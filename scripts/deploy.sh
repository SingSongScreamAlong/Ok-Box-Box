#!/bin/bash
# Ok, Box Box - Deployment Script

set -e

echo "🏎️ Ok, Box Box - Deployment Script"
echo "=================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if doctl is installed
if ! command -v doctl &> /dev/null; then
    echo -e "${RED}Error: doctl (Digital Ocean CLI) is not installed${NC}"
    echo "Install it from: https://docs.digitalocean.com/reference/doctl/how-to/install/"
    exit 1
fi

# Check if authenticated
if ! doctl account get &> /dev/null; then
    echo -e "${RED}Error: Not authenticated with Digital Ocean${NC}"
    echo "Run: doctl auth init"
    exit 1
fi

echo -e "${GREEN}✓ Digital Ocean CLI authenticated${NC}"

# Build and deploy
echo ""
echo "📦 Building applications..."

# Build API
echo "Building API..."
cd services/api
npm run build
echo -e "${GREEN}✓ API built${NC}"

# Build BlackBox
echo "Building BlackBox..."
cd ../../apps/blackbox
npm run build
echo -e "${GREEN}✓ BlackBox built${NC}"

cd ../..

# Deploy to App Platform
echo ""
echo "🚀 Deploying to Digital Ocean App Platform..."

# Check if app exists
APP_ID=$(doctl apps list --format ID,Spec.Name --no-header | grep okboxbox | awk '{print $1}')

if [ -z "$APP_ID" ]; then
    echo "Creating new app..."
    doctl apps create --spec .do/app.yaml
else
    echo "Updating existing app: $APP_ID"
    doctl apps update $APP_ID --spec .do/app.yaml
fi

echo ""
echo -e "${GREEN}✓ Deployment initiated!${NC}"
echo ""
echo "Monitor deployment at: https://cloud.digitalocean.com/apps"
