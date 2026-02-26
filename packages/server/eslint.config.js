// ESLint flat config for @controlbox/server
// Enforces no-console rule to prevent log pollution in production

import tseslint from 'typescript-eslint';

export default tseslint.config(
    // Global ignores must be in their own config object
    {
        ignores: [
            'src/**/*.test.ts',
            'src/**/*.spec.ts', 
            'src/**/__tests__/**',
            'dist/**',
        ],
    },
    {
        files: ['src/**/*.ts'],
        extends: [tseslint.configs.base],
        languageOptions: {
            parser: tseslint.parser,
        },
        rules: {
            // Block console.log and console.debug - use structured logger instead
            'no-console': ['error', { 
                allow: ['warn', 'error'] 
            }],
        },
    },
);
