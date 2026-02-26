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
        
        await expect(page.getByRole('heading', { name: /sign in|login|welcome/i })).toBeVisible();
        await expect(page.getByPlaceholder(/email/i)).toBeVisible();
        await expect(page.getByPlaceholder(/password/i)).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
        await page.goto('/login');
        
        await page.getByPlaceholder(/email/i).fill('invalid@example.com');
        await page.getByPlaceholder(/password/i).fill('wrongpassword');
        await page.getByRole('button', { name: /sign in|login|continue/i }).click();
        
        // Expect error message or stay on login page
        await expect(page.getByText(/invalid|incorrect|failed|error/i)).toBeVisible({ timeout: 5000 });
    });

    test('should redirect unauthenticated users to login', async ({ page }) => {
        await page.goto('/driver');
        
        // Should redirect to login or show auth prompt
        await expect(page).toHaveURL(/\/(login|auth)/);
    });

    test('should login successfully with valid credentials', async ({ page }) => {
        await page.goto('/login');
        
        await page.getByPlaceholder(/email/i).fill(TEST_EMAIL);
        await page.getByPlaceholder(/password/i).fill(TEST_PASSWORD);
        await page.getByRole('button', { name: /sign in|login|continue/i }).click();
        
        // Should redirect to driver home
        await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });
        await expect(page.getByRole('main')).toBeVisible();
    });

    test('should persist session across refresh', async ({ page }) => {
        // Login first
        await page.goto('/login');
        await page.getByPlaceholder(/email/i).fill(TEST_EMAIL);
        await page.getByPlaceholder(/password/i).fill(TEST_PASSWORD);
        await page.getByRole('button', { name: /sign in|login|continue/i }).click();
        
        await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });
        
        // Refresh and verify still logged in
        await page.reload();
        await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 });
    });
});
