#!/bin/bash

# Exit on error
set -e

# Configuration
REMOTE_USER="root"
REMOTE_HOST="64.227.28.10"  # DigitalOcean server IP
REMOTE_DIR="/opt/blackbox-server"
LOCAL_DIR="./server"

# Domain configuration (for reference)
DOMAIN="blackbox.racing"

# Install Node.js and npm if not already installed
ssh ${REMOTE_USER}@${REMOTE_HOST} "\
  if ! command -v node &> /dev/null; then
    echo 'Installing Node.js...'
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - &&\
    sudo apt-get install -y nodejs
  fi

  # Install PM2 if not already installed
  if ! command -v pm2 &> /dev/null; then
    echo 'Installing PM2...'
    sudo npm install -g pm2
  fi
"

# Create remote directory if it doesn't exist
ssh ${REMOTE_USER}@${REMOTE_HOST} "mkdir -p ${REMOTE_DIR}"

# Install dependencies and build
cd ${LOCAL_DIR}
npm install
npm run build
cd ..

# Sync files to DigitalOcean
echo "Syncing files to server..."
rsync -avz --delete \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='.env' \
  ${LOCAL_DIR}/ \
  ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/

# Set up environment file if it doesn't exist
ssh ${REMOTE_USER}@${REMOTE_HOST} "\
  if [ ! -f ${REMOTE_DIR}/.env ]; then
    echo 'NODE_ENV=production' > ${REMOTE_DIR}/.env
    echo 'DATABASE_URL=postgresql://user:password@localhost:5432/blackbox' >> ${REMOTE_DIR}/.env
    echo 'JWT_SECRET=your_jwt_secret_here' >> ${REMOTE_DIR}/.env
    echo 'Please update the .env file on the server with proper values'
  fi
"

# Install production dependencies
ssh ${REMOTE_USER}@${REMOTE_HOST} "\
  cd ${REMOTE_DIR} && \
  npm install --production
"

# Set up PM2 process
ssh ${REMOTE_USER}@${REMOTE_HOST} "\
  pm2 delete blackbox-server 2> /dev/null || true && \
  cd ${REMOTE_DIR} && \
  NODE_ENV=production pm2 start dist/server.js --name blackbox-server && \
  pm2 save && \
  pm2 startup 2> /dev/null || true
"

echo "Server deployed successfully to ${REMOTE_HOST}"
echo "Please make sure to update the .env file with proper configuration"
