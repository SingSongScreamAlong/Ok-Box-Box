/**
 * Mode Selector
 * 
 * Handles explicit mode selection for the relay agent.
 * 
 * CRITICAL: This module NEVER infers mode from iRacing running.
 * Race Control users often run iRacing as spectator/admin.
 */

import { BrowserWindow, shell } from 'electron';
import Store from 'electron-store';
import * as path from 'path';

// ============================================================================
// TYPES
// ============================================================================

export type RelayMode = 'driver' | 'team' | 'racecontrol';

interface ModePreferences {
    lastSelectedMode: RelayMode | null;
    modeHistory: Array<{ mode: RelayMode; timestamp: number }>;
}

const store = new Store<ModePreferences>({
    name: 'mode-preferences',
    defaults: {
        lastSelectedMode: null,
        modeHistory: []
    }
});

// ============================================================================
// MODE PERSISTENCE
// ============================================================================

/**
 * Get the last selected mode for this device.
 */
export function getSavedMode(): RelayMode | null {
    return store.get('lastSelectedMode');
}

/**
 * Save the selected mode for future sessions.
 */
export function saveMode(mode: RelayMode): void {
    store.set('lastSelectedMode', mode);

    // Also track history for analytics
    const history = store.get('modeHistory') || [];
    history.push({ mode, timestamp: Date.now() });
    // Keep last 50 entries
    store.set('modeHistory', history.slice(-50));
}

// ============================================================================
// MODE SELECTION LOGIC
// ============================================================================

/**
 * Determine which modes are available based on capabilities.
 * Returns empty array if user has no capabilities.
 */
export function getAvailableModes(capabilities: {
    driver_hud?: boolean;
    pitwall_view?: boolean;
    incident_review?: boolean;
}): RelayMode[] {
    const modes: RelayMode[] = [];

    if (capabilities.driver_hud) modes.push('driver');
    if (capabilities.pitwall_view) modes.push('team');
    if (capabilities.incident_review) modes.push('racecontrol');

    return modes;
}

/**
 * Select a mode based on available modes and saved preference.
 * 
 * RULES:
 * 1. If only ONE mode available → auto-select it
 * 2. If saved mode is available → use it (unless user explicitly picks different)
 * 3. Otherwise → show mode picker
 * 
 * NEVER select mode based on iRacing running.
 */
export async function selectMode(
    availableModes: RelayMode[],
    showPicker: () => Promise<RelayMode | null>
): Promise<RelayMode | null> {
    if (availableModes.length === 0) {
        console.log('⚠️ No modes available - user has no capabilities');
        return null;
    }

    // Only one option - auto-select
    if (availableModes.length === 1) {
        const mode = availableModes[0];
        console.log(`✅ Auto-selecting only available mode: ${mode}`);
        saveMode(mode);
        return mode;
    }

    // Multiple options - check saved preference
    const savedMode = getSavedMode();
    if (savedMode && availableModes.includes(savedMode)) {
        console.log(`✅ Using saved mode preference: ${savedMode}`);
        return savedMode;
    }

    // No saved preference or it's not available - ask user
    console.log('📋 Multiple modes available, prompting user...');
    const selectedMode = await showPicker();

    if (selectedMode) {
        saveMode(selectedMode);
        console.log(`✅ User selected mode: ${selectedMode}`);
    }

    return selectedMode;
}

// ============================================================================
// MODE PICKER WINDOW
// ============================================================================

let modePickerWindow: BrowserWindow | null = null;

/**
 * Show mode picker window and wait for user selection.
 */
export function showModePicker(availableModes: RelayMode[]): Promise<RelayMode | null> {
    return new Promise((resolve) => {
        if (modePickerWindow) {
            modePickerWindow.focus();
            return;
        }

        modePickerWindow = new BrowserWindow({
            width: 400,
            height: 350,
            resizable: false,
            frame: false,
            transparent: true,
            alwaysOnTop: true,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
            }
        });

        // Generate HTML for the picker
        const html = generateModePickerHTML(availableModes);
        modePickerWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

        // Handle selection via IPC (simplified - using query params for demo)
        modePickerWindow.webContents.on('will-navigate', (event, url) => {
            event.preventDefault();
            const match = url.match(/mode=(\w+)/);
            if (match) {
                const mode = match[1] as RelayMode;
                cleanup();
                resolve(mode);
            }
        });

        modePickerWindow.on('closed', () => {
            modePickerWindow = null;
            resolve(null);
        });

        function cleanup() {
            if (modePickerWindow) {
                modePickerWindow.close();
                modePickerWindow = null;
            }
        }
    });
}

/**
 * Generate HTML for mode picker window.
 */
function generateModePickerHTML(availableModes: RelayMode[]): string {
    const modeConfig: Record<RelayMode, { icon: string; title: string; desc: string; color: string }> = {
        driver: {
            icon: '🏎️',
            title: 'Driver HUD',
            desc: 'In-car overlay with spotter and AI coaching',
            color: '#00d4ff'
        },
        team: {
            icon: '📊',
            title: 'Team Pit Wall',
            desc: 'Strategy, fuel, and opponent intel',
            color: '#00ff88'
        },
        racecontrol: {
            icon: '⚖️',
            title: 'Race Control',
            desc: 'Incident review and penalties',
            color: '#ff6b00'
        }
    };

    const buttons = availableModes.map(mode => {
        const cfg = modeConfig[mode];
        return `
            <a href="?mode=${mode}" class="mode-btn" style="--color: ${cfg.color}">
                <span class="icon">${cfg.icon}</span>
                <span class="title">${cfg.title}</span>
                <span class="desc">${cfg.desc}</span>
            </a>
        `;
    }).join('');

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: rgba(20, 20, 30, 0.95);
                    color: white;
                    padding: 24px;
                    border-radius: 16px;
                    border: 1px solid rgba(255,255,255,0.1);
                    -webkit-app-region: drag;
                }
                h2 {
                    font-size: 18px;
                    font-weight: 600;
                    margin-bottom: 8px;
                    text-align: center;
                }
                p.subtitle {
                    font-size: 13px;
                    color: #888;
                    text-align: center;
                    margin-bottom: 20px;
                }
                .modes {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    -webkit-app-region: no-drag;
                }
                .mode-btn {
                    display: flex;
                    flex-direction: column;
                    padding: 16px;
                    background: rgba(255,255,255,0.05);
                    border: 2px solid rgba(255,255,255,0.1);
                    border-radius: 12px;
                    cursor: pointer;
                    text-decoration: none;
                    color: inherit;
                    transition: all 0.2s;
                }
                .mode-btn:hover {
                    background: rgba(255,255,255,0.1);
                    border-color: var(--color);
                    transform: translateY(-2px);
                }
                .icon { font-size: 24px; margin-bottom: 4px; }
                .title { font-size: 16px; font-weight: 600; }
                .desc { font-size: 12px; color: #888; margin-top: 4px; }
            </style>
        </head>
        <body>
            <h2>Select Mode</h2>
            <p class="subtitle">Choose how you want to use Ok, Box Box</p>
            <div class="modes">${buttons}</div>
        </body>
        </html>
    `;
}

// ============================================================================
// SURFACE URL HELPER
// ============================================================================

const API_URL = process.env.OKBOXBOX_WEB_URL || 'https://control.okboxbox.com';

/**
 * Get the web URL for a surface.
 */
export function getSurfaceUrl(mode: RelayMode): string {
    switch (mode) {
        case 'team':
            return `${API_URL}/team`;
        case 'racecontrol':
            return `${API_URL}/incidents`;
        default:
            return `${API_URL}/home`;
    }
}

/**
 * Open the web surface in default browser.
 */
export function openSurface(mode: RelayMode): void {
    const url = getSurfaceUrl(mode);
    console.log(`🌐 Opening ${mode} surface: ${url}`);
    shell.openExternal(url);
}
