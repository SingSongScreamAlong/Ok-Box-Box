/**
 * E2E Test: Authentication Flow
 * Tests login, session persistence, and protected routes
 */

import { test, expect } from '@playwright/test';

// Test credentials (use environment variables in CI)
const TEST_EMAIL = process.env.E2E_TEST_EMAIL || 'test@okboxbox.com';
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || 'testpassword123';

test.describe('Authentication', () => {
    test.beforeEach(async ({ page }) => {
        await page.context().clearCookies();
    });

    test('should display login page', async ({ page }) => {
        await page.goto('/login');
        
        await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
        await expect(page.locator('input[type="email"]')).toBeVisible();
        await expect(page.locator('input[type="password"]')).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
        await page.goto('/login');
        
        await page.locator('input[type="email"]').fill('invalid@test.com');
        await page.locator('input[type="password"]').fill('wrongpassword');
        await page.getByRole('button', { name: /sign in/i }).click();
        
        // Should show error message
        await expect(page.locator('.bg-red-500\\/10, [class*="error"], [class*="alert"]')).toBeVisible({ timeout: 10000 });
    });

    test('should redirect unauthenticated users to login', async ({ page }) => {
        await page.goto('/driver');
        
        // Should redirect to login or show auth prompt
        await expect(page).toHaveURL(/\/(login|auth)/);
    });

    test('should login successfully with valid credentials', async ({ page }) => {
        await page.goto('/login');
        
        await page.locator('input[type="email"]').fill(TEST_EMAIL);
        await page.locator('input[type="password"]').fill(TEST_PASSWORD);
        await page.getByRole('button', { name: /sign in/i }).click();
        
        // Should redirect away from login
        await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });
        await expect(page.getByRole('main')).toBeVisible();
    });

    test('should persist session across refresh', async ({ page }) => {
        await page.goto('/login');
        await page.locator('input[type="email"]').fill(TEST_EMAIL);
        await page.locator('input[type="password"]').fill(TEST_PASSWORD);
        await page.getByRole('button', { name: /sign in/i }).click();
        await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });
        
        // Refresh and check still logged in
        await page.reload();
        await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 });
    });
});
