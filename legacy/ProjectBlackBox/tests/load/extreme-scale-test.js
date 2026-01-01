/**
 * Extreme Scale Test - 1000-2000 Concurrent Users
 * WARNING: This test is very intensive and should only be run on production-grade infrastructure
 * 
 * Usage:
 *   k6 run --vus 1000 --duration 5m extreme-scale-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

// Custom metrics
const successRate = new Rate('success_rate');
const responseTime = new Trend('response_time');
const activeConnections = new Gauge('active_connections');
const totalRequests = new Counter('total_requests');
const errors = new Counter('errors');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
    scenarios: {
        // Scenario 1: Ramp to 1000 users
        ramp_to_1000: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '2m', target: 100 },
                { duration: '2m', target: 500 },
                { duration: '2m', target: 1000 },
                { duration: '5m', target: 1000 },  // Hold at 1000
                { duration: '2m', target: 0 },
            ],
            gracefulRampDown: '30s',
        },

        // Scenario 2: Spike test - sudden load
        spike_test: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '10s', target: 0 },
                { duration: '10s', target: 2000 },  // Sudden spike
                { duration: '1m', target: 2000 },   // Hold
                { duration: '10s', target: 0 },
            ],
            startTime: '15m', // Start after ramp test
        },
    },
    thresholds: {
        http_req_duration: ['p(95)<1000', 'p(99)<2000'],
        http_req_failed: ['rate<0.05'],  // Allow 5% error rate under extreme load
        success_rate: ['rate>0.90'],     // 90% success rate
        errors: ['count<1000'],          // Max 1000 errors
    },
};

function generateTelemetry(driverId) {
    return {
        sessionId: `extreme_session_${Math.floor(__VU / 10)}`,
        driverId: `driver_${driverId}`,
        timestamp: Date.now(),
        lap: Math.floor(Math.random() * 30) + 1,
        speed: 150 + Math.random() * 100,
        rpm: 5000 + Math.random() * 3000,
        gear: Math.floor(Math.random() * 6) + 1,
        throttle: Math.random(),
        brake: Math.random() * 0.5,
    };
}

export default function () {
    activeConnections.add(1);
    const driverId = __VU;

    // Lightweight telemetry upload
    const telemetry = generateTelemetry(driverId);
    const startTime = Date.now();

    const res = http.post(
        `${BASE_URL}/api/telemetry`,
        JSON.stringify(telemetry),
        {
            headers: { 'Content-Type': 'application/json' },
            timeout: '10s',
        }
    );

    const latency = Date.now() - startTime;
    responseTime.add(latency);
    totalRequests.add(1);

    const success = check(res, {
        'status is 200': (r) => r.status === 200 || r.status === 201,
        'response time < 2s': () => latency < 2000,
    });

    successRate.add(success);

    if (!success) {
        errors.add(1);
        if (errors.value % 100 === 0) {
            console.error(`Error count: ${errors.value}`);
        }
    }

    activeConnections.add(-1);

    // Minimal sleep to maximize throughput
    sleep(0.1);
}

export function handleSummary(data) {
    return {
        'stdout': textSummary(data, { indent: ' ', enableColors: true }),
        'extreme-scale-results.json': JSON.stringify(data),
    };
}

function textSummary(data, options) {
    const indent = options.indent || '';
    let summary = '\n' + indent + '🔥 EXTREME SCALE TEST RESULTS\n';
    summary += indent + '='.repeat(50) + '\n\n';

    const metrics = data.metrics;

    summary += indent + `Total Requests: ${metrics.total_requests.values.count}\n`;
    summary += indent + `Success Rate: ${(metrics.success_rate.values.rate * 100).toFixed(2)}%\n`;
    summary += indent + `Error Count: ${metrics.errors.values.count}\n`;
    summary += indent + `\nResponse Times:\n`;
    summary += indent + `  p50: ${metrics.response_time.values['p(50)'].toFixed(2)}ms\n`;
    summary += indent + `  p95: ${metrics.response_time.values['p(95)'].toFixed(2)}ms\n`;
    summary += indent + `  p99: ${metrics.response_time.values['p(99)'].toFixed(2)}ms\n`;
    summary += indent + `  max: ${metrics.response_time.values.max.toFixed(2)}ms\n`;

    return summary;
}
