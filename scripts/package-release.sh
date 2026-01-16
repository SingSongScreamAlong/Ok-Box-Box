#!/bin/bash
set -e

# ==========================================
# Ok, Box Box - Release Packaging Script
# Packages Server, Dashboard, and Relay for RC1
# ==========================================

VERSION="v1.0.0-rc1"
RELEASE_DIR="release/$VERSION"
PROJECT_ROOT=$(pwd)

echo "📦 Packaging Ok, Box Box Release: $VERSION"
echo "==========================================="

# 1. Prepare Release Directory
echo "📂 Creating release directory: $RELEASE_DIR"
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"

# 2. Package Relay Agent
echo "🏎️  Packaging Relay Agent..."
mkdir -p "$RELEASE_DIR/Relay-Agent"

# In a real CI env, we'd run the Windows build here.
# Since we are on Mac, we assume the user might have built artifacts or we verify source.
# For RC1 instructions, we bundle the source/tools so the user can 'install.bat'.
cp -r tools/relay-agent/* "$RELEASE_DIR/Relay-Agent/"
# Cleanup dev files from package
rm -rf "$RELEASE_DIR/Relay-Agent/venv" "$RELEASE_DIR/Relay-Agent/__pycache__" "$RELEASE_DIR/Relay-Agent/build" "$RELEASE_DIR/Relay-Agent/dist"

# Create a friendly README for the Release
cat > "$RELEASE_DIR/Relay-Agent/READ_ME_FIRST.txt" <<EOF
Ok, Box Box Relay Agent ($VERSION)
=====================================

HOW TO RUN:
1. Double-click 'install.bat' to set up.
2. Double-click 'run.bat' to start.

Requires: Python 3.7+
EOF

# Zip Relay
(cd "$RELEASE_DIR" && zip -r "OkBoxBox-Relay-$VERSION.zip" Relay-Agent)
rm -rf "$RELEASE_DIR/Relay-Agent"

# 3. Package Server (Source + Dist)
echo "🖥️  Packaging Server..."
# Build server to ensure it compiles
echo "   - Building server..."
(cd packages/server && npm install && npm run build)

mkdir -p "$RELEASE_DIR/Server"
cp packages/server/package.json "$RELEASE_DIR/Server/"
cp -r packages/server/dist "$RELEASE_DIR/Server/dist"
cp -r packages/server/src "$RELEASE_DIR/Server/src" # Include src for db migrations/seeds if needed
cp .env.example "$RELEASE_DIR/Server/.env"

# Create Server Start Script
cat > "$RELEASE_DIR/Server/start_server.sh" <<EOF
#!/bin/bash
npm install --production
node dist/index.js
EOF
chmod +x "$RELEASE_DIR/Server/start_server.sh"

# Zip Server
(cd "$RELEASE_DIR" && zip -r "OkBoxBox-Server-$VERSION.zip" Server)
rm -rf "$RELEASE_DIR/Server"

# 4. Package Dashboard (Static Build)
echo "📊 Packaging Dashboard..."
echo "   - Building dashboard..."
(cd packages/dashboard && npm install && npm run build)

mkdir -p "$RELEASE_DIR/Dashboard"
cp -r packages/dashboard/dist/* "$RELEASE_DIR/Dashboard/"

# Zip Dashboard
(cd "$RELEASE_DIR" && zip -r "OkBoxBox-Dashboard-$VERSION.zip" Dashboard)
rm -rf "$RELEASE_DIR/Dashboard"

# 5. Finalize
echo "==========================================="
echo "✅ Packaging Complete!"
echo "📍 Artifacts located in: $RELEASE_DIR"
ls -lh "$RELEASE_DIR"
