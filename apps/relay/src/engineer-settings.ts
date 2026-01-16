/**
 * Engineer Settings Window
 * 
 * Settings UI for the Voice Engineer - allows users to configure
 * what the race engineer says and how.
 */

import { BrowserWindow, ipcMain } from 'electron';
import { getSettings, updateSettings, VoiceSettings, speak } from './voice-engineer.js';

let settingsWindow: BrowserWindow | null = null;

/**
 * Create and show the engineer settings window
 */
export function showEngineerSettings(): void {
    if (settingsWindow && !settingsWindow.isDestroyed()) {
        settingsWindow.focus();
        return;
    }

    settingsWindow = new BrowserWindow({
        width: 400,
        height: 520,
        title: 'Race Engineer Settings',
        resizable: false,
        minimizable: false,
        maximizable: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: undefined // No preload needed, using inline script
        }
    });

    const settings = getSettings();

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Race Engineer Settings</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: #e0e0e0;
            padding: 24px;
            min-height: 100vh;
        }
        h1 {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 8px;
            color: #fff;
        }
        .subtitle {
            font-size: 12px;
            color: #888;
            margin-bottom: 24px;
        }
        .section {
            background: rgba(255,255,255,0.05);
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 16px;
        }
        .section-title {
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #888;
            margin-bottom: 12px;
        }
        .toggle-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .toggle-row:last-child { border-bottom: none; }
        .toggle-label {
            font-size: 14px;
        }
        .toggle-desc {
            font-size: 11px;
            color: #666;
            margin-top: 2px;
        }
        .toggle {
            position: relative;
            width: 44px;
            height: 24px;
        }
        .toggle input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        .toggle-slider {
            position: absolute;
            cursor: pointer;
            top: 0; left: 0; right: 0; bottom: 0;
            background-color: #333;
            border-radius: 24px;
            transition: 0.2s;
        }
        .toggle-slider:before {
            position: absolute;
            content: "";
            height: 18px;
            width: 18px;
            left: 3px;
            bottom: 3px;
            background-color: #666;
            border-radius: 50%;
            transition: 0.2s;
        }
        input:checked + .toggle-slider {
            background-color: #4CAF50;
        }
        input:checked + .toggle-slider:before {
            transform: translateX(20px);
            background-color: #fff;
        }
        .slider-row {
            padding: 12px 0;
        }
        .slider-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }
        .slider-label { font-size: 14px; }
        .slider-value { font-size: 14px; color: #4CAF50; }
        input[type="range"] {
            width: 100%;
            height: 4px;
            background: #333;
            border-radius: 2px;
            outline: none;
            -webkit-appearance: none;
        }
        input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 16px;
            height: 16px;
            background: #4CAF50;
            border-radius: 50%;
            cursor: pointer;
        }
        .master-toggle {
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 16px;
        }
        .master-toggle.disabled {
            background: linear-gradient(135deg, #333 0%, #2a2a2a 100%);
        }
        .test-btn {
            width: 100%;
            padding: 12px;
            background: #333;
            border: none;
            border-radius: 6px;
            color: #fff;
            font-size: 14px;
            cursor: pointer;
            margin-top: 8px;
            transition: background 0.2s;
        }
        .test-btn:hover { background: #444; }
        .test-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    </style>
</head>
<body>
    <h1>🎙️ Race Engineer</h1>
    <p class="subtitle">Configure your race engineer voice assistant</p>

    <div class="master-toggle ${settings.enabled ? '' : 'disabled'}" id="masterSection">
        <div class="toggle-row">
            <div>
                <div class="toggle-label" style="font-weight: 600;">Voice Engineer</div>
                <div class="toggle-desc">Enable spoken race engineer messages</div>
            </div>
            <label class="toggle">
                <input type="checkbox" id="enabled" ${settings.enabled ? 'checked' : ''}>
                <span class="toggle-slider"></span>
            </label>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Message Types</div>
        
        <div class="toggle-row">
            <div>
                <div class="toggle-label">Pit Calls</div>
                <div class="toggle-desc">"Box, box" and pit window alerts</div>
            </div>
            <label class="toggle">
                <input type="checkbox" id="speakPitCalls" ${settings.speakPitCalls ? 'checked' : ''}>
                <span class="toggle-slider"></span>
            </label>
        </div>

        <div class="toggle-row">
            <div>
                <div class="toggle-label">Cautions</div>
                <div class="toggle-desc">Yellow flags, incidents, safety car</div>
            </div>
            <label class="toggle">
                <input type="checkbox" id="speakCautions" ${settings.speakCautions ? 'checked' : ''}>
                <span class="toggle-slider"></span>
            </label>
        </div>

        <div class="toggle-row">
            <div>
                <div class="toggle-label">Fuel Warnings</div>
                <div class="toggle-desc">Low fuel and pit window alerts</div>
            </div>
            <label class="toggle">
                <input type="checkbox" id="speakFuel" ${settings.speakFuel ? 'checked' : ''}>
                <span class="toggle-slider"></span>
            </label>
        </div>

        <div class="toggle-row">
            <div>
                <div class="toggle-label">Gap Updates</div>
                <div class="toggle-desc">Gap to car ahead/behind</div>
            </div>
            <label class="toggle">
                <input type="checkbox" id="speakGaps" ${settings.speakGaps ? 'checked' : ''}>
                <span class="toggle-slider"></span>
            </label>
        </div>

        <div class="toggle-row">
            <div>
                <div class="toggle-label">Opportunities</div>
                <div class="toggle-desc">"You're clear", overtake chances</div>
            </div>
            <label class="toggle">
                <input type="checkbox" id="speakOpportunities" ${settings.speakOpportunities ? 'checked' : ''}>
                <span class="toggle-slider"></span>
            </label>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Voice Settings</div>
        
        <div class="slider-row">
            <div class="slider-header">
                <span class="slider-label">Speed</span>
                <span class="slider-value" id="rateValue">${settings.rate.toFixed(1)}x</span>
            </div>
            <input type="range" id="rate" min="0.5" max="2.0" step="0.1" value="${settings.rate}">
        </div>

        <div class="slider-row">
            <div class="slider-header">
                <span class="slider-label">Volume</span>
                <span class="slider-value" id="volumeValue">${Math.round(settings.volume * 100)}%</span>
            </div>
            <input type="range" id="volume" min="0" max="1" step="0.1" value="${settings.volume}">
        </div>

        <button class="test-btn" id="testBtn">Test Voice</button>
    </div>

    <script>
        // Send settings changes to main process
        function sendUpdate(key, value) {
            // Use postMessage to parent (will be caught by main process)
            window.postMessage({ type: 'settings-update', key, value }, '*');
        }

        // Master toggle
        document.getElementById('enabled').addEventListener('change', (e) => {
            const section = document.getElementById('masterSection');
            section.classList.toggle('disabled', !e.target.checked);
            sendUpdate('enabled', e.target.checked);
        });

        // Message type toggles
        ['speakPitCalls', 'speakCautions', 'speakFuel', 'speakGaps', 'speakOpportunities'].forEach(id => {
            document.getElementById(id).addEventListener('change', (e) => {
                sendUpdate(id, e.target.checked);
            });
        });

        // Sliders
        document.getElementById('rate').addEventListener('input', (e) => {
            document.getElementById('rateValue').textContent = parseFloat(e.target.value).toFixed(1) + 'x';
            sendUpdate('rate', parseFloat(e.target.value));
        });

        document.getElementById('volume').addEventListener('input', (e) => {
            document.getElementById('volumeValue').textContent = Math.round(e.target.value * 100) + '%';
            sendUpdate('volume', parseFloat(e.target.value));
        });

        // Test button
        document.getElementById('testBtn').addEventListener('click', () => {
            sendUpdate('test', true);
        });
    </script>
</body>
</html>
    `;

    settingsWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    // Handle settings updates from the window
    settingsWindow.webContents.on('console-message', (_event, _level, message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'settings-update') {
                if (data.key === 'test') {
                    speak('Ok, Box Box. Radio check. How copy?', 'normal');
                } else {
                    updateSettings({ [data.key]: data.value });
                }
            }
        } catch {
            // Not a settings message
        }
    });

    // Listen for postMessage from the window
    settingsWindow.webContents.executeJavaScript(`
        window.addEventListener('message', (e) => {
            if (e.data.type === 'settings-update') {
                console.log(JSON.stringify(e.data));
            }
        });
    `);

    settingsWindow.on('closed', () => {
        settingsWindow = null;
    });
}

/**
 * Close the settings window if open
 */
export function closeEngineerSettings(): void {
    if (settingsWindow && !settingsWindow.isDestroyed()) {
        settingsWindow.close();
    }
}
