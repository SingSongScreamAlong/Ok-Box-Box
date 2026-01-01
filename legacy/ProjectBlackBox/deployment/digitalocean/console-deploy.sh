#!/bin/bash
# BlackBox Console Deployment Script
# Run this script directly on your DigitalOcean droplet through the console

set -e

echo "🚀 BlackBox Hybrid Cloud Console Deployment"
echo "============================================"

# Set up API keys
echo "🔑 Setting up API keys..."

# Check if API keys are provided as environment variables
if [ -z "$OPENAI_API_KEY" ]; then
    echo "Enter your OpenAI API key:"
    read -s OPENAI_API_KEY
    export OPENAI_API_KEY
fi

if [ -z "$ELEVENLABS_API_KEY" ]; then
    echo "Enter your ElevenLabs API key:"
    read -s ELEVENLABS_API_KEY
    export ELEVENLABS_API_KEY
fi

if [ -z "$OPENAI_API_KEY" ] || [ -z "$ELEVENLABS_API_KEY" ]; then
    echo "❌ Error: API keys not set. Please set OPENAI_API_KEY and ELEVENLABS_API_KEY environment variables."
    exit 1
fi

# Update system
echo "📦 Updating system packages..."
apt-get update

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io
    systemctl start docker
    systemctl enable docker
fi

# Install Docker Compose if not present
if ! command -v docker-compose &> /dev/null; then
    echo "🔧 Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/download/v2.20.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# Install Git if not present
if ! command -v git &> /dev/null; then
    echo "📥 Installing Git..."
    apt-get install -y git
fi

# Clone the BlackBox repository
echo "📥 Cloning BlackBox repository..."
cd /opt
rm -rf blackbox
git clone https://github.com/SingSongScreamAlong/blackboxdriverapp.git blackbox
cd blackbox

# Create Docker Compose file
echo "📝 Creating Docker Compose configuration..."
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15
    container_name: blackbox-postgres
    environment:
      POSTGRES_DB: blackbox
      POSTGRES_USER: blackbox
      POSTGRES_PASSWORD: blackbox_secure_password_2024
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped
    networks:
      - blackbox-network

  # Backend API Service
  backend:
    build:
      context: .
      dockerfile: deployment/digitalocean/backend-engine/Dockerfile
    container_name: blackbox-backend
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://blackbox:blackbox_secure_password_2024@postgres:5432/blackbox
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      ELEVENLABS_API_KEY: ${ELEVENLABS_API_KEY}
      JWT_SECRET: blackbox-super-secret-jwt-key-2024
      PORT: 3000
    ports:
      - "3000:3000"
    depends_on:
      - postgres
    restart: unless-stopped
    networks:
      - blackbox-network

  # Dashboard (React Frontend)
  dashboard:
    build:
      context: .
      dockerfile: deployment/digitalocean/dashboard/Dockerfile
      args:
        REACT_APP_API_URL: http://68.183.18.151:3000/api
        REACT_APP_WS_URL: ws://68.183.18.151:3000/ws
    container_name: blackbox-dashboard
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped
    networks:
      - blackbox-network

volumes:
  postgres_data:

networks:
  blackbox-network:
    driver: bridge
EOF

# Deploy the application
echo "🚀 Deploying BlackBox application..."
docker-compose down || true
docker-compose up -d --build

# Show status
echo "📊 Checking deployment status..."
docker-compose ps

echo ""
echo "🎉 BlackBox Hybrid Cloud System Deployed Successfully!"
echo ""
echo "🌐 Your BlackBox system is now live at:"
echo "   📱 Dashboard: http://68.183.18.151"
echo "   🔧 API: http://68.183.18.151:3000"
echo ""
echo "📋 Useful commands:"
echo "   View logs: docker-compose logs -f [service-name]"
echo "   Stop services: docker-compose down"
echo "   Restart services: docker-compose restart"
echo "   Update deployment: git pull && docker-compose up -d --build"
EOF
