import Store from 'electron-store';
import { randomUUID } from 'crypto';

export interface RelaySettings {
    apiUrl: string;
    appUrl: string;
    relayId: string;
    authToken: string | null;
    userId: string | null;
    surface: 'driver' | 'team' | 'racecontrol' | null;
    linkedAt: number | null;
    autoLaunch: boolean;
    lastVersionCheckAt: number | null;
    skippedVersion: string | null;
}

const DEFAULT_API_URL = process.env.OKBOXBOX_API_URL || 'https://app.okboxbox.com';
const DEFAULT_APP_URL = process.env.OKBOXBOX_APP_URL || 'https://app.okboxbox.com';
const LEGACY_HOSTS = new Set([
    'api.okboxbox.com',
    'octopus-app-qsi3i.ondigitalocean.app',
]);

function normalizeHostedUrl(value: string | null | undefined, fallback: string): string {
    if (!value) {
        return fallback;
    }

    try {
        const url = new URL(value);
        if (LEGACY_HOSTS.has(url.host)) {
            return fallback;
        }
        return url.toString().replace(/\/$/, '');
    } catch {
        return fallback;
    }
}

function normalizeRelaySettings(settings: RelaySettings): RelaySettings {
    return {
        ...settings,
        apiUrl: normalizeHostedUrl(settings.apiUrl, DEFAULT_API_URL),
        appUrl: normalizeHostedUrl(settings.appUrl, DEFAULT_APP_URL),
    };
}

// In production: RELAY_SECRET env var authenticates the relay without a user token
const DEFAULT_RELAY_ID = process.env.RELAY_SECRET || `okboxbox-relay-${randomUUID()}`;

const store = new Store<RelaySettings>({
    name: 'relay-settings',
    defaults: {
        apiUrl: DEFAULT_API_URL,
        appUrl: DEFAULT_APP_URL,
        relayId: DEFAULT_RELAY_ID,
        authToken: null,
        userId: null,
        surface: null,
        linkedAt: null,
        autoLaunch: true,
        lastVersionCheckAt: null,
        skippedVersion: null,
    },
});

export function getRelaySettings(): RelaySettings {
    const normalized = normalizeRelaySettings(store.store);
    if (normalized.apiUrl !== store.store.apiUrl || normalized.appUrl !== store.store.appUrl) {
        store.set(normalized);
    }
    return normalized;
}

export function updateRelaySettings(patch: Partial<RelaySettings>): RelaySettings {
    const next = normalizeRelaySettings({
        ...getRelaySettings(),
        ...patch,
    });
    store.set(next);
    return next;
}

export function clearRelayLink(): RelaySettings {
    return updateRelaySettings({
        authToken: null,
        userId: null,
        surface: null,
        linkedAt: null,
    });
}

export function isRelayLinked(): boolean {
    const settings = getRelaySettings();
    return Boolean(settings.authToken && settings.userId);
}
