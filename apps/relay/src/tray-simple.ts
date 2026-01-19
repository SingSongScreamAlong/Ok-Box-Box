/**
 * Simplified Tray Manager
 * 
 * Minimal system tray with just:
 * - Status indicator
 * - Open Dashboard
 * - Quit
 */

import { Tray, Menu, app, nativeImage, shell } from 'electron';
import * as path from 'path';

export interface RelayStatus {
    iRacingDetected: boolean;
    serverConnected: boolean;
    sending: boolean;
    error: string | null;
}

export class TrayManager {
    private tray: Tray;
    private currentStatus: RelayStatus = {
        iRacingDetected: false,
        serverConnected: false,
        sending: false,
        error: null
    };

    constructor() {
        // Try to load icon from multiple locations
        let icon: Electron.NativeImage = nativeImage.createEmpty();
        const { app } = require('electron');
        
        const iconPaths = [
            path.join(__dirname, '../assets/icon.png'),
            path.join(process.resourcesPath || '', 'assets/icon.png'),
            path.join(app.getAppPath(), '../assets/icon.png'),
            path.join(__dirname, '../assets/icon.ico'),
            path.join(process.resourcesPath || '', 'assets/icon.ico'),
            path.join(app.getAppPath(), '../assets/icon.ico'),
        ];

        for (const iconPath of iconPaths) {
            try {
                const fs = require('fs');
                if (fs.existsSync(iconPath)) {
                    icon = nativeImage.createFromPath(iconPath);
                    if (!icon.isEmpty()) {
                        console.log('✅ Loaded tray icon from:', iconPath);
                        break;
                    }
                }
            } catch {}
        }

        if (icon.isEmpty()) {
            console.log('⚠️ No tray icon found, using default');
            icon = this.createDefaultIcon();
        }

        this.tray = new Tray(icon);
        this.tray.setToolTip('Ok, Box Box Relay');
        this.updateMenu();
    }

    private createDefaultIcon(): Electron.NativeImage {
        return nativeImage.createEmpty();
    }

    private isValid(): boolean {
        return this.tray && !this.tray.isDestroyed();
    }

    /**
     * Update status and refresh menu
     */
    updateStatus(status: Partial<RelayStatus>): void {
        this.currentStatus = { ...this.currentStatus, ...status };
        this.updateMenu();
    }

    /**
     * Update the tray menu based on current status
     */
    private updateMenu(): void {
        if (!this.isValid()) return;

        const statusLabel = this.getStatusLabel();

        const menu = Menu.buildFromTemplate([
            {
                label: '🏎️ Ok, Box Box Relay',
                enabled: false
            },
            { type: 'separator' },
            {
                label: statusLabel,
                enabled: false
            },
            { type: 'separator' },
            {
                label: '📊 Open Dashboard',
                click: () => {
                    shell.openExternal('https://octopus-app-qsi3i.ondigitalocean.app/team/live');
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

    private getStatusLabel(): string {
        if (this.currentStatus.error) {
            return `🔴 Error: ${this.currentStatus.error}`;
        }
        if (!this.currentStatus.serverConnected) {
            return '🟡 Connecting to server...';
        }
        if (!this.currentStatus.iRacingDetected) {
            return '🟢 Waiting for iRacing';
        }
        if (this.currentStatus.sending) {
            return '🔵 Sending telemetry';
        }
        return '🟢 Connected';
    }
}
