/**
 * Quick Smoke Test - No k6 Required
 * Tests basic server functionality with mock data
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';
let passedTests = 0;
let failedTests = 0;

console.log('🧪 Running Quick Smoke Test\n');
console.log('='.repeat(50));

// Test 1: Health Check
function testHealthCheck() {
    return new Promise((resolve) => {
        http.get(`${BASE_URL}/health`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log('✅ Health check: PASS');
                    passedTests++;
                } else {
                    console.log(`❌ Health check: FAIL (status ${res.statusCode})`);
                    failedTests++;
                }
                resolve();
            });
        }).on('error', (err) => {
            console.log(`❌ Health check: FAIL (${err.message})`);
            failedTests++;
            resolve();
        });
    });
}

// Test 2: Readiness Check
function testReadiness() {
    return new Promise((resolve) => {
        http.get(`${BASE_URL}/health/ready`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200 || res.statusCode === 503) {
                    console.log('✅ Readiness check: PASS');
                    passedTests++;
                } else {
                    console.log(`❌ Readiness check: FAIL (status ${res.statusCode})`);
                    failedTests++;
                }
                resolve();
            });
        }).on('error', (err) => {
            console.log(`❌ Readiness check: FAIL (${err.message})`);
            failedTests++;
            resolve();
        });
    });
}

// Test 3: Mock Telemetry Upload
function testTelemetryUpload() {
    return new Promise((resolve) => {
        const telemetry = JSON.stringify({
            sessionId: 'smoke_test',
            driverId: 'test_driver',
            timestamp: Date.now(),
            speed: 150,
            rpm: 6000,
            gear: 4
        });

        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/telemetry',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': telemetry.length
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200 || res.statusCode === 201) {
                    console.log('✅ Telemetry upload: PASS');
                    passedTests++;
                } else {
                    console.log(`❌ Telemetry upload: FAIL (status ${res.statusCode})`);
                    failedTests++;
                }
                resolve();
            });
        });

        req.on('error', (err) => {
            console.log(`❌ Telemetry upload: FAIL (${err.message})`);
            failedTests++;
            resolve();
        });

        req.write(telemetry);
        req.end();
    });
}

// Run all tests
async function runTests() {
    await testHealthCheck();
    await testReadiness();
    await testTelemetryUpload();

    console.log('='.repeat(50));
    console.log(`\n📊 Results: ${passedTests} passed, ${failedTests} failed`);

    if (failedTests === 0) {
        console.log('✅ All smoke tests passed! Server is ready for load testing.\n');
        process.exit(0);
    } else {
        console.log('⚠️  Some tests failed. Check server status.\n');
        process.exit(1);
    }
}

runTests();
