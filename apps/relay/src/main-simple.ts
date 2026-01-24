/**
 * Ok, Box Box Relay - Simplified Autonomous Agent
 * 
 * A minimal, self-healing relay that:
 * - Auto-starts on Windows boot
 * - Auto-detects iRacing
 * - Auto-connects to cloud server
 * - Auto-reconnects on failure
 * - Shows minimal status indicator
 * 
 * NO login required, NO mode selection, NO HUD - just pure telemetry relay.
 */

import { app } from 'electron';
import { TrayManager } from './tray-simple.js';
import { PythonBridge, RelayStatus } from './python-bridge-simple.js';
import { createStatusWindow, updateStatus, closeStatusWindow } from './status-window.js';

const APP_NAME = 'Ok, Box Box Relay';
const CLOUD_URL = process.env.OKBOXBOX_API_URL || 'http://localhost:3001';

let tray: TrayManager | null = null;
let pythonBridge: PythonBridge | null = null;
let statusWindow: any = null;

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    console.log('Another instance is already running. Exiting.');
    app.quit();
}

app.whenReady().then(async () => {
    console.log(`🏎️ ${APP_NAME} starting...`);

    // Auto-start on Windows boot
    setupAutoStart();

    // Create minimal tray
    tray = new TrayManager();

    // Create status window
    statusWindow = createStatusWindow();
    updateStatus({ serverConnected: false, iRacingDetected: false, sending: false, error: null });

    // Start the autonomous relay
    startRelay();
});

app.on('window-all-closed', () => {
    // Don't quit - we're a tray app
});

app.on('before-quit', () => {
    console.log('🛑 Shutting down...');
    pythonBridge?.stop();
    closeStatusWindow();
});

/**
 * Start the autonomous relay - self-healing, always running
 */
async function startRelay() {
    console.log('🚀 Starting autonomous relay...');

    pythonBridge = new PythonBridge(CLOUD_URL);

    // Wire up status updates
    pythonBridge.on('status', (status: RelayStatus) => {
        updateStatus(status);
        tray?.updateStatus(status);
    });

    // Start with auto-reconnect
    await pythonBridge.start();
}

/**
 * Setup Windows auto-start
 */
function setupAutoStart(): void {
    if (process.platform !== 'win32') return;

    const AutoLaunch = require('auto-launch');
    const autoLauncher = new AutoLaunch({
        name: APP_NAME,
        path: app.getPath('exe'),
    });

    autoLauncher.isEnabled().then((isEnabled: boolean) => {
        if (!isEnabled) {
            autoLauncher.enable();
            console.log('✅ Auto-start enabled');
        }
    }).catch((err: Error) => {
        console.log('⚠️ Could not setup auto-start:', err.message);
    });
}
