/**
 * Playwright Test Fixtures
 * Shared authentication and setup for all E2E tests
 */

import { test as base, expect, Page } from '@playwright/test';

// Test credentials
const TEST_EMAIL = process.env.E2E_TEST_EMAIL || 'test@okboxbox.com';
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || 'testpassword123';

// Extend base test with authenticated page fixture
export const test = base.extend<{ authenticatedPage: Page }>({
    authenticatedPage: async ({ page }, use) => {
        // Login
        await page.goto('/login');
        await page.locator('input[type="email"]').fill(TEST_EMAIL);
        await page.locator('input[type="password"]').fill(TEST_PASSWORD);
        await page.getByRole('button', { name: /sign in/i }).click();
        await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });
        
        // Use the authenticated page
        await use(page);
    },
});

export { expect };

// Helper function for standalone login (for tests that need custom login flow)
export async function login(page: Page): Promise<void> {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(TEST_EMAIL);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });
}

// Helper to wait for page to be fully loaded (no spinners/loading states)
export async function waitForPageLoad(page: Page): Promise<void> {
    // Wait for any loading spinners to disappear
    await page.waitForLoadState('networkidle');
    
    // Wait for common loading indicators to disappear
    const loadingSelectors = [
        '[class*="loading"]',
        '[class*="spinner"]',
        '[class*="skeleton"]',
    ];
    
    for (const selector of loadingSelectors) {
        const elements = page.locator(selector);
        const count = await elements.count();
        if (count > 0) {
            await elements.first().waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
        }
    }
}

// Helper to check for console errors
export async function checkNoConsoleErrors(page: Page): Promise<string[]> {
    const errors: string[] = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            errors.push(msg.text());
        }
    });
    return errors;
}
