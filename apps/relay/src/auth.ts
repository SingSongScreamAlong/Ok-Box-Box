import { clearRelayLink, getRelaySettings, updateRelaySettings } from './settings.js';

export interface RelayBootstrap {
    user: {
        id: string;
        email: string;
        displayName: string;
    };
    memberships: {
        teams: Array<{ id: string; name: string; role: string }>;
        leagues: Array<{ id: string; name: string; role: string }>;
    };
    licenses: {
        driver: boolean;
        team: boolean;
        league: boolean;
    };
    roles: string[];
    capabilities: Record<string, boolean>;
    ui: {
        defaultLanding: string;
        availableSurfaces: Array<'driver' | 'team' | 'racecontrol'>;
    };
}

interface LaunchExchangeResponse {
    accessToken: string;
    expiresAt: number | null;
    user: {
        id: string;
        email: string;
        displayName: string;
    };
    surface: 'driver' | 'team' | 'racecontrol';
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
    const settings = getRelaySettings();
    const response = await fetch(`${settings.apiUrl}${path}`, init);
    const json: any = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(json?.error?.message || json?.message || `Request failed (${response.status})`);
    }
    return (json?.data ?? json) as T;
}

export class AuthManager {
    private accessToken: string | null = null;
    private bootstrap: RelayBootstrap | null = null;

    constructor() {
        const settings = getRelaySettings();
        this.accessToken = settings.authToken;
    }

    async loadSavedToken(): Promise<boolean> {
        const settings = getRelaySettings();
        if (!settings.authToken) {
            return false;
        }

        this.accessToken = settings.authToken;
        const bootstrap = await this.fetchBootstrap();
        if (!bootstrap) {
            await this.logout();
            return false;
        }
        return true;
    }

    async exchangeLaunchToken(token: string): Promise<RelayBootstrap | null> {
        const result = await fetchJson<LaunchExchangeResponse>('/api/launch-token/exchange', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
        });

        this.accessToken = result.accessToken;
        updateRelaySettings({
            authToken: result.accessToken,
            userId: result.user.id,
            surface: result.surface,
            linkedAt: Date.now(),
        });

        return this.fetchBootstrap();
    }

    async fetchBootstrap(): Promise<RelayBootstrap | null> {
        if (!this.accessToken) {
            return null;
        }

        try {
            const bootstrap = await fetchJson<RelayBootstrap>('/api/auth/me/bootstrap', {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                },
            });
            this.bootstrap = bootstrap;
            return bootstrap;
        } catch {
            return null;
        }
    }

    getBootstrap(): RelayBootstrap | null {
        return this.bootstrap;
    }

    isLoggedIn(): boolean {
        return Boolean(this.accessToken);
    }

    getAccessToken(): string | null {
        return this.accessToken;
    }

    getLinkedUserId(): string | null {
        return getRelaySettings().userId;
    }

    async logout(): Promise<void> {
        this.accessToken = null;
        this.bootstrap = null;
        clearRelayLink();
    }
}
