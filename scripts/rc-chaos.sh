#!/bin/bash
# =====================================================================
# RC Chaos - Run chaos/failover scenarios
# =====================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo "🌩️ RC Chaos Test - Gateway Failover"
echo ""

SCENARIO="${1:-failover}"

case "$SCENARIO" in
    failover)
        echo "Scenario: Kill primary server, verify system recovery"
        echo ""
        
        # Check initial health
        echo "1. Checking initial health..."
        if ! ./scripts/rc-health.sh; then
            echo "❌ Stack not healthy. Run './scripts/rc-up.sh' first."
            exit 1
        fi
        
        echo ""
        echo "2. Killing server container..."
        docker kill rc_server
        
        echo ""
        echo "3. Waiting 5 seconds..."
        sleep 5
        
        echo ""
        echo "4. Restarting server..."
        docker-compose -f docker-compose.rc.yml up -d server
        
        echo ""
        echo "5. Waiting for recovery (30s)..."
        sleep 30
        
        echo ""
        echo "6. Verifying health..."
        if ./scripts/rc-health.sh; then
            echo ""
            echo "✅ CHAOS TEST PASSED: Server recovered successfully"
            exit 0
        else
            echo ""
            echo "❌ CHAOS TEST FAILED: Server did not recover"
            exit 1
        fi
        ;;
        
    db-kill)
        echo "Scenario: Kill database, verify graceful degradation"
        echo ""
        
        echo "1. Killing postgres container..."
        docker kill rc_postgres
        
        echo ""
        echo "2. Waiting 5 seconds..."
        sleep 5
        
        echo ""
        echo "3. Checking server response..."
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3001/api/health" 2>/dev/null || echo "000")
        
        if [ "$HTTP_CODE" = "503" ] || [ "$HTTP_CODE" = "500" ]; then
            echo "   Server returning $HTTP_CODE (expected during DB outage)"
        fi
        
        echo ""
        echo "4. Restarting postgres..."
        docker-compose -f docker-compose.rc.yml up -d postgres
        
        echo ""
        echo "5. Waiting for recovery (30s)..."
        sleep 30
        
        echo ""
        echo "6. Verifying health..."
        if ./scripts/rc-health.sh; then
            echo ""
            echo "✅ CHAOS TEST PASSED: System recovered from DB outage"
            exit 0
        else
            echo ""
            echo "❌ CHAOS TEST FAILED: System did not recover"
            exit 1
        fi
        ;;
        
    *)
        echo "Usage: $0 [failover|db-kill]"
        echo ""
        echo "Scenarios:"
        echo "  failover  - Kill and restart server"
        echo "  db-kill   - Kill and restart database"
        exit 1
        ;;
esac
