#!/bin/bash

# Exit on error
set -e

# Configuration
REMOTE_USER="root"
REMOTE_HOST="64.227.28.10"  # DigitalOcean server IP
REMOTE_DIR="/var/www/blackbox-dashboard"
LOCAL_DIR="./dashboard/build"

# Domain configuration (for reference)
DOMAIN="blackbox.racing"

# Build the dashboard
cd dashboard
npm run build
cd ..

# Create remote directory if it doesn't exist
ssh ${REMOTE_USER}@${REMOTE_HOST} "mkdir -p ${REMOTE_DIR}"

# Sync build files to DigitalOcean
rsync -avz --delete \
  --exclude='.DS_Store' \
  --exclude='.git' \
  ${LOCAL_DIR}/ \
  ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/

# Set up Nginx configuration
cat << EOF | ssh ${REMOTE_USER}@${REMOTE_HOST} "cat > /etc/nginx/sites-available/blackbox-dashboard"
server {
    listen 80;
    server_name blackbox.racing www.blackbox.racing;

    location / {
        root ${REMOTE_DIR};
        try_files \$uri /index.html;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
    }
}
EOF

# Enable the site
ssh ${REMOTE_USER}@${REMOTE_HOST} "\
    ln -sf /etc/nginx/sites-available/blackbox-dashboard /etc/nginx/sites-enabled/ && \
    nginx -t && \
    systemctl reload nginx
"

echo "Dashboard deployed successfully to ${REMOTE_HOST}"
