/* TacviewDataService: minimal client for TelemetryServer HTTP API */

const BASE_URL = (process.env.REACT_APP_TELEMETRY_API || 'http://localhost:8000').replace(/\/$/, '');
const AUTH = process.env.REACT_APP_TELEMETRY_API_KEY || 'test_api_key';

export interface APISessionSummary {
  id: string;
  trackId?: string;
  startedAt?: string;
  endedAt?: string | null;
  drivers?: Array<{ id: string; name?: string; carNumber?: string }>; 
}

export interface APITelemetryResponse<T = any> {
  telemetry: T[];
}

export interface APISample {
  tsMs: number;
  driverId: string;
  pos?: { x: number; y: number; z?: number };
  x?: number; // compatibility: some sources may send flat pos
  y?: number;
  z?: number;
  speed?: number;
  heading?: number;
  throttle?: number;
  brake?: number;
  gear?: number;
  rpm?: number;
  lap?: number;
  sector?: number;
  flags?: Record<string, any>;
  extra?: Record<string, any>;
}

async function apiGet<T>(path: string, params?: Record<string, string | number | boolean>): Promise<T> {
  const url = new URL(BASE_URL + path);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  }
  const res = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${AUTH}`,
      'Accept': 'application/json'
    },
    credentials: 'omit'
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GET ${url.pathname} failed: ${res.status} ${res.statusText} ${text}`);
  }
  return res.json();
}

export async function listSessions(): Promise<APISessionSummary[]> {
  const data = await apiGet<{ sessions: APISessionSummary[] }>(`/api/v1/sessions`);
  return data.sessions || [];
}

export async function getSessionTelemetry(sessionId: string, start = 0, end?: number, limit = 2000): Promise<APISample[]> {
  const params: Record<string, string | number> = { start, limit };
  if (end !== undefined) params.end = end;
  const data = await apiGet<APITelemetryResponse<APISample>>(`/api/v1/sessions/${encodeURIComponent(sessionId)}/telemetry`, params);
  return data.telemetry || [];
}

export async function getSessionEvents(sessionId: string, start = 0, end?: number, limit = 500, event?: string): Promise<any[]> {
  const params: Record<string, string | number> = { start, limit };
  if (end !== undefined) params.end = end;
  if (event) params.event_type = event;
  const data = await apiGet<{ events: any[] }>(`/api/v1/sessions/${encodeURIComponent(sessionId)}/events`, params);
  return data.events || [];
}
