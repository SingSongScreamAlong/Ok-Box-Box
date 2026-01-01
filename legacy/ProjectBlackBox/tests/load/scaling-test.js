/**
 * k6 Load Testing Script for ProjectBlackBox
 * Tests system scalability with increasing concurrent users
 * 
 * Usage:
 *   k6 run --vus 10 --duration 30s scaling-test.js
 *   k6 run scaling-test.js  (uses built-in stages)
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import crypto from 'k6/crypto';

// Custom metrics
const telemetryRate = new Rate('telemetry_success_rate');
const telemetryLatency = new Trend('telemetry_latency');
const apiErrors = new Counter('api_errors');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Test stages - progressive load increase
export const options = {
    stages: [
        { duration: '10s', target: 5 },    // Ramp to 5 users
        { duration: '20s', target: 5 },    // Stay at 5 users
        { duration: '10s', target: 10 },   // Ramp to 10 users
        { duration: '20s', target: 10 },   // Stay at 10 users
        { duration: '10s', target: 20 },   // Ramp to 20
        { duration: '20s', target: 20 },   // Stay at 20
        { duration: '10s', target: 0 },    // Ramp down
    ],
    thresholds: {
        http_req_duration: ['p(95)<500', 'p(99)<1000'],
        http_req_failed: ['rate<0.05'],
        telemetry_success_rate: ['rate>0.95'],
        telemetry_latency: ['p(95)<200'],
    },
};

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}


/**
 * Generate mock telemetry data
 */
function generateTelemetryData(timestamp) {
    return {
        timestamp: timestamp,
        speed: 150 + Math.random() * 100,
        rpm: 5000 + Math.random() * 3000,
        gear: Math.floor(Math.random() * 6) + 1,
        throttle: Math.random(),
        brake: Math.random() * 0.5,
        steering: (Math.random() - 0.5) * 0.6,
        lap: 1,
        sector: 1,
        lapTime: 90000,
        sectorTime: 30000,
        position: { x: 0, y: 0, z: 0 },
        force: { lateral: 0, longitudinal: 0, vertical: 0 }
    };
}

/**
 * Setup function - runs once
 */
export function setup() {
    console.log('🏁 Starting ProjectBlackBox Load Test');
    console.log(`Base URL: ${BASE_URL}`);

    // Register a test user
    const email = `loadtest_${Date.now()}@example.com`;
    const password = 'Password123!';
    const name = 'Load Test User';

    const payload = JSON.stringify({ email, password, name });
    const params = { headers: { 'Content-Type': 'application/json' } };

    const res = http.post(`${BASE_URL}/auth/register`, payload, params);

    // If user already exists (e.g. rerun), try login
    let token;
    let authHeader;

    if (res.status === 201) {
        token = res.json('token');
        console.log('✅ Registered new test user');
    } else if (res.status === 409) {
        console.log('⚠️ User exists, logging in...');
        const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({ email, password }), params);
        if (loginRes.status === 200) {
            token = loginRes.json('token');
            console.log('✅ Logged in successfully');
        } else {
            console.error('❌ Login failed');
            throw new Error('Authentication failed');
        }
    } else {
        console.error(`❌ Registration failed: ${res.status}`);
        throw new Error('Authentication failed');
    }

    // Create a base session for this test run? 
    // Actually, better if each VU creates its own session to avoid lock contention if any
    return { token: token };
}

/**
 * Main test function - runs for each VU iteration
 */
export default function (data) {
    const token = data.token;
    const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    // 1. Create a session for this iteration
    const sessionId = uuidv4();
    const sessionPayload = JSON.stringify({
        id: sessionId,
        name: `Load Test Session VU:${__VU} Iter:${__ITER}`,
        track: 'monza'
    });

    const sessionRes = http.post(`${BASE_URL}/sessions`, sessionPayload, { headers: authHeaders });

    check(sessionRes, {
        'session created': (r) => r.status === 201 || r.status === 409 // 409 if collision (unlikely with timestamp)
    });

    if (sessionRes.status !== 201 && sessionRes.status !== 409) {
        apiErrors.add(1);
        sleep(1);
        return;
    }

    // 2. Send Telemetry Batch
    group('Telemetry Upload', () => {
        const now = Date.now();
        // Send a batch of 10 points
        const telemetryBatch = [];
        for (let i = 0; i < 10; i++) {
            telemetryBatch.push(generateTelemetryData(now + i * 100)); // 100ms intervals
        }

        const startTime = Date.now();
        const res = http.post(
            `${BASE_URL}/sessions/${sessionId}/telemetry`,
            JSON.stringify(telemetryBatch),
            { headers: authHeaders }
        );

        const latency = Date.now() - startTime;
        telemetryLatency.add(latency);

        const success = check(res, {
            'telemetry upload status 202': (r) => r.status === 202,
            'telemetry upload latency < 500ms': () => latency < 500,
        });

        telemetryRate.add(success);

        if (!success) {
            apiErrors.add(1);
            console.error(`Telemetry upload failed: ${res.status} - ${res.body}`);
        }
    });

    sleep(1);
}

/**
 * Teardown function
 */
export function teardown(data) {
    console.log(`\n🏁 Load Test Complete`);
}
