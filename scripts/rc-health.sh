#!/bin/bash
# =====================================================================
# RC Health - Check health of all RC services
# =====================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo "🏥 Checking RC Stack Health..."
echo ""

PASS_COUNT=0
FAIL_COUNT=0

check_endpoint() {
    local name="$1"
    local url="$2"
    local expected="${3:-200}"
    
    printf "  %-30s " "$name"
    
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
    
    if [ "$HTTP_CODE" = "$expected" ]; then
        echo "✅ OK ($HTTP_CODE)"
        ((PASS_COUNT++))
    else
        echo "❌ FAIL (got $HTTP_CODE, expected $expected)"
        ((FAIL_COUNT++))
    fi
}

check_container() {
    local name="$1"
    local container="$2"
    
    printf "  %-30s " "$name"
    
    STATUS=$(docker inspect -f '{{.State.Health.Status}}' "$container" 2>/dev/null || echo "not found")
    
    if [ "$STATUS" = "healthy" ]; then
        echo "✅ healthy"
        ((PASS_COUNT++))
    elif [ "$STATUS" = "starting" ]; then
        echo "⏳ starting..."
        ((FAIL_COUNT++))
    else
        echo "❌ $STATUS"
        ((FAIL_COUNT++))
    fi
}

echo "Container Health:"
check_container "PostgreSQL" "rc_postgres"
check_container "Redis" "rc_redis"
check_container "Server" "rc_server"

echo ""
echo "HTTP Endpoints:"
check_endpoint "Health" "http://localhost:3001/api/health"
check_endpoint "Health Ready" "http://localhost:3001/api/health/ready"
check_endpoint "Build Info" "http://localhost:3001/api/dev/diagnostics/build"

echo ""
echo "Dashboard:"
check_endpoint "Dashboard Root" "http://localhost:5173"

echo ""
echo "─────────────────────────────────────────"

if [ $FAIL_COUNT -eq 0 ]; then
    echo "✅ All health checks passed! ($PASS_COUNT/$((PASS_COUNT + FAIL_COUNT)))"
    exit 0
else
    echo "❌ $FAIL_COUNT check(s) failed, $PASS_COUNT passed"
    exit 1
fi
