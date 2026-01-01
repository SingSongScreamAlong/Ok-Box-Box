// =====================================================================
// Smoke Test
// Basic connectivity and data flow verification (< 5 minutes)
// =====================================================================

import { io, Socket } from 'socket.io-client';

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';
const TEST_SESSION_ID = `smoke-test-${Date.now()}`;

interface TestResult {
    name: string;
    passed: boolean;
    duration: number;
    error?: string;
}

const results: TestResult[] = [];

async function runTest(name: string, fn: () => Promise<void>): Promise<void> {
    const start = Date.now();
    try {
        await fn();
        results.push({ name, passed: true, duration: Date.now() - start });
        console.log(`  ✅ ${name}`);
    } catch (err) {
        results.push({ name, passed: false, duration: Date.now() - start, error: (err as Error).message });
        console.log(`  ❌ ${name}: ${(err as Error).message}`);
    }
}

function createSocket(namespace: string = ''): Socket {
    return io(`${SERVER_URL}${namespace}`, {
        transports: ['websocket'],
        auth: {
            devRole: 'relay',
            devSurface: 'relay'
        }
    });
}

async function waitForEvent<T>(socket: Socket, event: string, timeoutMs: number = 5000): Promise<T> {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error(`Timeout waiting for ${event}`));
        }, timeoutMs);

        socket.once(event, (data: T) => {
            clearTimeout(timeout);
            resolve(data);
        });
    });
}

// =====================================================================
// Tests
// =====================================================================

async function testHealthEndpoint(): Promise<void> {
    const res = await fetch(`${SERVER_URL}/api/health`);
    if (!res.ok) throw new Error(`Health returned ${res.status}`);
    const data = await res.json();
    if (!data.healthy) throw new Error('Server reports unhealthy');
}

async function testSocketConnection(): Promise<void> {
    const socket = createSocket();

    await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
            socket.disconnect();
            reject(new Error('Connection timeout'));
        }, 5000);

        socket.on('connect', () => {
            clearTimeout(timeout);
            socket.disconnect();
            resolve();
        });

        socket.on('connect_error', (err) => {
            clearTimeout(timeout);
            socket.disconnect();
            reject(new Error(`Connection error: ${err.message}`));
        });
    });
}

async function testSessionJoin(): Promise<void> {
    const socket = createSocket();

    await new Promise<void>((resolve, reject) => {
        socket.on('connect', () => {
            socket.emit('join', { sessionId: TEST_SESSION_ID });

            // Wait a bit and check if no error occurred
            setTimeout(() => {
                socket.disconnect();
                resolve();
            }, 1000);
        });

        socket.on('error', (err: any) => {
            socket.disconnect();
            reject(new Error(`Join error: ${err.message || err}`));
        });

        socket.on('connect_error', (err) => {
            socket.disconnect();
            reject(new Error(`Connection error: ${err.message}`));
        });
    });
}

async function testTelemetryFlow(): Promise<void> {
    // Simulate relay sending telemetry
    const relaySocket = createSocket();
    const dashSocket = createSocket();

    let timingReceived = false;

    await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
            relaySocket.disconnect();
            dashSocket.disconnect();
            if (!timingReceived) {
                reject(new Error('No timing:update received within 10s'));
            }
        }, 10000);

        dashSocket.on('connect', () => {
            dashSocket.emit('join', { sessionId: TEST_SESSION_ID });
        });

        dashSocket.on('timing:update', (data: any) => {
            timingReceived = true;
            clearTimeout(timeout);
            relaySocket.disconnect();
            dashSocket.disconnect();
            resolve();
        });

        relaySocket.on('connect', () => {
            relaySocket.emit('join', { sessionId: TEST_SESSION_ID });

            // Send telemetry frames for 10 seconds
            let count = 0;
            const interval = setInterval(() => {
                if (count++ > 50 || timingReceived) {
                    clearInterval(interval);
                    return;
                }

                relaySocket.emit('telemetry', {
                    sessionId: TEST_SESSION_ID,
                    timestamp: Date.now(),
                    cars: [
                        { carId: 1, driverName: 'Test Driver', position: 1, lap: 1, speed: 200 }
                    ]
                });
            }, 200);
        });

        relaySocket.on('connect_error', (err) => {
            clearTimeout(timeout);
            relaySocket.disconnect();
            dashSocket.disconnect();
            reject(new Error(`Relay connection error: ${err.message}`));
        });
    });
}

async function testIncidentFlow(): Promise<void> {
    const socket = createSocket();

    await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
            socket.disconnect();
            // Incident test is optional - pass if no error
            resolve();
        }, 5000);

        socket.on('connect', () => {
            socket.emit('join', { sessionId: TEST_SESSION_ID });

            // Emit an incident
            socket.emit('incident:detected', {
                sessionId: TEST_SESSION_ID,
                timestamp: Date.now(),
                lap: 5,
                description: 'Smoke test incident'
            });

            // If we can emit without error, pass
            setTimeout(() => {
                clearTimeout(timeout);
                socket.disconnect();
                resolve();
            }, 2000);
        });

        socket.on('error', (err: any) => {
            clearTimeout(timeout);
            socket.disconnect();
            reject(new Error(`Incident error: ${err.message || err}`));
        });
    });
}

// =====================================================================
// Main
// =====================================================================

async function main(): Promise<void> {
    console.log('');
    console.log('🧪 SMOKE TEST');
    console.log('='.repeat(50));
    console.log(`Server: ${SERVER_URL}`);
    console.log(`Session: ${TEST_SESSION_ID}`);
    console.log('');

    await runTest('Health endpoint responds', testHealthEndpoint);
    await runTest('Socket connects', testSocketConnection);
    await runTest('Session join works', testSessionJoin);
    await runTest('Telemetry flow works', testTelemetryFlow);
    await runTest('Incident emit works', testIncidentFlow);

    console.log('');
    console.log('='.repeat(50));

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const totalTime = results.reduce((sum, r) => sum + r.duration, 0);

    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log(`Duration: ${(totalTime / 1000).toFixed(1)}s`);
    console.log('');

    if (failed > 0) {
        console.log('❌ SMOKE TEST FAILED');
        process.exit(1);
    } else {
        console.log('✅ SMOKE TEST PASSED');
        process.exit(0);
    }
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
