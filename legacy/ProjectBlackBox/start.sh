#!/bin/bash
# ============================================================================
# ProjectBlackBox - Quick Start Script
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "============================================"
echo "  ProjectBlackBox - Starting..."
echo "============================================"

# Check for .env file
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  No .env file found. Creating from template...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Please edit .env and add your API keys:${NC}"
    echo "   - OPENAI_API_KEY"
    echo "   - ELEVENLABS_API_KEY"
    echo ""
    echo "Then run this script again."
    exit 1
fi

# Check for required API keys
source .env
if [ -z "$OPENAI_API_KEY" ] || [ "$OPENAI_API_KEY" = "" ]; then
    echo -e "${YELLOW}⚠️  OPENAI_API_KEY not set in .env${NC}"
    echo "   AI coaching features will be disabled."
fi

if [ -z "$ELEVENLABS_API_KEY" ] || [ "$ELEVENLABS_API_KEY" = "" ]; then
    echo -e "${YELLOW}⚠️  ELEVENLABS_API_KEY not set in .env${NC}"
    echo "   Voice synthesis will be disabled."
fi

# Install dependencies if needed
echo ""
echo -e "${GREEN}📦 Checking dependencies...${NC}"

if [ ! -d "server/node_modules" ]; then
    echo "Installing server dependencies..."
    cd server && npm install && cd ..
fi

if [ ! -d "dashboard/node_modules" ]; then
    echo "Installing dashboard dependencies..."
    cd dashboard && npm install && cd ..
fi

# Build server
echo ""
echo -e "${GREEN}🔨 Building server...${NC}"
cd server && npm run build && cd ..

# Start services
echo ""
echo -e "${GREEN}🚀 Starting services...${NC}"
echo ""

# Start server in background
echo "Starting backend server on port 3000..."
cd server && npm run start &
SERVER_PID=$!
cd ..

sleep 2

# Start dashboard
echo "Starting dashboard on port 3001..."
cd dashboard && npm start &
DASHBOARD_PID=$!
cd ..

echo ""
echo "============================================"
echo -e "${GREEN}✅ ProjectBlackBox is running!${NC}"
echo "============================================"
echo ""
echo "  Dashboard:  http://localhost:3001"
echo "  Server:     http://localhost:3000"
echo ""
echo "  Press Ctrl+C to stop all services"
echo ""

# Wait for interrupt
trap "echo ''; echo 'Stopping services...'; kill $SERVER_PID $DASHBOARD_PID 2>/dev/null; exit 0" INT
wait
