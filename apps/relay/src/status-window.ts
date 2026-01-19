/**
 * Relay Status Window
 * 
 * Minimal, unobtrusive status indicator showing:
 * - Connection status (connected/disconnected)
 * - Data flow indicator (sending/idle)
 * - iRacing detection status
 * 
 * Design: Small pill-shaped overlay in corner of screen
 */

import { BrowserWindow, screen } from 'electron';

let statusWindow: BrowserWindow | null = null;

export interface RelayStatus {
    iRacingDetected: boolean;
    serverConnected: boolean;
    sending: boolean;
    lastDataTime: number | null;
    error: string | null;
}

let currentStatus: RelayStatus = {
    iRacingDetected: false,
    serverConnected: false,
    sending: false,
    lastDataTime: null,
    error: null
};

/**
 * Create the minimal status window
 */
export function createStatusWindow(): BrowserWindow {
    if (statusWindow && !statusWindow.isDestroyed()) {
        return statusWindow;
    }

    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    statusWindow = new BrowserWindow({
        width: 200,
        height: 60,
        x: width - 220,
        y: height - 80,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: false,  // Show in taskbar so user can minimize
        resizable: false,
        hasShadow: false,
        focusable: true,
        movable: true,
        minimizable: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    // Allow mouse events for dragging
    statusWindow.setIgnoreMouseEvents(false);

    // Load status UI
    statusWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(getStatusHTML())}`);

    // Listen for minimize signal from renderer
    statusWindow.webContents.on('console-message', (_event, _level, message) => {
        if (message === 'MINIMIZE' && statusWindow && !statusWindow.isDestroyed()) {
            statusWindow.minimize();
        }
    });

    statusWindow.on('closed', () => {
        statusWindow = null;
    });

    console.log('📊 Status window created');
    return statusWindow;
}

/**
 * Update the status display
 */
export function updateStatus(status: Partial<RelayStatus>): void {
    currentStatus = { ...currentStatus, ...status };
    
    if (statusWindow && !statusWindow.isDestroyed()) {
        statusWindow.webContents.executeJavaScript(`updateStatus(${JSON.stringify(currentStatus)})`);
    }
}

/**
 * Close the status window
 */
export function closeStatusWindow(): void {
    if (statusWindow && !statusWindow.isDestroyed()) {
        statusWindow.close();
        statusWindow = null;
    }
}

/**
 * Get current status
 */
export function getStatus(): RelayStatus {
    return currentStatus;
}

/**
 * Generate the status window HTML
 */
function getStatusHTML(): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: transparent;
            overflow: hidden;
            -webkit-app-region: no-drag;
        }
        .status-pill {
            display: flex;
            align-items: center;
            gap: 8px;
            background: rgba(20, 20, 30, 0.95);
            border-radius: 25px;
            padding: 8px 14px;
            border: 1px solid rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(10px);
            -webkit-app-region: drag;
            cursor: move;
        }
        .status-pill:hover {
            border-color: rgba(255, 255, 255, 0.3);
        }
        .minimize-btn {
            width: 16px;
            height: 16px;
            border: none;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 50%;
            color: #888;
            font-size: 10px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            -webkit-app-region: no-drag;
            margin-left: auto;
        }
        .minimize-btn:hover {
            background: rgba(255, 255, 255, 0.2);
            color: #fff;
        }
        .indicator {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            transition: all 0.3s ease;
        }
        .indicator.disconnected { background: #ef4444; box-shadow: 0 0 8px #ef4444; }
        .indicator.connecting { background: #f59e0b; box-shadow: 0 0 8px #f59e0b; animation: pulse 1s infinite; }
        .indicator.connected { background: #22c55e; box-shadow: 0 0 8px #22c55e; }
        .indicator.sending { background: #3b82f6; box-shadow: 0 0 12px #3b82f6; animation: pulse 0.5s infinite; }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(0.9); }
        }
        
        .status-text {
            color: #e0e0e0;
            font-size: 11px;
            font-weight: 500;
            white-space: nowrap;
        }
        .status-text.error { color: #ef4444; }
        
        .data-indicator {
            font-size: 10px;
            color: #888;
            margin-left: auto;
        }
        .data-indicator.active { color: #3b82f6; }
    </style>
</head>
<body>
    <div class="status-pill">
        <div id="indicator" class="indicator disconnected"></div>
        <span id="statusText" class="status-text">Starting...</span>
        <button id="minimizeBtn" class="minimize-btn" title="Minimize">−</button>
    </div>
    
    <script>
        // Minimize button - uses IPC to tell main process
        document.getElementById('minimizeBtn').addEventListener('click', () => {
            window.electronAPI?.minimize?.() || console.log('MINIMIZE');
        });
        
        function updateStatus(status) {
            const indicator = document.getElementById('indicator');
            const statusText = document.getElementById('statusText');
            
            // Reset classes
            indicator.className = 'indicator';
            statusText.className = 'status-text';
            
            if (status.error) {
                indicator.classList.add('disconnected');
                statusText.textContent = status.error;
                statusText.classList.add('error');
            } else if (!status.serverConnected) {
                indicator.classList.add('connecting');
                statusText.textContent = 'Connecting...';
            } else if (!status.iRacingDetected) {
                indicator.classList.add('connected');
                statusText.textContent = 'Waiting for iRacing';
            } else if (status.sending) {
                indicator.classList.add('sending');
                statusText.textContent = 'Sending telemetry';
            } else {
                indicator.classList.add('connected');
                statusText.textContent = 'Connected';
            }
        }
        
        // Initial state
        updateStatus({
            iRacingDetected: false,
            serverConnected: false,
            sending: false,
            error: null
        });
    </script>
</body>
</html>
    `;
}
