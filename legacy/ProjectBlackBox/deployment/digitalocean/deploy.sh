#!/bin/bash
# Deploy the BlackBox application to DigitalOcean App Platform

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

# Set variables
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APP_SPEC_FILE="${PROJECT_ROOT}/deployment/digitalocean/app-spec.yaml"

# Authenticate with DigitalOcean
echo "Authenticating with DigitalOcean..."
doctl auth init -t ${DO_API_TOKEN}

# Check if app exists
APP_EXISTS=$(doctl apps list --format ID --no-header | grep -q "${DO_APP_ID}" && echo "true" || echo "false")

if [ "${APP_EXISTS}" = "true" ]; then
  # Update existing app
  echo "Updating existing app ${DO_APP_ID}..."
  doctl apps update ${DO_APP_ID} --spec ${APP_SPEC_FILE}
else
  # Create new app
  echo "Creating new app..."
  doctl apps create --spec ${APP_SPEC_FILE}
fi

# Get app URL
APP_URL=$(doctl apps list --format DefaultIngress --no-header | head -n 1)
echo "App deployed successfully! Access it at: ${APP_URL}"

# Configure environment variables for the dashboard
echo "Configuring environment variables..."
doctl apps update ${DO_APP_ID} --set-env-vars REACT_APP_API_URL=${APP_URL}/api,REACT_APP_WS_URL=wss://${APP_URL}/ws

echo "Deployment complete!"
