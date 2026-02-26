/**
 * E2E Test: Navigation
 * Tests all driver tier routes are accessible and render correctly
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

test.describe('Driver Tier Navigation', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    const routes = [
        { path: '/driver', name: 'Driver Home', selector: 'main' },
        { path: '/driver/cockpit', name: 'Cockpit', selector: 'main' },
        { path: '/driver/ratings', name: 'Ratings', selector: 'text=/ratings|licensing/i' },
        { path: '/driver/stats', name: 'Stats', selector: 'main' },
        { path: '/driver/history', name: 'History', selector: 'main' },
        { path: '/driver/sessions', name: 'Sessions', selector: 'main' },
        { path: '/driver/idp', name: 'IDP', selector: 'main' },
        { path: '/driver/progress', name: 'Progress', selector: 'main' },
        { path: '/driver/profile', name: 'Profile', selector: 'main' },
        { path: '/driver/pitwall', name: 'Pitwall', selector: 'main' },
        { path: '/driver/blackbox', name: 'BlackBox', selector: 'main' },
    ];

    for (const route of routes) {
        test(`should load ${route.name} page`, async ({ page }) => {
            await page.goto(route.path);
            
            // Page should load without error
            await expect(page.locator(route.selector).first()).toBeVisible({ timeout: 10000 });
            
            // No error boundaries or crash messages
            await expect(page.getByText(/error|crash|failed to load/i)).not.toBeVisible();
        });
    }

    test('should navigate via sidebar', async ({ page }) => {
        await page.goto('/driver');
        
        // Click on Ratings in sidebar
        await page.getByRole('link', { name: /ratings/i }).click();
        await expect(page).toHaveURL(/\/driver\/ratings/);
        
        // Click on Stats
        await page.getByRole('link', { name: /stats/i }).click();
        await expect(page).toHaveURL(/\/driver\/stats/);
    });

    test('should handle browser back/forward', async ({ page }) => {
        await page.goto('/driver');
        await page.goto('/driver/ratings');
        await page.goto('/driver/stats');
        
        // Go back
        await page.goBack();
        await expect(page).toHaveURL(/\/driver\/ratings/);
        
        // Go forward
        await page.goForward();
        await expect(page).toHaveURL(/\/driver\/stats/);
    });
});

test.describe('Crew Chat Navigation', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    const crewRoutes = [
        { path: '/driver/crew/engineer', name: 'Engineer Chat' },
        { path: '/driver/crew/spotter', name: 'Spotter Chat' },
        { path: '/driver/crew/analyst', name: 'Analyst Chat' },
    ];

    for (const route of crewRoutes) {
        test(`should load ${route.name}`, async ({ page }) => {
            await page.goto(route.path);
            
            // Chat interface should be visible
            await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
            
            // Should have input field for messages
            await expect(page.getByPlaceholder(/message|type|ask/i)).toBeVisible();
        });
    }
});
