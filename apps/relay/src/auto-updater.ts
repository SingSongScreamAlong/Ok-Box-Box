import { dialog, shell } from 'electron';
import { getRelaySettings, updateRelaySettings } from './settings.js';

interface VersionInfo {
    version: string;
    download_url: string;
    release_notes: string;
    min_supported_version: string;
}

let intervalHandle: NodeJS.Timeout | null = null;

function compareVersions(a: string, b: string): number {
    const aParts = a.split(/[-.]/).map((part) => Number.parseInt(part, 10) || 0);
    const bParts = b.split(/[-.]/).map((part) => Number.parseInt(part, 10) || 0);
    const max = Math.max(aParts.length, bParts.length);
    for (let i = 0; i < max; i += 1) {
        const diff = (aParts[i] || 0) - (bParts[i] || 0);
        if (diff !== 0) return diff;
    }
    return 0;
}

async function fetchVersionInfo(): Promise<VersionInfo | null> {
    const settings = getRelaySettings();
    try {
        const response = await fetch(`${settings.apiUrl}/api/relay/version`);
        if (!response.ok) return null;
        return await response.json() as VersionInfo;
    } catch {
        return null;
    }
}

export async function checkForUpdates(silent = true): Promise<VersionInfo | null> {
    const info = await fetchVersionInfo();
    if (!info) return null;

    const currentVersion = process.env.npm_package_version || '1.0.0-alpha';
    if (compareVersions(info.version, currentVersion) <= 0) {
        if (!silent) {
            await dialog.showMessageBox({
                type: 'info',
                title: 'Ok, Box Box Relay',
                message: 'Relay is up to date.',
            });
        }
        return null;
    }

    const settings = getRelaySettings();
    if (silent && settings.skippedVersion === info.version) {
        return null;
    }

    updateRelaySettings({ lastVersionCheckAt: Date.now() });
    return info;
}

export async function showUpdateDialog(info: VersionInfo): Promise<void> {
    const result = await dialog.showMessageBox({
        type: 'info',
        buttons: ['Download Update', 'Skip This Version', 'Later'],
        defaultId: 0,
        cancelId: 2,
        title: 'Ok, Box Box Relay Update Available',
        message: `Version ${info.version} is available.`,
        detail: info.release_notes || 'A new relay version is ready to install.',
    });

    if (result.response === 0) {
        await shell.openExternal(info.download_url);
        return;
    }

    if (result.response === 1) {
        updateRelaySettings({ skippedVersion: info.version });
    }
}

export function startUpdateChecker(): void {
    if (intervalHandle) return;
    intervalHandle = setInterval(async () => {
        const info = await checkForUpdates(true);
        if (info) {
            await showUpdateDialog(info);
        }
    }, 1000 * 60 * 60 * 6);
}

export function stopUpdateChecker(): void {
    if (intervalHandle) {
        clearInterval(intervalHandle);
        intervalHandle = null;
    }
}

export async function manualUpdateCheck(): Promise<void> {
    const info = await checkForUpdates(false);
    if (info) {
        await showUpdateDialog(info);
    }
}
