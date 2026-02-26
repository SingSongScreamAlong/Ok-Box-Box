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
    await page.locator('input[type="email"]').fill(TEST_EMAIL);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
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
            await expect(page.locator('input, textarea').first()).toBeVisible();
        });
    }
});
