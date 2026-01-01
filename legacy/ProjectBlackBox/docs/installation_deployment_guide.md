# PitBox Hybrid Cloud System - Installation & Deployment Guide

## Table of Contents
1. [System Requirements](#system-requirements)
2. [Local Installation](#local-installation)
3. [Production Deployment](#production-deployment)
4. [Configuration Reference](#configuration-reference)
5. [Troubleshooting](#troubleshooting)
6. [Maintenance](#maintenance)

## System Requirements

### Driver App (Windows)
- **Operating System**: Windows 10/11 (64-bit)
- **CPU**: Intel Core i5 or equivalent (i7 recommended)
- **RAM**: 8GB minimum (16GB recommended)
- **Storage**: 500MB free space
- **Network**: Stable internet connection (5Mbps+ upload speed)
- **Software**: iRacing subscription and installation

### Relay Agent
- **Operating System**: Windows 10/11 (64-bit)
- **Python**: 3.8+ with pip
- **RAM**: 4GB minimum
- **Storage**: 200MB free space
- **Network**: Stable internet connection

### Dashboard (Development)
- **Operating System**: Any (Windows, macOS, Linux)
- **Node.js**: v16+ with npm
- **RAM**: 4GB minimum
- **Storage**: 1GB free space
- **Browser**: Chrome, Firefox, or Edge

### Cloud Backend (Production)
- **DigitalOcean Account**: App Platform or Droplet
- **Docker**: Latest version with docker-compose
- **Domain Name**: For production deployment
- **API Keys**: OpenAI and ElevenLabs accounts

## Local Installation

### Step 1: Clone Repository

```bash
git clone https://github.com/SingSongScreamAlong/pitboxdriverapp.git
cd pitboxdriverapp
```

### Step 2: Install Driver App

```bash
# Navigate to driver_app directory
cd driver_app

# Install dependencies
npm install

# Build the application
npm run build

# Start the application in development mode
npm start

# For production build (creates Windows installer)
npm run make
```

### Step 3: Install Relay Agent

```bash
# Navigate to relay_agent directory
cd relay_agent

# Create and activate virtual environment
python -m venv relay_agent_venv
source relay_agent_venv/bin/activate  # Windows: relay_agent_venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the relay agent
python agent_main.py
```

### Step 4: Install Dashboard

```bash
# Navigate to dashboard directory
cd dashboard

# Install dependencies
npm install

# Start development server
npm start
```

### Step 5: Configure API Keys

1. Create a file named `.env` in the project root with the following content:

```
OPENAI_API_KEY=your_openai_key
ELEVENLABS_API_KEY=your_elevenlabs_key
```

2. Restart all services to apply the configuration.

## Production Deployment

### Option 1: DigitalOcean App Platform

#### Prerequisites
- DigitalOcean account
- doctl CLI installed and authenticated
- API keys for OpenAI and ElevenLabs

#### Step 1: Configure Deployment

1. Navigate to the deployment directory:

```bash
cd deployment/digitalocean
```

2. Create configuration file:

```bash
cp config.env.example config.env
```

3. Edit `config.env` with your API keys:

```
OPENAI_API_KEY=your_openai_key
ELEVENLABS_API_KEY=your_elevenlabs_key
```

#### Step 2: Deploy to DigitalOcean

```bash
# Run the deployment script
./deploy-dashboard-solution.sh
```

This script:
1. Builds the dashboard locally
2. Copies the build to the DigitalOcean droplet
3. Builds and runs the Docker container on the droplet

#### Step 3: Configure DNS

1. Get your app URL from DigitalOcean App Platform dashboard
2. Add a CNAME record in your DNS provider:
   - Name: `pitbox` (or your preferred subdomain)
   - Value: Your DigitalOcean app URL
   - TTL: 3600 (or as recommended by your DNS provider)

#### Step 4: Verify Deployment

1. Wait for DNS propagation (may take up to 24 hours)
2. Access your dashboard at `https://your-subdomain.your-domain.com`
3. Verify all components are working correctly

### Option 2: Docker Compose on DigitalOcean Droplet

#### Prerequisites
- DigitalOcean account
- SSH key added to DigitalOcean
- API keys for OpenAI and ElevenLabs

#### Step 1: Create Droplet

```bash
doctl compute droplet create pitbox-server \
  --image docker-20-04 \
  --size s-2vcpu-4gb \
  --region nyc1 \
  --ssh-keys your-ssh-key-id
```

#### Step 2: SSH to Droplet

```bash
doctl compute ssh pitbox-server
```

#### Step 3: Clone Repository and Configure

```bash
# Clone repository
git clone https://github.com/SingSongScreamAlong/pitboxdriverapp.git
cd pitboxdriverapp

# Configure environment
cd deployment/digitalocean
cp config.env.example config.env
nano config.env  # Edit with your API keys
```

#### Step 4: Deploy with Docker Compose

```bash
# Build and start containers
docker-compose up -d
```

#### Step 5: Configure Nginx and SSL

```bash
# Install Certbot
apt-get update
apt-get install -y certbot python3-certbot-nginx

# Configure Nginx
cp nginx-config.example /etc/nginx/sites-available/pitbox
ln -s /etc/nginx/sites-available/pitbox /etc/nginx/sites-enabled/
nano /etc/nginx/sites-available/pitbox  # Edit with your domain

# Obtain SSL certificate
certbot --nginx -d your-domain.com

# Restart Nginx
systemctl restart nginx
```

#### Step 6: Verify Deployment

1. Access your dashboard at `https://your-domain.com`
2. Verify all components are working correctly

### Option 3: Windows Server Deployment

For teams that prefer an on-premises solution:

#### Prerequisites
- Windows Server 2019 or newer
- Administrator access
- IIS installed
- Node.js and Python installed

#### Step 1: Install Prerequisites

```powershell
# Install Chocolatey
Set-ExecutionPolicy Bypass -Scope Process -Force
iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))

# Install Node.js and Python
choco install nodejs-lts python -y
```

#### Step 2: Clone Repository

```powershell
# Clone repository
git clone https://github.com/SingSongScreamAlong/pitboxdriverapp.git
cd pitboxdriverapp
```

#### Step 3: Configure and Build

```powershell
# Configure environment
Copy-Item .env.example .env
# Edit .env with your API keys

# Build dashboard
cd dashboard
npm install
npm run build

# Set up Relay Agent
cd ..\relay_agent
python -m venv relay_agent_venv
.\relay_agent_venv\Scripts\Activate
pip install -r requirements.txt
```

#### Step 4: Configure IIS

1. Open IIS Manager
2. Create a new website:
   - Site name: PitBox Dashboard
   - Physical path: `C:\path\to\pitboxdriverapp\dashboard\build`
   - Binding: Your preferred hostname and port
3. Set up URL Rewrite for SPA routing

#### Step 5: Set Up Windows Services

1. Install nssm (Non-Sucking Service Manager):
   ```powershell
   choco install nssm -y
   ```

2. Create service for Relay Agent:
   ```powershell
   nssm install PitBoxRelayAgent "C:\path\to\pitboxdriverapp\relay_agent\relay_agent_venv\Scripts\python.exe" "C:\path\to\pitboxdriverapp\relay_agent\agent_main.py"
   nssm set PitBoxRelayAgent AppDirectory "C:\path\to\pitboxdriverapp\relay_agent"
   nssm start PitBoxRelayAgent
   ```

## Configuration Reference

### Driver App Configuration

File: `driver_app/src/config/AppConfig.ts`

```typescript
export const AppConfig = {
  // Relay Agent connection
  relayAgent: {
    url: "ws://localhost:8765",
    reconnectInterval: 5000,
    maxReconnectAttempts: 10
  },
  
  // Cloud backend
  cloud: {
    enabled: true,
    endpoint: "https://your-domain.com/api",
    fallbackToLocal: true
  },
  
  // AI coaching settings
  aiCoach: {
    enabled: true,
    feedbackFrequency: "medium", // "low", "medium", "high"
    focusAreas: ["braking", "racingLine", "consistency"],
    skillLevel: "intermediate" // "beginner", "intermediate", "advanced"
  },
  
  // Voice settings
  voice: {
    ttsEnabled: true,
    sttEnabled: true,
    voiceId: "en-US-Neural2-F",
    volume: 0.8,
    speed: 1.0,
    wakeWord: "PitBox"
  },
  
  // Video capture
  video: {
    enabled: false,
    quality: "medium", // "low", "medium", "high"
    frameRate: 15,
    captureInterval: 5000 // ms
  },
  
  // Logging
  logging: {
    level: "info", // "debug", "info", "warn", "error"
    console: true,
    file: true,
    maxFileSize: 10 * 1024 * 1024 // 10MB
  }
};
```

### Relay Agent Configuration

File: `relay_agent/config/config.json`

```json
{
  "websocket": {
    "host": "0.0.0.0",
    "port": 8765,
    "maxConnections": 10,
    "pingInterval": 30
  },
  
  "cloud": {
    "enabled": true,
    "endpoint": "https://your-domain.com/api",
    "apiKey": "your_api_key",
    "retryInterval": 5,
    "maxRetries": 3
  },
  
  "telemetry": {
    "sampleRate": 10,
    "bufferSize": 1000,
    "compressData": true
  },
  
  "video": {
    "enabled": false,
    "encoder": "h264",
    "quality": 23,
    "frameRate": 15,
    "resolution": "720p"
  },
  
  "logging": {
    "level": "info",
    "file": "relay_agent.log",
    "maxSize": 10485760,
    "backupCount": 3
  }
}
```

### Dashboard Configuration

File: `dashboard/.env`

```
REACT_APP_WEBSOCKET_URL=wss://your-domain.com/ws
REACT_APP_API_URL=https://your-domain.com/api
REACT_APP_VERSION=1.0.0
REACT_APP_TELEMETRY_THROTTLE=100
REACT_APP_USE_WEBWORKER=true
```

### DigitalOcean Deployment Configuration

File: `deployment/digitalocean/app-spec-working.yaml`

```yaml
name: pitbox-hybrid-cloud
region: nyc
services:
  - name: dashboard
    github:
      repo: SingSongScreamAlong/pitboxdriverapp
      branch: main
      deploy_on_push: true
    build_command: cd dashboard && npm install && npm run build
    run_command: cd dashboard && npx serve -s build
    envs:
      - key: REACT_APP_WEBSOCKET_URL
        value: ${_self.PRIVATE_URL}/ws
      - key: REACT_APP_API_URL
        value: ${_self.PRIVATE_URL}/api
      - key: OPENAI_API_KEY
        value: ${openai.API_KEY}
      - key: ELEVENLABS_API_KEY
        value: ${elevenlabs.API_KEY}
    http_port: 3000
    routes:
      - path: /
  
  - name: api
    github:
      repo: SingSongScreamAlong/pitboxdriverapp
      branch: main
      deploy_on_push: true
    build_command: cd relay_agent && pip install -r requirements.txt
    run_command: cd relay_agent && python cloud_server.py
    envs:
      - key: PORT
        value: "8080"
      - key: OPENAI_API_KEY
        value: ${openai.API_KEY}
      - key: ELEVENLABS_API_KEY
        value: ${elevenlabs.API_KEY}
    http_port: 8080
    routes:
      - path: /api
      - path: /ws
```

## Troubleshooting

### Common Issues and Solutions

#### Driver App Not Connecting to Relay Agent

**Symptoms:**
- "Connection Failed" error in Driver App
- No telemetry data displayed

**Solutions:**
1. Verify Relay Agent is running (`python agent_main.py`)
2. Check WebSocket URL in AppConfig.ts (default: ws://localhost:8765)
3. Check firewall settings (allow port 8765)
4. Restart Relay Agent and Driver App

#### Dashboard Not Receiving Data

**Symptoms:**
- Dashboard shows "Connecting..." indefinitely
- No telemetry data displayed

**Solutions:**
1. Verify WebSocket URL in dashboard configuration
2. Check browser console for connection errors
3. Verify Relay Agent is running and accessible
4. Check network connectivity between components

#### DigitalOcean Deployment Failures

**Symptoms:**
- Deployment script fails
- App Platform shows build errors

**Solutions:**
1. Check API keys in config.env
2. Verify app-spec.yaml syntax
3. Try alternative deployment method (Docker on Droplet)
4. Check DigitalOcean status page for service issues

#### Docker Build Errors

**Symptoms:**
- Docker build fails with npm errors
- Missing dependencies

**Solutions:**
1. Use `npm install` instead of `npm ci` in Dockerfile
2. Verify package.json and package-lock.json are in sync
3. Check for Node.js version compatibility
4. Increase Docker memory allocation

### Diagnostic Tools

#### Connection Tester

```bash
# Test WebSocket connection
cd validation
python test_websocket_connection.py --url ws://localhost:8765
```

#### Log Analyzer

```bash
# Analyze relay agent logs
cd validation
python analyze_logs.py --file ../relay_agent/relay_agent.log
```

#### System Validator

```bash
# Validate full system
cd validation
python validate_system.py --config ../config/validation.json
```

## Maintenance

### Backup Procedures

#### Database Backup

```bash
# Backup PostgreSQL database
pg_dump -U postgres -d pitbox > backup/pitbox_db_$(date +%Y%m%d).sql
```

#### Configuration Backup

```bash
# Backup all configuration files
mkdir -p backup/config_$(date +%Y%m%d)
cp driver_app/src/config/AppConfig.ts backup/config_$(date +%Y%m%d)/
cp relay_agent/config/config.json backup/config_$(date +%Y%m%d)/
cp dashboard/.env backup/config_$(date +%Y%m%d)/
```

### Update Procedures

#### Driver App Update

```bash
# Update Driver App
cd driver_app
git pull
npm install
npm run build
npm run make  # Create new installer
```

#### Relay Agent Update

```bash
# Update Relay Agent
cd relay_agent
git pull
source relay_agent_venv/bin/activate
pip install -r requirements.txt
```

#### Dashboard Update

```bash
# Update Dashboard
cd dashboard
git pull
npm install
npm run build
```

#### Cloud Backend Update

```bash
# Update Cloud Backend on DigitalOcean
cd deployment/digitalocean
./update-backend.sh
```

### Monitoring

#### Health Checks

```bash
# Check system health
cd validation
python health_check.py --all
```

#### Performance Monitoring

```bash
# Monitor system performance
cd validation
python performance_monitor.py --interval 60
```

#### Log Rotation

Logs are automatically rotated based on configuration:

- Driver App: 10MB max file size, 3 backup files
- Relay Agent: 10MB max file size, 3 backup files
- Dashboard: Managed by hosting platform

### Security Updates

1. Regularly update dependencies:
   ```bash
   # Update npm dependencies
   npm audit fix
   
   # Update Python dependencies
   pip install --upgrade -r requirements.txt
   ```

2. Rotate API keys regularly:
   - Generate new OpenAI and ElevenLabs API keys
   - Update configuration files
   - Restart services

3. Update SSL certificates:
   ```bash
   # Renew Let's Encrypt certificates
   certbot renew
   ```
