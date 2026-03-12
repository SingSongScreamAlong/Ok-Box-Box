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
    return store.store;
}

export function updateRelaySettings(patch: Partial<RelaySettings>): RelaySettings {
    const next = {
        ...store.store,
        ...patch,
    };
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
