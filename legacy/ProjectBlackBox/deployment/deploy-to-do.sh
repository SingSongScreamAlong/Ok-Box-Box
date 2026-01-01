#!/bin/bash
# BlackBox Simplified Deployment Script

set -e

# Configuration - Replace with your Droplet IP
DROPLET_IP="YOUR_DROPLET_IP"
DROPLET_USER="root"

echo "=== BlackBox Droplet Deployment ==="
echo "Deploying to droplet: $DROPLET_USER@$DROPLET_IP"

# Check if we can connect to the droplet
echo "Testing connection to droplet..."
if ! ssh -o ConnectTimeout=10 $DROPLET_USER@$DROPLET_IP "echo 'Connection successful'"; then
    echo "Error: Cannot connect to droplet $DROPLET_IP"
    echo "Please ensure:"
    echo "1. Your SSH key is added to the droplet"
    echo "2. The droplet IP is correct"
    echo "3. The droplet is running"
    exit 1
fi

# Create deployment directory on droplet
echo "Creating deployment directory on droplet..."
ssh $DROPLET_USER@$DROPLET_IP "mkdir -p /opt/blackbox"

# Copy deployment files to droplet
echo "Copying deployment files..."
scp -r deployment/digitalocean/* $DROPLET_USER@$DROPLET_IP:/opt/blackbox/
scp deployment/docker-compose.droplet.yml $DROPLET_USER@$DROPLET_IP:/opt/blackbox/docker-compose.yml
scp deployment/.env $DROPLET_USER@$DROPLET_IP:/opt/blackbox/.env

echo "Deployment files copied successfully!"

# Run deployment on droplet
echo "Running deployment on droplet..."
ssh $DROPLET_USER@$DROPLET_IP << 'EOF'
cd /opt/blackbox

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

# Pull and start services
echo "Starting BlackBox services..."
docker-compose pull
docker-compose up -d

# Show status
echo "Deployment complete! Services status:"
docker-compose ps

echo "Services should be available at:"
echo "- Backend API: http://$(curl -s ifconfig.me):3000"
echo "- Dashboard: http://$(curl -s ifconfig.me):80"
echo "- WebSocket: ws://$(curl -s ifconfig.me):8765"

EOF

echo "=== Deployment Complete ==="
echo "Next steps:"
echo "1. Access your dashboard at http://$DROPLET_IP"
echo "2. Configure your driver app to connect to:"
echo "   - Backend API: http://$DROPLET_IP:3000"
echo "   - WebSocket: ws://$DROPLET_IP:8765"
