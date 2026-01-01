#!/bin/bash

# BlackBox Racing - Deploy Dashboard to Vercel
# Deploys the React dashboard for universal access

echo "🌐 Deploying BlackBox Racing Dashboard to Vercel..."
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Build dashboard
echo "🔨 Building dashboard..."
cd dashboard
npm install
npm run build

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel --prod

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📱 Your dashboard is now accessible from:"
echo "  - Windows PCs"
echo "  - macOS computers"
echo "  - iPads"
echo "  - iPhones"
echo "  - Android devices"
echo "  - Any device with a web browser!"
echo ""
echo "🔗 Dashboard URL: Check the output above for your deployment URL"
echo ""
