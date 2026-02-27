#!/usr/bin/env node
/**
 * Lint only changed .ts files (vs origin/main)
 * Excludes test files and __tests__ directories
 * Used in CI to block NEW console.log without failing on existing violations
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverRoot = resolve(__dirname, '..');

try {
    // Get changed files vs origin/main (from repo root, filter to server/src)
    const diffOutput = execSync('git diff --name-only origin/main -- "packages/server/src/**/*.ts"', {
        encoding: 'utf-8',
        cwd: resolve(serverRoot, '../..'), // repo root
    }).trim();

    if (!diffOutput) {
        console.log('No changed .ts files to lint');
        process.exit(0);
    }

    // Filter out test files and convert to relative paths from server root
    const repoRoot = resolve(serverRoot, '../..');
    const files = diffOutput
        .split('\n')
        .filter(f => f.endsWith('.ts'))
        .filter(f => !f.includes('.test.ts'))
        .filter(f => !f.includes('.spec.ts'))
        .filter(f => !f.includes('__tests__'))
        .map(f => resolve(repoRoot, f)) // Convert to absolute path
        .filter(f => existsSync(f));

    if (files.length === 0) {
        console.log('No non-test .ts files changed');
        process.exit(0);
    }

    console.log(`Linting ${files.length} changed file(s):`);
    files.forEach(f => console.log(`  - ${f}`));

    // Run eslint on changed files
    execSync(`npx eslint ${files.join(' ')}`, {
        stdio: 'inherit',
        cwd: process.cwd(),
    });

    console.log('✅ Lint passed for changed files');
} catch (error) {
    if (error.status) {
        // ESLint found errors
        process.exit(error.status);
    }
    // Git diff failed (maybe no origin/main) - fall back to full lint
    console.log('Could not diff against origin/main, running full lint...');
    try {
        execSync('npm run lint', { stdio: 'inherit', cwd: process.cwd() });
    } catch {
        process.exit(1);
    }
}
