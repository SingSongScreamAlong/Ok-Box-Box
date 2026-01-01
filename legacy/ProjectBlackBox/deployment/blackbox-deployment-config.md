# PitBox Deployment Configuration

## Environment Variables

```
# PitBox Droplet Deployment Configuration

# Database Configuration
DB_PASSWORD=secure_random_password_here

# Authentication
JWT_SECRET=secure_random_jwt_secret_here
API_KEY=secure_random_api_key_here

# AI Services
# Using OpenAI API key instead of GradientAI
GRADIENT_AI_API_KEY=YOUR_OPENAI_API_KEY_HERE
ELEVENLABS_API_KEY=sk_f92aab2a18dd30b8c5258739d6ff85fc95f4bce6fa1e5fc0

# CORS Configuration (for development use *, for production use your domain)
CORS_ORIGIN=*

# Optional: Custom domain configuration
# DOMAIN=yourdomain.com
# SSL_EMAIL=your-email@example.com
```

## Deployment Steps

1. Create a DigitalOcean Droplet:
   - Size: Basic Droplet with 2GB RAM / 1 CPU
   - Region: Choose closest to your location
   - Image: Ubuntu 22.04 LTS
   - Authentication: SSH keys

2. Set environment variables:
   ```bash
   export DROPLET_IP=your-droplet-ip
   export DROPLET_USER=root
   ```

3. Run deployment script:
   ```bash
   cd /Users/conradweeden/ProjectPitBox/deployment
   ./droplet-deploy.sh
   ```

4. Verify deployment:
   ```bash
   ssh $DROPLET_USER@$DROPLET_IP "cd /opt/pitbox && docker-compose ps"
   ```

5. Configure Driver App:
   - Update Cloud Backend URL: http://$DROPLET_IP:3000
   - Update WebSocket URL: ws://$DROPLET_IP:8765

6. Test hybrid cloud connection:
   ```bash
   cd /Users/conradweeden/ProjectPitBox/dashboard
   npm run validate:hybrid-cloud
   ```
