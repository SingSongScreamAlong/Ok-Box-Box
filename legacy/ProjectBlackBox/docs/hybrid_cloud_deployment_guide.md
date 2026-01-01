# PitBox Hybrid Cloud Deployment Guide

This guide provides detailed instructions for deploying the PitBox system in a hybrid cloud architecture using DigitalOcean as the cloud provider, with GradientAI for AI agent capabilities and ElevenLabs for voice integration.

## Architecture Overview

The PitBox hybrid cloud architecture consists of the following components:

1. **Driver App (Local)** - Electron-based application running on the driver's Windows PC
2. **Relay Agent (Cloud)** - Containerized service running on DigitalOcean that relays telemetry and video data
3. **Backend Engine (Cloud)** - Core processing engine running on DigitalOcean that handles data processing and storage
4. **AI Agent (Cloud)** - GradientAI-powered service for real-time driver coaching and analysis
5. **Voice Integration (Hybrid)** - ElevenLabs TTS for cloud-generated voice responses with local playback
6. **Dashboard (Cloud)** - Web-based team dashboard for monitoring and analysis

## Prerequisites

- DigitalOcean account with API access
- GradientAI account with API key
- ElevenLabs account with API key
- Docker and Docker Compose installed locally
- Node.js 18+ installed locally
- Python 3.9+ installed locally

## Configuration Files

### 1. Environment Variables

Create a `.env` file in the `deployment/digitalocean` directory based on the provided `.env.template`:

```bash
# DigitalOcean Configuration
DO_API_TOKEN=your_digitalocean_api_token
DO_APP_ID=your_app_id_if_exists
DO_REGION=nyc1

# Domain Configuration
DOMAIN=your-domain.com
SUBDOMAIN=pitbox

# Container Registry
REGISTRY=registry.digitalocean.com/pitbox

# API Keys
GRADIENT_AI_API_KEY=your_gradient_ai_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key

# Security
JWT_SECRET=your_jwt_secret_key
```

### 2. Driver App Configuration

The driver app configuration is managed through the `AppConfig` class. Key settings for hybrid cloud operation:

- `cloudEnabled`: Set to `true` to use cloud services
- `cloudServerUrl`: URL of the DigitalOcean-hosted backend
- `aiEnabled`: Set to `true` to enable AI agent integration
- `voiceEnabled`: Set to `true` to enable voice feedback

## Deployment Steps

### 1. Build and Push Container Images

Run the build and push script to create and upload container images to DigitalOcean Container Registry:

```bash
cd deployment/digitalocean
./build-and-push.sh
```

### 2. Deploy to DigitalOcean App Platform

Deploy the application stack to DigitalOcean App Platform:

```bash
cd deployment/digitalocean
./deploy.sh
```

### 3. Configure DNS

Set up DNS records for your domain to point to the DigitalOcean App Platform:

```bash
cd deployment/digitalocean
./configure-dns.sh
```

### 4. Configure Relay Agent

Update the relay agent configuration to connect to the cloud backend:

1. Edit `~/PitBoxRelay/config/config.json`
2. Set `backend_url` to your DigitalOcean app URL
3. Restart the relay agent service

### 5. Configure Driver App

1. Launch the driver app
2. Go to Settings > Cloud Configuration
3. Enable cloud integration
4. Enter your DigitalOcean app URL
5. Enable AI and voice integration if desired
6. Save settings and restart the app

## Component-Specific Configuration

### AI Agent Configuration

The AI agent configuration is stored in `deployment/digitalocean/ai-agent/config.json`. Key settings:

- `models`: Configuration for different AI models used by the agent
- `relay_agent`: Connection details for the relay agent
- `voice`: ElevenLabs voice configuration

### Voice Integration

Voice integration uses ElevenLabs for text-to-speech:

1. Obtain an API key from ElevenLabs
2. Configure the API key in the driver app settings
3. Select a voice ID from the available voices
4. Adjust voice settings as needed

## Testing the Deployment

### 1. Test Cloud Connectivity

From the driver app:

1. Go to Settings > Diagnostics
2. Click "Test Cloud Connection"
3. Verify that the connection is successful

### 2. Test AI Agent

1. Start a telemetry session
2. Enable AI feedback
3. Verify that AI feedback is received

### 3. Test Voice Integration

1. Enable voice feedback
2. Verify that voice responses are played correctly

## Troubleshooting

### Cloud Connectivity Issues

- Check that the DigitalOcean app is running
- Verify that the driver app is configured with the correct cloud URL
- Check firewall settings on the local network

### AI Agent Issues

- Verify that the GradientAI API key is valid
- Check AI agent logs in the DigitalOcean dashboard
- Ensure the AI agent container is running

### Voice Integration Issues

- Verify that the ElevenLabs API key is valid
- Check voice cache directory permissions
- Test with a simple voice message

## Updating the Deployment

To update the deployment with new code:

```bash
cd deployment/digitalocean
./update.sh
```

## Monitoring and Logging

- DigitalOcean App Platform provides built-in monitoring and logging
- Additional logs are available in the driver app at `%APPDATA%\PitBox\logs`
- AI agent logs are available in the DigitalOcean dashboard

## Security Considerations

- All API keys should be kept secure and not committed to version control
- JWT authentication is used for all API endpoints
- HTTPS is enforced for all cloud communications
- Rate limiting is enabled on all API endpoints

## Backup and Recovery

- Database backups are automated through DigitalOcean
- Configuration files should be backed up separately
- Driver app data is stored locally and should be backed up regularly

## Conclusion

This hybrid cloud architecture provides a scalable, secure, and modular solution for the PitBox system. By leveraging DigitalOcean for cloud infrastructure, GradientAI for intelligent feedback, and ElevenLabs for voice integration, the system delivers a comprehensive driver coaching and telemetry analysis platform.
