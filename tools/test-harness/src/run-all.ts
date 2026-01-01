// =====================================================================
// Run All Tests
// Execute smoke, replay, rate tests in sequence
// =====================================================================

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface TestRun {
    name: string;
    file: string;
}

const tests: TestRun[] = [
    { name: 'Smoke', file: 'smoke-test.ts' },
    { name: 'Replay', file: 'replay-test.ts' },
    { name: 'Rate', file: 'rate-test.ts' }
];

async function runTest(test: TestRun): Promise<boolean> {
    return new Promise((resolve) => {
        console.log('');
        console.log('─'.repeat(60));

        const proc = spawn('node', ['--loader', 'ts-node/esm', join(__dirname, test.file)], {
            stdio: 'inherit',
            env: process.env
        });

        proc.on('close', (code) => {
            resolve(code === 0);
        });

        proc.on('error', () => {
            resolve(false);
        });
    });
}

async function main(): Promise<void> {
    console.log('');
    console.log('═'.repeat(60));
    console.log('  RC TEST SUITE');
    console.log('═'.repeat(60));

    const results: { name: string; passed: boolean }[] = [];

    for (const test of tests) {
        const passed = await runTest(test);
        results.push({ name: test.name, passed });

        if (!passed) {
            console.log(`\n⚠️  ${test.name} test failed - continuing with remaining tests...`);
        }
    }

    console.log('');
    console.log('═'.repeat(60));
    console.log('  SUMMARY');
    console.log('═'.repeat(60));
    console.log('');

    for (const r of results) {
        console.log(`  ${r.passed ? '✅' : '❌'} ${r.name}`);
    }

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    console.log('');
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log('');

    if (failed > 0) {
        console.log('❌ TEST SUITE FAILED');
        process.exit(1);
    } else {
        console.log('✅ TEST SUITE PASSED');
        process.exit(0);
    }
}

main();
