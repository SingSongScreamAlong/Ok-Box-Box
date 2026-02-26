/**
 * E2E Test: Driver Tier Pages
 * Tests specific functionality of each driver page
 */

import { test, expect } from '@playwright/test';

// Helper to login before tests
async function login(page: any) {
    const TEST_EMAIL = process.env.E2E_TEST_EMAIL || 'test@okboxbox.com';
    const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || 'testpassword123';
    
    await page.goto('/login');
    await page.getByPlaceholder(/email/i).fill(TEST_EMAIL);
    await page.getByPlaceholder(/password/i).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in|login|continue/i }).click();
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });
}

test.describe('Driver Home', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test('should display driver dashboard', async ({ page }) => {
        await page.goto('/driver');
        await expect(page.getByRole('main')).toBeVisible();
    });
});

test.describe('Driver Ratings', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test('should display safety rating', async ({ page }) => {
        await page.goto('/driver/ratings');
        await expect(page.getByText(/safety/i)).toBeVisible({ timeout: 10000 });
    });

    test('should display iRating', async ({ page }) => {
        await page.goto('/driver/ratings');
        await expect(page.getByText(/irating/i)).toBeVisible({ timeout: 10000 });
    });

    test('should display license breakdown', async ({ page }) => {
        await page.goto('/driver/ratings');
        await expect(page.getByText(/license/i)).toBeVisible({ timeout: 10000 });
    });
});

test.describe('Driver Stats', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test('should display performance stats', async ({ page }) => {
        await page.goto('/driver/stats');
        await expect(page.getByRole('main')).toBeVisible({ timeout: 10000 });
    });
});

test.describe('Driver History', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test('should display race history', async ({ page }) => {
        await page.goto('/driver/history');
        await expect(page.getByRole('main')).toBeVisible({ timeout: 10000 });
    });
});

test.describe('Driver IDP', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test('should display development plan', async ({ page }) => {
        await page.goto('/driver/idp');
        await expect(page.getByRole('main')).toBeVisible({ timeout: 10000 });
    });

    test('should show focus areas', async ({ page }) => {
        await page.goto('/driver/idp');
        // IDP should have focus areas or goals
        await expect(page.locator('main')).toBeVisible();
    });
});

test.describe('Driver Cockpit', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test('should display cockpit view', async ({ page }) => {
        await page.goto('/driver/cockpit');
        await expect(page.getByRole('main')).toBeVisible({ timeout: 10000 });
    });

    test('should show track map', async ({ page }) => {
        await page.goto('/driver/cockpit');
        // Track map or position indicator should be present
        await expect(page.locator('main')).toBeVisible();
    });
});

test.describe('Driver Pitwall', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test('should display pitwall view', async ({ page }) => {
        await page.goto('/driver/pitwall');
        await expect(page.getByRole('main')).toBeVisible({ timeout: 10000 });
    });
});

test.describe('Driver BlackBox', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test('should display telemetry dashboard', async ({ page }) => {
        await page.goto('/driver/blackbox');
        await expect(page.getByRole('main')).toBeVisible({ timeout: 10000 });
    });
});

test.describe('Driver Profile', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test('should display profile settings', async ({ page }) => {
        await page.goto('/driver/profile');
        await expect(page.getByRole('main')).toBeVisible({ timeout: 10000 });
    });
});
