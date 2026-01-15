/**
 * Driver HUD Window
 * 
 * Always-on-top, transparent overlay window for in-sim display.
 * Shows real-time telemetry and AI coaching messages.
 * 
 * Features:
 * - Transparent background
 * - Always on top of game
 * - Click-through when not focused
 * - Draggable/resizable in settings mode
 */

import { BrowserWindow, screen, ipcMain } from 'electron';
import * as path from 'path';

let hudWindow: BrowserWindow | null = null;

export interface HUDConfig {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    opacity?: number;
}

const DEFAULT_CONFIG: HUDConfig = {
    width: 200,
    height: 120,
    opacity: 0.95
};

/**
 * Create and show the Driver HUD window
 */
export function createHUDWindow(config: HUDConfig = {}): BrowserWindow {
    if (hudWindow) {
        hudWindow.focus();
        return hudWindow;
    }

    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    const hudConfig = { ...DEFAULT_CONFIG, ...config };

    // Default position: bottom-right corner
    const x = hudConfig.x ?? width - (hudConfig.width || 300) - 50;
    const y = hudConfig.y ?? height - (hudConfig.height || 200) - 100;

    hudWindow = new BrowserWindow({
        width: hudConfig.width,
        height: hudConfig.height,
        x,
        y,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: true,
        hasShadow: false,
        movable: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    // Allow mouse events for dragging - user can move the HUD
    hudWindow.setIgnoreMouseEvents(false);

    // Load HUD HTML
    hudWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(getHUDHTML())}`);

    // Set opacity
    if (hudConfig.opacity !== undefined) {
        hudWindow.setOpacity(hudConfig.opacity);
    }

    hudWindow.on('closed', () => {
        hudWindow = null;
    });

    console.log('🖥️ HUD window created');
    return hudWindow;
}

/**
 * Get the HUD window instance
 */
export function getHUDWindow(): BrowserWindow | null {
    return hudWindow;
}

/**
 * Close the HUD window
 */
export function closeHUDWindow(): void {
    if (hudWindow) {
        hudWindow.close();
        hudWindow = null;
    }
}

/**
 * Update HUD data
 */
export function updateHUD(data: HUDData): void {
    if (hudWindow && !hudWindow.isDestroyed()) {
        hudWindow.webContents.send('hud:update', data);
    }
}

/**
 * Show AI coaching message
 */
export function showCoachingMessage(message: string, type: 'info' | 'warning' | 'success' = 'info'): void {
    if (hudWindow && !hudWindow.isDestroyed()) {
        hudWindow.webContents.send('hud:coaching', { message, type });
    }
}

/**
 * Update connection status on HUD
 */
export function updateHUDStatus(status: { cloudConnected: boolean; simConnected: boolean; sending: boolean }): void {
    if (hudWindow && !hudWindow.isDestroyed()) {
        hudWindow.webContents.send('hud:status', status);
    }
}

export interface HUDData {
    speed: number;
    gear: number;
    rpm: number;
    position: number;
    lap: number;
    gapAhead: number | null;
    gapBehind: number | null;
    fuelLaps: number | null;
}

// IPC handlers for HUD interaction
ipcMain.on('hud:enableMouse', () => {
    hudWindow?.setIgnoreMouseEvents(false);
});

ipcMain.on('hud:disableMouse', () => {
    hudWindow?.setIgnoreMouseEvents(true, { forward: true });
});

ipcMain.on('hud:move', (_, delta: { x: number; y: number }) => {
    if (hudWindow) {
        const [x, y] = hudWindow.getPosition();
        hudWindow.setPosition(x + delta.x, y + delta.y);
    }
});

/**
 * HUD HTML
 */
function getHUDHTML(): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Ok, Box Box Relay</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body {
            background: transparent;
            overflow: hidden;
            user-select: none;
            -webkit-user-select: none;
        }
        body {
            font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
            color: #fff;
            padding: 8px;
        }
        .hud-container {
            background: rgba(0, 0, 0, 0.85);
            border-radius: 12px;
            padding: 16px 20px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.15);
            -webkit-app-region: drag;
            cursor: move;
            min-width: 180px;
        }
        .logo {
            text-align: center;
            margin-bottom: 12px;
            font-size: 16px;
            font-weight: 700;
            letter-spacing: 1px;
        }
        .logo .ok { color: #fff; }
        .logo .box { color: #00d9ff; }
        .status-row {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
        }
        .status-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #666;
        }
        .status-dot.connected { background: #4ade80; }
        .status-dot.disconnected { background: #f87171; }
        .status-dot.sending { background: #00d9ff; animation: pulse 1s infinite; }
        .status-label {
            font-size: 13px;
            font-weight: 500;
        }
        .status-value {
            font-size: 13px;
            opacity: 0.7;
            margin-left: auto;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
        }
    </style>
</head>
<body>
    <div class="hud-container">
        <div class="logo"><span class="ok">OK,</span> <span class="box">BOX BOX</span></div>
        <div class="status-row">
            <div class="status-dot" id="cloudDot"></div>
            <span class="status-label">Cloud</span>
            <span class="status-value" id="cloudStatus">Connecting...</span>
        </div>
        <div class="status-row">
            <div class="status-dot" id="dataDot"></div>
            <span class="status-label">Data</span>
            <span class="status-value" id="dataStatus">Waiting...</span>
        </div>
    </div>
    <script>
        const cloudDot = document.getElementById('cloudDot');
        const cloudStatus = document.getElementById('cloudStatus');
        const dataDot = document.getElementById('dataDot');
        const dataStatus = document.getElementById('dataStatus');
        
        // Listen for status updates
        window.electronAPI?.onStatusUpdate?.((data) => {
            // Cloud connection status
            if (data.cloudConnected) {
                cloudDot.className = 'status-dot connected';
                cloudStatus.textContent = 'Connected';
            } else {
                cloudDot.className = 'status-dot disconnected';
                cloudStatus.textContent = 'Disconnected';
            }
            
            // Data sending status
            if (data.sending) {
                dataDot.className = 'status-dot sending';
                dataStatus.textContent = 'Sending...';
            } else if (data.simConnected) {
                dataDot.className = 'status-dot connected';
                dataStatus.textContent = 'Ready';
            } else {
                dataDot.className = 'status-dot';
                dataStatus.textContent = 'Waiting for sim';
            }
        });
    </script>
</body>
</html>`;
}
