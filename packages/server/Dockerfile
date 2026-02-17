# =====================================================================
# ControlBox Server Dockerfile
# Located at packages/server/Dockerfile for DigitalOcean App Platform
# Build context is repo root (/.app_platform_workspace)
# =====================================================================

FROM node:20-alpine

WORKDIR /app

# Copy package files (root + workspaces the server depends on)
COPY package*.json ./
COPY packages/common/package*.json ./packages/common/
COPY packages/protocol/package*.json ./packages/protocol/
COPY packages/server/package*.json ./packages/server/

# Install all dependencies (need devDependencies for build)
RUN npm ci

# Copy source code for server and its dependencies
COPY tsconfig.base.json ./
COPY packages/common ./packages/common
COPY packages/protocol ./packages/protocol
COPY packages/server ./packages/server

# Build common, protocol, then server
RUN npm run build -w packages/common && \
    npm run build -w packages/protocol && \
    npm run build -w packages/server

# Prune devDependencies after build
RUN npm prune --omit=dev

# Set runtime environment
ENV NODE_ENV=production
ENV PORT=8080

WORKDIR /app/packages/server

EXPOSE 8080

# Start full server - database, auth, API routes, WebSocket
CMD ["node", "dist/index.js"]
