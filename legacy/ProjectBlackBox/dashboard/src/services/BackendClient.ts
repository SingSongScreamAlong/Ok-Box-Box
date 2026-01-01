import { TelemetryData } from './WebSocketService';

const DEFAULT_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';

export interface Session {
  id: string;
  name?: string;
  track?: string;
  createdAt: number;
}

class BackendClient {
  constructor(private baseUrl: string = DEFAULT_BASE_URL) {}

  async listSessions(): Promise<{ sessions: Session[] }> {
    const res = await fetch(`${this.baseUrl}/sessions`);
    if (!res.ok) throw new Error(`List sessions failed: ${res.status}`);
    return res.json();
  }

  async health(): Promise<{ status: string; time: number }> {
    const res = await fetch(`${this.baseUrl}/health`);
    if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
    return res.json();
    }

  async createSession(payload: { id?: string; name?: string; track?: string }): Promise<Session> {
    const res = await fetch(`${this.baseUrl}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Create session failed: ${res.status}`);
    return res.json();
  }

  async appendTelemetry(sessionId: string, telemetry: TelemetryData | TelemetryData[]): Promise<{ appended: number }> {
    const res = await fetch(`${this.baseUrl}/sessions/${encodeURIComponent(sessionId)}/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(telemetry),
    });
    if (!res.ok) throw new Error(`Append telemetry failed: ${res.status}`);
    return res.json();
  }

  async fetchTelemetry(sessionId: string, opts: { fromTs?: number; toTs?: number; driverId?: string } = {}): Promise<{ count: number; data: TelemetryData[] }> {
    const params = new URLSearchParams();
    if (opts.fromTs !== undefined) params.set('fromTs', String(opts.fromTs));
    if (opts.toTs !== undefined) params.set('toTs', String(opts.toTs));
    if (opts.driverId) params.set('driverId', opts.driverId);

    const res = await fetch(`${this.baseUrl}/sessions/${encodeURIComponent(sessionId)}/telemetry?${params.toString()}`);
    if (!res.ok) throw new Error(`Fetch telemetry failed: ${res.status}`);
    return res.json();
  }
}

export default new BackendClient();
