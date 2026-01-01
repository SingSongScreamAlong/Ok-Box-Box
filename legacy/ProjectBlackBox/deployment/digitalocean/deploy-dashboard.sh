#!/bin/bash
# BlackBox Dashboard Deployment Script
# This script deploys the simplified dashboard to your DigitalOcean droplet

set -e

# Configuration
DROPLET_IP="137.184.151.3"
SSH_USER="root"
REMOTE_DIR="/opt/blackbox"
LOCAL_DASHBOARD_DIR="$(pwd)/simplified-dashboard"

echo "🚀 BlackBox Dashboard Deployment"
echo "==============================="
echo "This script will deploy the simplified dashboard to your DigitalOcean droplet."
echo "Droplet IP: $DROPLET_IP"
echo "Remote directory: $REMOTE_DIR"
echo ""

# Check if the local dashboard directory exists
if [ ! -d "$LOCAL_DASHBOARD_DIR" ]; then
  echo "❌ Error: Local dashboard directory not found at $LOCAL_DASHBOARD_DIR"
  exit 1
fi

echo "📦 Building the dashboard locally..."
cd "$LOCAL_DASHBOARD_DIR"
npm install
npm run build

echo "📤 Copying files to the droplet..."
# Create a temporary directory for the build
ssh -o StrictHostKeyChecking=no $SSH_USER@$DROPLET_IP "mkdir -p $REMOTE_DIR/dashboard-build"

# Copy the build files to the droplet
scp -r build/* $SSH_USER@$DROPLET_IP:$REMOTE_DIR/dashboard-build/

# Copy the Dockerfile and nginx.conf
scp Dockerfile nginx.conf $SSH_USER@$DROPLET_IP:$REMOTE_DIR/

echo "🏗️ Building and deploying the dashboard container on the droplet..."
ssh -o StrictHostKeyChecking=no $SSH_USER@$DROPLET_IP "cd $REMOTE_DIR && \
  docker build -t blackbox-dashboard -f Dockerfile . && \
  docker-compose stop dashboard || true && \
  docker-compose rm -f dashboard || true && \
  docker-compose up -d dashboard"

echo "⏳ Waiting for the dashboard to start..."
sleep 10

echo "🔍 Checking dashboard status..."
ssh -o StrictHostKeyChecking=no $SSH_USER@$DROPLET_IP "cd $REMOTE_DIR && docker-compose ps dashboard"

echo "🌐 Dashboard URL: http://$DROPLET_IP"
echo ""
echo "✅ Deployment complete!"
echo "You can now access your BlackBox dashboard at http://$DROPLET_IP"
echo ""
echo "API Keys configured:"
echo "- OpenAI API Key: [CONFIGURED]"
echo "- ElevenLabs API Key: [CONFIGURED]"
echo ""
echo "📝 Note: If you encounter any issues, check the logs with:"
echo "ssh $SSH_USER@$DROPLET_IP \"cd $REMOTE_DIR && docker-compose logs dashboard\""
