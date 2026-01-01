// =====================================================================
// Diagnostics API Client
// Client for DEV diagnostics endpoints
// =====================================================================

const API_BASE = import.meta.env.VITE_API_URL || '';

interface RelayHealthResponse {
    totalConnections: number;
    relays: Array<{
        socketId: string;
        connected: boolean;
        rooms: string[];
        transport: string;
        joinedAt: number | null;
    }>;
    timestamp: number;
}

interface ActiveSession {
    sessionId: string;
    trackName: string;
    sessionType: string;
    driverCount: number;
    lastUpdate: number;
    ageMs: number;
}

interface SessionsResponse {
    count: number;
    sessions: ActiveSession[];
    runtime: {
        uptimeMs: number;
        activeRelays: number;
        activeDashboards: number;
    };
    timestamp: number;
}

interface ErrorEntry {
    id: string;
    timestamp: number;
    subsystem: string;
    message: string;
    stack?: string;
}

interface ErrorsResponse {
    count: number;
    errors: ErrorEntry[];
    countsBySubsystem: Record<string, number>;
    timestamp: number;
}

interface SessionFlowResponse {
    sessionId: string;
    session: {
        trackName: string;
        sessionType: string;
        driverCount: number;
        lastUpdate: number;
    };
    flow: {
        ingestRates: Record<string, string>;
        emitRates: Record<string, string>;
        dbHealth: {
            status: string;
            lastWriteMs: number | null;
        };
    };
    errors: ErrorEntry[];
    timestamp: number;
}

interface SupportBundle {
    generatedAt: string;
    version: {
        package: string;
        gitCommit?: string;
        nodeVersion: string;
    };
    config: Record<string, unknown>;
    runtime: {
        uptimeMs: number;
        activeRelays: number;
        activeDashboards: number;
    };
    sessions: {
        active: number;
        list: Array<{
            sessionId: string;
            trackName: string;
            driverCount: number;
            lastUpdate: number;
        }>;
    };
    metrics: unknown[];
    errors: {
        recent: ErrorEntry[];
        countsBySubsystem: Record<string, number>;
    };
    database?: {
        connected: boolean;
        tableCounts?: Record<string, number>;
    };
}

class DiagnosticsClient {
    private token: string | null = null;

    setToken(token: string) {
        this.token = token;
    }

    private async fetch<T>(path: string, options: RequestInit = {}): Promise<T> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string> || {})
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const res = await fetch(`${API_BASE}/api/dev/diagnostics${path}`, {
            ...options,
            headers
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
            throw new Error(data.error || `HTTP ${res.status}`);
        }

        return data.data;
    }

    async getRelayHealth(): Promise<RelayHealthResponse> {
        return this.fetch<RelayHealthResponse>('/health/relay');
    }

    async getActiveSessions(): Promise<SessionsResponse> {
        return this.fetch<SessionsResponse>('/sessions/active');
    }

    async getSessionFlow(sessionId: string): Promise<SessionFlowResponse> {
        return this.fetch<SessionFlowResponse>(`/session/${sessionId}/flow`);
    }

    async getRecentErrors(limit: number = 100, subsystem?: string): Promise<ErrorsResponse> {
        const params = new URLSearchParams();
        params.set('limit', String(limit));
        if (subsystem) params.set('subsystem', subsystem);
        return this.fetch<ErrorsResponse>(`/errors/recent?${params}`);
    }

    async injectEvent(sessionId: string, eventType: string, payload: unknown): Promise<{ eventType: string; sessionId: string; injectedAt: number }> {
        return this.fetch(`/session/${sessionId}/inject`, {
            method: 'POST',
            body: JSON.stringify({ eventType, payload })
        });
    }

    async generateSupportBundle(options: {
        sessionId?: string;
        includeDbSample?: boolean;
    } = {}): Promise<SupportBundle> {
        return this.fetch<SupportBundle>('/support-bundle', {
            method: 'POST',
            body: JSON.stringify(options)
        });
    }

    async getMetricsSnapshot(): Promise<{
        metrics: unknown[];
        runtime: { uptimeMs: number; activeRelays: number; activeDashboards: number };
        timestamp: number;
    }> {
        return this.fetch('/metrics/snapshot');
    }
}

export const diagnosticsClient = new DiagnosticsClient();
export type { RelayHealthResponse, SessionsResponse, ActiveSession, ErrorEntry, ErrorsResponse, SessionFlowResponse, SupportBundle };
