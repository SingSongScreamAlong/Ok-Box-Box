// =====================================================================
// Load Test
// Simulate 60 drivers, 20 spectators (goal: 20 minutes)
// =====================================================================

import { io, Socket } from 'socket.io-client';

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';
const TEST_SESSION_ID = `load-test-${Date.now()}`;
const DRIVER_COUNT = parseInt(process.env.DRIVER_COUNT || '60', 10);
const SPECTATOR_COUNT = parseInt(process.env.SPECTATOR_COUNT || '20', 10);
const DURATION_SEC = parseInt(process.env.DURATION_SEC || '60', 10);
const FRAME_RATE_HZ = parseInt(process.env.FRAME_RATE_HZ || '60', 10);

// Metrics
let framesSent = 0;
let framesReceived = 0;
let errors = 0;
let latencies: number[] = [];

function createSocket(role: string, surface: string): Socket {
    return io(SERVER_URL, {
        transports: ['websocket'],
        auth: {
            devRole: role,
            devSurface: surface
        }
    });
}

function generateDriverData(driverIndex: number, lap: number): any {
    return {
        carId: driverIndex,
        driverId: `driver-${driverIndex}`,
        driverName: `Load Test Driver ${driverIndex}`,
        carNumber: String(driverIndex + 1),
        position: driverIndex + 1,
        lap: lap,
        speed: 180 + Math.random() * 50,
        lapDistPct: Math.random()
    };
}

async function runRelaySimulation(durationMs: number): Promise<void> {
    const socket = createSocket('relay', 'relay');
    let lap = 1;

    return new Promise((resolve, reject) => {
        socket.on('connect', () => {
            console.log('  📡 Relay connected');
            socket.emit('join', { sessionId: TEST_SESSION_ID });

            const intervalMs = 1000 / FRAME_RATE_HZ;
            let frameCounter = 0;

            const interval = setInterval(() => {
                const cars = [];
                for (let i = 0; i < DRIVER_COUNT; i++) {
                    cars.push(generateDriverData(i, lap));
                }

                socket.emit('telemetry', {
                    sessionId: TEST_SESSION_ID,
                    timestamp: Date.now(),
                    frameId: `frame-${frameCounter++}`,
                    cars
                });

                framesSent++;

                // Increment lap occasionally
                if (Math.random() < 0.01) lap++;
            }, intervalMs);

            setTimeout(() => {
                clearInterval(interval);
                socket.disconnect();
                resolve();
            }, durationMs);
        });

        socket.on('connect_error', (err) => {
            reject(new Error(`Relay connection error: ${err.message}`));
        });
    });
}

async function runSpectatorSimulation(spectatorId: number, durationMs: number): Promise<void> {
    const socket = createSocket('broadcast', 'racebox');

    return new Promise((resolve) => {
        socket.on('connect', () => {
            socket.emit('join', { sessionId: TEST_SESSION_ID });
        });

        socket.on('timing:update', (data: any) => {
            framesReceived++;

            // Calculate latency if timestamp available
            if (data.serverTimestamp) {
                const latency = Date.now() - data.serverTimestamp;
                latencies.push(latency);
            }
        });

        socket.on('error', () => {
            errors++;
        });

        setTimeout(() => {
            socket.disconnect();
            resolve();
        }, durationMs);
    });
}

function calculatePercentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.floor(sorted.length * p);
    return sorted[idx];
}

// =====================================================================
// Main
// =====================================================================

async function main(): Promise<void> {
    console.log('');
    console.log('🔥 LOAD TEST');
    console.log('='.repeat(50));
    console.log(`Server: ${SERVER_URL}`);
    console.log(`Session: ${TEST_SESSION_ID}`);
    console.log(`Drivers: ${DRIVER_COUNT}`);
    console.log(`Spectators: ${SPECTATOR_COUNT}`);
    console.log(`Duration: ${DURATION_SEC}s`);
    console.log(`Frame Rate: ${FRAME_RATE_HZ}Hz`);
    console.log('');

    const durationMs = DURATION_SEC * 1000;
    const startTime = Date.now();

    console.log('Starting simulation...');
    console.log('');

    // Start relay (producer)
    const relayPromise = runRelaySimulation(durationMs);

    // Start spectators (consumers) after 2 seconds
    await new Promise(r => setTimeout(r, 2000));

    const spectatorPromises = [];
    for (let i = 0; i < SPECTATOR_COUNT; i++) {
        spectatorPromises.push(runSpectatorSimulation(i, durationMs - 2000));
    }
    console.log(`  👥 ${SPECTATOR_COUNT} spectators connected`);

    // Wait for all to complete
    await Promise.all([relayPromise, ...spectatorPromises]);

    const elapsed = (Date.now() - startTime) / 1000;

    console.log('');
    console.log('='.repeat(50));
    console.log('RESULTS');
    console.log('='.repeat(50));
    console.log(`Duration: ${elapsed.toFixed(1)}s`);
    console.log(`Frames Sent: ${framesSent}`);
    console.log(`Frames Received: ${framesReceived}`);
    console.log(`Send Rate: ${(framesSent / elapsed).toFixed(1)} fps`);
    console.log(`Receive Rate: ${(framesReceived / elapsed).toFixed(1)} fps`);
    console.log(`Errors: ${errors}`);

    if (latencies.length > 0) {
        console.log(`Latency p50: ${calculatePercentile(latencies, 0.5).toFixed(0)}ms`);
        console.log(`Latency p95: ${calculatePercentile(latencies, 0.95).toFixed(0)}ms`);
        console.log(`Latency p99: ${calculatePercentile(latencies, 0.99).toFixed(0)}ms`);
    }

    console.log('');
    console.log('✅ LOAD TEST COMPLETE');
    process.exit(0);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
