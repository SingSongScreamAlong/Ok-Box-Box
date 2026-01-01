# PitBox Hybrid Cloud Deployment Guide

## Overview

This guide will walk you through the complete process of deploying the PitBox hybrid cloud system to DigitalOcean. By following these steps, you'll complete the final 5% of your hybrid cloud migration.

## Prerequisites

- DigitalOcean account with access to create Droplets
- SSH key added to your DigitalOcean account
- Terminal access on your local machine
- Git repository cloned locally

## Deployment Steps

### Step 1: Prepare Your Environment

First, run the preparation script to set up your environment variables and API keys:

```bash
cd /Users/conradweeden/ProjectPitBox/deployment
./prepare-deployment.sh
```

This script will:
- Create a `.env` file from the template
- Add your OpenAI and ElevenLabs API keys
- Generate secure random values for JWT secret, API key, and database password

### Step 2: Review Environment Configuration

Open the generated `.env` file to verify all values are set correctly:

```bash
nano .env
```

Ensure the following values are properly set:
- `ELEVENLABS_API_KEY`: Your ElevenLabs API key
- `GRADIENT_AI_API_KEY`: Your OpenAI API key (used for AI coaching)
- `JWT_SECRET`: A secure random string for JWT authentication
- `API_KEY`: A secure random string for internal service authentication
- `DB_PASSWORD`: A secure random string for the PostgreSQL database

### Step 3: Configure Deployment Target

Set your DigitalOcean Droplet IP and user:

```bash
export DROPLET_IP=your-droplet-ip
export DROPLET_USER=root  # or your custom user if configured
```

### Step 4: Run the Deployment Script

Execute the deployment script to deploy to your DigitalOcean Droplet:

```bash
./droplet-deploy.sh
```

This script will:
- Test the connection to your Droplet
- Install Docker and Docker Compose if needed
- Copy all necessary files to your Droplet
- Configure the environment
- Start all PitBox services

### Step 5: Verify Deployment

After deployment completes, verify that all services are running:

```bash
ssh $DROPLET_USER@$DROPLET_IP "cd /opt/pitbox && docker-compose ps"
```

You should see all services (postgres, backend, dashboard, relay-agent, ai-agent, nginx) running.

### Step 6: Test the Hybrid Cloud Connection

Run the validation script to test the connection between your local driver app and the cloud backend:

```bash
cd /Users/conradweeden/ProjectPitBox/dashboard
npm run validate:hybrid-cloud
```

This will test the WebSocket connection to your cloud backend and verify that data can be transmitted successfully.

### Step 7: Configure Your Driver App

Update your local driver app configuration to point to your new cloud backend:

1. Open the driver app settings
2. Set the Cloud Backend URL to: `http://$DROPLET_IP:3000`
3. Set the WebSocket URL to: `ws://$DROPLET_IP:8765`
4. Save the configuration and restart the driver app

### Step 8: Test End-to-End Functionality

1. Start the driver app
2. Connect to iRacing (or use the simulation mode)
3. Verify that telemetry data is being sent to the cloud backend
4. Open the dashboard at `http://$DROPLET_IP` to monitor the data
5. Test the AI coaching functionality

## Troubleshooting

### Connection Issues

If you experience connection issues:

1. Verify that all services are running:
   ```bash
   ssh $DROPLET_USER@$DROPLET_IP "cd /opt/pitbox && docker-compose ps"
   ```

2. Check service logs:
   ```bash
   ssh $DROPLET_USER@$DROPLET_IP "cd /opt/pitbox && docker-compose logs -f backend"
   ssh $DROPLET_USER@$DROPLET_IP "cd /opt/pitbox && docker-compose logs -f relay-agent"
   ```

3. Ensure firewall rules allow traffic on ports 3000, 8765, and 80:
   ```bash
   ssh $DROPLET_USER@$DROPLET_IP "ufw status"
   ```

### API Key Issues

If API services aren't working:

1. Verify API keys in the `.env` file:
   ```bash
   ssh $DROPLET_USER@$DROPLET_IP "cd /opt/pitbox && cat .env"
   ```

2. Restart services to apply changes:
   ```bash
   ssh $DROPLET_USER@$DROPLET_IP "cd /opt/pitbox && docker-compose restart"
   ```

## Maintenance

### Updating the Deployment

To update your deployment with new code:

```bash
cd /Users/conradweeden/ProjectPitBox/deployment
./droplet-deploy.sh
```

### Monitoring Logs

To monitor logs from your services:

```bash
ssh $DROPLET_USER@$DROPLET_IP "cd /opt/pitbox && docker-compose logs -f"
```

### Backing Up Data

To back up your PostgreSQL database:

```bash
ssh $DROPLET_USER@$DROPLET_IP "cd /opt/pitbox && docker-compose exec postgres pg_dump -U pitbox -d pitbox > backup.sql"
```

## Conclusion

Congratulations! You've successfully completed the PitBox hybrid cloud migration. Your system now has:

- ✅ Local driver app for low-latency data collection
- ✅ Relay agent for data streaming and processing
- ✅ Cloud backend for AI processing and storage
- ✅ Dashboard for monitoring and team coordination
- ✅ AI coaching with voice feedback

Enjoy your fully functional hybrid cloud racing telemetry and coaching system!
