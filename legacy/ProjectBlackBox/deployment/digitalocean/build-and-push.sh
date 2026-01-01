#!/bin/bash
# Build and push Docker images to DigitalOcean Container Registry

# Load environment variables
if [ -f .env ]; then
  source .env
else
  echo "Error: .env file not found"
  exit 1
fi

# Check if doctl is installed
if ! command -v doctl &> /dev/null; then
  echo "Error: doctl is not installed"
  exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
  echo "Error: Docker is not installed"
  exit 1
fi

# Set variables
REGISTRY="registry.digitalocean.com/${DO_REGISTRY_NAME}"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Authenticate with DigitalOcean Container Registry
echo "Authenticating with DigitalOcean Container Registry..."
doctl registry login

# Build and push relay agent image
echo "Building and pushing relay agent image..."
docker build -t ${REGISTRY}/relay-agent:latest -f ${PROJECT_ROOT}/deployment/digitalocean/relay-agent/Dockerfile ${PROJECT_ROOT}
docker push ${REGISTRY}/relay-agent:latest

# Build and push dashboard image
echo "Building and pushing dashboard image..."
docker build -t ${REGISTRY}/dashboard:latest \
  --build-arg REACT_APP_API_URL=${REACT_APP_API_URL} \
  --build-arg REACT_APP_WS_URL=${REACT_APP_WS_URL} \
  -f ${PROJECT_ROOT}/deployment/digitalocean/dashboard/Dockerfile ${PROJECT_ROOT}
docker push ${REGISTRY}/dashboard:latest

# Build and push AI agent image
echo "Building and pushing AI agent image..."
docker build -t ${REGISTRY}/ai-agent:latest -f ${PROJECT_ROOT}/deployment/digitalocean/ai-agent/Dockerfile ${PROJECT_ROOT}
docker push ${REGISTRY}/ai-agent:latest

echo "All images built and pushed successfully!"
