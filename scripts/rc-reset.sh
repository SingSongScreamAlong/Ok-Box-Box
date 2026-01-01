#!/bin/bash
# =====================================================================
# RC Reset - Stop Stack and Wipe All Volumes
# =====================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo "⚠️  This will stop the RC stack and DELETE ALL DATA (postgres, redis)."
read -p "Are you sure? (y/N) " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

echo "🗑️ Resetting Release Candidate Stack..."

docker-compose -f docker-compose.rc.yml down -v

echo "✅ RC Stack reset. All volumes deleted."
