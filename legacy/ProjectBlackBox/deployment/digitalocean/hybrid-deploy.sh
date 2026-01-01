#!/bin/bash
# Hybrid Cloud Deployment Script for BlackBox
# This script deploys all components of the BlackBox hybrid cloud architecture to DigitalOcean

set -e

# Load environment variables
if [ -f .env ]; then
  echo "Loading environment variables from .env"
  export $(grep -v '^#' .env | xargs)
else
  echo "Error: .env file not found"
  echo "Please create a .env file based on .env.template"
  exit 1
fi

# Check required environment variables
required_vars=("DO_API_TOKEN" "DO_REGION" "OPENAI_API_KEY" "ELEVENLABS_API_KEY" "JWT_SECRET")
for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "Error: Required environment variable $var is not set"
    exit 1
  fi
done

echo "=== BlackBox Hybrid Cloud Deployment ==="
echo "Starting deployment to DigitalOcean..."

# Create app specification from template
echo "Generating app specification..."
envsubst < app-spec.yaml.template > app-spec.yaml

# Check if app exists
if [ -z "$DO_APP_ID" ]; then
  echo "Creating new DigitalOcean App Platform application..."
  DO_APP_ID=$(doctl apps create --spec app-spec.yaml --format ID --no-header)
  echo "App created with ID: $DO_APP_ID"
  
  # Update .env file with app ID
  if grep -q "DO_APP_ID=" .env; then
    sed -i '' "s/DO_APP_ID=.*/DO_APP_ID=$DO_APP_ID/" .env
  else
    echo "DO_APP_ID=$DO_APP_ID" >> .env
  fi
  
  echo "Updated .env file with app ID"
else
  echo "Updating existing DigitalOcean App Platform application..."
  doctl apps update $DO_APP_ID --spec app-spec.yaml
fi

# Deploy the application
echo "Deploying application..."
doctl apps create-deployment $DO_APP_ID

# Wait for deployment to complete
echo "Waiting for deployment to complete..."
status="in_progress"
while [ "$status" = "in_progress" ]; do
  sleep 10
  status=$(doctl apps get-deployment $(doctl apps list-deployments $DO_APP_ID --format ID --no-header | head -n1) --format Progress.Steps.Status --no-header | grep -v "SUCCESS" | wc -l)
  if [ "$status" -eq 0 ]; then
    status="complete"
  else
    echo "Deployment in progress..."
  fi
done

# Get app URL
APP_URL=$(doctl apps get $DO_APP_ID --format DefaultIngress --no-header)
echo "Application deployed successfully!"
echo "App URL: $APP_URL"

# Configure DNS if domain is provided
if [ -n "$DOMAIN" ] && [ -n "$SUBDOMAIN" ]; then
  echo "Configuring DNS for $SUBDOMAIN.$DOMAIN..."
  ./configure-dns.sh
fi

# Update relay agent configuration
echo "Updating relay agent configuration..."
cat > relay-agent/config.json << EOF
{
  "name": "BlackBoxRelay",
  "version": "1.0.0",
  "backend_url": "https://$SUBDOMAIN.$DOMAIN/api",
  "ws_url": "wss://$SUBDOMAIN.$DOMAIN/ws",
  "auth_token": "${JWT_SECRET}",
  "video": {
    "enabled": true,
    "max_resolution": "640x480",
    "max_fps": 15,
    "quality": 80
  },
  "telemetry": {
    "enabled": true,
    "capture_rate": 10,
    "batch_size": 10
  },
  "ai_agent": {
    "enabled": true,
    "url": "https://$SUBDOMAIN.$DOMAIN/ai",
    "api_key": "${GRADIENT_AI_API_KEY}"
  },
  "voice": {
    "enabled": true,
    "provider": "elevenlabs",
    "api_key": "${ELEVENLABS_API_KEY}"
  },
  "log_level": "info"
}
EOF

# Update AI agent configuration
echo "Updating AI agent configuration..."
cat > ai-agent/config.json << EOF
{
  "agent": {
    "name": "BlackBoxAIAgent",
    "version": "1.0.0",
    "log_level": "INFO"
  },
  "server": {
    "host": "0.0.0.0",
    "port": 3000,
    "cors_origins": ["*"]
  },
  "models": {
    "driver_coach": {
      "model_id": "driver-coach-v1",
      "temperature": 0.2,
      "max_tokens": 1024
    },
    "strategy": {
      "model_id": "race-strategy-v1",
      "temperature": 0.3,
      "max_tokens": 2048
    },
    "telemetry": {
      "model_id": "telemetry-analysis-v1",
      "temperature": 0.1,
      "max_tokens": 1024
    }
  },
  "relay_agent": {
    "url": "https://$SUBDOMAIN.$DOMAIN/api",
    "ws_url": "wss://$SUBDOMAIN.$DOMAIN/ws",
    "auth_token": "${JWT_SECRET}"
  },
  "voice": {
    "provider": "elevenlabs",
    "api_key": "${ELEVENLABS_API_KEY}",
    "voice_id": "default",
    "model": "eleven_multilingual_v2"
  },
  "cache": {
    "enabled": true,
    "ttl_seconds": 300,
    "max_size_mb": 100
  },
  "security": {
    "api_key_required": true,
    "rate_limit": {
      "enabled": true,
      "max_requests": 100,
      "window_seconds": 60
    }
  }
}
EOF

# Generate driver app configuration template
echo "Generating driver app configuration template..."
cat > driver-app-config.json << EOF
{
  "serverUrl": "http://localhost:3000",
  "cloudEnabled": true,
  "cloudServerUrl": "https://$SUBDOMAIN.$DOMAIN",
  "fallbackToLocal": true,
  "aiEnabled": true,
  "voiceEnabled": true,
  "voiceSettings": {
    "ttsEnabled": true,
    "sttEnabled": false,
    "voiceId": "default",
    "language": "en-US"
  }
}
EOF

echo "=== Deployment Complete ==="
echo "BlackBox hybrid cloud architecture has been deployed successfully."
echo ""
echo "Next steps:"
echo "1. Configure the driver app with the cloud URL: https://$SUBDOMAIN.$DOMAIN"
echo "2. Enable cloud integration in the driver app settings"
echo "3. Test the connection between the driver app and cloud backend"
echo "4. Configure AI and voice integration as needed"
echo ""
echo "For more information, see the Hybrid Cloud Deployment Guide in the docs directory."
