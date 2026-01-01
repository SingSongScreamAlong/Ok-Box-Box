#!/bin/bash

echo "🔧 Fixing relay-agent for cloud deployment (removing pyirsdk, adding redis)..."

# Navigate to project directory
cd /root/blackboxdriverapp

# Update the relay-agent Dockerfile for cloud deployment (no pyirsdk needed)
cat > deployment/digitalocean/relay-agent/Dockerfile << 'DOCKERFILE_EOF'
FROM python:3.9-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Create requirements.txt with cloud dependencies (no pyirsdk needed)
RUN echo "websockets==11.0.3" > requirements.txt && \
    echo "websocket-client==1.6.4" >> requirements.txt && \
    echo "requests==2.31.0" >> requirements.txt && \
    echo "numpy==1.24.3" >> requirements.txt && \
    echo "pillow==10.0.1" >> requirements.txt && \
    echo "psutil==5.9.5" >> requirements.txt && \
    echo "asyncio" >> requirements.txt && \
    echo "json5==0.9.14" >> requirements.txt && \
    echo "redis==4.5.4" >> requirements.txt && \
    echo "openai==1.3.0" >> requirements.txt && \
    echo "elevenlabs==0.2.24" >> requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Create necessary directories
RUN mkdir -p /root/BlackBoxRelay/logs /root/BlackBoxRelay/config /root/BlackBoxRelay/data

# Copy relay agent source code
COPY relay_agent/ .

# Create default config
RUN echo '{"port": 8081, "host": "0.0.0.0", "debug": false}' > /root/BlackBoxRelay/config/config.json

# Expose port
EXPOSE 8081

# Run the relay agent
CMD ["python", "agent_main.py"]
DOCKERFILE_EOF

echo "✅ Updated Dockerfile for cloud deployment (removed pyirsdk, added redis + AI dependencies)"

# Stop and remove existing containers
echo "🛑 Stopping existing services..."
docker-compose down

# Rebuild only the relay-agent service
echo "🔨 Rebuilding relay-agent for cloud deployment..."
docker-compose build relay-agent

# Start all services
echo "🚀 Starting all services..."
docker-compose up -d

# Wait for services to initialize
echo "⏳ Waiting for services to initialize..."
sleep 15

# Check service status
echo "📊 Service Status:"
docker-compose ps

# Check logs for any errors
echo "📋 Relay Agent Logs:"
docker-compose logs --tail=15 relay-agent

echo ""
echo "🎉 BlackBox cloud deployment fixed!"
echo "📊 Dashboard: http://64.227.28.10:3000"
echo "🔧 Backend API: http://64.227.28.10:8080"
echo "📡 Relay Agent: http://64.227.28.10:8081"
echo ""
echo "✅ Cloud services ready to receive telemetry from your PC and provide AI analysis!"
