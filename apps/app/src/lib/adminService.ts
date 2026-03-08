// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// Admin Service
// Typed API client for all admin + ops endpoints
// Requires: Supabase session access_token (isSuperAdmin=true on the server)
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

import { supabase } from './supabase';
import { API_BASE } from './config';

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    return { Authorization: `Bearer ${session.access_token}` };
  }
  return {};
}

async function apiGet<T>(path: string): Promise<T> {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_BASE}/api${path}`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw Object.assign(new Error(err?.error?.message || err?.error || res.statusText), { status: res.status });
  }
  const body = await res.json();
  return body.data ?? body;
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const headers = { ...(await getAuthHeader()), 'Content-Type': 'application/json' };
  const res = await fetch(`${API_BASE}/api${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw Object.assign(new Error(err?.error?.message || err?.error || res.statusText), { status: res.status });
  }
  const data = await res.json();
  return data.data ?? data;
}

async function apiDelete<T>(path: string): Promise<T> {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_BASE}/api${path}`, { method: 'DELETE', headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw Object.assign(new Error(err?.error?.message || err?.error || res.statusText), { status: res.status });
  }
  const data = await res.json();
  return data.data ?? data;
}

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// Types
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  isSuperAdmin: boolean;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface License {
  id: string;
  leagueId: string;
  seriesId: string;
  seasonId: string;
  status: string;
  startDate: string;
  endDate: string;
  createdAt: string;
}

export interface Entitlement {
  id: string;
  user_id: string | null;
  org_id: string | null;
  product: string;
  status: string;
  source: string;
  user_email?: string;
  user_display_name?: string;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  entitlement_id: string;
  action: string;
  triggered_by: string;
  admin_email?: string;
  previous_status?: string;
  new_status?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface OpsSummary {
  build: { gitSha?: string; version: string; environment: string };
  uptime: { startedAt: number; uptimeMs: number; uptimeFormatted: string };
  sessions: { active: number; details: { sessionId: string; trackName: string; driverCount: number; ageMs: number }[] };
  sockets: { activeConnections: number; totalConnected: number; totalDisconnected: number };
  relay: { totalFrames: number; totalDrops: number; totalDriftWarnings: number; activeSessions: number; ingestRate: number; ingestRates: { total: number; byStream: Record<string, number> } };
  errors: { last10mCount: number; bySubsystem: Record<string, number> };
  eventBuffers: Record<string, { size: number; capacity: number }>;
  runtime: { startTime: number; uptimeMs: number; activeRelays: number; activeDashboards: number };
  hottestSessions: { sessionId: string; state: string; driverCount: number; frameCountByStream: Record<string, number>; dropCount: number; errorCount: number; createdAt: number; lastFrameAt: number }[];
  timestamp: number;
}

export interface OpsSocket {
  socketId: string;
  role: string;
  surface: string;
  joinedRoomsCount: number;
  joinedRooms: string[];
  connectedAtMs: number;
  lastSeenMs: number;
  ageMs: number;
}

export interface OpsSession {
  sessionId: string;
  state: string;
  driverCount: number;
  createdAt: number;
  lastFrameAt: number;
  ageMs: number;
  lastFrameAgeMs: number;
  rates: { baseline: number; controls: number; total: number };
  drops: number;
  errors: number;
}

export interface OpsEvent {
  id: string | number;
  timestamp: number;
  type: string;
  sessionId?: string;
  [key: string]: unknown;
}

export interface TelemetryStream {
  runId: string;
  stream: unknown;
  worker: {
    runId: string;
    userId: string;
    sessionId: string;
    totalTicks: number;
    currentLap: number;
    lapTimes: number[];
    lastTs: number;
    startTs: number;
    ageMs: number;
    durationMs: number;
    pillars: Record<string, number>;
    smoothedBehavioral: Record<string, number>;
    avgFps: number | null;
    avgLatency: number | null;
    overRotationEvents: number;
    underRotationEvents: number;
    rotationSampleCount: number;
    brakeOnsetCount: number;
    brakeSmoothCount: number;
    absTicks: number;
    trailBrakeTicks: number;
    throttleOnsetCount: number;
    throttleSmoothCount: number;
    steerCorrectionCount: number;
    warnings: string[];
  } | null;
}

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// Auth: check if current user is super admin
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export async function fetchCurrentAdminUser(): Promise<{ isSuperAdmin: boolean } | null> {
  try {
    const data = await apiGet<{ user: AdminUser }>('/auth/me');
    const user = (data as any)?.user ?? data;
    return { isSuperAdmin: user?.isSuperAdmin === true };
  } catch {
    return null;
  }
}

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// Users
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  return apiGet<AdminUser[]>('/admin/users');
}

export async function createAdminUser(payload: { email: string; password: string; displayName: string; isSuperAdmin?: boolean }): Promise<AdminUser> {
  return apiPost<AdminUser>('/admin/users', payload);
}

export async function deactivateAdminUser(userId: string): Promise<void> {
  return apiDelete<void>(`/admin/users/${userId}`);
}

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// Entitlements
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export async function fetchEntitlements(): Promise<Entitlement[]> {
  return apiGet<Entitlement[]>('/admin/entitlements');
}

export async function grantEntitlement(payload: { userEmail?: string; userId?: string; product: string; notes?: string }): Promise<Entitlement> {
  return apiPost<Entitlement>('/admin/entitlements/grant', payload);
}

export async function revokeEntitlement(entitlementId: string, reason?: string): Promise<void> {
  return apiPost<void>('/admin/entitlements/revoke', { entitlementId, reason });
}

export async function fetchAuditLog(limit = 50): Promise<AuditLogEntry[]> {
  return apiGet<AuditLogEntry[]>(`/admin/audit-log?limit=${limit}`);
}

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// Ops
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export async function fetchOpsSummary(): Promise<OpsSummary> {
  return apiGet<OpsSummary>('/ops/summary');
}

export async function fetchOpsSockets(): Promise<{ count: number; sockets: OpsSocket[] }> {
  return apiGet('/ops/sockets');
}

export async function fetchOpsSessions(): Promise<{ count: number; sessions: OpsSession[] }> {
  return apiGet('/ops/sessions');
}

export async function fetchOpsEvents(type: 'socket' | 'relay' | 'session' | 'error' | 'all' = 'all', limit = 200): Promise<{ type: string; count: number; events: OpsEvent[] }> {
  return apiGet(`/ops/events?type=${type}&limit=${limit}`);
}

export async function startTrace(sessionId: string, durationSec = 30): Promise<{ traceId: string; durationSec: number; expiresAt: number }> {
  return apiPost('/ops/trace/start', { sessionId, durationSec });
}

export async function fetchTrace(traceId: string): Promise<{ traceId: string; isExpired: boolean; samples: unknown[]; events: { relay: OpsEvent[]; session: OpsEvent[] } }> {
  return apiGet(`/ops/trace/${traceId}`);
}

export async function generateSupportPack(sessionId?: string): Promise<Record<string, unknown>> {
  return apiPost('/ops/support-pack', { sessionId, includeConfig: true });
}

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// Telemetry Streams
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export async function fetchTelemetryStreams(): Promise<{ activeRunCount: number; streams: TelemetryStream[] }> {
  return apiGet('/admin/telemetry/streams');
}

export async function fetchTelemetryRun(runId: string): Promise<TelemetryStream> {
  return apiGet(`/admin/telemetry/streams/${runId}`);
}
