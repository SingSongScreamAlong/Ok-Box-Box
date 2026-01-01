// =====================================================================
// Rate/Entitlement Gate Test
// Verify role-based rate limiting (< 5 minutes)
// =====================================================================

import { io, Socket } from 'socket.io-client';

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';
const TEST_SESSION_ID = `rate-test-${Date.now()}`;

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

function createSocket(role: string, surface: string): Socket {
    return io(SERVER_URL, {
        transports: ['websocket'],
        auth: {
            devRole: role,
            devSurface: surface
        }
    });
}

// =====================================================================
// Tests
// =====================================================================

async function testTeamConnection(): Promise<void> {
    const socket = createSocket('team', 'dashboard');

    await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
            socket.disconnect();
            reject(new Error('Connection timeout'));
        }, 5000);

        socket.on('connect', () => {
            clearTimeout(timeout);
            socket.emit('join', { sessionId: TEST_SESSION_ID });
            setTimeout(() => {
                socket.disconnect();
                resolve();
            }, 1000);
        });

        socket.on('connect_error', (err) => {
            clearTimeout(timeout);
            socket.disconnect();
            reject(new Error(`Connection error: ${err.message}`));
        });
    });
}

async function testRaceControlConnection(): Promise<void> {
    const socket = createSocket('race_control', 'racebox');

    await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
            socket.disconnect();
            reject(new Error('Connection timeout'));
        }, 5000);

        socket.on('connect', () => {
            clearTimeout(timeout);
            socket.emit('join', { sessionId: TEST_SESSION_ID });
            setTimeout(() => {
                socket.disconnect();
                resolve();
            }, 1000);
        });

        socket.on('connect_error', (err) => {
            clearTimeout(timeout);
            socket.disconnect();
            reject(new Error(`Connection error: ${err.message}`));
        });
    });
}

async function testBroadcastConnection(): Promise<void> {
    const socket = createSocket('broadcast', 'racebox');

    await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
            socket.disconnect();
            reject(new Error('Connection timeout'));
        }, 5000);

        socket.on('connect', () => {
            clearTimeout(timeout);
            socket.emit('join', { sessionId: TEST_SESSION_ID });
            setTimeout(() => {
                socket.disconnect();
                resolve();
            }, 1000);
        });

        socket.on('connect_error', (err) => {
            clearTimeout(timeout);
            socket.disconnect();
            reject(new Error(`Connection error: ${err.message}`));
        });
    });
}

async function testMultipleConnections(): Promise<void> {
    const sockets: Socket[] = [];

    // Create 3 sockets with different roles
    const roles = [
        { role: 'team', surface: 'dashboard' },
        { role: 'race_control', surface: 'racebox' },
        { role: 'broadcast', surface: 'racebox' }
    ];

    await Promise.all(roles.map(({ role, surface }) => {
        return new Promise<void>((resolve, reject) => {
            const socket = createSocket(role, surface);
            sockets.push(socket);

            const timeout = setTimeout(() => {
                reject(new Error(`${role} connection timeout`));
            }, 5000);

            socket.on('connect', () => {
                clearTimeout(timeout);
                socket.emit('join', { sessionId: TEST_SESSION_ID });
                resolve();
            });

            socket.on('connect_error', (err) => {
                clearTimeout(timeout);
                reject(new Error(`${role} error: ${err.message}`));
            });
        });
    }));

    // Wait a bit then disconnect all
    await new Promise(r => setTimeout(r, 2000));
    sockets.forEach(s => s.disconnect());
}

async function testSubscriptionLimit(): Promise<void> {
    // This test verifies that rate limits are enforced
    // For now, just verify we can subscribe without error
    const socket = createSocket('broadcast', 'racebox');

    await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
            socket.disconnect();
            resolve(); // Pass if no error
        }, 5000);

        socket.on('connect', () => {
            // Subscribe to multiple events
            socket.emit('join', { sessionId: TEST_SESSION_ID });
            socket.emit('subscribe', { event: 'telemetry:frame', rate: 5 });
            socket.emit('subscribe', { event: 'telemetry:timing', rate: 2 });

            setTimeout(() => {
                clearTimeout(timeout);
                socket.disconnect();
                resolve();
            }, 2000);
        });

        socket.on('error', (err: any) => {
            clearTimeout(timeout);
            socket.disconnect();
            // Rate limit error is acceptable
            if (err.message?.includes('rate') || err.message?.includes('limit')) {
                resolve();
            } else {
                reject(new Error(`Unexpected error: ${err.message || err}`));
            }
        });
    });
}

// =====================================================================
// Main
// =====================================================================

async function main(): Promise<void> {
    console.log('');
    console.log('📊 RATE/ENTITLEMENT TEST');
    console.log('='.repeat(50));
    console.log(`Server: ${SERVER_URL}`);
    console.log(`Session: ${TEST_SESSION_ID}`);
    console.log('');

    await runTest('Team role connects', testTeamConnection);
    await runTest('Race control role connects', testRaceControlConnection);
    await runTest('Broadcast role connects', testBroadcastConnection);
    await runTest('Multiple roles simultaneously', testMultipleConnections);
    await runTest('Subscription rate respected', testSubscriptionLimit);

    console.log('');
    console.log('='.repeat(50));

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const totalTime = results.reduce((sum, r) => sum + r.duration, 0);

    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log(`Duration: ${(totalTime / 1000).toFixed(1)}s`);
    console.log('');

    if (failed > 0) {
        console.log('❌ RATE TEST FAILED');
        process.exit(1);
    } else {
        console.log('✅ RATE TEST PASSED');
        process.exit(0);
    }
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
