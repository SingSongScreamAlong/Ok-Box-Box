/**
 * Ok, Box Box Relay Agent - Main Process
 * 
 * Electron entry point. Responsibilities:
 * - System tray icon
 * - Login/authentication
 * - Bootstrap fetch
 * - MODE SELECTION (explicit - never infer from iRacing)
 * - Python SDK bridge (IPC)
 * - HUD overlay window
 * - Custom protocol handler (okboxbox://)
 * 
 * CRITICAL: Race Control users often run iRacing as spectator/admin.
 * iRacing running must NEVER auto-select Driver HUD.
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { AuthManager, BootstrapResponse } from './auth';
import { TrayManager } from './tray';
import { PythonBridge } from './python-bridge';
import { createHUDWindow, closeHUDWindow } from './hud-window';
import {
    RelayMode,
    getAvailableModes,
    selectMode,
    showModePicker,
    getSavedMode,
    saveMode,
    openSurface
} from './mode-selector';
import {
    registerProtocol,
    setupProtocolHandlers,
    handleLaunchUrl
} from './protocol-handler';


// ============================================================================
// CONSTANTS
// ============================================================================

const API_URL = process.env.OKBOXBOX_API_URL || 'https://octopus-app-qsi3i.ondigitalocean.app';
const APP_NAME = 'Ok, Box Box Relay';
const PROTOCOL_NAME = 'okboxbox';

// Demo mode - skip login for testing
const DEMO_MODE = process.env.OKBOXBOX_DEMO === '1' || true; // Enable by default for testing

// ============================================================================
// STATE
// ============================================================================

let tray: TrayManager | null = null;
let hudWindow: BrowserWindow | null = null;
let authManager: AuthManager;
let pythonBridge: PythonBridge | null = null;
let currentMode: RelayMode | null = null;

// ============================================================================
// APP LIFECYCLE
// ============================================================================

// Register as default protocol client BEFORE requesting single instance lock
registerProtocol();

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    console.log('Another instance is already running. Exiting.');
    app.quit();
} else {
    app.on('second-instance', (_event, commandLine) => {
        // Check for protocol URL in command line (Windows/Linux)
        const protocolUrl = commandLine.find(arg => arg.startsWith(`${PROTOCOL_NAME}://`));
        if (protocolUrl) {
            console.log('📱 Received protocol URL from second instance:', protocolUrl);
            handleLaunchUrl(protocolUrl);
        }

        // Focus window if exists
        if (hudWindow) {
            if (hudWindow.isMinimized()) hudWindow.restore();
            hudWindow.focus();
        }
    });
}

app.whenReady().then(async () => {
    console.log(`🏎️ ${APP_NAME} starting...`);

    // Auto-start on Windows boot
    setupAutoStart();

    // Initialize auth manager
    authManager = new AuthManager(API_URL);

    // Create tray
    tray = new TrayManager(authManager);

    // Setup protocol handlers (macOS open-url, Windows/Linux via second-instance)
    setupProtocolHandlers();

    // Demo mode - skip login entirely
    if (DEMO_MODE) {
        console.log('🎮 DEMO MODE - Skipping login');
        const demoBootstrap: BootstrapResponse = {
            user: {
                id: 'demo-user',
                email: 'demo@okboxbox.com',
                displayName: 'Demo Driver'
            },
            licenses: {
                blackbox: true,
                controlbox: true
            },
            roles: ['driver'],
            capabilities: {
                driver_hud: true,
                ai_coaching: true,
                voice_engineer: true,
                personal_telemetry: true,
                pitwall_view: false,
                multi_car_monitor: false,
                strategy_timeline: false,
                incident_review: false,
                penalty_assign: false,
                protest_review: false,
                rulebook_manage: false,
                session_authority: false
            },
            defaultSurface: 'driver'
        };
        tray.setLoggedIn('Demo Driver');
        await startRelay(demoBootstrap);
        return;
    }

    // Check for saved token
    const hasToken = await authManager.loadSavedToken();

    if (hasToken) {
        console.log('🔑 Found saved token, fetching bootstrap...');
        const bootstrap = await authManager.fetchBootstrap();

        if (bootstrap) {
            console.log(`✅ Logged in as ${bootstrap.user.displayName}`);
            tray.setLoggedIn(bootstrap.user.displayName);
            await startRelay(bootstrap);
        } else {
            console.log('⚠️ Token expired, need to login');
            tray.setLoggedOut();
        }
    } else {
        console.log('🔐 No saved token, waiting for login...');
        tray.setLoggedOut();
    }
});

app.on('window-all-closed', () => {
    // Don't quit on window close - we're a tray app
});

app.on('before-quit', () => {
    console.log('🛑 Shutting down...');
    if (pythonBridge) {
        pythonBridge.stop();
    }
});

// ============================================================================
// RELAY STARTUP
// ============================================================================

async function startRelay(bootstrap: BootstrapResponse) {
    console.log('🚀 Starting relay...');

    // =========================================================================
    // STEP 1: Determine available modes from capabilities
    // =========================================================================
    const availableModes = getAvailableModes(bootstrap.capabilities);
    console.log(`📋 Available modes: ${availableModes.join(', ')}`);

    if (availableModes.length === 0) {
        console.error('❌ User has no capabilities - cannot start relay');
        return;
    }

    // =========================================================================
    // STEP 2: Select mode (NEVER based on iRacing running)
    // =========================================================================
    const selectedMode = await selectMode(availableModes, () => showModePicker(availableModes));

    if (!selectedMode) {
        console.log('⚠️ No mode selected - waiting...');
        return;
    }

    currentMode = selectedMode;
    console.log(`✅ Mode selected: ${currentMode}`);

    // Update tray to show current mode
    tray?.setMode(currentMode);

    // =========================================================================
    // STEP 3: Start telemetry uplink (ALWAYS, regardless of mode)
    // =========================================================================
    // Pass a provider so bridge can get fresh tokens on reconnect
    pythonBridge = new PythonBridge(() => authManager.getAccessToken());
    pythonBridge.setBootstrap(bootstrap);
    await pythonBridge.start();
    console.log('📡 Telemetry uplink started');

    // =========================================================================
    // STEP 4: Launch appropriate surface
    // =========================================================================
    if (currentMode === 'driver') {
        console.log('🖥️ Launching Driver HUD...');
        hudWindow = createHUDWindow();

        // Initialize Voice Engineer for race engineer callouts
        const { initVoiceEngineer, speak } = await import('./voice-engineer.js');
        initVoiceEngineer({ rate: 1.1, pitch: 1.0 });
        speak('Ok, Box Box connected. Standing by.');
        console.log('🎙️ Voice engineer enabled');
    } else {
        // Open web surface in browser
        openSurface(currentMode);
    }
}

// ============================================================================
// MODE SWITCHING
// ============================================================================

async function switchMode(newMode: RelayMode) {
    console.log(`🔄 Switching mode: ${currentMode} → ${newMode}`);

    // Close current surface
    if (currentMode === 'driver' && hudWindow) {
        closeHUDWindow();
        hudWindow = null;
    }

    // Update state
    currentMode = newMode;
    saveMode(newMode);
    tray?.setMode(newMode);

    // Open new surface
    if (newMode === 'driver') {
        hudWindow = createHUDWindow();
    } else {
        openSurface(newMode);
    }
}

// ============================================================================
// IPC HANDLERS
// ============================================================================

ipcMain.handle('auth:login', async (_, email: string, password: string) => {
    try {
        const result = await authManager.login(email, password);
        if (result.success && result.bootstrap) {
            tray?.setLoggedIn(result.bootstrap.user.displayName);
            await startRelay(result.bootstrap);
        }
        return result;
    } catch (error) {
        return { success: false, error: String(error) };
    }
});

ipcMain.handle('auth:logout', async () => {
    await authManager.logout();
    tray?.setLoggedOut();
    currentMode = null;
    if (pythonBridge) {
        pythonBridge.stop();
        pythonBridge = null;
    }
    if (hudWindow) {
        closeHUDWindow();
        hudWindow = null;
    }
    return { success: true };
});

ipcMain.handle('auth:getBootstrap', () => {
    return authManager.getBootstrap();
});

ipcMain.handle('relay:status', () => {
    return {
        mode: currentMode,
        connected: pythonBridge?.isConnected() ?? false,
        simRunning: pythonBridge?.isSimRunning() ?? false,
        viewers: pythonBridge?.getViewerCount() ?? 0
    };
});

ipcMain.handle('relay:switchMode', async (_, mode: RelayMode) => {
    await switchMode(mode);
    return { success: true, mode };
});

ipcMain.handle('relay:getAvailableModes', () => {
    const bootstrap = authManager.getBootstrap();
    if (!bootstrap) return [];
    return getAvailableModes(bootstrap.capabilities);
});

// ============================================================================
// AUTO-START ON WINDOWS BOOT
// ============================================================================

function setupAutoStart(): void {
    // Only on Windows, and only in packaged app
    if (process.platform !== 'win32' || !app.isPackaged) {
        return;
    }

    const exePath = process.execPath;
    const appName = 'OkBoxBoxRelay';

    // Set to run on login
    app.setLoginItemSettings({
        openAtLogin: true,
        openAsHidden: true,
        path: exePath,
        args: ['--hidden']
    });

    console.log('✅ Auto-start enabled - will run on Windows boot');
}
