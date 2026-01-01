#!/bin/bash

# BlackBox Dashboard Direct Deployment Script
# This script creates a deployment package that can be manually transferred to the droplet

set -e

echo "🚀 BlackBox Dashboard Direct Deployment"
echo "======================================"

# Configuration
DROPLET_IP="64.227.28.10"
BUILD_DIR="./dashboard_deployment"
DASHBOARD_DIR="./dashboard"

# Clean and create build directory
echo "📦 Preparing deployment package..."
rm -rf $BUILD_DIR
mkdir -p $BUILD_DIR

# Build the dashboard locally
echo "🔨 Building dashboard locally..."
cd $DASHBOARD_DIR
npm install
npm run build
cd ..

# Copy built dashboard to deployment directory
echo "📋 Copying dashboard build..."
cp -r $DASHBOARD_DIR/build $BUILD_DIR/dashboard-build

# Create Dockerfile for dashboard
echo "🐳 Creating dashboard Dockerfile..."
cat > $BUILD_DIR/Dockerfile << 'EOF'
FROM nginx:alpine

# Copy built React app
COPY dashboard-build /usr/share/nginx/html

# Create nginx configuration
RUN echo 'server {' > /etc/nginx/conf.d/default.conf && \
    echo '    listen 80;' >> /etc/nginx/conf.d/default.conf && \
    echo '    server_name localhost;' >> /etc/nginx/conf.d/default.conf && \
    echo '    location / {' >> /etc/nginx/conf.d/default.conf && \
    echo '        root /usr/share/nginx/html;' >> /etc/nginx/conf.d/default.conf && \
    echo '        index index.html index.htm;' >> /etc/nginx/conf.d/default.conf && \
    echo '        try_files $uri $uri/ /index.html;' >> /etc/nginx/conf.d/default.conf && \
    echo '    }' >> /etc/nginx/conf.d/default.conf && \
    echo '    location /api/ {' >> /etc/nginx/conf.d/default.conf && \
    echo '        proxy_pass http://backend:3000/;' >> /etc/nginx/conf.d/default.conf && \
    echo '        proxy_set_header Host $host;' >> /etc/nginx/conf.d/default.conf && \
    echo '        proxy_set_header X-Real-IP $remote_addr;' >> /etc/nginx/conf.d/default.conf && \
    echo '        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;' >> /etc/nginx/conf.d/default.conf && \
    echo '        proxy_set_header X-Forwarded-Proto $scheme;' >> /etc/nginx/conf.d/default.conf && \
    echo '    }' >> /etc/nginx/conf.d/default.conf && \
    echo '}' >> /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
EOF

# Create docker-compose for the droplet
echo "🐙 Creating docker-compose configuration..."
cat > $BUILD_DIR/docker-compose.yml << 'EOF'
version: '3.8'

services:
  # Dashboard (React Frontend)
  dashboard:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: blackbox-dashboard
    ports:
      - "80:80"
      - "443:443"
    restart: unless-stopped
    networks:
      - blackbox-network

  # Backend API (if needed)
  backend:
    image: node:18-alpine
    container_name: blackbox-backend
    working_dir: /app
    command: sh -c "npm install && npm start"
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    restart: unless-stopped
    networks:
      - blackbox-network
    volumes:
      - ./backend:/app

networks:
  blackbox-network:
    driver: bridge
EOF

# Create deployment instructions
echo "📝 Creating deployment instructions..."
cat > $BUILD_DIR/DEPLOY_INSTRUCTIONS.md << 'EOF'
# BlackBox Dashboard Deployment Instructions

## Prerequisites
- Docker and Docker Compose installed on the droplet
- SSH access to the droplet

## Deployment Steps

1. Transfer this entire directory to your droplet:
   ```bash
   scp -r dashboard_deployment root@64.227.28.10:/opt/blackbox/
   ```

2. SSH into your droplet:
   ```bash
   ssh root@64.227.28.10
   ```

3. Navigate to the deployment directory:
   ```bash
   cd /opt/blackbox/dashboard_deployment
   ```

4. Build and start the dashboard:
   ```bash
   docker-compose down
   docker-compose build
   docker-compose up -d
   ```

5. Check the status:
   ```bash
   docker-compose ps
   docker-compose logs dashboard
   ```

6. Access your dashboard:
   - Open http://64.227.28.10 in your browser
   - The dashboard should be running and accessible

## Troubleshooting

- Check container logs: `docker-compose logs dashboard`
- Restart services: `docker-compose restart`
- Rebuild if needed: `docker-compose build --no-cache`
EOF

# Create a simple deployment script for the droplet
echo "🔧 Creating droplet deployment script..."
cat > $BUILD_DIR/deploy_on_droplet.sh << 'EOF'
#!/bin/bash

echo "🚀 Deploying BlackBox Dashboard on Droplet"

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl start docker
    systemctl enable docker
fi

# Install Docker Compose if not present
if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# Stop any existing containers
echo "Stopping existing containers..."
docker-compose down 2>/dev/null || true

# Build and start the dashboard
echo "Building and starting dashboard..."
docker-compose build
docker-compose up -d

echo "✅ Dashboard deployment complete!"
echo "Access your dashboard at: http://64.227.28.10"

# Show status
docker-compose ps
EOF

chmod +x $BUILD_DIR/deploy_on_droplet.sh

echo ""
echo "✅ Deployment package created successfully!"
echo ""
echo "📁 Deployment package location: $BUILD_DIR"
echo "🌐 Target droplet: $DROPLET_IP"
echo ""
echo "Next steps:"
echo "1. Transfer the deployment package to your droplet"
echo "2. Run the deployment script on the droplet"
echo ""
echo "Manual transfer command:"
echo "scp -r $BUILD_DIR root@$DROPLET_IP:/opt/blackbox/"
echo ""
echo "Or follow the instructions in: $BUILD_DIR/DEPLOY_INSTRUCTIONS.md"
