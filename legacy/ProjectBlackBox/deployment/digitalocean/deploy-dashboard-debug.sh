#!/bin/bash
# BlackBox Dashboard Deployment Script (Debug Version)
# This script deploys the simplified dashboard to your DigitalOcean droplet with added debugging

set -e
set -x  # Enable command echo for debugging

# Configuration
DROPLET_IP="137.184.151.3"
SSH_USER="root"
REMOTE_DIR="/opt/blackbox"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCAL_DASHBOARD_DIR="$SCRIPT_DIR/simplified-dashboard"

echo "🚀 BlackBox Dashboard Deployment (DEBUG MODE)"
echo "==============================="
echo "This script will deploy the simplified dashboard to your DigitalOcean droplet."
echo "Droplet IP: $DROPLET_IP"
echo "Remote directory: $REMOTE_DIR"
echo "Script directory: $SCRIPT_DIR"
echo "Local dashboard directory: $LOCAL_DASHBOARD_DIR"
echo ""

# Check if the local dashboard directory exists
if [ ! -d "$LOCAL_DASHBOARD_DIR" ]; then
  echo "❌ Error: Local dashboard directory not found at $LOCAL_DASHBOARD_DIR"
  exit 1
fi

echo "📦 Building the dashboard locally..."
cd "$LOCAL_DASHBOARD_DIR"
echo "Current directory: $(pwd)"
echo "Running npm install with 5-minute timeout..."
timeout 300 npm install || { echo "npm install timed out or failed"; exit 1; }
echo "npm install completed successfully"

echo "Running npm build..."
npm run build || { echo "npm build failed"; exit 1; }
echo "npm build completed successfully"

echo "📤 Copying files to the droplet..."
# Test SSH connection first with timeout
echo "Testing SSH connection..."
timeout 10 ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 $SSH_USER@$DROPLET_IP "echo SSH connection successful" || { echo "SSH connection failed or timed out"; exit 1; }

# Create a temporary directory for the build
echo "Creating remote directory..."
ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 $SSH_USER@$DROPLET_IP "mkdir -p $REMOTE_DIR/dashboard-build" || { echo "Failed to create remote directory"; exit 1; }

# Copy the build files to the droplet
echo "Copying build files..."
scp -o ConnectTimeout=5 -r build/* $SSH_USER@$DROPLET_IP:$REMOTE_DIR/dashboard-build/ || { echo "Failed to copy build files"; exit 1; }

# Copy the Dockerfile and nginx.conf
echo "Copying Dockerfile and nginx.conf..."
scp -o ConnectTimeout=5 Dockerfile nginx.conf $SSH_USER@$DROPLET_IP:$REMOTE_DIR/ || { echo "Failed to copy Dockerfile and nginx.conf"; exit 1; }

echo "🏗️ Building and deploying the dashboard container on the droplet..."
ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 $SSH_USER@$DROPLET_IP "cd $REMOTE_DIR && \
  docker build -t blackbox-dashboard -f Dockerfile . && \
  docker-compose stop dashboard || true && \
  docker-compose rm -f dashboard || true && \
  docker-compose up -d dashboard" || { echo "Failed to build and deploy container"; exit 1; }

echo "⏳ Waiting for the dashboard to start..."
sleep 10

echo "🔍 Checking dashboard status..."
ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 $SSH_USER@$DROPLET_IP "cd $REMOTE_DIR && docker-compose ps dashboard" || { echo "Failed to check dashboard status"; exit 1; }

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
