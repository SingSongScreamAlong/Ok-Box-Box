#!/bin/bash
# =====================================================================
# ControlBox / OkBoxBox - Deploy to Digital Ocean Droplet
# Deploys the full session viewer with live telemetry and video display
# =====================================================================

set -e

# Configuration
DROPLET_IP="${DROPLET_IP:-137.184.151.3}"
DROPLET_USER="${DROPLET_USER:-root}"
DEPLOY_DIR="/opt/controlbox"

echo "🏎️  ControlBox Deployment Script"
echo "   Target: $DROPLET_USER@$DROPLET_IP"
echo "   Deploy Directory: $DEPLOY_DIR"
echo ""

# Check if we can connect
echo "📡 Testing SSH connection..."
ssh -o ConnectTimeout=10 -o BatchMode=yes $DROPLET_USER@$DROPLET_IP "echo 'SSH connection successful'" || {
    echo "❌ Cannot connect to droplet. Please check:"
    echo "   - SSH key is configured"
    echo "   - Droplet IP is correct: $DROPLET_IP"
    echo "   - Firewall allows SSH (port 22)"
    exit 1
}

echo "✅ SSH connection verified"
echo ""

# Create deployment package
echo "📦 Creating deployment package..."
TEMP_DIR=$(mktemp -d)
PACKAGE_NAME="controlbox-deploy-$(date +%Y%m%d-%H%M%S).tar.gz"

# Copy essential files
cp -r packages $TEMP_DIR/
cp -r .do $TEMP_DIR/ 2>/dev/null || true
cp package*.json $TEMP_DIR/
cp tsconfig.base.json $TEMP_DIR/
cp Dockerfile $TEMP_DIR/
cp Dockerfile.server $TEMP_DIR/ 2>/dev/null || true
cp docker-compose.yml $TEMP_DIR/
cp docker-compose.prod.yml $TEMP_DIR/
cp nginx.conf $TEMP_DIR/ 2>/dev/null || true

# Create the tarball (excluding node_modules and dist)
cd $TEMP_DIR
tar --exclude='node_modules' --exclude='dist' --exclude='.git' -czf /tmp/$PACKAGE_NAME .
cd -

echo "✅ Package created: $PACKAGE_NAME"
echo ""

# Upload to droplet
echo "📤 Uploading to droplet..."
scp /tmp/$PACKAGE_NAME $DROPLET_USER@$DROPLET_IP:/tmp/

# Deploy on droplet
echo "🚀 Deploying on droplet..."
ssh $DROPLET_USER@$DROPLET_IP << 'REMOTE_SCRIPT'
set -e

DEPLOY_DIR="/opt/controlbox"
PACKAGE_FILE=$(ls -t /tmp/controlbox-deploy-*.tar.gz | head -1)

echo "📁 Setting up deployment directory..."
mkdir -p $DEPLOY_DIR
cd $DEPLOY_DIR

# Backup existing deployment
if [ -d "packages" ]; then
    echo "📦 Backing up existing deployment..."
    BACKUP_DIR="/opt/controlbox-backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p $BACKUP_DIR
    cp -r packages $BACKUP_DIR/ 2>/dev/null || true
    cp docker-compose*.yml $BACKUP_DIR/ 2>/dev/null || true
fi

# Extract new deployment
echo "📂 Extracting deployment package..."
tar -xzf $PACKAGE_FILE -C $DEPLOY_DIR

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl start docker
    systemctl enable docker
fi

# Install Docker Compose if not present
if ! command -v docker-compose &> /dev/null; then
    echo "🐳 Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cat > .env << 'ENVFILE'
# ControlBox Production Environment
NODE_ENV=production
PORT=8080

# Database
POSTGRES_USER=controlbox
POSTGRES_PASSWORD=controlbox_prod_$(openssl rand -hex 16)
POSTGRES_DB=controlbox

# Redis
REDIS_PASSWORD=redis_prod_$(openssl rand -hex 16)

# JWT Secret
JWT_SECRET=$(openssl rand -hex 32)

# CORS - Allow all origins for now
CORS_ORIGINS=*

# Build info
BUILD_TIME=$(date -Iseconds)
GIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
ENVFILE
    echo "⚠️  Please update .env with your actual secrets!"
fi

# Create production docker-compose override
echo "📝 Creating docker-compose.override.yml..."
cat > docker-compose.override.yml << 'OVERRIDE'
version: '3.8'

services:
  # Build and run the server
  server:
    build:
      context: .
      dockerfile: Dockerfile
      target: server
    container_name: controlbox_server
    restart: always
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
      - PORT=8080
      - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - CORS_ORIGINS=${CORS_ORIGINS:-*}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - controlbox_network

  # Build and run the dashboard
  dashboard:
    build:
      context: .
      dockerfile: Dockerfile
      target: dashboard
    container_name: controlbox_dashboard
    restart: always
    ports:
      - "80:80"
    depends_on:
      - server
    networks:
      - controlbox_network

  # PostgreSQL with healthcheck
  postgres:
    image: postgres:15-alpine
    container_name: controlbox_postgres
    restart: always
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - controlbox_network

  # Redis with healthcheck
  redis:
    image: redis:7-alpine
    container_name: controlbox_redis
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - controlbox_network

volumes:
  postgres_data:
  redis_data:

networks:
  controlbox_network:
    driver: bridge
OVERRIDE

# Open firewall ports
echo "🔥 Configuring firewall..."
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP (Dashboard)
ufw allow 443/tcp  # HTTPS
ufw allow 8080/tcp # API Server
ufw --force enable

# Build and start containers
echo "🐳 Building and starting containers..."
docker-compose -f docker-compose.yml -f docker-compose.override.yml build --no-cache
docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to start..."
sleep 10

# Check status
echo ""
echo "📊 Container Status:"
docker-compose -f docker-compose.yml -f docker-compose.override.yml ps

# Test health endpoint
echo ""
echo "🏥 Testing health endpoint..."
curl -s http://localhost:8080/api/health || echo "Health check pending..."

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Access your services:"
echo "   Dashboard: http://$(curl -s ifconfig.me)"
echo "   API:       http://$(curl -s ifconfig.me):8080"
echo "   Health:    http://$(curl -s ifconfig.me):8080/api/health"
echo ""
echo "📋 Useful commands:"
echo "   View logs:     docker-compose logs -f"
echo "   Restart:       docker-compose restart"
echo "   Stop:          docker-compose down"
echo "   Rebuild:       docker-compose build --no-cache && docker-compose up -d"

REMOTE_SCRIPT

# Cleanup
rm -rf $TEMP_DIR
rm -f /tmp/$PACKAGE_NAME

echo ""
echo "🎉 Deployment script completed!"
echo ""
echo "Your ControlBox session viewer with live telemetry is now deploying to:"
echo "   http://$DROPLET_IP (Dashboard)"
echo "   http://$DROPLET_IP:8080 (API/WebSocket)"
