# DigitalOcean Deployment for PitBox

This directory contains configuration files and instructions for deploying the PitBox hybrid cloud architecture to DigitalOcean.

## Architecture Overview

The PitBox hybrid cloud architecture consists of the following components:

1. **Cloud Backend (DigitalOcean App Platform)**
   - Relay Agent Service: Processes and distributes telemetry and video data
   - API Service: Provides RESTful endpoints for driver app and dashboard
   - WebSocket Service: Handles real-time communication

2. **AI Agent (DigitalOcean GradientAI)**
   - Driver Coach Agent: Provides real-time feedback to drivers
   - Strategy Assistant: Offers team strategy suggestions
   - Telemetry Analyzer: Processes telemetry data for insights

3. **Database (DigitalOcean Managed Database)**
   - Session Storage: Stores race session data
   - Telemetry Archive: Archives telemetry data for analysis
   - User Management: Handles authentication and authorization

## Deployment Instructions

### Prerequisites

1. DigitalOcean account with appropriate permissions
2. DigitalOcean CLI (`doctl`) installed and configured
3. Docker and Docker Compose installed locally
4. GitHub repository access

### Step 1: Configure Environment Variables

Create a `.env` file in the `deployment/digitalocean` directory with the following variables:

```
DO_APP_ID=your-app-id
DO_API_TOKEN=your-api-token
DO_REGION=nyc1
DB_CONNECTION_STRING=your-db-connection-string
GRADIENT_AI_API_KEY=your-gradient-ai-api-key
ELEVENLABS_API_KEY=your-elevenlabs-api-key
```

### Step 2: Build and Push Docker Images

Run the build script to build and push the Docker images to DigitalOcean Container Registry:

```bash
./build-and-push.sh
```

### Step 3: Deploy to DigitalOcean App Platform

Deploy the application to DigitalOcean App Platform:

```bash
./deploy.sh
```

### Step 4: Configure DNS and SSL

Configure DNS records and SSL certificates for your domain:

```bash
./configure-dns.sh your-domain.com
```

## Monitoring and Maintenance

### Logs

View logs for the deployed application:

```bash
doctl apps logs $DO_APP_ID
```

### Scaling

Scale the application components as needed:

```bash
doctl apps update $DO_APP_ID --spec app-spec.yaml
```

### Updates

Update the deployed application:

```bash
./update.sh
```

## Troubleshooting

### Common Issues

1. **Connection Refused**: Check that the WebSocket service is running and accessible
2. **Authentication Failure**: Verify API keys and tokens are correctly configured
3. **Database Connection Issues**: Check database connection string and network settings

### Support

For additional support, please contact the PitBox development team.
