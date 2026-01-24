/**
 * Auto-Updater Module
 * 
 * Checks for relay updates on startup and periodically.
 * Shows notification when update is available.
 */

import { app, dialog, shell, Notification } from 'electron';
import fetch from 'node-fetch';

const API_URL = process.env.OKBOXBOX_API_URL || 'https://octopus-app-qsi3i.ondigitalocean.app';
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours

interface VersionInfo {
    version: string;
    download_url: string;
    release_notes: string;
    min_supported_version: string;
}

let updateCheckInterval: NodeJS.Timeout | null = null;
let lastNotifiedVersion: string | null = null;

/**
 * Compare semantic versions
 * Returns: 1 if a > b, -1 if a < b, 0 if equal
 */
function compareVersions(a: string, b: string): number {
    const parseVersion = (v: string) => {
        const clean = v.replace(/^v/, '').split('-')[0];
        return clean.split('.').map(n => parseInt(n, 10) || 0);
    };

    const aParts = parseVersion(a);
    const bParts = parseVersion(b);

    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aVal = aParts[i] || 0;
        const bVal = bParts[i] || 0;
        if (aVal > bVal) return 1;
        if (aVal < bVal) return -1;
    }
    return 0;
}

/**
 * Get current app version from package.json
 */
function getCurrentVersion(): string {
    return app.getVersion() || '1.0.0-alpha';
}

/**
 * Check for updates from the server
 */
export async function checkForUpdates(silent: boolean = true): Promise<VersionInfo | null> {
    try {
        const response = await fetch(`${API_URL}/api/relay/version`);
        
        if (!response.ok) {
            console.log('⚠️ Update check failed:', response.status);
            return null;
        }

        const versionInfo = await response.json() as VersionInfo;
        const currentVersion = getCurrentVersion();

        console.log(`🔄 Version check: current=${currentVersion}, latest=${versionInfo.version}`);

        // Check if update is available
        if (compareVersions(versionInfo.version, currentVersion) > 0) {
            console.log(`🆕 Update available: ${versionInfo.version}`);

            // Check if version is below minimum supported
            if (compareVersions(currentVersion, versionInfo.min_supported_version) < 0) {
                // Force update required
                showForceUpdateDialog(versionInfo);
                return versionInfo;
            }

            // Optional update - show notification (but not repeatedly for same version)
            if (!silent && lastNotifiedVersion !== versionInfo.version) {
                showUpdateNotification(versionInfo);
                lastNotifiedVersion = versionInfo.version;
            }

            return versionInfo;
        }

        console.log('✅ Relay is up to date');
        return null;

    } catch (error) {
        console.error('❌ Update check error:', error);
        return null;
    }
}

/**
 * Show system notification for available update
 */
function showUpdateNotification(info: VersionInfo): void {
    if (!Notification.isSupported()) {
        console.log('Notifications not supported on this system');
        return;
    }

    const notification = new Notification({
        title: 'Ok, Box Box Update Available',
        body: `Version ${info.version} is available. Click to download.`,
        icon: undefined // Will use app icon
    });

    notification.on('click', () => {
        shell.openExternal(info.download_url);
    });

    notification.show();
}

/**
 * Show dialog for forced update (version below minimum)
 */
function showForceUpdateDialog(info: VersionInfo): void {
    dialog.showMessageBox({
        type: 'warning',
        title: 'Update Required',
        message: `Your relay version is no longer supported.\n\nCurrent: ${getCurrentVersion()}\nRequired: ${info.min_supported_version}+\nLatest: ${info.version}`,
        detail: info.release_notes,
        buttons: ['Download Update', 'Quit'],
        defaultId: 0,
        cancelId: 1
    }).then(({ response }) => {
        if (response === 0) {
            shell.openExternal(info.download_url);
        }
        // Quit app regardless - can't continue with unsupported version
        app.quit();
    });
}

/**
 * Show dialog for optional update
 */
export function showUpdateDialog(info: VersionInfo): void {
    dialog.showMessageBox({
        type: 'info',
        title: 'Update Available',
        message: `A new version of Ok, Box Box Relay is available.\n\nCurrent: ${getCurrentVersion()}\nLatest: ${info.version}`,
        detail: info.release_notes,
        buttons: ['Download', 'Later'],
        defaultId: 0,
        cancelId: 1
    }).then(({ response }) => {
        if (response === 0) {
            shell.openExternal(info.download_url);
        }
    });
}

/**
 * Start periodic update checks
 */
export function startUpdateChecker(): void {
    // Check immediately on startup (silent)
    checkForUpdates(true);

    // Then check periodically
    updateCheckInterval = setInterval(() => {
        checkForUpdates(false); // Show notification if update found
    }, CHECK_INTERVAL_MS);

    console.log('🔄 Auto-updater started (checking every 4 hours)');
}

/**
 * Stop periodic update checks
 */
export function stopUpdateChecker(): void {
    if (updateCheckInterval) {
        clearInterval(updateCheckInterval);
        updateCheckInterval = null;
    }
}

/**
 * Manual update check (from menu)
 */
export async function manualUpdateCheck(): Promise<void> {
    const info = await checkForUpdates(true);
    
    if (info) {
        showUpdateDialog(info);
    } else {
        dialog.showMessageBox({
            type: 'info',
            title: 'No Updates',
            message: 'You are running the latest version.',
            detail: `Current version: ${getCurrentVersion()}`,
            buttons: ['OK']
        });
    }
}
