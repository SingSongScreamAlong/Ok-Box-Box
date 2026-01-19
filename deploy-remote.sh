#!/bin/bash
# =====================================================================
# ControlBox - Remote Deployment Script
# Run this on the Digital Ocean droplet
# =====================================================================

set -e

echo "🏎️  ControlBox Remote Deployment"
echo "================================"
echo ""

DEPLOY_DIR="/opt/controlbox"
REPO_URL="https://github.com/SingSongScreamAlong/Ok-Box-Box.git"

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl start docker
    systemctl enable docker
    rm get-docker.sh
fi

# Install Docker Compose if not present
if ! command -v docker-compose &> /dev/null; then
    echo "🐳 Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# Install git if not present
if ! command -v git &> /dev/null; then
    echo "📦 Installing git..."
    apt-get update && apt-get install -y git
fi

# Clone or update repository
echo "📥 Getting latest code..."
if [ -d "$DEPLOY_DIR/.git" ]; then
    cd $DEPLOY_DIR
    git fetch origin
    git reset --hard origin/main
else
    rm -rf $DEPLOY_DIR
    git clone $REPO_URL $DEPLOY_DIR
    cd $DEPLOY_DIR
fi

# Create production docker-compose file
echo "📝 Creating production docker-compose..."
cat > $DEPLOY_DIR/docker-compose.live.yml << 'COMPOSE'
version: '3.8'

services:
  # ControlBox Server (Standalone mode - no DB required for live telemetry)
  server:
    build:
      context: .
      dockerfile: Dockerfile.server
      args:
        CACHE_BUST: "2026011902"
    container_name: controlbox_server
    restart: always
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
      - PORT=8080
      - HOST=0.0.0.0
      - CORS_ORIGINS=*
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8080/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    networks:
      - controlbox_net

  # Dashboard (React frontend served by nginx)
  dashboard:
    build:
      context: .
      dockerfile: Dockerfile.dashboard
      args:
        CACHE_BUST: "2026011902"
        VITE_API_URL: "http://137.184.151.3:8080"
        VITE_WS_URL: "ws://137.184.151.3:8080"
    container_name: controlbox_dashboard
    restart: always
    ports:
      - "80:80"
    depends_on:
      server:
        condition: service_healthy
    networks:
      - controlbox_net

networks:
  controlbox_net:
    driver: bridge
COMPOSE

# Create dashboard Dockerfile if it doesn't exist
cat > $DEPLOY_DIR/Dockerfile.dashboard << 'DOCKERFILE'
# =====================================================================
# ControlBox Dashboard Dockerfile
# =====================================================================

FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/common/package*.json ./packages/common/
COPY packages/protocol/package*.json ./packages/protocol/
COPY packages/dashboard/package*.json ./packages/dashboard/

# Install dependencies
RUN npm ci

# Build args for API URLs
ARG VITE_API_URL=http://localhost:8080
ARG VITE_WS_URL=ws://localhost:8080
ARG CACHE_BUST=1

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

# Copy source
COPY tsconfig.base.json ./
COPY packages/common ./packages/common
COPY packages/protocol ./packages/protocol
COPY packages/dashboard ./packages/dashboard

# Build common, protocol, then dashboard
RUN npm run build -w packages/common && \
    npm run build -w packages/protocol && \
    npm run build -w packages/dashboard

# Production stage - nginx
FROM nginx:alpine

# Copy built dashboard
COPY --from=builder /app/packages/dashboard/dist /usr/share/nginx/html

# Custom nginx config
RUN cat > /etc/nginx/conf.d/default.conf << 'NGINX'
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain application/json application/javascript text/css;

    # SPA fallback - all routes go to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Proxy WebSocket and API to server
    location /socket.io/ {
        proxy_pass http://controlbox_server:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/ {
        proxy_pass http://controlbox_server:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
NGINX

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
DOCKERFILE

# Configure firewall
echo "🔥 Configuring firewall..."
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # Dashboard
ufw allow 8080/tcp # API/WebSocket
ufw --force enable

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.live.yml down 2>/dev/null || true
docker stop controlbox_server controlbox_dashboard 2>/dev/null || true
docker rm controlbox_server controlbox_dashboard 2>/dev/null || true

# Build and start
echo "🐳 Building containers (this may take a few minutes)..."
docker-compose -f docker-compose.live.yml build --no-cache

echo "🚀 Starting containers..."
docker-compose -f docker-compose.live.yml up -d

# Wait for startup
echo "⏳ Waiting for services to start..."
sleep 15

# Show status
echo ""
echo "📊 Container Status:"
docker-compose -f docker-compose.live.yml ps

# Test health
echo ""
echo "🏥 Health Check:"
curl -s http://localhost:8080/api/health && echo "" || echo "Still starting..."

# Get public IP
PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || echo "137.184.151.3")

echo ""
echo "============================================"
echo "✅ DEPLOYMENT COMPLETE!"
echo "============================================"
echo ""
echo "🌐 Your ControlBox is live at:"
echo ""
echo "   Dashboard:  http://$PUBLIC_IP"
echo "   API:        http://$PUBLIC_IP:8080"
echo "   Health:     http://$PUBLIC_IP:8080/api/health"
echo "   Telemetry:  http://$PUBLIC_IP:8080/api/health/telemetry"
echo ""
echo "📡 WebSocket endpoint for relay:"
echo "   ws://$PUBLIC_IP:8080"
echo ""
echo "📋 Commands:"
echo "   View logs:  docker-compose -f docker-compose.live.yml logs -f"
echo "   Restart:    docker-compose -f docker-compose.live.yml restart"
echo "   Stop:       docker-compose -f docker-compose.live.yml down"
echo ""
