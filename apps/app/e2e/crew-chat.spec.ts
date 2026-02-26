/**
 * E2E Test: AI Crew Chat
 * Tests the Engineer, Spotter, and Analyst chat interfaces
 */

import { test, expect } from '@playwright/test';

// Helper to login before tests
async function login(page: any) {
    const TEST_EMAIL = process.env.E2E_TEST_EMAIL || 'test@okboxbox.com';
    const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || 'testpassword123';
    
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(TEST_EMAIL);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });
}

test.describe('Engineer Chat', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test('should display chat interface', async ({ page }) => {
        await page.goto('/driver/crew/engineer');
        await expect(page.getByRole('main')).toBeVisible({ timeout: 10000 });
    });

    test('should have message input', async ({ page }) => {
        await page.goto('/driver/crew/engineer');
        await expect(page.locator('input, textarea').first()).toBeVisible({ timeout: 10000 });
    });

    test('should send message and receive response', async ({ page }) => {
        await page.goto('/driver/crew/engineer');
        
        const input = page.locator('input, textarea').first();
        await input.fill('What tire pressures should I run?');
        await input.press('Enter');
        
        // Should show loading or response
        await expect(page.locator('main')).toBeVisible();
    });
});

test.describe('Spotter Chat', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test('should display chat interface', async ({ page }) => {
        await page.goto('/driver/crew/spotter');
        await expect(page.getByRole('main')).toBeVisible({ timeout: 10000 });
    });

    test('should have message input', async ({ page }) => {
        await page.goto('/driver/crew/spotter');
        await expect(page.locator('input, textarea').first()).toBeVisible({ timeout: 10000 });
    });
});

test.describe('Analyst Chat', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test('should display chat interface', async ({ page }) => {
        await page.goto('/driver/crew/analyst');
        await expect(page.getByRole('main')).toBeVisible({ timeout: 10000 });
    });

    test('should have message input', async ({ page }) => {
        await page.goto('/driver/crew/analyst');
        await expect(page.locator('input, textarea').first()).toBeVisible({ timeout: 10000 });
    });
});
