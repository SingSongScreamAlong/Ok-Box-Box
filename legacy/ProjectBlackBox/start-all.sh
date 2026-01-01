#!/bin/bash

# ProjectBlackBox - Unified Startup Script
# Starts Server and Dashboard for manual verification

# Kill any existing processes on ports 3000 and 3001
lsof -ti:3000,3001 | xargs kill -9 2>/dev/null

echo "🏁 Starting ProjectBlackBox Environment..."
echo "=========================================="

# 1. Start Backend Server
echo "🚀 Starting Backend Server..."
cd server
npm run dev > ../server.log 2>&1 &
SERVER_PID=$!
echo "   Server PID: $SERVER_PID"
cd ..

# 2. Wait for Server Health
echo "⏳ Waiting for Server to be ready..."
sleep 5
while ! curl -s http://localhost:3000/health > /dev/null; do
  echo "   Waiting for localhost:3000..."
  sleep 2
done
echo "✅ Server is UP!"

# 3. Start Dashboard (if needed, assuming it runs on 3001 or is static)
# If dashboard is part of 'server' static files, this might be skipped, 
# but usually it's a separate dev server.
if [ -d "dashboard" ]; then
    echo "📊 Starting Dashboard..."
    cd dashboard
    # Package.json uses 'start' for react-scripts, not 'dev'
    if grep -q '"dev":' package.json; then
        PORT=3001 npm run dev > ../dashboard.log 2>&1 &
    else
        PORT=3001 npm start > ../dashboard.log 2>&1 &
    fi
    DASH_PID=$!
    echo "   Dashboard PID: $DASH_PID"
    cd ..
else
    echo "⚠️ Dashboard directory not found, skipping."
fi

echo ""
echo "=========================================="
echo "✅ Environment Ready!"
echo "   Server API:  http://localhost:3000"
echo "   Dashboard:   http://localhost:3001 (typically)"
echo "=========================================="
echo ""
echo "📝 To test Driver App:"
echo "   1. Open a new terminal"
echo "   2. cd driver_app"
echo "   3. npm start"
echo ""
echo "🛑 Press Ctrl+C to stop all services"

# Wait for user interrupt
trap "kill $SERVER_PID $DASH_PID 2>/dev/null; exit" SIGINT
wait
