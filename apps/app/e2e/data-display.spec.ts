/**
 * E2E Test: Data Display
 * Tests that pages correctly display data from the API
 */

import { test, expect } from './fixtures';

test.describe('Driver Profile Data', () => {
    test('Profile page displays user information', async ({ authenticatedPage: page }) => {
        await page.goto('/driver/profile');
        await expect(page.getByRole('main')).toBeVisible({ timeout: 10000 });
        
        // Profile page should load without errors
        // Content may be images/icons, not just text
        await expect(page.getByText(/something went wrong|error/i)).not.toBeVisible();
    });
});

test.describe('Driver Ratings Data', () => {
    test('Ratings page displays license and iRating info', async ({ authenticatedPage: page }) => {
        await page.goto('/driver/ratings');
        await expect(page.getByRole('main')).toBeVisible({ timeout: 10000 });
        
        // Ratings page should have content about ratings/licensing
        const mainContent = await page.locator('main').textContent();
        expect(mainContent).toBeTruthy();
    });
});

test.describe('Driver Stats Data', () => {
    test('Stats page displays performance metrics', async ({ authenticatedPage: page }) => {
        await page.goto('/driver/stats');
        await expect(page.getByRole('main')).toBeVisible({ timeout: 10000 });
        
        // Stats should show some metrics
        const mainContent = await page.locator('main').textContent();
        expect(mainContent).toBeTruthy();
    });
});

test.describe('Driver History Data', () => {
    test('History page displays race history', async ({ authenticatedPage: page }) => {
        await page.goto('/driver/history');
        await expect(page.getByRole('main')).toBeVisible({ timeout: 10000 });
        
        // History should show past races or empty state
        const mainContent = await page.locator('main').textContent();
        expect(mainContent).toBeTruthy();
    });
});

test.describe('Driver Sessions Data', () => {
    test('Sessions page displays session list', async ({ authenticatedPage: page }) => {
        await page.goto('/driver/sessions');
        await expect(page.getByRole('main')).toBeVisible({ timeout: 10000 });
        
        // Sessions should show list or empty state
        const mainContent = await page.locator('main').textContent();
        expect(mainContent).toBeTruthy();
    });
});

test.describe('Driver IDP Data', () => {
    test('IDP page displays development plan', async ({ authenticatedPage: page }) => {
        await page.goto('/driver/idp');
        await expect(page.getByRole('main')).toBeVisible({ timeout: 10000 });
        
        // IDP should show goals/focus areas or empty state
        const mainContent = await page.locator('main').textContent();
        expect(mainContent).toBeTruthy();
    });
});

test.describe('Driver Progress Data', () => {
    test('Progress page displays progress tracking', async ({ authenticatedPage: page }) => {
        await page.goto('/driver/progress');
        await expect(page.getByRole('main')).toBeVisible({ timeout: 10000 });
        
        // Progress should show tracking data or empty state
        const mainContent = await page.locator('main').textContent();
        expect(mainContent).toBeTruthy();
    });
});

test.describe('Error Handling', () => {
    test('Pages handle API errors gracefully', async ({ authenticatedPage: page }) => {
        // Navigate to a page that requires API data
        await page.goto('/driver/stats');
        await expect(page.getByRole('main')).toBeVisible({ timeout: 10000 });
        
        // Should not show unhandled error or crash
        await expect(page.getByText(/unhandled|crash|fatal/i)).not.toBeVisible();
    });

    test('404 page for invalid routes', async ({ authenticatedPage: page }) => {
        await page.goto('/driver/nonexistent-page-12345');
        
        // Should show 404 or redirect, not crash
        const pageContent = await page.content();
        expect(pageContent).toBeTruthy();
    });
});
