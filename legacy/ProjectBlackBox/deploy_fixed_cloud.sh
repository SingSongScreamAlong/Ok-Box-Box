#!/bin/bash

echo "🚀 Deploying fixed BlackBox cloud configuration to DigitalOcean..."

# DigitalOcean droplet details
DROPLET_IP="64.227.28.10"
DROPLET_USER="root"
PROJECT_DIR="/root/blackboxdriverapp"

echo "📁 Copying updated Dockerfile to droplet..."
scp -o StrictHostKeyChecking=no deployment/digitalocean/relay-agent/Dockerfile $DROPLET_USER@$DROPLET_IP:$PROJECT_DIR/deployment/digitalocean/relay-agent/

echo "📁 Copying docker-compose.yml to droplet..."
scp -o StrictHostKeyChecking=no docker-compose.yml $DROPLET_USER@$DROPLET_IP:$PROJECT_DIR/

echo "🔧 Rebuilding and restarting services on droplet..."
ssh -o StrictHostKeyChecking=no $DROPLET_USER@$DROPLET_IP << 'REMOTE_SCRIPT'
cd /root/blackboxdriverapp

echo "🛑 Stopping existing services..."
docker-compose down

echo "🔨 Rebuilding relay-agent with cloud dependencies..."
docker-compose build relay-agent

echo "🚀 Starting all services..."
docker-compose up -d

echo "⏳ Waiting for services to initialize..."
sleep 15

echo "📊 Service Status:"
docker-compose ps

echo ""
echo "📋 Relay Agent Logs:"
docker-compose logs --tail=10 relay-agent

echo ""
echo "📋 Backend Logs:"
docker-compose logs --tail=5 backend-engine

echo ""
echo "📋 Dashboard Logs:"
docker-compose logs --tail=5 dashboard
REMOTE_SCRIPT

echo ""
echo "🎉 BlackBox cloud deployment complete!"
echo "📊 Dashboard: http://64.227.28.10:3000"
echo "🔧 Backend API: http://64.227.28.10:8080"
echo "📡 Relay Agent: http://64.227.28.10:8081"
echo ""
echo "✅ Cloud services ready to receive telemetry from your PC!"
echo "💡 Next: Configure your local PC driver app to send data to the cloud"
