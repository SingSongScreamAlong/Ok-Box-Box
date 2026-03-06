import { useCallback, useEffect, useMemo, useState, type ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Clock3,
  Cpu,
  Download,
  Eye,
  Network,
  Radio,
  RefreshCw,
  Server,
  Users,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://octopus-app-qsi3i.ondigitalocean.app';

interface OpsSummary {
  build?: {
    gitSha?: string;
    version?: string;
    environment?: string;
  };
  uptime?: {
    startedAt?: number;
    uptimeMs?: number;
    uptimeFormatted?: string;
  };
  sessions?: {
    active?: number;
    details?: Array<{
      sessionId: string;
      trackName?: string;
      driverCount?: number;
      ageMs?: number;
    }>;
  };
  sockets?: {
    activeConnections?: number;
    rooms?: number;
    eventsPerSecond?: number;
  };
  relay?: {
    connectedRelays?: number;
    activeSessions?: number;
    ingestRates?: Record<string, number>;
  };
  errors?: {
    last10mCount?: number;
    bySubsystem?: Record<string, number>;
  };
  runtime?: {
    memory?: {
      rssMb?: number;
      heapUsedMb?: number;
      heapTotalMb?: number;
    };
    cpu?: {
      userMs?: number;
      systemMs?: number;
    };
    eventLoopLagMs?: number;
  };
  hottestSessions?: Array<{
    sessionId: string;
    frameRate?: number;
    driverCount?: number;
    lastFrameAgeMs?: number;
  }>;
  timestamp?: number;
}

interface OpsSocketsResponse {
  count: number;
  sockets: Array<{
    socketId: string;
    role?: string;
    surface?: string;
    joinedRoomsCount?: number;
    joinedRooms?: string[];
    ageMs?: number;
    lastSeenMs?: number;
  }>;
}

interface OpsSessionsResponse {
  count: number;
  sessions: Array<{
    sessionId: string;
    state?: string;
    driverCount?: number;
    createdAt?: number;
    lastFrameAt?: number;
    ageMs?: number;
    lastFrameAgeMs?: number;
    rates?: {
      baseline?: number;
      controls?: number;
      total?: number;
    };
    drops?: number;
    errors?: number;
  }>;
}

interface OpsEventsResponse {
  count: number;
  events: Array<{
    timestamp?: number;
    level?: string;
    subsystem?: string;
    type?: string;
    message?: string;
    sessionId?: string;
    error?: string;
  }>;
}

interface TelemetryStreamsResponse {
  activeRunCount: number;
  streams: Array<{
    runId: string;
    stream?: {
      fps?: number;
      samplesReceived?: number;
      droppedSamples?: number;
      lastSampleAt?: number;
    } | null;
    worker?: {
      currentLap?: number;
      totalTicks?: number;
      ageMs?: number;
      reliability?: number;
      warnings?: string[];
    } | null;
  }>;
  timestamp: string;
}

interface TraceResponse {
  traceId: string;
  sessionId: string;
  startedAt: number;
  expiresAt: number;
  isExpired: boolean;
  durationMs: number;
  samples: unknown[];
  events?: {
    relay?: unknown[];
    session?: unknown[];
  };
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return {};
  }
  return {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...headers,
      ...(init?.headers || {}),
    },
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json?.error || json?.message || `Request failed (${response.status})`);
  }
  return (json?.data ?? json) as T;
}

function formatMs(ms?: number | null) {
  if (ms == null || Number.isNaN(ms)) return '—';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remSeconds}s`;
}

function formatNumber(value?: number | null, fractionDigits = 0) {
  if (value == null || Number.isNaN(value)) return '—';
  return value.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

function StatCard({
  title,
  value,
  detail,
  icon: Icon,
}: {
  title: string;
  value: string;
  detail?: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">{title}</div>
          <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
          {detail ? <div className="mt-1 text-xs text-white/45">{detail}</div> : null}
        </div>
        <div className="flex h-10 w-10 items-center justify-center border border-white/10 bg-white/[0.02]">
          <Icon className="h-5 w-5 text-[#f97316]" />
        </div>
      </div>
    </div>
  );
}

export function AdminOps() {
  const [summary, setSummary] = useState<OpsSummary | null>(null);
  const [socketData, setSocketData] = useState<OpsSocketsResponse | null>(null);
  const [sessionData, setSessionData] = useState<OpsSessionsResponse | null>(null);
  const [errorEvents, setErrorEvents] = useState<OpsEventsResponse | null>(null);
  const [telemetryStreams, setTelemetryStreams] = useState<TelemetryStreamsResponse | null>(null);
  const [trace, setTrace] = useState<TraceResponse | null>(null);
  const [traceSessionId, setTraceSessionId] = useState('');
  const [traceDuration, setTraceDuration] = useState(30);
  const [traceLoading, setTraceLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (showSpinner = false) => {
    if (showSpinner) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      setError(null);
      const [summaryResult, socketsResult, sessionsResult, eventsResult, telemetryResult] = await Promise.allSettled([
        fetchJson<OpsSummary>('/api/ops/summary'),
        fetchJson<OpsSocketsResponse>('/api/ops/sockets'),
        fetchJson<OpsSessionsResponse>('/api/ops/sessions'),
        fetchJson<OpsEventsResponse>('/api/ops/events?type=error&limit=50'),
        fetchJson<TelemetryStreamsResponse>('/api/admin/telemetry/streams'),
      ]);

      if (summaryResult.status === 'fulfilled') setSummary(summaryResult.value);
      if (socketsResult.status === 'fulfilled') setSocketData(socketsResult.value);
      if (sessionsResult.status === 'fulfilled') setSessionData(sessionsResult.value);
      if (eventsResult.status === 'fulfilled') setErrorEvents(eventsResult.value);
      if (telemetryResult.status === 'fulfilled') setTelemetryStreams(telemetryResult.value);
      if (summaryResult.status === 'rejected') {
        setError(summaryResult.reason instanceof Error ? summaryResult.reason.message : 'Failed to load ops summary');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData(true);
  }, [loadData]);

  useEffect(() => {
    // Only auto-refresh if initial load succeeded (no error state)
    if (error) return;
    const timer = window.setInterval(() => {
      void loadData(false);
    }, 10000);
    return () => window.clearInterval(timer);
  }, [loadData, error]);

  useEffect(() => {
    if (!traceSessionId && summary?.sessions?.details?.[0]?.sessionId) {
      setTraceSessionId(summary.sessions.details[0].sessionId);
    }
  }, [summary, traceSessionId]);

  const errorBreakdown = useMemo(() => {
    return Object.entries(summary?.errors?.bySubsystem || {}).sort((a, b) => b[1] - a[1]);
  }, [summary]);

  const handleStartTrace = async () => {
    if (!traceSessionId) return;
    setTraceLoading(true);
    try {
      const result = await fetchJson<{ traceId: string }>('/api/ops/trace/start', {
        method: 'POST',
        body: JSON.stringify({ sessionId: traceSessionId, durationSec: traceDuration }),
      });
      const traceResult = await fetchJson<TraceResponse>(`/api/ops/trace/${result.traceId}`);
      setTrace(traceResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start trace');
    } finally {
      setTraceLoading(false);
    }
  };

  const handleExportSupportPack = async () => {
    try {
      const data = await fetchJson<Record<string, unknown>>('/api/ops/support-pack', {
        method: 'POST',
        body: JSON.stringify({ sessionId: traceSessionId || undefined, includeConfig: true }),
      });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `ops-support-pack-${Date.now()}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export support pack');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[--bg] flex items-center justify-center">
        <div className="text-xs uppercase tracking-[0.2em] text-white/40">Loading ops dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[--bg] text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
        <div className="mb-6 flex flex-col gap-4 border border-white/10 bg-white/[0.03] p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <Link to="/driver/home" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/45 hover:text-white">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </div>
            <h1 className="text-2xl font-bold uppercase tracking-[0.2em]" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              Admin Ops
            </h1>
            <p className="mt-2 text-sm text-white/50">
              Runtime health, sockets, session ingest, recent errors, and diagnostics export.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => void loadData(false)}
              className="inline-flex items-center gap-2 border border-white/10 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/70 hover:bg-white/[0.06]"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleExportSupportPack}
              className="inline-flex items-center gap-2 border border-[#f97316]/30 bg-[#f97316]/10 px-4 py-2 text-xs uppercase tracking-[0.18em] text-[#f97316] hover:bg-[#f97316]/15"
            >
              <Download className="h-4 w-4" />
              Export Support Pack
            </button>
          </div>
        </div>

        {error ? (
          <div className="mb-6 border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Active Sessions"
            value={formatNumber(summary?.sessions?.active)}
            detail={`${formatNumber(summary?.relay?.activeSessions)} relay-tracked`}
            icon={Radio}
          />
          <StatCard
            title="Socket Connections"
            value={formatNumber(socketData?.count ?? summary?.sockets?.activeConnections)}
            detail={`${formatNumber(summary?.sockets?.rooms)} rooms`}
            icon={Network}
          />
          <StatCard
            title="Errors · Last 10m"
            value={formatNumber(summary?.errors?.last10mCount)}
            detail={errorBreakdown[0] ? `${errorBreakdown[0][0]} leading` : 'No recent subsystem spikes'}
            icon={AlertTriangle}
          />
          <StatCard
            title="Uptime"
            value={summary?.uptime?.uptimeFormatted || '—'}
            detail={`${summary?.build?.environment || 'unknown'} · ${summary?.build?.gitSha || 'no sha'}`}
            icon={Server}
          />
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
          <div className="space-y-6">
            <section className="border border-white/10 bg-white/[0.03] p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm uppercase tracking-[0.2em] text-white/50">Active Sessions</h2>
                  <p className="mt-1 text-xs text-white/35">Live ingest and session health.</p>
                </div>
                <div className="text-xs text-white/35">{formatNumber(sessionData?.count)} sessions</div>
              </div>
              <div className="space-y-3">
                {(sessionData?.sessions || []).length === 0 ? (
                  <div className="border border-white/10 bg-black/20 px-4 py-6 text-sm text-white/40">No active sessions.</div>
                ) : (
                  sessionData?.sessions.map((item) => (
                    <div key={item.sessionId} className="border border-white/10 bg-black/20 p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="font-mono text-sm text-white">{item.sessionId}</div>
                          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white/35">{item.state || 'unknown state'}</div>
                        </div>
                        <button
                          onClick={() => setTraceSessionId(item.sessionId)}
                          className={`inline-flex items-center gap-2 border px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] ${traceSessionId === item.sessionId ? 'border-[#f97316]/40 bg-[#f97316]/10 text-[#f97316]' : 'border-white/10 text-white/60 hover:bg-white/5'}`}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Select for Trace
                        </button>
                      </div>
                      <div className="mt-4 grid gap-3 md:grid-cols-5">
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">Drivers</div>
                          <div className="mt-1 text-sm text-white">{formatNumber(item.driverCount)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">Frames</div>
                          <div className="mt-1 text-sm text-white">{formatNumber(item.rates?.total)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">Drops</div>
                          <div className="mt-1 text-sm text-white">{formatNumber(item.drops)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">Errors</div>
                          <div className="mt-1 text-sm text-white">{formatNumber(item.errors)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">Last Frame</div>
                          <div className="mt-1 text-sm text-white">{formatMs(item.lastFrameAgeMs)}</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="border border-white/10 bg-white/[0.03] p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm uppercase tracking-[0.2em] text-white/50">Recent Error Stream</h2>
                  <p className="mt-1 text-xs text-white/35">Latest buffered error events.</p>
                </div>
                <div className="text-xs text-white/35">{formatNumber(errorEvents?.count)} events</div>
              </div>
              <div className="space-y-2">
                {(errorEvents?.events || []).length === 0 ? (
                  <div className="border border-white/10 bg-black/20 px-4 py-6 text-sm text-white/40">No buffered error events.</div>
                ) : (
                  errorEvents?.events.slice(0, 12).map((event, index) => (
                    <div key={`${event.timestamp}-${index}`} className="grid gap-2 border border-white/10 bg-black/20 p-3 md:grid-cols-[140px,120px,1fr]">
                      <div className="font-mono text-xs text-white/45">
                        {event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : 'unknown'}
                      </div>
                      <div className="text-xs uppercase tracking-[0.18em] text-red-300/80">
                        {event.subsystem || event.type || 'error'}
                      </div>
                      <div className="text-sm text-white/75">{event.message || event.error || 'No message'}</div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="border border-white/10 bg-white/[0.03] p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm uppercase tracking-[0.2em] text-white/50">Trace Control</h2>
                  <p className="mt-1 text-xs text-white/35">Capture short diagnostics for a selected session.</p>
                </div>
                <Clock3 className="h-4 w-4 text-white/35" />
              </div>
              <div className="space-y-3">
                <div>
                  <label className="mb-2 block text-[10px] uppercase tracking-[0.18em] text-white/35">Session ID</label>
                  <input
                    value={traceSessionId}
                    onChange={(event) => setTraceSessionId(event.target.value)}
                    className="w-full border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-[#f97316]/40"
                    placeholder="session id"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[10px] uppercase tracking-[0.18em] text-white/35">Duration (seconds)</label>
                  <input
                    type="number"
                    min={10}
                    max={300}
                    value={traceDuration}
                    onChange={(event) => setTraceDuration(Number(event.target.value))}
                    className="w-full border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-[#f97316]/40"
                  />
                </div>
                <button
                  onClick={handleStartTrace}
                  disabled={!traceSessionId || traceLoading}
                  className="inline-flex w-full items-center justify-center gap-2 border border-[#f97316]/30 bg-[#f97316]/10 px-4 py-2 text-xs uppercase tracking-[0.18em] text-[#f97316] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Activity className="h-4 w-4" />
                  {traceLoading ? 'Starting Trace...' : 'Start Trace'}
                </button>
              </div>
              {trace ? (
                <div className="mt-4 border border-white/10 bg-black/20 p-4 text-sm">
                  <div className="font-mono text-white">{trace.traceId}</div>
                  <div className="mt-2 grid gap-2 text-white/60">
                    <div>Session: {trace.sessionId}</div>
                    <div>Duration: {formatMs(trace.durationMs)}</div>
                    <div>Samples: {formatNumber(trace.samples.length)}</div>
                    <div>Relay events: {formatNumber(trace.events?.relay?.length)}</div>
                  </div>
                </div>
              ) : null}
            </section>

            <section className="border border-white/10 bg-white/[0.03] p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm uppercase tracking-[0.2em] text-white/50">Socket Surfaces</h2>
                  <p className="mt-1 text-xs text-white/35">Current client connection mix.</p>
                </div>
                <Users className="h-4 w-4 text-white/35" />
              </div>
              <div className="space-y-2">
                {(socketData?.sockets || []).length === 0 ? (
                  <div className="border border-white/10 bg-black/20 px-4 py-6 text-sm text-white/40">No active socket clients.</div>
                ) : (
                  socketData?.sockets.slice(0, 10).map((socket) => (
                    <div key={socket.socketId} className="grid gap-2 border border-white/10 bg-black/20 p-3 md:grid-cols-[1fr,90px,90px]">
                      <div>
                        <div className="font-mono text-xs text-white/70">{socket.socketId}</div>
                        <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/35">{socket.surface || socket.role || 'unknown surface'}</div>
                      </div>
                      <div className="text-sm text-white/70">{formatNumber(socket.joinedRoomsCount)} rooms</div>
                      <div className="text-sm text-white/70">{formatMs(socket.ageMs)}</div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="border border-white/10 bg-white/[0.03] p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm uppercase tracking-[0.2em] text-white/50">Telemetry Streams</h2>
                  <p className="mt-1 text-xs text-white/35">Admin diagnostics for active runs.</p>
                </div>
                <Cpu className="h-4 w-4 text-white/35" />
              </div>
              <div className="space-y-2">
                {(telemetryStreams?.streams || []).length === 0 ? (
                  <div className="border border-white/10 bg-black/20 px-4 py-6 text-sm text-white/40">No telemetry diagnostics available.</div>
                ) : (
                  telemetryStreams?.streams.map((stream) => (
                    <div key={stream.runId} className="border border-white/10 bg-black/20 p-3">
                      <div className="font-mono text-xs text-white/70">{stream.runId}</div>
                      <div className="mt-3 grid gap-3 md:grid-cols-4">
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">FPS</div>
                          <div className="mt-1 text-sm text-white">{formatNumber(stream.stream?.fps, 1)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">Samples</div>
                          <div className="mt-1 text-sm text-white">{formatNumber(stream.stream?.samplesReceived)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">Dropped</div>
                          <div className="mt-1 text-sm text-white">{formatNumber(stream.stream?.droppedSamples)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">Worker Age</div>
                          <div className="mt-1 text-sm text-white">{formatMs(stream.worker?.ageMs)}</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
