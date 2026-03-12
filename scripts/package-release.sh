#!/bin/bash
set -e

# ==========================================
# Ok, Box Box - Release Packaging Script
# Packages Server, App, and Relay Tooling for RC1
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

if [ -d "apps/desktop/release" ] && [ "$(find apps/desktop/release -mindepth 1 -maxdepth 1 | head -n 1)" ]; then
  echo "🖥️  Packaging Desktop Relay..."
  mkdir -p "$RELEASE_DIR/Desktop"
  cp -r apps/desktop/release/* "$RELEASE_DIR/Desktop/"
  (cd "$RELEASE_DIR" && zip -r "OkBoxBox-Desktop-$VERSION.zip" Desktop)
  rm -rf "$RELEASE_DIR/Desktop"
else
  echo "⚠️  Desktop release artifacts not found in apps/desktop/release"
  echo "   Build them with: npm run electron:build --workspace=okboxbox-desktop"
fi

# 2. Package Relay Agent Tooling
echo "🏎️  Packaging Relay Agent Tooling..."
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

# 4. Package App (Static Build)
echo "📊 Packaging App..."
echo "   - Building app..."
(cd apps/app && npm install && npm run build)

mkdir -p "$RELEASE_DIR/App"
cp -r apps/app/dist/* "$RELEASE_DIR/App/"

# Zip App
(cd "$RELEASE_DIR" && zip -r "OkBoxBox-App-$VERSION.zip" App)
rm -rf "$RELEASE_DIR/App"

# 5. Finalize
echo "==========================================="
echo "✅ Packaging Complete!"
echo "📍 Artifacts located in: $RELEASE_DIR"
ls -lh "$RELEASE_DIR"
