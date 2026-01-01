/**
 * E2E Test: Team Dashboard
 * 
 * Tests the BlackBox Team Dashboard:
 * - Navigate to team view
 * - Verify telemetry components render
 * - Check strategy panel displays
 */

import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.E2E_TEST_EMAIL || 'test@okboxbox.com';
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || 'testpassword123';
const TEST_SESSION_ID = process.env.E2E_SESSION_ID || 'demo-session';

test.describe('Team Dashboard', () => {
    test.beforeEach(async ({ page }) => {
        // Login before each test
        await page.goto('/login');
        await page.getByLabel(/email/i).fill(TEST_EMAIL);
        await page.getByLabel(/password/i).fill(TEST_PASSWORD);
        await page.getByRole('button', { name: /sign in|login/i }).click();
        await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });
    });

    test('should load team dashboard page', async ({ page }) => {
        await page.goto(`/team/${TEST_SESSION_ID}`);

        // Verify main dashboard container loads
        await expect(page.locator('.team-dashboard, [data-testid="team-dashboard"]')).toBeVisible({ timeout: 10000 });
    });

    test('should display race state pane', async ({ page }) => {
        await page.goto(`/team/${TEST_SESSION_ID}`);

        // Race state should show position, lap, or flag info
        const raceState = page.locator('.race-state-pane, [data-testid="race-state"]');
        await expect(raceState).toBeVisible({ timeout: 10000 });
    });

    test('should display car status pane', async ({ page }) => {
        await page.goto(`/team/${TEST_SESSION_ID}`);

        // Car status shows fuel, tires, damage
        const carStatus = page.locator('.car-status-pane, [data-testid="car-status"]');
        await expect(carStatus).toBeVisible({ timeout: 10000 });
    });

    test('should display strategy timeline', async ({ page }) => {
        await page.goto(`/team/${TEST_SESSION_ID}`);

        // Strategy timeline shows pit windows, stints
        const timeline = page.locator('.strategy-timeline, [data-testid="strategy-timeline"]');
        await expect(timeline).toBeVisible({ timeout: 10000 });
    });

    test('should display opponent intel pane', async ({ page }) => {
        await page.goto(`/team/${TEST_SESSION_ID}`);

        // Opponent intel shows nearby cars
        const opponentIntel = page.locator('.opponent-intel, [data-testid="opponent-intel"]');
        await expect(opponentIntel).toBeVisible({ timeout: 10000 });
    });

    test('should display event log', async ({ page }) => {
        await page.goto(`/team/${TEST_SESSION_ID}`);

        // Event log shows race events
        const eventLog = page.locator('.event-log, [data-testid="event-log"]');
        await expect(eventLog).toBeVisible({ timeout: 10000 });
    });
});
