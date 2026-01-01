#!/bin/bash
# BlackBox Deployment Preparation Script
# This script prepares the environment for deployment to DigitalOcean

set -e

echo "=== BlackBox Deployment Preparation ==="
echo "This script will prepare your environment for deployment to DigitalOcean"

# Create .env file from template
echo "Creating .env file from template..."
cp .env.droplet.template .env

# Add API keys to .env
echo "Adding API keys to .env file..."
sed -i '' 's/your-elevenlabs-api-key/sk_f92aab2a18dd30b8c5258739d6ff85fc95f4bce6fa1e5fc0/g' .env
sed -i '' 's/your-gradient-ai-api-key/YOUR_OPENAI_API_KEY_HERE/g' .env

# Generate a secure JWT secret
JWT_SECRET=$(openssl rand -base64 32)
sed -i '' "s/your-super-secret-jwt-key-here/$JWT_SECRET/g" .env

# Generate a secure API key
API_KEY=$(openssl rand -base64 24)
sed -i '' "s/your-api-key-for-services/$API_KEY/g" .env

# Generate a secure DB password
DB_PASSWORD=$(openssl rand -base64 16)
sed -i '' "s/blackbox123/$DB_PASSWORD/g" .env

echo "Environment file prepared successfully!"
echo ""
echo "Next steps:"
echo "1. Review the .env file to ensure all values are set correctly"
echo "2. Run the deployment script: ./droplet-deploy.sh"
echo "3. SSH to your droplet and verify the deployment"
echo ""
echo "=== Preparation Complete ==="
