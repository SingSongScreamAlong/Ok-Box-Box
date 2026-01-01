# =====================================================================
# BlackBox Racing Multi-Stage Dockerfile
# For DigitalOcean App Platform deployment
# =====================================================================

# Stage 1: Build Server
FROM node:20-alpine AS server-builder

WORKDIR /app/server

# Copy server package files
COPY server/package*.json ./

# Install dependencies
RUN npm ci

# Copy server source
COPY server/tsconfig.json ./
COPY server/src ./src

# Build server
RUN npm run build

# Stage 2: Build Dashboard
FROM node:20-alpine AS dashboard-builder

WORKDIR /app/dashboard

# Copy dashboard package files
COPY dashboard/package*.json ./

# Install dependencies
RUN npm ci

# Copy dashboard source
COPY dashboard/tsconfig.json ./
COPY dashboard/public ./public
COPY dashboard/src ./src

# Build args for API URL
ARG REACT_APP_API_URL
ARG REACT_APP_WS_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_WS_URL=$REACT_APP_WS_URL

# Build dashboard
RUN npm run build

# Stage 3: Production Server
FROM node:20-alpine AS server

WORKDIR /app

# Copy built server
COPY --from=server-builder /app/server/dist ./dist
COPY --from=server-builder /app/server/package*.json ./

# Copy migrations if they exist (optional)
COPY server/migrations/ ./migrations/

# Install production dependencies only
RUN npm ci --only=production

# Set runtime environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start server
CMD ["node", "dist/server.js"]

# Stage 4: Production Dashboard (static files with nginx)
FROM nginx:alpine AS dashboard

# Copy built dashboard
COPY --from=dashboard-builder /app/dashboard/build /usr/share/nginx/html

# Copy nginx config
COPY dashboard/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
