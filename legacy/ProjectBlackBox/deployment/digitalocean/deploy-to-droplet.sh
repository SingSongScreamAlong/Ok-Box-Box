#!/bin/bash
# BlackBox Hybrid Cloud Deployment Script for DigitalOcean Droplet
# This script deploys the BlackBox system using Docker Compose

set -e

# Configuration
DROPLET_IP="68.183.18.151"
DROPLET_USER="root"
PROJECT_NAME="blackbox"
REMOTE_DIR="/opt/blackbox"

echo "🚀 Deploying BlackBox Hybrid Cloud System to DigitalOcean Droplet"
echo "Droplet IP: $DROPLET_IP"
echo "=================================================="

# Check if we can connect to the droplet
echo "📡 Testing connection to droplet..."
if ! ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no $DROPLET_USER@$DROPLET_IP "echo 'Connection successful'"; then
    echo "❌ Cannot connect to droplet. Please check:"
    echo "   - SSH key is added to your droplet"
    echo "   - Droplet is running"
    echo "   - IP address is correct"
    exit 1
fi

# Create remote directory and copy files
echo "📁 Setting up remote directory..."
ssh $DROPLET_USER@$DROPLET_IP "mkdir -p $REMOTE_DIR"

# Copy project files to droplet
echo "📤 Copying project files to droplet..."
rsync -avz --exclude='.git' --exclude='node_modules' --exclude='*.log' \
    ../../ $DROPLET_USER@$DROPLET_IP:$REMOTE_DIR/

# Install Docker and Docker Compose if not already installed
echo "🐳 Installing Docker and Docker Compose..."
ssh $DROPLET_USER@$DROPLET_IP << 'EOF'
# Update system
apt-get update

# Install Docker if not installed
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io
    systemctl start docker
    systemctl enable docker
fi

# Install Docker Compose if not installed
if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/download/v2.20.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

echo "Docker and Docker Compose installed successfully!"
EOF

# Deploy the application
echo "🚀 Deploying BlackBox application..."
ssh $DROPLET_USER@$DROPLET_IP << EOF
cd $REMOTE_DIR/deployment/digitalocean

# Stop any existing containers
echo "Stopping existing containers..."
docker-compose down || true

# Build and start the application
echo "Building and starting BlackBox services..."
docker-compose up -d --build

# Show running containers
echo "Checking deployment status..."
docker-compose ps

echo "🎉 BlackBox deployment completed!"
echo ""
echo "Your BlackBox system is now live at:"
echo "  📱 Dashboard: http://$DROPLET_IP"
echo "  🔧 API: http://$DROPLET_IP:3000"
echo "  📡 Relay Agent: http://$DROPLET_IP:8766"
echo ""
echo "To check logs: docker-compose logs -f [service-name]"
echo "To stop: docker-compose down"
echo "To restart: docker-compose restart"
EOF

echo ""
echo "✅ BlackBox Hybrid Cloud System Successfully Deployed!"
echo "🌐 Access your dashboard at: http://$DROPLET_IP"
