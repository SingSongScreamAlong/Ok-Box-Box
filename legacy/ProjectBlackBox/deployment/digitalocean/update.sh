#!/bin/bash
# Update the BlackBox application on DigitalOcean App Platform

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
  # Build and push Docker images
  echo "Building and pushing Docker images..."
  ${PROJECT_ROOT}/deployment/digitalocean/build-and-push.sh
  
  # Update existing app
  echo "Updating app ${DO_APP_ID}..."
  doctl apps update ${DO_APP_ID} --spec ${APP_SPEC_FILE}
  
  # Wait for deployment to complete
  echo "Waiting for deployment to complete..."
  doctl apps get ${DO_APP_ID} --format DeploymentInProgress --no-header | grep -q "true"
  while [ $? -eq 0 ]; do
    echo "Deployment in progress..."
    sleep 10
    doctl apps get ${DO_APP_ID} --format DeploymentInProgress --no-header | grep -q "true"
  done
  
  # Check deployment status
  DEPLOYMENT_STATUS=$(doctl apps get ${DO_APP_ID} --format ActiveDeployment.Phase --no-header)
  if [ "${DEPLOYMENT_STATUS}" = "ACTIVE" ]; then
    echo "Deployment completed successfully!"
  else
    echo "Deployment failed with status: ${DEPLOYMENT_STATUS}"
    echo "Check the logs with: doctl apps logs ${DO_APP_ID}"
    exit 1
  fi
else
  echo "Error: App ${DO_APP_ID} not found"
  echo "Please run deploy.sh first to create the app"
  exit 1
fi

echo "Update complete!"
