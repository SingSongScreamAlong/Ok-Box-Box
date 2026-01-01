FROM node:18-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache python3 py3-pip

# Create directory structure
RUN mkdir -p /app/data /app/models

# Copy package.json and package-lock.json
COPY ai_agent/package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production

# Copy Python requirements
COPY ai_agent/requirements.txt ./

# Install Python dependencies
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy application code
COPY ai_agent/ ./

# Expose the port the app runs on
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PYTHONUNBUFFERED=1

# Command to run the application
CMD ["node", "server.js"]
