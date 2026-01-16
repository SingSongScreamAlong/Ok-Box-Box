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

/**
 * Send telemetry data to HUD for display
 */
export function updateHUDTelemetry(data: {
    speed: number;
    gear: number;
    rpm: number;
    lap: number;
    position: number;
    fuelPct: number;
    fuelLaps?: number;
}): void {
    if (hudWindow && !hudWindow.isDestroyed()) {
        hudWindow.webContents.send('hud:telemetry', data);
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
 * HUD HTML - Full Driver HUD with telemetry display
 */
function getHUDHTML(): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Ok, Box Box Driver HUD</title>
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
            background: rgba(0, 0, 0, 0.9);
            border-radius: 12px;
            padding: 12px 16px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            -webkit-app-region: drag;
            cursor: move;
            min-width: 220px;
        }
        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 10px;
            padding-bottom: 8px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .logo {
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 1px;
        }
        .logo .ok { color: #fff; }
        .logo .box { color: #00d9ff; }
        .status-dots {
            display: flex;
            gap: 6px;
        }
        .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #444;
        }
        .status-dot.connected { background: #4ade80; }
        .status-dot.sending { background: #00d9ff; animation: pulse 1s infinite; }
        
        /* Main telemetry display */
        .telemetry-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
        }
        .telemetry-item {
            text-align: center;
        }
        .telemetry-value {
            font-size: 24px;
            font-weight: 700;
            font-variant-numeric: tabular-nums;
            line-height: 1;
        }
        .telemetry-label {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
            opacity: 0.5;
            margin-top: 2px;
        }
        
        /* Gear display - larger */
        .gear-display {
            grid-column: span 2;
            text-align: center;
            margin: 8px 0;
        }
        .gear-value {
            font-size: 48px;
            font-weight: 800;
            line-height: 1;
            color: #00d9ff;
        }
        .gear-label {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
            opacity: 0.5;
        }
        
        /* Fuel bar */
        .fuel-bar-container {
            grid-column: span 2;
            margin-top: 8px;
        }
        .fuel-bar-label {
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            margin-bottom: 4px;
        }
        .fuel-bar {
            height: 6px;
            background: rgba(255,255,255,0.1);
            border-radius: 3px;
            overflow: hidden;
        }
        .fuel-bar-fill {
            height: 100%;
            background: linear-gradient(90deg, #f87171, #fbbf24, #4ade80);
            transition: width 0.3s;
        }
        
        /* Position badge */
        .position-badge {
            position: absolute;
            top: -4px;
            right: -4px;
            background: #00d9ff;
            color: #000;
            font-size: 14px;
            font-weight: 800;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        /* Coaching message */
        .coaching-message {
            display: none;
            grid-column: span 2;
            margin-top: 8px;
            padding: 8px;
            border-radius: 6px;
            font-size: 12px;
            text-align: center;
        }
        .coaching-message.visible { display: block; }
        .coaching-message.info { background: rgba(0, 217, 255, 0.2); border: 1px solid rgba(0, 217, 255, 0.3); }
        .coaching-message.warning { background: rgba(251, 191, 36, 0.2); border: 1px solid rgba(251, 191, 36, 0.3); }
        .coaching-message.success { background: rgba(74, 222, 128, 0.2); border: 1px solid rgba(74, 222, 128, 0.3); }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
        }
        
        .hidden { display: none; }
    </style>
</head>
<body>
    <div class="hud-container" style="position: relative;">
        <div class="position-badge" id="position">-</div>
        
        <div class="header">
            <div class="logo"><span class="ok">OK,</span> <span class="box">BOX BOX</span></div>
            <div class="status-dots">
                <div class="status-dot" id="cloudDot" title="Cloud"></div>
                <div class="status-dot" id="dataDot" title="Data"></div>
            </div>
        </div>
        
        <div class="gear-display">
            <div class="gear-value" id="gear">N</div>
            <div class="gear-label">Gear</div>
        </div>
        
        <div class="telemetry-grid">
            <div class="telemetry-item">
                <div class="telemetry-value" id="speed">0</div>
                <div class="telemetry-label">KM/H</div>
            </div>
            <div class="telemetry-item">
                <div class="telemetry-value" id="rpm">0</div>
                <div class="telemetry-label">RPM</div>
            </div>
            <div class="telemetry-item">
                <div class="telemetry-value" id="lap">0</div>
                <div class="telemetry-label">Lap</div>
            </div>
            <div class="telemetry-item">
                <div class="telemetry-value" id="fuelLaps">--</div>
                <div class="telemetry-label">Fuel Laps</div>
            </div>
            
            <div class="fuel-bar-container">
                <div class="fuel-bar-label">
                    <span>FUEL</span>
                    <span id="fuelPct">0%</span>
                </div>
                <div class="fuel-bar">
                    <div class="fuel-bar-fill" id="fuelBar" style="width: 0%"></div>
                </div>
            </div>
            
            <div class="coaching-message" id="coaching"></div>
        </div>
    </div>
    <script>
        const cloudDot = document.getElementById('cloudDot');
        const dataDot = document.getElementById('dataDot');
        const gearEl = document.getElementById('gear');
        const speedEl = document.getElementById('speed');
        const rpmEl = document.getElementById('rpm');
        const lapEl = document.getElementById('lap');
        const positionEl = document.getElementById('position');
        const fuelLapsEl = document.getElementById('fuelLaps');
        const fuelPctEl = document.getElementById('fuelPct');
        const fuelBarEl = document.getElementById('fuelBar');
        const coachingEl = document.getElementById('coaching');
        
        // Listen for status updates
        window.electronAPI?.onStatusUpdate?.((data) => {
            cloudDot.className = data.cloudConnected ? 'status-dot connected' : 'status-dot';
            dataDot.className = data.sending ? 'status-dot sending' : (data.simConnected ? 'status-dot connected' : 'status-dot');
        });
        
        // Listen for telemetry updates
        window.electronAPI?.onTelemetryUpdate?.((data) => {
            // Gear
            const gear = data.gear;
            gearEl.textContent = gear === -1 ? 'R' : gear === 0 ? 'N' : gear.toString();
            
            // Speed (m/s to km/h)
            speedEl.textContent = Math.round(data.speed * 3.6);
            
            // RPM (divide by 1000 for display)
            rpmEl.textContent = (data.rpm / 1000).toFixed(1) + 'k';
            
            // Lap
            lapEl.textContent = data.lap || 0;
            
            // Position
            positionEl.textContent = data.position || '-';
            
            // Fuel
            if (data.fuelLaps !== null && data.fuelLaps !== undefined) {
                fuelLapsEl.textContent = data.fuelLaps.toFixed(1);
            }
            const fuelPct = Math.round((data.fuelPct || 0) * 100);
            fuelPctEl.textContent = fuelPct + '%';
            fuelBarEl.style.width = fuelPct + '%';
        });
        
        // Listen for coaching messages
        window.electronAPI?.onCoachingMessage?.((data) => {
            coachingEl.textContent = data.message;
            coachingEl.className = 'coaching-message visible ' + data.type;
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                coachingEl.className = 'coaching-message';
            }, 5000);
        });
    </script>
</body>
</html>`;
}
