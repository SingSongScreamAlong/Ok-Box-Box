# PitBox Droplet Deployment Guide

## 🚀 Quick Start for Your Existing Droplet

Since you already have a DigitalOcean droplet, this is the simplest and most cost-effective way to deploy PitBox.

### Prerequisites

1. **Your DigitalOcean Droplet** (you already have this!)
2. **SSH access** to your droplet
3. **Domain/subdomain** (optional, can use IP address)

### Step 1: Prepare Your Local Machine

```bash
# Navigate to deployment directory
cd /Users/conradweeden/ProjectPitBox/deployment

# Make deployment script executable
chmod +x droplet-deploy.sh

# Set your droplet IP (replace with your actual IP)
export DROPLET_IP=137.184.151.3
export DROPLET_USER=root  # or your username
```

### Step 2: Deploy to Your Droplet

```bash
# Run the deployment script
./droplet-deploy.sh
```

This script will:
- ✅ Test connection to your droplet
- ✅ Install Docker and Docker Compose (if needed)
- ✅ Copy all deployment files to your droplet
- ✅ Start all PitBox services

### Step 3: Configure API Keys

After deployment, SSH to your droplet and configure your API keys:

```bash
# SSH to your droplet
ssh root@68.183.18.151

# Edit the configuration file
cd /opt/pitbox
nano .env
```

Add your API keys:
```bash
# Required API Keys
GRADIENT_AI_API_KEY=your-gradient-ai-key-here
ELEVENLABS_API_KEY=your-elevenlabs-key-here
JWT_SECRET=your-secure-jwt-secret-here
```

### Step 4: Restart Services

```bash
# Restart services to pick up new configuration
docker-compose restart

# Check that everything is running
docker-compose ps
```

### Step 5: Test Your Deployment

Your services will be available at:

- **Backend API**: `http://YOUR_DROPLET_IP:3000`
- **Dashboard**: `http://YOUR_DROPLET_IP:80`
- **WebSocket**: `ws://YOUR_DROPLET_IP:8765`

Test the connection:
```bash
# From your local machine, test the hybrid cloud validator
cd /Users/conradweeden/ProjectPitBox/dashboard
npm run validate:hybrid-cloud
```

## 🔧 Service Management

### View Logs
```bash
# View all service logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f relay-agent
```

### Restart Services
```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### Update Services
```bash
# Pull latest images and restart
docker-compose pull
docker-compose up -d
```

## 🌐 Optional: Set Up Domain

If you want to use a custom domain instead of the IP address:

1. **Point your domain** to your droplet IP in your DNS settings
2. **Update the configuration** in `/opt/pitbox/.env`:
   ```bash
   DOMAIN=yourdomain.com
   ```
3. **Restart services**: `docker-compose restart`

## 📊 Monitoring

### Check Service Status
```bash
docker-compose ps
```

### Resource Usage
```bash
docker stats
```

### Disk Usage
```bash
docker system df
```

## 🔒 Security Notes

- Change default passwords in `.env`
- Consider setting up a firewall
- Use HTTPS in production (SSL certificates)
- Regularly update Docker images

## 🆘 Troubleshooting

### Services Won't Start
```bash
# Check logs for errors
docker-compose logs

# Restart problematic service
docker-compose restart SERVICE_NAME
```

### Can't Connect to Services
- Check firewall settings on your droplet
- Ensure ports 80, 3000, 8765 are open
- Verify services are running: `docker-compose ps`

### Database Issues
```bash
# Reset database (WARNING: This will delete all data)
docker-compose down -v
docker-compose up -d
```

## 💡 Cost Comparison

**Using Your Existing Droplet**: $0 additional cost  
**DigitalOcean App Platform**: ~$60-100/month for all services

Your droplet approach is much more cost-effective!
