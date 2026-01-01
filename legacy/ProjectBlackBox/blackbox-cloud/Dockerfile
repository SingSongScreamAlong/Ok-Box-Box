FROM node:20-alpine

WORKDIR /app

# Install all dependencies (need devDependencies for TypeScript build)
COPY package*.json ./
RUN npm install

# Build TypeScript
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Run
EXPOSE 3000
CMD ["node", "dist/server.js"]
