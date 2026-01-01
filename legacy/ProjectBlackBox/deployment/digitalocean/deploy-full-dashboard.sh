#!/bin/bash
# BlackBox Full Dashboard Deployment Script
# This script deploys the full-featured dashboard to your DigitalOcean droplet

set -e
set -x  # Enable command echo for debugging

# Configuration
DROPLET_IP="137.184.151.3"
SSH_USER="root"
REMOTE_DIR="/opt/blackbox"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCAL_DASHBOARD_DIR="$(cd "$SCRIPT_DIR/../../dashboard" && pwd)"

echo "🚀 BlackBox Full Dashboard Deployment"
echo "==============================="
echo "This script will deploy the full-featured dashboard to your DigitalOcean droplet."
echo "Droplet IP: $DROPLET_IP"
echo "Remote directory: $REMOTE_DIR"
echo "Script directory: $SCRIPT_DIR"
echo "Local dashboard directory: $LOCAL_DASHBOARD_DIR"
echo ""

# Check if the local dashboard directory exists
if [ ! -d "$LOCAL_DASHBOARD_DIR" ]; then
  echo "❌ Error: Full dashboard directory not found at $LOCAL_DASHBOARD_DIR"
  exit 1
fi

echo "📦 Building the dashboard locally..."
cd "$LOCAL_DASHBOARD_DIR"
echo "Current directory: $(pwd)"

# Use a background process with kill timer instead of timeout (macOS compatible)
echo "Running npm install with 5-minute timeout..."
npm install &
npm_pid=$!

# Set a timer to kill npm if it takes too long
(
  sleep 300
  if ps -p $npm_pid > /dev/null; then
    echo "npm install is taking too long, killing process..."
    kill -9 $npm_pid
    exit 1
  fi
) &
timer_pid=$!

# Wait for npm to finish
wait $npm_pid
npm_result=$?

# Kill the timer
kill -9 $timer_pid 2>/dev/null || true

# Check npm result
if [ $npm_result -ne 0 ]; then
  echo "npm install failed with exit code $npm_result"
  exit 1
fi

echo "npm install completed successfully"

echo "Running npm build..."
npm run build
if [ $? -ne 0 ]; then
  echo "npm build failed"
  exit 1
fi
echo "npm build completed successfully"

echo "📤 Copying files to the droplet..."
# Test SSH connection first
echo "Testing SSH connection..."
ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 $SSH_USER@$DROPLET_IP "echo SSH connection successful" || { 
  echo "SSH connection failed or timed out."
  exit 1
}

# Create the dashboard directory structure on the remote server
echo "Creating remote directory structure..."
ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 $SSH_USER@$DROPLET_IP "mkdir -p $REMOTE_DIR/dashboard" || { 
  echo "Failed to create remote directory"
  exit 1
}

# Copy the build files directly to the remote server
echo "Copying build files..."
scp -o ConnectTimeout=5 -r build/* $SSH_USER@$DROPLET_IP:$REMOTE_DIR/dashboard/ || { 
  echo "Failed to copy build files"
  exit 1
}

# Create a simple Dockerfile for the dashboard on the remote server
echo "Creating Dockerfile on remote server..."
cat > temp_dockerfile << EOF
FROM nginx:alpine
COPY ./dashboard /usr/share/nginx/html
COPY ./nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
EOF

# Create nginx.conf for the dashboard
cat > temp_nginx.conf << EOF
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;
    
    # Handle React Router paths
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API proxy for backend services
    location /api/ {
        proxy_pass http://backend:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # WebSocket proxy for real-time communication
    location /socket.io/ {
        proxy_pass http://backend:3000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Copy the Dockerfile and nginx.conf
echo "Copying Dockerfile and nginx.conf..."
scp -o ConnectTimeout=5 temp_dockerfile $SSH_USER@$DROPLET_IP:$REMOTE_DIR/Dockerfile.dashboard || { 
  echo "Failed to copy Dockerfile"
  exit 1
}
scp -o ConnectTimeout=5 temp_nginx.conf $SSH_USER@$DROPLET_IP:$REMOTE_DIR/nginx.conf || { 
  echo "Failed to copy nginx.conf"
  exit 1
}
rm temp_dockerfile temp_nginx.conf

echo "🏗️ Building and deploying the dashboard container on the droplet..."
ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 $SSH_USER@$DROPLET_IP "cd $REMOTE_DIR && \
  docker build -t blackbox-dashboard -f Dockerfile.dashboard . && \
  docker-compose stop dashboard || true && \
  docker-compose rm -f dashboard || true && \
  docker-compose up -d dashboard" || { 
  echo "Failed to build and deploy container"
  exit 1
}

echo "⏳ Waiting for the dashboard to start..."
sleep 10

echo "🔍 Checking dashboard status..."
ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 $SSH_USER@$DROPLET_IP "cd $REMOTE_DIR && docker-compose ps dashboard" || { 
  echo "Failed to check dashboard status"
  exit 1
}

echo "🌐 Dashboard URL: http://$DROPLET_IP"
echo ""
echo "✅ Deployment complete!"
echo "You can now access your full-featured BlackBox dashboard at http://$DROPLET_IP"
echo ""
echo "API Keys configured:"
echo "- OpenAI API Key: [CONFIGURED]"
echo "- ElevenLabs API Key: [CONFIGURED]"
echo ""
echo "📝 Note: If you encounter any issues, check the logs with:"
echo "ssh $SSH_USER@$DROPLET_IP \"cd $REMOTE_DIR && docker-compose logs dashboard\""
