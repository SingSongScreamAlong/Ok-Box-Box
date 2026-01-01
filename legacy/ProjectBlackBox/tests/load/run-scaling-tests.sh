#!/bin/bash

# ProjectBlackBox - Automated Scaling Test Runner
# Runs progressive load tests and generates reports

set -e

echo "🏁 ProjectBlackBox Scaling Test Suite"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0.32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}❌ k6 is not installed${NC}"
    echo "Install with: brew install k6"
    echo "Or visit: https://k6.io/docs/getting-started/installation/"
    exit 1
fi

echo -e "${GREEN}✅ k6 is installed${NC}"
echo ""

# Check if server is running
echo "Checking if server is running..."
if curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${GREEN}✅ Server is running${NC}"
else
    echo -e "${RED}❌ Server is not running${NC}"
    echo "Please start the server first:"
    echo "  cd server && npm run dev"
    exit 1
fi

echo ""
echo "======================================"
echo "Test Configuration:"
echo "======================================"
echo "Base URL: http://localhost:3000"
echo "WebSocket URL: ws://localhost:3000"
echo ""

# Create results directory
mkdir -p tests/load/results
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RESULTS_DIR="tests/load/results/${TIMESTAMP}"
mkdir -p "$RESULTS_DIR"

echo "Results will be saved to: $RESULTS_DIR"
echo ""

# Function to run a test
run_test() {
    local test_name=$1
    local test_file=$2
    local vus=$3
    local duration=$4
    
    echo "======================================"
    echo -e "${YELLOW}Running: $test_name${NC}"
    echo "VUs: $vus, Duration: $duration"
    echo "======================================"
    
    k6 run \
        --vus "$vus" \
        --duration "$duration" \
        --out json="$RESULTS_DIR/${test_name}.json" \
        "$test_file" \
        2>&1 | tee "$RESULTS_DIR/${test_name}.log"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $test_name completed successfully${NC}"
    else
        echo -e "${RED}❌ $test_name failed${NC}"
    fi
    
    echo ""
    sleep 5  # Cool down between tests
}

# Test Suite
echo "======================================"
echo "Starting Test Suite"
echo "======================================"
echo ""

# Test 1: Single User Baseline
run_test "01_baseline_1_user" "tests/load/scaling-test.js" 1 "30s"

# Test 2: 5 Concurrent Users
run_test "02_light_load_5_users" "tests/load/scaling-test.js" 5 "1m"

# Test 3: 10 Concurrent Users
run_test "03_moderate_load_10_users" "tests/load/scaling-test.js" 10 "2m"

# Test 4: 20 Concurrent Users
run_test "04_medium_load_20_users" "tests/load/scaling-test.js" 20 "2m"

# Test 5: 50 Concurrent Users
run_test "05_high_load_50_users" "tests/load/scaling-test.js" 50 "3m"

# Test 6: 100 Concurrent Users
run_test "06_very_high_load_100_users" "tests/load/scaling-test.js" 100 "3m"

# Test 7: Progressive Scaling (Full Test)
echo "======================================"
echo -e "${YELLOW}Running: Progressive Scaling Test${NC}"
echo "This test will progressively scale from 1 to 200 users"
echo "======================================"

k6 run \
    --out json="$RESULTS_DIR/07_progressive_scaling.json" \
    tests/load/scaling-test.js \
    2>&1 | tee "$RESULTS_DIR/07_progressive_scaling.log"

echo ""

# Optional: Extreme Scale Tests (commented out by default)
echo "======================================"
echo "Extreme Scale Tests (1000-2000 users)"
echo "======================================"
echo "These tests are disabled by default."
echo "To run them, uncomment the lines in run-scaling-tests.sh"
echo ""

# Uncomment to run extreme tests:
# run_test "08_extreme_1000_users" "tests/load/extreme-scale-test.js" 1000 "5m"
# run_test "09_spike_2000_users" "tests/load/extreme-scale-test.js" 2000 "2m"

# Generate summary report
echo "======================================"
echo "Generating Summary Report"
echo "======================================"

cat > "$RESULTS_DIR/SUMMARY.md" << EOF
# ProjectBlackBox Scaling Test Results

**Test Date**: $(date)
**Results Directory**: $RESULTS_DIR

## Tests Executed

1. Baseline (1 user, 30s)
2. Light Load (5 users, 1m)
3. Moderate Load (10 users, 2m)
4. Medium Load (20 users, 2m)
5. High Load (50 users, 3m)
6. Very High Load (100 users, 3m)
7. Progressive Scaling (1→200 users)

## How to View Results

### Individual Test Logs
\`\`\`bash
cat $RESULTS_DIR/01_baseline_1_user.log
\`\`\`

### JSON Results
\`\`\`bash
cat $RESULTS_DIR/01_baseline_1_user.json | jq
\`\`\`

### Key Metrics to Check

- **http_req_duration**: Response times (p95, p99)
- **http_req_failed**: Error rate
- **telemetry_success_rate**: Telemetry upload success
- **websocket_connections**: WebSocket stability

## Next Steps

1. Review logs for errors
2. Check response times under load
3. Identify bottlenecks
4. Optimize as needed
5. Re-run tests to validate improvements

## Recommendations

- **1-10 users**: Should handle easily with <100ms response times
- **10-50 users**: Target <200ms p95 response times
- **50-100 users**: Target <500ms p95 response times
- **100+ users**: May need horizontal scaling

EOF

echo -e "${GREEN}✅ Summary report generated${NC}"
echo ""

echo "======================================"
echo "Test Suite Complete!"
echo "======================================"
echo ""
echo "Results saved to: $RESULTS_DIR"
echo ""
echo "View summary:"
echo "  cat $RESULTS_DIR/SUMMARY.md"
echo ""
echo "View detailed results:"
echo "  ls -lh $RESULTS_DIR/"
echo ""
