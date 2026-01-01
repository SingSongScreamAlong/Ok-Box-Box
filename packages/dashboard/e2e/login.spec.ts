/**
 * E2E Test: Login Flow
 * 
 * Tests the authentication flow:
 * - Navigate to login page
 * - Submit credentials
 * - Verify successful login and redirect
 */

import { test, expect } from '@playwright/test';

// Test user credentials (use environment variables in CI)
const TEST_EMAIL = process.env.E2E_TEST_EMAIL || 'test@okboxbox.com';
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || 'testpassword123';

test.describe('Login Flow', () => {
    test.beforeEach(async ({ page }) => {
        // Clear any existing auth state
        await page.context().clearCookies();
    });

    test('should display login page', async ({ page }) => {
        await page.goto('/login');

        // Verify login form elements are visible
        await expect(page.getByRole('heading', { name: /sign in|login/i })).toBeVisible();
        await expect(page.getByLabel(/email/i)).toBeVisible();
        await expect(page.getByLabel(/password/i)).toBeVisible();
        await expect(page.getByRole('button', { name: /sign in|login/i })).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
        await page.goto('/login');

        // Fill in invalid credentials
        await page.getByLabel(/email/i).fill('invalid@example.com');
        await page.getByLabel(/password/i).fill('wrongpassword');
        await page.getByRole('button', { name: /sign in|login/i }).click();

        // Expect error message
        await expect(page.getByText(/invalid|incorrect|failed/i)).toBeVisible({ timeout: 5000 });
    });

    test('should redirect to login when accessing protected route', async ({ page }) => {
        // Try to access protected route without auth
        await page.goto('/incidents');

        // Should redirect to login
        await expect(page).toHaveURL(/\/login/);
    });

    test('should login successfully with valid credentials', async ({ page }) => {
        await page.goto('/login');

        // Fill in valid credentials
        await page.getByLabel(/email/i).fill(TEST_EMAIL);
        await page.getByLabel(/password/i).fill(TEST_PASSWORD);
        await page.getByRole('button', { name: /sign in|login/i }).click();

        // Should redirect away from login page
        await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });

        // Should see dashboard content
        await expect(page.getByRole('main')).toBeVisible();
    });

    test('should persist login across page refresh', async ({ page }) => {
        // Login first
        await page.goto('/login');
        await page.getByLabel(/email/i).fill(TEST_EMAIL);
        await page.getByLabel(/password/i).fill(TEST_PASSWORD);
        await page.getByRole('button', { name: /sign in|login/i }).click();

        // Wait for login to complete
        await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });

        // Refresh page
        await page.reload();

        // Should still be logged in (not redirected to login)
        await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 });
    });
});
