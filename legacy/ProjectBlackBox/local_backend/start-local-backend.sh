#!/bin/bash
# Start the local backend server using .env.local configuration

# Copy .env.local to .env (since .env is gitignored)
cp .env.local .env

# Start the server
echo "Starting BlackBox local backend server on port 3001..."
npm start
