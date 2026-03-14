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
 * Standalone desktop runtime for the embedded relay.
 */

import { app, shell } from 'electron';
import { AuthManager } from './auth.js';
import { checkForUpdates, showUpdateDialog, startUpdateChecker, stopUpdateChecker, manualUpdateCheck } from './auto-updater.js';
import { extractProtocolUrl, parseProtocolUrl, registerProtocol } from './protocol-handler.js';
import { getRelaySettings } from './settings.js';
import { TrayManager } from './tray-simple.js';
import { PythonBridge, RelayStatus } from './python-bridge-simple.js';
import { createStatusWindow, updateStatus, closeStatusWindow } from './status-window.js';
import { ClipManager } from './clip-manager.js';

const APP_NAME = 'Ok, Box Box Relay';

let tray: TrayManager | null = null;
let pythonBridge: PythonBridge | null = null;
const clipManager = new ClipManager();
const authManager = new AuthManager();
let pendingLaunchUrl: string | null = extractProtocolUrl(process.argv);

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    console.log('Another instance is already running. Exiting.');
    app.quit();
}

app.whenReady().then(async () => {
    console.log(`🏎️ ${APP_NAME} starting...`);
    app.setAppUserModelId('com.okboxbox.relay');

    // Auto-start on Windows boot
    setupAutoStart();

    registerProtocol();

    // Create minimal tray
    tray = new TrayManager({
        openApp: () => {
            const settings = getRelaySettings();
            void shell.openExternal(authManager.isLoggedIn() ? `${settings.appUrl}/driver/home` : `${settings.appUrl}/login`);
        },
        connectRelay: () => {
            const settings = getRelaySettings();
            void shell.openExternal(`${settings.appUrl}/download`);
        },
        checkForUpdates: () => {
            void manualUpdateCheck();
        },
        logout: () => {
            void unlinkRelay();
        },
    });

    // Create status window
    createStatusWindow();
    updateStatus({ serverConnected: false, iRacingDetected: false, sending: false, error: null });

    const restored = await authManager.loadSavedToken();
    refreshLinkState();

    // Start clip server for replay intelligence
    clipManager.startServer();

    // Start the autonomous relay
    await startRelay();

    if (pendingLaunchUrl) {
        await handleLaunchUrl(pendingLaunchUrl);
        pendingLaunchUrl = null;
    }

    const updateInfo = await checkForUpdates(true);
    if (updateInfo) {
        await showUpdateDialog(updateInfo);
    }
    startUpdateChecker();

    if (!restored) {
        console.log('🔓 Relay not linked yet. Waiting for launch token or manual connect flow.');
    }
});

app.on('second-instance', (_event, argv) => {
    const url = extractProtocolUrl(argv);
    if (url) {
        void handleLaunchUrl(url);
    }
});

app.on('open-url', (event, url) => {
    event.preventDefault();
    void handleLaunchUrl(url);
});

app.on('window-all-closed', () => {
    // Don't quit - we're a tray app
});

app.on('before-quit', () => {
    console.log('🛑 Shutting down...');
    stopUpdateChecker();
    pythonBridge?.stop();
    clipManager.stopServer();
    closeStatusWindow();
});

function getBridgeOptions() {
    const settings = getRelaySettings();
    return {
        cloudUrl: settings.apiUrl,
        relayId: settings.relayId,
        authToken: authManager.getAccessToken(),
        userId: settings.userId,
        enableLocalDev: !app.isPackaged,
    };
}

function refreshLinkState(): void {
    tray?.updateLinkState(authManager.getBootstrap()?.user.displayName || null);
    pythonBridge?.updateOptions(getBridgeOptions());
}

async function unlinkRelay(): Promise<void> {
    await authManager.logout();
    refreshLinkState();
    await restartRelay();
}

async function restartRelay(): Promise<void> {
    pythonBridge?.stop();
    pythonBridge = null;
    updateStatus({ serverConnected: false, iRacingDetected: false, sending: false, error: null });
    await startRelay();
}

async function handleLaunchUrl(url: string): Promise<boolean> {
    const parsed = parseProtocolUrl(url);
    if (!parsed || parsed.action !== 'launch') {
        return false;
    }

    try {
        const bootstrap = await authManager.exchangeLaunchToken(parsed.token);
        if (!bootstrap) {
            return false;
        }

        console.log(`🔗 Relay linked to ${bootstrap.user.email}`);
        refreshLinkState();
        await restartRelay();
        return true;
    } catch (error) {
        console.error('Failed to handle launch URL:', error);
        updateStatus({ error: error instanceof Error ? error.message : 'Relay link failed' });
        return false;
    }
}

/**
 * Start the autonomous relay - self-healing, always running
 */
async function startRelay() {
    console.log('🚀 Starting autonomous relay...');

    pythonBridge = new PythonBridge(getBridgeOptions());

    // Wire up status updates
    pythonBridge.on('status', (status: RelayStatus) => {
        updateStatus(status);
        tray?.updateStatus(status);
    });

    // Wire clip_saved events into ClipManager
    pythonBridge.on('clip_saved', (data: any) => {
        clipManager.onClipSaved(data);
    });

    // Start with auto-reconnect
    await pythonBridge.start();
}

/**
 * Setup Windows auto-start
 */
function setupAutoStart(): void {
    if (process.platform !== 'win32') return;

    const settings = getRelaySettings();
    if (!settings.autoLaunch) return;

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
