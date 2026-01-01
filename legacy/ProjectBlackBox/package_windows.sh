#!/bin/bash

# BlackBox Windows Packaging Script
# This script creates a Windows deployment package

echo "========================================="
echo "   BlackBox Windows Packaging Script"
echo "========================================="
echo ""

# Set package name
PACKAGE_NAME="BlackBox_Windows_$(date +%Y%m%d_%H%M%S)"
PACKAGE_DIR="./${PACKAGE_NAME}"

echo "📦 Creating Windows package: ${PACKAGE_NAME}"
echo ""

# Create package directory
mkdir -p "${PACKAGE_DIR}"

# Copy essential files
echo "📋 Copying files..."

# Core files
cp docker-compose.yml "${PACKAGE_DIR}/" 2>/dev/null || echo "⚠️  docker-compose.yml not found"
cp .env.example "${PACKAGE_DIR}/" 2>/dev/null || echo "⚠️  .env.example not found"

# Windows scripts
cp setup_windows.bat "${PACKAGE_DIR}/" 2>/dev/null || echo "⚠️  setup_windows.bat not found"
cp start_blackbox.ps1 "${PACKAGE_DIR}/" 2>/dev/null || echo "⚠️  start_blackbox.ps1 not found"

# Documentation
cp README_Windows.md "${PACKAGE_DIR}/" 2>/dev/null || echo "⚠️  README_Windows.md not found"
cp API_DOCUMENTATION.md "${PACKAGE_DIR}/" 2>/dev/null || echo "⚠️  API_DOCUMENTATION.md not found"
cp DEVELOPMENT.md "${PACKAGE_DIR}/" 2>/dev/null || echo "⚠️  DEVELOPMENT.md not found"

# Server files
if [ -d "server" ]; then
    echo "📁 Copying server files..."
    cp -r server "${PACKAGE_DIR}/"
else
    echo "⚠️  server directory not found"
fi

# Relay agent files
if [ -d "relay_agent" ]; then
    echo "📁 Copying relay_agent files..."
    cp -r relay_agent "${PACKAGE_DIR}/"
else
    echo "⚠️  relay_agent directory not found"
fi

# Dashboard files
if [ -d "dashboard" ]; then
    echo "📁 Copying dashboard files..."
    cp -r dashboard "${PACKAGE_DIR}/"
else
    echo "⚠️  dashboard directory not found"
fi

# Deployment files
if [ -d "deployment" ]; then
    echo "📁 Copying deployment files..."
    cp -r deployment "${PACKAGE_DIR}/"
else
    echo "⚠️  deployment directory not found"
fi

# Validation files
if [ -d "validation" ]; then
    echo "📁 Copying validation files..."
    cp -r validation "${PACKAGE_DIR}/"
else
    echo "⚠️  validation directory not found"
fi

# Create a .env file with defaults for Windows users
cat > "${PACKAGE_DIR}/.env" << 'EOF'
# BlackBox Environment Configuration for Windows
# Edit these values with your actual API keys

# Database Configuration
PG_CONNECTION_STRING=postgresql://blackbox:blackbox@localhost:5432/blackbox_telemetry
POSTGRES_PASSWORD=blackbox

# Authentication
JWT_SECRET=your-super-secure-jwt-secret-change-this-in-production
JWT_EXPIRES_IN=24h
BCRYPT_ROUNDS=12

# AI Services (REQUIRED - Get from respective services)
OPENAI_API_KEY=your_openai_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# Server Configuration
PORT=4000
NODE_ENV=production

# CORS Configuration
CORS_ORIGIN=http://localhost

# Logging
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Health Checks
HEALTH_DB_TIMEOUT=5000
HEALTH_EXTERNAL_TIMEOUT=10000

# Multi-Driver Configuration
MAX_DRIVERS_PER_SESSION=4
MAX_SESSION_DURATION_MINUTES=480
DRIVER_SWITCH_COOLDOWN_SEC=30

# Performance
ENABLE_COMPRESSION=true
ENABLE_CACHING=true
CACHE_TTL_SEC=300
MAX_PAYLOAD_SIZE=2mb

# Relay Agent Configuration
BACKEND_URL=http://localhost:4000
TELEMETRY_PROTOCOL=websocket
COMPRESS_TELEMETRY=true
MAX_TELEMETRY_RATE=10
EOF

echo "✅ Created .env file with Windows defaults"
echo ""

# Create package info file
cat > "${PACKAGE_DIR}/PACKAGE_INFO.txt" << EOF
BlackBox Windows Deployment Package
===================================

Created: $(date)
Package Version: ${PACKAGE_NAME}

CONTENTS:
--------
✓ setup_windows.bat - Main Windows setup script
✓ start_blackbox.ps1 - PowerShell quick start script
✓ docker-compose.yml - Docker orchestration
✓ .env - Environment configuration (EDIT BEFORE RUNNING)
✓ README_Windows.md - Detailed Windows setup guide
✓ server/ - Backend API server (Node.js)
✓ relay_agent/ - Telemetry collection (Python)
✓ dashboard/ - Web dashboard (React)
✓ API_DOCUMENTATION.md - API reference
✓ DEVELOPMENT.md - Development guide

SYSTEM REQUIREMENTS:
-------------------
- Windows 10/11 (64-bit)
- Docker Desktop (latest)
- 4GB RAM minimum
- 5GB free disk space

QUICK START:
-----------
1. Extract this ZIP file
2. Install Docker Desktop
3. Edit .env file with your API keys
4. Run setup_windows.bat as Administrator
5. Choose option 1 to start BlackBox
6. Open http://localhost in your browser

SUPPORT:
-------
For issues, check the logs using setup_windows.bat option 4
Full documentation: README_Windows.md

Happy Racing! 🏁
EOF

echo "✅ Created package info file"
echo ""

# Create ZIP package
echo "📦 Creating ZIP package..."
if command -v zip >/dev/null 2>&1; then
    zip -r "${PACKAGE_NAME}.zip" "${PACKAGE_DIR}" >/dev/null 2>&1
    PACKAGE_FILE="${PACKAGE_NAME}.zip"
elif command -v tar >/dev/null 2>&1; then
    tar -czf "${PACKAGE_NAME}.tar.gz" "${PACKAGE_DIR}" >/dev/null 2>&1
    PACKAGE_FILE="${PACKAGE_NAME}.tar.gz"
else
    echo "⚠️  Neither zip nor tar available. Package created but not compressed."
    PACKAGE_FILE="${PACKAGE_DIR}"
fi

echo ""
echo "========================================="
echo "   BlackBox Windows Package Created!"
echo "========================================="
echo ""
echo "📦 Package: ${PACKAGE_FILE}"
echo ""
echo "📊 Package Contents:"
find "${PACKAGE_DIR}" -type f | wc -l | xargs echo "   Files:"
du -sh "${PACKAGE_DIR}" 2>/dev/null | cut -f1 | xargs echo "   Size:"
echo ""
echo "📋 What's included:"
echo "   ✅ Windows setup script (setup_windows.bat)"
echo "   ✅ PowerShell script (start_blackbox.ps1)"
echo "   ✅ Docker configuration"
echo "   ✅ Environment template (.env)"
echo "   ✅ Complete documentation (README_Windows.md)"
echo "   ✅ All BlackBox components (server, relay, dashboard)"
echo "   ✅ API documentation"
echo ""
echo "🚀 Ready to send to Windows users!"
echo ""
echo "📧 Instructions for recipient:"
echo "   1. Extract the ZIP file"
echo "   2. Install Docker Desktop"
echo "   3. Edit .env with API keys"
echo "   4. Run setup_windows.bat"
echo "   5. Choose option 1 to start"
echo "   6. Open http://localhost"
echo ""

# Clean up
echo "🧹 Cleaning up temporary files..."
rm -rf "${PACKAGE_DIR}"

echo ""
echo "✅ Packaging complete!"
echo ""
echo "🎉 Your BlackBox Windows package is ready:"
echo "   ${PACKAGE_FILE}"
echo ""
echo "Send this file to your Windows user and they'll be racing in minutes! 🏁"
