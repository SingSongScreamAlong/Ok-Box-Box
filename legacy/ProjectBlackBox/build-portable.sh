#!/bin/bash

# BlackBox Racing - Build Portable Windows Executable
# This creates a portable .exe that requires no installation

echo "🏎️  Building BlackBox Racing Portable Executable..."
echo ""

# Check if electron-builder is installed
if ! command -v electron-builder &> /dev/null; then
    echo "📦 Installing electron-builder..."
    npm install -g electron-builder
fi

# Build the driver app first
echo "🔨 Building driver app..."
cd driver_app
npm install
npm run build

# Build portable executable
echo "📦 Creating portable executable..."
cd ..
electron-builder --config electron-builder.config.js --win portable

echo ""
echo "✅ Build complete!"
echo ""
echo "📁 Output: dist/BlackBox-Racing-Portable.exe"
echo ""
echo "📝 Next steps:"
echo "  1. Test the portable executable"
echo "  2. Create a GitHub release: gh release create v1.0.0 dist/BlackBox-Racing-Portable.exe"
echo "  3. Users can download and run - no installation required!"
echo ""
