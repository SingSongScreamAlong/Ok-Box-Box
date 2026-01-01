/**
 * Protocol Handler for okboxbox:// URLs
 * 
 * Handles deep links from the Launchpad to launch specific surfaces.
 * 
 * URL format: okboxbox://launch?token=<jwt>
 */

import { BrowserWindow, shell } from 'electron';
import { RelayMode, saveMode, openSurface } from './mode-selector';
import { createHUDWindow, closeHUDWindow } from './hud-window';

// ============================================================================
// TYPES
// ============================================================================

interface LaunchTokenPayload {
    userId: string;
    surface: RelayMode;
    exp: number;
}

// ============================================================================
// PROTOCOL REGISTRATION
// ============================================================================

const PROTOCOL_NAME = 'okboxbox';

/**
 * Register the custom protocol handler.
 * Call this before app.ready or in main.ts setup.
 */
export function registerProtocol(): boolean {
    const { app } = require('electron');

    // On macOS, set as default protocol client
    if (process.defaultApp) {
        if (process.argv.length >= 2) {
            app.setAsDefaultProtocolClient(PROTOCOL_NAME, process.execPath, [
                require('path').resolve(process.argv[1])
            ]);
        }
    } else {
        app.setAsDefaultProtocolClient(PROTOCOL_NAME);
    }

    return app.isDefaultProtocolClient(PROTOCOL_NAME);
}

// ============================================================================
// URL PARSING
// ============================================================================

/**
 * Parse a protocol URL.
 * Returns null if not a valid okboxbox:// URL.
 */
export function parseProtocolUrl(url: string): { action: string; token: string } | null {
    try {
        // okboxbox://launch?token=...
        if (!url.startsWith(`${PROTOCOL_NAME}://`)) {
            return null;
        }

        const urlObj = new URL(url);
        const action = urlObj.hostname; // 'launch'
        const token = urlObj.searchParams.get('token');

        if (!token) {
            console.warn('Protocol URL missing token');
            return null;
        }

        return { action, token };
    } catch (error) {
        console.error('Failed to parse protocol URL:', error);
        return null;
    }
}

// ============================================================================
// TOKEN VALIDATION (via API)
// ============================================================================

const API_URL = process.env.OKBOXBOX_API_URL || 'https://coral-app-x988a.ondigitalocean.app';

/**
 * Validate a launch token with the server.
 */
export async function validateToken(token: string): Promise<LaunchTokenPayload | null> {
    try {
        const response = await fetch(`${API_URL}/api/launch-token/validate?token=${encodeURIComponent(token)}`);
        const result = await response.json() as { success: boolean; data?: LaunchTokenPayload };

        if (!result.success || !result.data) {
            console.warn('Launch token validation failed');
            return null;
        }

        return result.data;
    } catch (error) {
        console.error('Token validation error:', error);
        return null;
    }
}

// ============================================================================
// LAUNCH HANDLER
// ============================================================================

let currentHudWindow: BrowserWindow | null = null;

/**
 * Handle a launch protocol URL.
 * Validates token, sets mode, opens surface.
 */
export async function handleLaunchUrl(url: string): Promise<boolean> {
    console.log('📱 Handling protocol URL:', url);

    const parsed = parseProtocolUrl(url);
    if (!parsed) {
        console.error('Invalid protocol URL');
        return false;
    }

    if (parsed.action !== 'launch') {
        console.warn(`Unknown protocol action: ${parsed.action}`);
        return false;
    }

    // Validate token
    const payload = await validateToken(parsed.token);
    if (!payload) {
        console.error('Token validation failed');
        showErrorDialog('Launch Failed', 'Your launch link has expired. Please try again from the Launchpad.');
        return false;
    }

    console.log(`✅ Token valid for surface: ${payload.surface}`);

    // Set and save mode
    saveMode(payload.surface);

    // Close existing HUD if switching away from driver
    if (currentHudWindow) {
        closeHUDWindow();
        currentHudWindow = null;
    }

    // Open the appropriate surface
    if (payload.surface === 'driver') {
        console.log('🖥️ Launching Driver HUD...');
        currentHudWindow = createHUDWindow();
    } else {
        // Open web surface
        openSurface(payload.surface);
    }

    return true;
}

// ============================================================================
// ERROR DIALOG
// ============================================================================

function showErrorDialog(title: string, message: string): void {
    const { dialog } = require('electron');
    dialog.showErrorBox(title, message);
}

// ============================================================================
// APP EVENT HANDLERS
// ============================================================================

/**
 * Set up protocol URL handlers.
 * Call this in main.ts after app.ready.
 */
export function setupProtocolHandlers(): void {
    const { app } = require('electron');

    // Handle protocol URL on macOS (when app is already running)
    app.on('open-url', (event: Event, url: string) => {
        event.preventDefault();
        handleLaunchUrl(url);
    });

    // Handle protocol URL on Windows/Linux (passed as command line arg)
    app.on('second-instance', (_event: Event, commandLine: string[]) => {
        // Look for protocol URL in command line
        const url = commandLine.find(arg => arg.startsWith(`${PROTOCOL_NAME}://`));
        if (url) {
            handleLaunchUrl(url);
        }
    });

    // Check if launched from protocol URL
    const launchUrl = process.argv.find(arg => arg.startsWith(`${PROTOCOL_NAME}://`));
    if (launchUrl) {
        // Delay slightly to let app finish initializing
        setTimeout(() => handleLaunchUrl(launchUrl), 500);
    }
}
