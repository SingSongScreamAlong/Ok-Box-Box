FROM node:18-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache python3 py3-pip postgresql-client

# Create necessary directories
RUN mkdir -p /app/data /app/logs

# Copy package files and install dependencies
COPY ../../local_backend/package*.json ./
RUN npm install --omit=dev

# Copy application code from root-level local_backend directory
COPY ../../local_backend/ ./

# Expose port
EXPOSE 8080

# Start the backend
CMD ["npm", "start"]
