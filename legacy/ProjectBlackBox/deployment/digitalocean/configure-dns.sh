#!/bin/bash
# Configure DNS and SSL for the BlackBox application on DigitalOcean

# Check if domain is provided
if [ -z "$1" ]; then
  echo "Error: Domain name not provided"
  echo "Usage: $0 your-domain.com"
  exit 1
fi

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
DOMAIN=$1
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Authenticate with DigitalOcean
echo "Authenticating with DigitalOcean..."
doctl auth init -t ${DO_API_TOKEN}

# Get app URL
APP_URL=$(doctl apps list --format DefaultIngress --no-header | head -n 1)
if [ -z "${APP_URL}" ]; then
  echo "Error: Could not retrieve app URL"
  exit 1
fi

# Extract app hostname
APP_HOSTNAME=$(echo ${APP_URL} | sed 's/https:\/\///')

# Create domain in DigitalOcean
echo "Creating domain in DigitalOcean..."
doctl domains create ${DOMAIN} || echo "Domain already exists or could not be created"

# Add DNS records
echo "Adding DNS records..."
doctl domains records create ${DOMAIN} --record-type A --record-name @ --record-data $(dig +short ${APP_HOSTNAME} | head -n 1) --record-ttl 3600
doctl domains records create ${DOMAIN} --record-type CNAME --record-name www --record-data ${APP_HOSTNAME} --record-ttl 3600

# Configure custom domain for the app
echo "Configuring custom domain for the app..."
doctl apps update ${DO_APP_ID} --spec <(cat ${PROJECT_ROOT}/deployment/digitalocean/app-spec.yaml | sed "s/routes:/domains: [${DOMAIN}]\n  routes:/")

# Wait for DNS propagation
echo "Waiting for DNS propagation (this may take a few minutes)..."
sleep 60

# Check if SSL certificate is provisioned
echo "Checking SSL certificate status..."
SSL_STATUS=$(doctl apps get ${DO_APP_ID} --format Domains --no-header | grep -q "SSL: Provisioned" && echo "Provisioned" || echo "Pending")

if [ "${SSL_STATUS}" = "Provisioned" ]; then
  echo "SSL certificate provisioned successfully!"
else
  echo "SSL certificate is being provisioned. This may take up to 24 hours."
  echo "Check the status with: doctl apps get ${DO_APP_ID} --format Domains"
fi

echo "DNS and SSL configuration complete!"
echo "Your application will be available at: https://${DOMAIN} and https://www.${DOMAIN}"
