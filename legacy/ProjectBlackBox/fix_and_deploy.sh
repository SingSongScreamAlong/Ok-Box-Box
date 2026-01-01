#!/bin/bash

echo "🔧 Fixing BlackBox Dockerfiles and deploying..."

# Stop any running containers
docker compose down 2>/dev/null || true

# Clean up Docker build cache
docker builder prune -f

# Create the corrected relay-agent Dockerfile
mkdir -p deployment/digitalocean/relay-agent
cat > deployment/digitalocean/relay-agent/Dockerfile << 'DOCKERFILE'
FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libopencv-dev \
    && rm -rf /var/lib/apt/lists/*

# Create requirements.txt with common Python packages
RUN echo "websockets==11.0.3" > requirements.txt && \
    echo "opencv-python==4.8.1.78" >> requirements.txt && \
    echo "requests==2.31.0" >> requirements.txt && \
    echo "numpy==1.24.3" >> requirements.txt && \
    echo "pillow==10.0.1" >> requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Create necessary directories
RUN mkdir -p /root/BlackBoxRelay/logs /root/BlackBoxRelay/config /root/BlackBoxRelay/data

# Copy application code from root-level relay_agent directory
COPY ../../relay_agent/ .

# Create default configuration
RUN echo '{"port": 8081, "host": "0.0.0.0", "debug": false}' > /root/BlackBoxRelay/config/config.json

# Expose ports
EXPOSE 8765 8766 8081

# Start the relay agent
CMD ["python", "agent_main.py"]
DOCKERFILE

# Create the corrected backend-engine Dockerfile
mkdir -p deployment/digitalocean/backend-engine
cat > deployment/digitalocean/backend-engine/Dockerfile << 'DOCKERFILE'
FROM node:18-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache python3 py3-pip postgresql-client

# Create necessary directories
RUN mkdir -p /app/data /app/logs

# Copy package files and install dependencies
COPY ../../local_backend/package*.json ./
RUN npm install --omit=dev

# Copy application code from root-level local_backend directory
COPY ../../local_backend/ ./

# Expose port
EXPOSE 8080

# Start the backend
CMD ["npm", "start"]
DOCKERFILE

# Create the corrected dashboard Dockerfile
mkdir -p deployment/digitalocean/dashboard
cat > deployment/digitalocean/dashboard/Dockerfile << 'DOCKERFILE'
FROM node:18-alpine as build

WORKDIR /app

# Copy package files and install dependencies
COPY ../../dashboard/package*.json ./
RUN npm ci

# Copy dashboard source code from root-level dashboard directory
COPY ../../dashboard/ ./

# Build the React app
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built app to nginx
COPY --from=build /app/build /usr/share/nginx/html

# Create nginx configuration inline
RUN echo 'server {' > /etc/nginx/conf.d/default.conf && \
    echo '    listen 80;' >> /etc/nginx/conf.d/default.conf && \
    echo '    server_name localhost;' >> /etc/nginx/conf.d/default.conf && \
    echo '    location / {' >> /etc/nginx/conf.d/default.conf && \
    echo '        root /usr/share/nginx/html;' >> /etc/nginx/conf.d/default.conf && \
    echo '        index index.html index.htm;' >> /etc/nginx/conf.d/default.conf && \
    echo '        try_files $uri $uri/ /index.html;' >> /etc/nginx/conf.d/default.conf && \
    echo '    }' >> /etc/nginx/conf.d/default.conf && \
    echo '    location /api/ {' >> /etc/nginx/conf.d/default.conf && \
    echo '        proxy_pass http://backend-engine:8080/;' >> /etc/nginx/conf.d/default.conf && \
    echo '        proxy_set_header Host $host;' >> /etc/nginx/conf.d/default.conf && \
    echo '        proxy_set_header X-Real-IP $remote_addr;' >> /etc/nginx/conf.d/default.conf && \
    echo '    }' >> /etc/nginx/conf.d/default.conf && \
    echo '}' >> /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
DOCKERFILE

# Create the working docker-compose.yml (without AI agent)
cat > docker-compose.yml << 'COMPOSE'
services:
  backend-engine:
    build:
      context: ./deployment/digitalocean/backend-engine
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
      - PORT=8080
      - OPENAI_API_KEY=YOUR_OPENAI_API_KEY_HERE
      - ELEVENLABS_API_KEY=sk_f92aab2a18dd30b8c5258739d6ff85fc95f4bce6fa1e5fc0
    restart: unless-stopped

  dashboard:
    build:
      context: ./deployment/digitalocean/dashboard
      dockerfile: Dockerfile
    ports:
      - "80:80"
    environment:
      - NODE_ENV=production
      - REACT_APP_API_URL=http://64.227.28.10:8080
      - REACT_APP_WS_URL=ws://64.227.28.10:8080
    depends_on:
      - backend-engine
    restart: unless-stopped

  relay-agent:
    build:
      context: ./deployment/digitalocean/relay-agent
      dockerfile: Dockerfile
    ports:
      - "8081:8081"
      - "8765:8765"
      - "8766:8766"
    environment:
      - NODE_ENV=production
      - PORT=8081
      - OPENAI_API_KEY=YOUR_OPENAI_API_KEY_HERE
      - ELEVENLABS_API_KEY=sk_f92aab2a18dd30b8c5258739d6ff85fc95f4bce6fa1e5fc0
    restart: unless-stopped
COMPOSE

echo "✅ All Dockerfiles and docker-compose.yml updated!"
echo "🚀 Starting BlackBox services..."

# Build and start all services
docker compose up -d --build

echo "⏳ Waiting for services to start..."
sleep 10

# Show service status
echo "📊 Service Status:"
docker compose ps

echo ""
echo "�� Recent logs:"
docker compose logs --tail=20

echo ""
echo "🎉 BlackBox deployment complete!"
echo "📊 Dashboard: http://64.227.28.10"
echo "🔧 Backend API: http://64.227.28.10:8080"
echo "📡 Relay Agent: http://64.227.28.10:8081"
echo ""
echo "To check logs: docker compose logs"
echo "To restart: docker compose restart"
echo "To stop: docker compose down"

