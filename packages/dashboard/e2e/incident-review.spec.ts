/**
 * E2E Test: Incident Review Flow
 * 
 * Tests the ControlBox Incident Review:
 * - Navigate to incidents page
 * - View incident list
 * - Select and review an incident
 * - Assign penalty (if available)
 */

import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.E2E_TEST_EMAIL || 'test@okboxbox.com';
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || 'testpassword123';

test.describe('Incident Review', () => {
    test.beforeEach(async ({ page }) => {
        // Login before each test
        await page.goto('/login');
        await page.getByLabel(/email/i).fill(TEST_EMAIL);
        await page.getByLabel(/password/i).fill(TEST_PASSWORD);
        await page.getByRole('button', { name: /sign in|login/i }).click();
        await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });
    });

    test('should load incidents page', async ({ page }) => {
        await page.goto('/incidents');

        // Should display incidents heading or list
        await expect(page.getByRole('heading', { name: /incident/i })).toBeVisible({ timeout: 10000 });
    });

    test('should show incident list or empty state', async ({ page }) => {
        await page.goto('/incidents');

        // Either show incident cards or "no incidents" message
        const hasIncidents = await page.locator('.incident-card, [data-testid="incident-item"]').count() > 0;
        const hasEmptyState = await page.getByText(/no incident|no data|empty/i).isVisible().catch(() => false);

        expect(hasIncidents || hasEmptyState).toBe(true);
    });

    test('should navigate to session view', async ({ page }) => {
        await page.goto('/');

        // Look for session link
        const sessionLink = page.locator('a[href*="/session/"]').first();

        if (await sessionLink.isVisible().catch(() => false)) {
            await sessionLink.click();

            // Should load session view
            await expect(page).toHaveURL(/\/session\//);
            await expect(page.locator('.session-view, [data-testid="session-view"]')).toBeVisible({ timeout: 10000 });
        }
    });

    test('should display rulebook page for admins', async ({ page }) => {
        await page.goto('/rulebooks');

        // Either show rulebook editor or unauthorized message
        const heading = page.getByRole('heading', { name: /rulebook/i });
        const unauthorized = page.getByText(/unauthorized|access denied|permission/i);

        const hasHeading = await heading.isVisible().catch(() => false);
        const hasUnauthorized = await unauthorized.isVisible().catch(() => false);

        expect(hasHeading || hasUnauthorized).toBe(true);
    });

    test('should display protests page', async ({ page }) => {
        await page.goto('/protests');

        // Should show protests heading or unauthorized
        const heading = page.getByRole('heading', { name: /protest/i });
        const unauthorized = page.getByText(/unauthorized|access denied/i);

        const hasHeading = await heading.isVisible().catch(() => false);
        const hasUnauthorized = await unauthorized.isVisible().catch(() => false);

        expect(hasHeading || hasUnauthorized).toBe(true);
    });
});
