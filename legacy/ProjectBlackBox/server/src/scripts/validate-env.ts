/**
 * Environment Validation Script
 * 
 * Usage: node dist/scripts/validate-env.js
 * 
 * This script imports the configuration which triggers the validation logic
 * defined in config/environment.ts. If validation fails, it will throw an error
 * and exit with a non-zero status code.
 */

import { config } from '../config/environment.js';

try {
    // Accessing config triggers the loadEnvironment() logic
    console.log('Environment Validation Passed:');
    console.log(`- NODE_ENV: ${config.NODE_ENV}`);
    console.log(`- SERVER_URL: ${config.SERVER_URL}`);
    console.log(`- DATABASE_URL: ${config.DATABASE_URL ? 'Set' : 'Missing'}`);
    console.log(`- DASHBOARD_URL: ${config.DASHBOARD_URL}`);

    if (config.NODE_ENV === 'production') {
        console.log('Production checks enabled.');
    } else {
        console.log('Development mode - skipping strict security checks.');
    }

    process.exit(0);
} catch (error) {
    console.error('Environment Validation FAILED:');
    console.error(error);
    process.exit(1);
}
