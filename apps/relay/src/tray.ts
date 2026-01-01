/**
 * Tray Manager
 * 
 * Manages the system tray icon and menu.
 * Shows different menus based on login state.
 */

import { Tray, Menu, nativeImage, shell, BrowserWindow, app } from 'electron';
import * as path from 'path';
import { AuthManager } from './auth';

export class TrayManager {
    private tray: Tray;
    private authManager: AuthManager;
    private loginWindow: BrowserWindow | null = null;

    constructor(authManager: AuthManager) {
        this.authManager = authManager;

        // Create tray icon (use a simple icon or placeholder)
        const iconPath = path.join(__dirname, '../assets/tray-icon.png');
        let icon: Electron.NativeImage;

        try {
            icon = nativeImage.createFromPath(iconPath);
            if (icon.isEmpty()) {
                // Fallback: create a simple colored icon
                icon = this.createDefaultIcon();
            }
        } catch {
            icon = this.createDefaultIcon();
        }

        this.tray = new Tray(icon);
        this.tray.setToolTip('Ok, Box Box Relay');

        // Start with logged out state
        this.setLoggedOut();
    }

    /**
     * Create a default icon if none exists
     */
    private createDefaultIcon(): Electron.NativeImage {
        // Create a 16x16 icon (simple approach)
        return nativeImage.createEmpty();
    }

    /**
     * Set tray menu for logged in state
     */
    setLoggedIn(displayName: string): void {
        const menu = Menu.buildFromTemplate([
            {
                label: `✅ ${displayName}`,
                enabled: false
            },
            { type: 'separator' },
            {
                label: '🏎️ Relay Status',
                submenu: [
                    { label: 'Checking...', enabled: false }
                ]
            },
            {
                label: '📊 Open Dashboard',
                click: () => {
                    shell.openExternal('https://coral-app-x988a.ondigitalocean.app/team/live');
                }
            },
            { type: 'separator' },
            {
                label: '⚙️ Settings',
                click: () => this.openSettings()
            },
            {
                label: '🚪 Sign Out',
                click: async () => {
                    await this.authManager.logout();
                    this.setLoggedOut();
                }
            },
            { type: 'separator' },
            {
                label: 'Quit',
                click: () => app.quit()
            }
        ]);

        this.tray.setContextMenu(menu);
    }

    /**
     * Set tray menu for logged out state
     */
    setLoggedOut(): void {
        const menu = Menu.buildFromTemplate([
            {
                label: '🔐 Not Logged In',
                enabled: false
            },
            { type: 'separator' },
            {
                label: '🔑 Sign In...',
                click: () => this.openLogin()
            },
            { type: 'separator' },
            {
                label: 'Quit',
                click: () => app.quit()
            }
        ]);

        this.tray.setContextMenu(menu);
    }

    /**
     * Update relay status in menu
     */
    updateStatus(status: { connected: boolean; simRunning: boolean; viewers: number }): void {
        const bootstrap = this.authManager.getBootstrap();
        if (!bootstrap) return;

        const statusLabel = status.simRunning
            ? `🟢 Connected - ${status.viewers} viewer(s)`
            : status.connected
                ? '🟡 Waiting for sim...'
                : '🔴 Disconnected';

        const menu = Menu.buildFromTemplate([
            {
                label: `✅ ${bootstrap.user.displayName}`,
                enabled: false
            },
            { type: 'separator' },
            {
                label: statusLabel,
                enabled: false
            },
            {
                label: '📊 Open Dashboard',
                click: () => {
                    shell.openExternal('https://coral-app-x988a.ondigitalocean.app/team/live');
                }
            },
            { type: 'separator' },
            {
                label: '⚙️ Settings',
                click: () => this.openSettings()
            },
            {
                label: '🚪 Sign Out',
                click: async () => {
                    await this.authManager.logout();
                    this.setLoggedOut();
                }
            },
            { type: 'separator' },
            {
                label: 'Quit',
                click: () => app.quit()
            }
        ]);

        this.tray.setContextMenu(menu);
    }

    /**
     * Set current mode and update tray menu
     */
    setMode(mode: 'driver' | 'team' | 'racecontrol'): void {
        const bootstrap = this.authManager.getBootstrap();
        if (!bootstrap) return;

        const modeLabels: Record<string, string> = {
            driver: '🏎️ Driver HUD',
            team: '📊 Team Pit Wall',
            racecontrol: '⚖️ Race Control'
        };

        const menu = Menu.buildFromTemplate([
            {
                label: `✅ ${bootstrap.user.displayName}`,
                enabled: false
            },
            {
                label: `Mode: ${modeLabels[mode] || mode}`,
                enabled: false
            },
            { type: 'separator' },
            {
                label: '🔄 Switch Mode',
                submenu: [
                    {
                        label: '🏎️ Driver HUD',
                        type: 'radio',
                        checked: mode === 'driver',
                        click: () => this.switchModeCallback?.('driver')
                    },
                    {
                        label: '📊 Team Pit Wall',
                        type: 'radio',
                        checked: mode === 'team',
                        click: () => this.switchModeCallback?.('team')
                    },
                    {
                        label: '⚖️ Race Control',
                        type: 'radio',
                        checked: mode === 'racecontrol',
                        click: () => this.switchModeCallback?.('racecontrol')
                    }
                ]
            },
            { type: 'separator' },
            {
                label: '📊 Open Dashboard',
                click: () => {
                    shell.openExternal('https://coral-app-x988a.ondigitalocean.app/home');
                }
            },
            {
                label: '⚙️ Settings',
                click: () => this.openSettings()
            },
            {
                label: '🚪 Sign Out',
                click: async () => {
                    await this.authManager.logout();
                    this.setLoggedOut();
                }
            },
            { type: 'separator' },
            {
                label: 'Quit',
                click: () => app.quit()
            }
        ]);

        this.tray.setContextMenu(menu);
    }

    // Callback for mode switching from tray menu
    private switchModeCallback: ((mode: 'driver' | 'team' | 'racecontrol') => void) | null = null;

    /**
     * Set callback for mode switching from tray menu
     */
    onModeSwitch(callback: (mode: 'driver' | 'team' | 'racecontrol') => void): void {
        this.switchModeCallback = callback;
    }

    /**
     * Open login window
     */
    private openLogin(): void {
        if (this.loginWindow) {
            this.loginWindow.focus();
            return;
        }

        this.loginWindow = new BrowserWindow({
            width: 400,
            height: 500,
            resizable: false,
            title: 'Sign In - Ok, Box Box',
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, 'preload.js')
            }
        });

        // Load login HTML (embedded)
        this.loginWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(this.getLoginHTML())}`);

        this.loginWindow.on('closed', () => {
            this.loginWindow = null;
        });
    }

    /**
     * Open settings window
     */
    private openSettings(): void {
        // TODO: Implement settings window
        console.log('Settings not yet implemented');
    }

    /**
     * Get login HTML
     */
    private getLoginHTML(): string {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Sign In</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: #fff;
            padding: 40px;
            min-height: 100vh;
        }
        .logo { text-align: center; margin-bottom: 30px; }
        .logo h1 { font-size: 24px; font-weight: 600; }
        .logo span { color: #00d9ff; }
        form { max-width: 300px; margin: 0 auto; }
        .field { margin-bottom: 20px; }
        label { display: block; margin-bottom: 8px; font-size: 14px; opacity: 0.8; }
        input {
            width: 100%;
            padding: 12px;
            font-size: 16px;
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 8px;
            background: rgba(255,255,255,0.1);
            color: #fff;
        }
        input:focus { outline: none; border-color: #00d9ff; }
        button {
            width: 100%;
            padding: 14px;
            font-size: 16px;
            font-weight: 600;
            border: none;
            border-radius: 8px;
            background: linear-gradient(90deg, #00d9ff 0%, #0099ff 100%);
            color: #fff;
            cursor: pointer;
            margin-top: 10px;
        }
        button:hover { opacity: 0.9; }
        .error { color: #ff6b6b; font-size: 14px; margin-top: 10px; text-align: center; }
    </style>
</head>
<body>
    <div class="logo">
        <h1>Ok, <span>Box Box</span></h1>
        <p style="opacity: 0.6; margin-top: 8px;">Relay Agent</p>
    </div>
    <form id="loginForm">
        <div class="field">
            <label>Email</label>
            <input type="email" id="email" required>
        </div>
        <div class="field">
            <label>Password</label>
            <input type="password" id="password" required>
        </div>
        <button type="submit">Sign In</button>
        <div id="error" class="error"></div>
    </form>
    <script>
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const errorEl = document.getElementById('error');
            
            try {
                const result = await window.electronAPI.login(email, password);
                if (result.success) {
                    window.close();
                } else {
                    errorEl.textContent = result.error || 'Login failed';
                }
            } catch (err) {
                errorEl.textContent = 'Connection error';
            }
        });
    </script>
</body>
</html>`;
    }
}
