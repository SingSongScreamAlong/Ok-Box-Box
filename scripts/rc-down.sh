#!/bin/bash
# =====================================================================
# RC Down - Stop Release Candidate Stack
# =====================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo "🛑 Stopping Release Candidate Stack..."

docker-compose -f docker-compose.rc.yml down

echo "✅ RC Stack stopped."
