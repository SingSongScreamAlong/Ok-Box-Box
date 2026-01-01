#!/bin/bash
# =====================================================================
# RC Up - Start Release Candidate Stack
# =====================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Set build stamp vars
export BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
export GIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
export CACHE_BUST=$(date +%Y%m%d%H%M)

echo "🚀 Starting Release Candidate Stack..."
echo "   Build Time: $BUILD_TIME"
echo "   Git SHA: $GIT_SHA"

# Build and start
docker-compose -f docker-compose.rc.yml up --build -d

echo ""
echo "✅ RC Stack started!"
echo ""
echo "Services:"
echo "  - Server:    http://localhost:3001"
echo "  - Dashboard: http://localhost:5173"
echo "  - Postgres:  localhost:5432"
echo "  - Redis:     localhost:6379"
echo ""
echo "Run './scripts/rc-health.sh' to verify health"
echo "Run './scripts/rc-logs.sh' to view logs"
