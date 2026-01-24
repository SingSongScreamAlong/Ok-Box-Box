#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Colors for console output
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

console.clear();
console.log(`${RED}================================================================${RESET}`);
console.log(`${RED}   ⚠️  WARNING: LEGACY ENVIRONMENT DETECTED  ⚠️${RESET}`);
console.log(`${RED}================================================================${RESET}`);
console.log('');
console.log(`${YELLOW}You are attempting to run a legacy component of Ok, Box Box.${RESET}`);
console.log(`${YELLOW}This code is deprecated, unmaintained, and possibly broken.${RESET}`);
console.log('');
console.log(`Canonical alternatives:`);
console.log(`  - Dashboard:   ${RESET}npm run app`);
console.log(`  - Website:     ${RESET}npm run website`);
console.log(`  - API:         ${RESET}npm run api`);
console.log('');
console.log(`${RED}Proceed only if you are explicitly testing legacy functionality.${RESET}`);
console.log(`${RED}================================================================${RESET}`);
console.log('');

// Wait 2 seconds to ensure the user sees the message
setTimeout(() => {
    console.log('Starting legacy process...');
}, 2000);
