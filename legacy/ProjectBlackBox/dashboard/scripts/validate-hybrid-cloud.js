/**
 * Hybrid Cloud Integration Validation Script Runner
 * 
 * This script runs the hybrid cloud validation tests in a Node.js environment.
 */

const path = require('path');
const { execSync } = require('child_process');

// Ensure TypeScript is installed
try {
  execSync('npx tsc --version', { stdio: 'ignore' });
} catch (error) {
  console.error('TypeScript is not installed. Installing...');
  execSync('npm install --save-dev typescript ts-node', { stdio: 'inherit' });
}

console.log('Running hybrid cloud validation tests...');

try {
  // Run the validation script using ts-node
  execSync('npx ts-node src/tests/hybrid-cloud-validation.ts', { 
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..')
  });
  console.log('Validation tests completed.');
} catch (error) {
  console.error('Error running validation tests:', error.message);
  process.exit(1);
}
