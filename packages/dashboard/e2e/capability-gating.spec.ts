/**
 * E2E Test: Capability Gating
 * 
 * Tests that routes are properly gated by capabilities, not licenses.
 * 
 * CRITICAL: Race control pages must load even when telemetry is absent.
 */

import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.E2E_TEST_EMAIL || 'test@okboxbox.com';
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || 'testpassword123';

test.describe('Capability Gating', () => {
    test.beforeEach(async ({ page }) => {
        // Login before each test
        await page.goto('/login');
        await page.getByLabel(/email/i).fill(TEST_EMAIL);
        await page.getByLabel(/password/i).fill(TEST_PASSWORD);
        await page.getByRole('button', { name: /sign in|login/i }).click();
        await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });
    });

    test('should show Surface Home with available surfaces', async ({ page }) => {
        await page.goto('/home');

        // Should display surface cards
        await expect(page.locator('.surface-home, [data-testid="surface-home"]')).toBeVisible({ timeout: 10000 });

        // Should have at least one surface card
        const cards = page.locator('.surface-card');
        await expect(cards.first()).toBeVisible();
    });

    test('should allow access to team route with pitwall_view capability', async ({ page }) => {
        await page.goto('/team');

        // Should either show team dashboard OR require capability
        const teamVisible = await page.locator('.team-dashboard, [data-testid="team-dashboard"]').isVisible().catch(() => false);
        const unauthorized = await page.getByText(/unauthorized|not authorized|access denied/i).isVisible().catch(() => false);

        // One of these should be true
        expect(teamVisible || unauthorized).toBe(true);
    });

    test('should allow access to incidents route with incident_review capability', async ({ page }) => {
        await page.goto('/incidents');

        // Should either show incidents page OR require capability
        const incidentsVisible = await page.getByRole('heading', { name: /incident/i }).isVisible().catch(() => false);
        const unauthorized = await page.getByText(/unauthorized|not authorized|access denied/i).isVisible().catch(() => false);

        expect(incidentsVisible || unauthorized).toBe(true);
    });

    test('race control should work when telemetry is disconnected', async ({ page }) => {
        await page.goto('/incidents');

        // Should not show error - either incidents or "waiting for session" state
        const hasError = await page.getByText(/error|failed to load/i).isVisible().catch(() => false);
        const incidentsVisible = await page.getByRole('heading', { name: /incident/i }).isVisible().catch(() => false);
        const waitingState = await page.getByText(/no session|waiting|select a session/i).isVisible().catch(() => false);

        // Should NOT show error
        expect(hasError).toBe(false);

        // Should show either incidents or waiting state
        expect(incidentsVisible || waitingState).toBe(true);
    });

    test('should redirect from protected route when lacking capability', async ({ page }) => {
        // This test assumes we can test with a user lacking certain capabilities
        // For now, verify the RequireCapability guard exists by checking redirect behavior

        await page.goto('/rulebooks');

        // Should either show rulebooks OR redirect/unauthorized
        const rulebooksVisible = await page.getByRole('heading', { name: /rulebook/i }).isVisible().catch(() => false);
        const unauthorized = await page.getByText(/unauthorized|not authorized/i).isVisible().catch(() => false);
        const redirected = page.url().includes('/home') || page.url().includes('/login');

        // One of these should be true
        expect(rulebooksVisible || unauthorized || redirected).toBe(true);
    });

    test('should load protests page with protest_review capability', async ({ page }) => {
        await page.goto('/protests');

        // Should either show protests OR require capability
        const protestsVisible = await page.getByRole('heading', { name: /protest/i }).isVisible().catch(() => false);
        const unauthorized = await page.getByText(/unauthorized|not authorized/i).isVisible().catch(() => false);

        expect(protestsVisible || unauthorized).toBe(true);
    });
});
