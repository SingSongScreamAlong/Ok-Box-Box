# ControlBox - Digital Ocean Droplet Setup

## Quick Deploy Instructions

You need to run these commands on your Digital Ocean droplet. You can either:
1. Use the **Digital Ocean Console** (web-based terminal in DO dashboard)
2. Add your SSH key to the droplet and SSH in

---

## Option 1: Using Digital Ocean Console

1. Go to https://cloud.digitalocean.com/droplets
2. Click on your droplet (64.227.28.10)
3. Click "Console" button (top right)
4. Copy and paste the commands below

---

## Option 2: Add SSH Key to Droplet

First, get your public key:
```powershell
# On your Windows machine, run:
type $env:USERPROFILE\.ssh\id_ed25519.pub
```

Then in Digital Ocean Console, add it:
```bash
# On the droplet, run:
mkdir -p ~/.ssh
echo "YOUR_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

---

## Deployment Commands (Run on Droplet)

Copy and paste this entire block into the droplet terminal:

```bash
#!/bin/bash
# =====================================================================
# ControlBox Full Deployment - Run this on your Digital Ocean Droplet
# =====================================================================

set -e

echo "🏎️  ControlBox Deployment Starting..."

# Variables
DEPLOY_DIR="/opt/controlbox"
REPO_URL="https://github.com/SingSongScreamAlong/Ok-Box-Box.git"

# Install Docker
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl start docker
    systemctl enable docker
    rm get-docker.sh
fi

# Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "🐳 Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# Install git
apt-get update && apt-get install -y git curl

# Clone or update repository
echo "📥 Getting latest code from GitHub..."
if [ -d "$DEPLOY_DIR/.git" ]; then
    cd $DEPLOY_DIR
    git fetch origin
    git reset --hard origin/main
else
    rm -rf $DEPLOY_DIR
    git clone $REPO_URL $DEPLOY_DIR
    cd $DEPLOY_DIR
fi

# Get public IP
PUBLIC_IP=$(curl -s ifconfig.me)
echo "📡 Public IP: $PUBLIC_IP"

# Create docker-compose for live deployment
cat > $DEPLOY_DIR/docker-compose.live.yml << COMPOSE
version: '3.8'

services:
  server:
    build:
      context: .
      dockerfile: Dockerfile.server
      args:
        CACHE_BUST: "$(date +%s)"
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

  dashboard:
    build:
      context: .
      dockerfile: Dockerfile.dashboard
      args:
        CACHE_BUST: "$(date +%s)"
        VITE_API_URL: "http://$PUBLIC_IP:8080"
        VITE_WS_URL: "ws://$PUBLIC_IP:8080"
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

# Create dashboard Dockerfile
cat > $DEPLOY_DIR/Dockerfile.dashboard << 'DOCKERFILE'
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY packages/common/package*.json ./packages/common/
COPY packages/protocol/package*.json ./packages/protocol/
COPY packages/dashboard/package*.json ./packages/dashboard/
RUN npm ci
ARG VITE_API_URL=http://localhost:8080
ARG VITE_WS_URL=ws://localhost:8080
ARG CACHE_BUST=1
ENV VITE_API_URL=\$VITE_API_URL
ENV VITE_WS_URL=\$VITE_WS_URL
COPY tsconfig.base.json ./
COPY packages/common ./packages/common
COPY packages/protocol ./packages/protocol
COPY packages/dashboard ./packages/dashboard
RUN npm run build -w packages/common && npm run build -w packages/protocol && npm run build -w packages/dashboard

FROM nginx:alpine
COPY --from=builder /app/packages/dashboard/dist /usr/share/nginx/html
RUN echo 'server { listen 80; server_name _; root /usr/share/nginx/html; index index.html; gzip on; gzip_types text/plain application/json application/javascript text/css; location / { try_files \$uri \$uri/ /index.html; } location /socket.io/ { proxy_pass http://controlbox_server:8080; proxy_http_version 1.1; proxy_set_header Upgrade \$http_upgrade; proxy_set_header Connection "upgrade"; } location /api/ { proxy_pass http://controlbox_server:8080; } }' > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
DOCKERFILE

# Configure firewall
echo "🔥 Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 8080/tcp
ufw --force enable

# Stop existing containers
echo "🛑 Stopping existing containers..."
cd $DEPLOY_DIR
docker-compose -f docker-compose.live.yml down 2>/dev/null || true

# Build and start
echo "🐳 Building containers (this takes 3-5 minutes)..."
docker-compose -f docker-compose.live.yml build --no-cache

echo "🚀 Starting containers..."
docker-compose -f docker-compose.live.yml up -d

# Wait and show status
echo "⏳ Waiting for services..."
sleep 20

echo ""
echo "📊 Container Status:"
docker-compose -f docker-compose.live.yml ps

echo ""
echo "🏥 Health Check:"
curl -s http://localhost:8080/api/health || echo "Starting..."

echo ""
echo "============================================"
echo "✅ DEPLOYMENT COMPLETE!"
echo "============================================"
echo ""
echo "🌐 Your ControlBox is live:"
echo "   Dashboard:  http://$PUBLIC_IP"
echo "   API:        http://$PUBLIC_IP:8080"
echo "   WebSocket:  ws://$PUBLIC_IP:8080"
echo ""
echo "📡 Configure your relay to connect to:"
echo "   ws://$PUBLIC_IP:8080"
echo ""
```

---

## After Deployment

### View Logs
```bash
cd /opt/controlbox
docker-compose -f docker-compose.live.yml logs -f
```

### Restart Services
```bash
cd /opt/controlbox
docker-compose -f docker-compose.live.yml restart
```

### Update to Latest Code
```bash
cd /opt/controlbox
git pull origin main
docker-compose -f docker-compose.live.yml build --no-cache
docker-compose -f docker-compose.live.yml up -d
```

---

## Configure Local Relay

After deployment, update your local relay config to point to the server:

**File:** `C:\Users\conra\CascadeProjects\okboxbox\relay\.env`
```
SERVER_URL=ws://64.227.28.10:8080
```

Or for the iRacing telemetry sender:
**File:** `C:\Users\conra\CascadeProjects\iracing-telemetry-sender\config.json`
```json
{
  "server": {
    "host": "64.227.28.10",
    "port": 8080,
    "protocol": "ws"
  }
}
```
