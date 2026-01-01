/**
 * Race Simulation Script
 * Uses MockTelemetryGenerator to simulate a live driver on Silverstone.
 * Authenticates, creates a session, and posts telemetry via HTTP.
 */
import { generateMockSession } from '../tests/load/mock-telemetry-generator';

const API_URL = process.env.API_URL || process.env.BACKEND_URL || 'http://localhost:3000';
const SIMULATION_INTERVAL_MS = 100; // 100ms = 10Hz updates

// Test credentials (must match seed data or be created)
const EMAIL = 'test2@example.com';
const PASSWORD = 'password123';

async function runSimulation() {
    console.log('🏎️  Starting Race Simulation...');

    try {
        // 1. Login
        console.log(`🔐 Logging in as ${EMAIL}...`);
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: EMAIL, password: PASSWORD })
        });

        if (!loginRes.ok) {
            throw new Error(`Login failed: ${loginRes.status} ${await loginRes.text()}`);
        }
        const { token, user } = await loginRes.json() as any;
        console.log(`✅ Logged in! Token acquired.`);

        // 2. Create Session
        const sessionName = `Sim Race - ${new Date().toLocaleTimeString()}`;
        console.log(`📝 Creating session: ${sessionName}...`);
        const createRes = await fetch(`${API_URL}/sessions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name: sessionName,
                track: 'Silverstone'
            })
        });

        if (!createRes.ok) {
            throw new Error(`Session creation failed: ${createRes.status} ${await createRes.text()}`);
        }
        const session = await createRes.json() as any;
        console.log(`✅ Session Created: ${session.id}`);

        // 3. Start Telemetry Loop
        const mockSession = generateMockSession(1);
        const generator = mockSession.generators[0];
        // generator.sessionId = session.id; // Correct the session ID in generator
        // Re-instantiate generator with correct ID if needed, or just patch it
        // The generator class logic is self-contained but we need to ensure the data has the right ID?
        // Actually, let's use a fixed ID that we can navigate to if needed, or just rely on the dashboard 
        // picking up the latest active session.
        // Actually the mock generator takes sessionID in constructor.
        // Let's just create a new generator with the real session ID.
        const { MockTelemetryGenerator } = await import('../tests/load/mock-telemetry-generator');
        const sim = new MockTelemetryGenerator(session.id, user.id || 'sim_driver');

        console.log(`🚀 Starting Telemetry Stream... Press Ctrl+C to stop.`);

        setInterval(async () => {
            const telemetry = sim.generateSample();

            // Post telemetry
            try {
                const postRes = await fetch(`${API_URL}/sessions/${session.id}/telemetry`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(telemetry)
                });

                if (!postRes.ok) {
                    console.error(`⚠️ Post failed: ${postRes.status}`);
                } else {
                    if (telemetry.lapDist < 50) {
                        process.stdout.write('.');
                    }
                }
            } catch (e) {
                console.error('Network error posting telemetry:', e);
            }

        }, SIMULATION_INTERVAL_MS);

    } catch (err: any) {
        console.error('❌ Simulation Error:', err.message);
        process.exit(1);
    }
}

runSimulation();

// Keep script running
process.on('SIGINT', () => {
    console.log('\n🛑 Simulation stopped.');
    process.exit();
});
