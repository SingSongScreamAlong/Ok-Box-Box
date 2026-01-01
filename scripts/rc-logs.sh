#!/bin/bash
# =====================================================================
# RC Logs - View logs from RC Stack
# =====================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

SERVICE="${1:-}"

if [ -n "$SERVICE" ]; then
    echo "📜 Logs for $SERVICE:"
    docker-compose -f docker-compose.rc.yml logs -f "$SERVICE"
else
    echo "📜 Logs for all services (Ctrl+C to exit):"
    docker-compose -f docker-compose.rc.yml logs -f
fi
