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
    width: 300,
    height: 200,
    opacity: 0.9
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
        resizable: false,
        hasShadow: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    // Make click-through when not focused (Windows/Mac)
    hudWindow.setIgnoreMouseEvents(true, { forward: true });

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
    <title>Driver HUD</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body {
            background: transparent;
            overflow: hidden;
            user-select: none;
            -webkit-user-select: none;
            -webkit-app-region: no-drag;
        }
        body {
            font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
            color: #fff;
            padding: 16px;
        }
        .hud-container {
            background: rgba(0, 0, 0, 0.7);
            border-radius: 12px;
            padding: 16px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .main-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 12px;
        }
        .speed-block {
            display: flex;
            align-items: baseline;
        }
        .speed {
            font-size: 48px;
            font-weight: 700;
            letter-spacing: -2px;
        }
        .speed-unit {
            font-size: 14px;
            opacity: 0.6;
            margin-left: 4px;
        }
        .gear {
            font-size: 36px;
            font-weight: 600;
            color: #00d9ff;
            background: rgba(0, 217, 255, 0.1);
            width: 50px;
            height: 50px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            font-size: 14px;
        }
        .info-item {
            text-align: center;
        }
        .info-label {
            font-size: 10px;
            text-transform: uppercase;
            opacity: 0.5;
            letter-spacing: 1px;
        }
        .info-value {
            font-size: 18px;
            font-weight: 600;
            margin-top: 2px;
        }
        .info-value.positive { color: #4ade80; }
        .info-value.negative { color: #f87171; }
        .coaching-message {
            margin-top: 12px;
            padding: 10px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 500;
            display: none;
            animation: fadeIn 0.3s ease;
        }
        .coaching-message.visible { display: block; }
        .coaching-message.info { background: rgba(0, 150, 255, 0.3); border-left: 3px solid #0096ff; }
        .coaching-message.warning { background: rgba(255, 180, 0, 0.3); border-left: 3px solid #ffb400; }
        .coaching-message.success { background: rgba(0, 200, 100, 0.3); border-left: 3px solid #00c864; }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-5px); }
            to { opacity: 1; transform: translateY(0); }
        }
    </style>
</head>
<body>
    <div class="hud-container">
        <div class="main-row">
            <div class="speed-block">
                <span class="speed" id="speed">0</span>
                <span class="speed-unit">km/h</span>
            </div>
            <div class="gear" id="gear">N</div>
        </div>
        <div class="info-row">
            <div class="info-item">
                <div class="info-label">Position</div>
                <div class="info-value" id="position">P1</div>
            </div>
            <div class="info-item">
                <div class="info-label">Gap Ahead</div>
                <div class="info-value" id="gapAhead">--</div>
            </div>
            <div class="info-item">
                <div class="info-label">Gap Behind</div>
                <div class="info-value" id="gapBehind">--</div>
            </div>
            <div class="info-item">
                <div class="info-label">Fuel Laps</div>
                <div class="info-value" id="fuelLaps">--</div>
            </div>
        </div>
        <div class="coaching-message" id="coaching"></div>
    </div>
    <script>
        const speedEl = document.getElementById('speed');
        const gearEl = document.getElementById('gear');
        const positionEl = document.getElementById('position');
        const gapAheadEl = document.getElementById('gapAhead');
        const gapBehindEl = document.getElementById('gapBehind');
        const fuelLapsEl = document.getElementById('fuelLaps');
        const coachingEl = document.getElementById('coaching');
        
        let coachingTimeout = null;
        
        // Listen for HUD updates
        window.electronAPI?.onHUDUpdate?.((data) => {
            speedEl.textContent = Math.round(data.speed * 3.6); // m/s to km/h
            gearEl.textContent = data.gear === 0 ? 'N' : data.gear === -1 ? 'R' : data.gear;
            positionEl.textContent = 'P' + data.position;
            
            if (data.gapAhead !== null) {
                gapAheadEl.textContent = '+' + data.gapAhead.toFixed(1) + 's';
                gapAheadEl.className = 'info-value';
            } else {
                gapAheadEl.textContent = '--';
            }
            
            if (data.gapBehind !== null) {
                gapBehindEl.textContent = '-' + data.gapBehind.toFixed(1) + 's';
                gapBehindEl.className = 'info-value negative';
            } else {
                gapBehindEl.textContent = '--';
            }
            
            if (data.fuelLaps !== null) {
                fuelLapsEl.textContent = data.fuelLaps.toFixed(1);
                fuelLapsEl.className = 'info-value ' + (data.fuelLaps < 3 ? 'negative' : '');
            } else {
                fuelLapsEl.textContent = '--';
            }
        });
        
        // Listen for coaching messages
        window.electronAPI?.onCoachingMessage?.((data) => {
            coachingEl.textContent = data.message;
            coachingEl.className = 'coaching-message visible ' + data.type;
            
            if (coachingTimeout) clearTimeout(coachingTimeout);
            coachingTimeout = setTimeout(() => {
                coachingEl.classList.remove('visible');
            }, 5000);
        });
    </script>
</body>
</html>`;
}
