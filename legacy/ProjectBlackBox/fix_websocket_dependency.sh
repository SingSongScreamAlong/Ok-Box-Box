#!/bin/bash

echo "🔧 Fixing relay-agent websocket dependency..."

# Stop running containers
docker compose down 2>/dev/null || true

# Update relay-agent Dockerfile to include websocket-client
mkdir -p deployment/digitalocean/relay-agent
cat > deployment/digitalocean/relay-agent/Dockerfile << 'DOCKERFILE'
FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libopencv-dev \
    && rm -rf /var/lib/apt/lists/*

# Create requirements.txt with ALL needed packages including websocket-client
RUN echo "websockets==11.0.3" > requirements.txt && \
    echo "websocket-client==1.6.4" >> requirements.txt && \
    echo "opencv-python==4.8.1.78" >> requirements.txt && \
    echo "requests==2.31.0" >> requirements.txt && \
    echo "numpy==1.24.3" >> requirements.txt && \
    echo "pillow==10.0.1" >> requirements.txt && \
    echo "psutil==5.9.5" >> requirements.txt && \
    echo "asyncio" >> requirements.txt && \
    echo "json5==0.9.14" >> requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Create necessary directories
RUN mkdir -p /root/BlackBoxRelay/logs /root/BlackBoxRelay/config /root/BlackBoxRelay/data

# Copy application code from relay_agent directory
COPY relay_agent/ .

# Create default configuration inline
RUN echo '{"port": 8081, "host": "0.0.0.0", "debug": false}' > /root/BlackBoxRelay/config/config.json

EXPOSE 8081 8765 8766

CMD ["python", "agent_main.py"]
DOCKERFILE

echo "✅ Updated relay-agent Dockerfile with websocket-client dependency"

echo "🚀 Rebuilding relay-agent service..."
docker compose build --no-cache relay-agent
docker compose up -d

echo "⏳ Waiting for services to initialize..."
sleep 15

echo "📊 Service Status:"
docker compose ps

echo ""
echo "📋 Service Logs:"
docker compose logs --tail=15 relay-agent

echo ""
echo "🎉 BlackBox deployment should now be complete!"
echo "📊 Dashboard: http://64.227.28.10:3000"
echo "🔧 Backend API: http://64.227.28.10:8080"
echo "📡 Relay Agent: http://64.227.28.10:8081"
