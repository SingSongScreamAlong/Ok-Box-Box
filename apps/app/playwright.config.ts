import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration for Driver Tier App
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: [
        ['html', { outputFolder: 'playwright-report' }],
        ['list']
    ],

    use: {
        // Base URL for the Driver Tier app
        baseURL: process.env.E2E_BASE_URL || 'http://localhost:5175',

        // Capture screenshot on failure
        screenshot: 'only-on-failure',

        // Record video on failure
        video: 'on-first-retry',

        // Trace on first retry
        trace: 'on-first-retry',

        // Default timeout
        actionTimeout: 10000,
    },

    // Timeout for each test
    timeout: 30000,

    // Expect timeout
    expect: {
        timeout: 5000,
    },

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        // Uncomment for cross-browser testing
        // {
        //     name: 'firefox',
        //     use: { ...devices['Desktop Firefox'] },
        // },
        // {
        //     name: 'mobile',
        //     use: { ...devices['iPhone 13'] },
        // },
    ],

    // Run local dev server before starting tests
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:5175',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
    },
});
