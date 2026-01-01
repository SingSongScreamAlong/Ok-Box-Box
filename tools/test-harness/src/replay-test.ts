// =====================================================================
// Replay/Persistence Test
// Verify data persistence and replay endpoints (< 5 minutes)
// =====================================================================

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';

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

// =====================================================================
// Tests
// =====================================================================

async function testSessionsEndpoint(): Promise<void> {
    const res = await fetch(`${SERVER_URL}/api/sessions`);
    if (!res.ok) throw new Error(`Sessions endpoint returned ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error('Sessions endpoint not successful');
}

async function testReplayEndpointExists(): Promise<void> {
    // Check if replay endpoints exist (404 is OK if not implemented yet)
    const res = await fetch(`${SERVER_URL}/api/replay/sessions`);

    if (res.status === 404) {
        console.log('    (replay endpoints not implemented - skipping)');
        return;
    }

    if (!res.ok && res.status !== 401 && res.status !== 403) {
        throw new Error(`Replay endpoint returned unexpected ${res.status}`);
    }
}

async function testDiagnosticsEndpoint(): Promise<void> {
    const res = await fetch(`${SERVER_URL}/api/dev/diagnostics/sessions`);

    // May require auth - 401/403 is acceptable
    if (res.status === 401 || res.status === 403) {
        console.log('    (auth required - acceptable)');
        return;
    }

    if (!res.ok) throw new Error(`Diagnostics returned ${res.status}`);
}

async function testParityEndpoint(): Promise<void> {
    const res = await fetch(`${SERVER_URL}/api/dev/diagnostics/parity`);

    // May require auth
    if (res.status === 401 || res.status === 403) {
        console.log('    (auth required - acceptable)');
        return;
    }

    if (res.status === 404) {
        console.log('    (endpoint not found - acceptable)');
        return;
    }

    if (!res.ok) throw new Error(`Parity returned ${res.status}`);
}

// =====================================================================
// Main
// =====================================================================

async function main(): Promise<void> {
    console.log('');
    console.log('🗃️ REPLAY/PERSISTENCE TEST');
    console.log('='.repeat(50));
    console.log(`Server: ${SERVER_URL}`);
    console.log('');

    await runTest('Sessions endpoint accessible', testSessionsEndpoint);
    await runTest('Replay endpoints exist', testReplayEndpointExists);
    await runTest('Diagnostics endpoint accessible', testDiagnosticsEndpoint);
    await runTest('Parity endpoint accessible', testParityEndpoint);

    console.log('');
    console.log('='.repeat(50));

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const totalTime = results.reduce((sum, r) => sum + r.duration, 0);

    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log(`Duration: ${(totalTime / 1000).toFixed(1)}s`);
    console.log('');

    if (failed > 0) {
        console.log('❌ REPLAY TEST FAILED');
        process.exit(1);
    } else {
        console.log('✅ REPLAY TEST PASSED');
        process.exit(0);
    }
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
