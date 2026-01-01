/**
 * Auth Manager
 * 
 * Handles authentication flow for the relay agent:
 * - Login with email/password
 * - Token storage (keychain)
 * - Bootstrap fetch
 * - Token refresh
 */

import * as keytar from 'keytar';

const SERVICE_NAME = 'okboxbox-relay';
const ACCOUNT_NAME = 'accessToken';

// API response types
interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: { code: string; message: string };
}

interface LoginData {
    accessToken: string;
    refreshToken: string;
    user: BootstrapResponse['user'];
}

export interface BootstrapResponse {
    user: {
        id: string;
        email: string;
        displayName: string;
    };
    licenses: {
        blackbox: boolean;
        controlbox: boolean;
    };
    roles: string[];
    capabilities: {
        driver_hud: boolean;
        ai_coaching: boolean;
        voice_engineer: boolean;
        personal_telemetry: boolean;
        pitwall_view: boolean;
        multi_car_monitor: boolean;
        strategy_timeline: boolean;
        incident_review: boolean;
        penalty_assign: boolean;
        protest_review: boolean;
        rulebook_manage: boolean;
        session_authority: boolean;
    };
    defaultSurface: string;
}

export class AuthManager {
    private apiUrl: string;
    private accessToken: string | null = null;
    private bootstrap: BootstrapResponse | null = null;

    constructor(apiUrl: string) {
        this.apiUrl = apiUrl;
    }

    /**
     * Load saved token from system keychain
     */
    async loadSavedToken(): Promise<boolean> {
        try {
            const token = await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME);
            if (token) {
                this.accessToken = token;
                return true;
            }
        } catch (error) {
            console.error('Failed to load token from keychain:', error);
        }
        return false;
    }

    /**
     * Save token to system keychain
     */
    private async saveToken(token: string): Promise<void> {
        try {
            await keytar.setPassword(SERVICE_NAME, ACCOUNT_NAME, token);
        } catch (error) {
            console.error('Failed to save token to keychain:', error);
        }
    }

    /**
     * Clear saved token
     */
    private async clearToken(): Promise<void> {
        try {
            await keytar.deletePassword(SERVICE_NAME, ACCOUNT_NAME);
        } catch (error) {
            console.error('Failed to clear token from keychain:', error);
        }
        this.accessToken = null;
        this.bootstrap = null;
    }

    /**
     * Login with email and password
     */
    async login(email: string, password: string): Promise<{ success: boolean; bootstrap?: BootstrapResponse; error?: string }> {
        try {
            const response = await fetch(`${this.apiUrl}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const result = await response.json() as ApiResponse<LoginData>;

            if (!response.ok || !result.success || !result.data) {
                return { success: false, error: result.error?.message || 'Login failed' };
            }

            this.accessToken = result.data.accessToken;
            await this.saveToken(this.accessToken!);

            // Fetch bootstrap
            const bootstrap = await this.fetchBootstrap();
            if (!bootstrap) {
                return { success: false, error: 'Failed to fetch bootstrap after login' };
            }

            return { success: true, bootstrap };
        } catch (error) {
            return { success: false, error: String(error) };
        }
    }

    /**
     * Logout
     */
    async logout(): Promise<void> {
        await this.clearToken();
    }

    /**
     * Fetch bootstrap data
     */
    async fetchBootstrap(): Promise<BootstrapResponse | null> {
        if (!this.accessToken) {
            return null;
        }

        try {
            const response = await fetch(`${this.apiUrl}/api/auth/me/bootstrap`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 401) {
                // Token expired
                await this.clearToken();
                return null;
            }

            const result = await response.json() as ApiResponse<BootstrapResponse>;

            if (!result.success || !result.data) {
                console.error('Bootstrap fetch failed:', result.error);
                return null;
            }

            this.bootstrap = result.data;
            return this.bootstrap;
        } catch (error) {
            console.error('Bootstrap fetch error:', error);
            return null;
        }
    }

    /**
     * Get current bootstrap (cached)
     */
    getBootstrap(): BootstrapResponse | null {
        return this.bootstrap;
    }

    /**
     * Check if logged in
     */
    isLoggedIn(): boolean {
        return this.accessToken !== null && this.bootstrap !== null;
    }

    /**
     * Get access token for API calls
     */
    getAccessToken(): string | null {
        return this.accessToken;
    }
}
