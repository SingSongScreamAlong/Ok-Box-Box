import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, Wifi, Radio, AlertTriangle, Clock,
  Server, Zap, ChevronRight, RefreshCw,
} from 'lucide-react';
import { fetchOpsSummary, type OpsSummary } from '../../lib/adminService';

const REFRESH_MS = 10_000;

function Stat({ label, value, sub, color = 'text-white/90' }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.07] rounded p-4">
      <div className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-1">{label}</div>
      <div className={`text-2xl font-mono font-bold ${color}`}>{value}</div>
      {sub && <div className="text-[10px] text-white/30 mt-1">{sub}</div>}
    </div>
  );
}

function Badge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium ${
      ok ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
         : 'bg-red-500/10 text-red-400 border border-red-500/20'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-400' : 'bg-red-400'} animate-pulse`} />
      {label}
    </span>
  );
}

export function AdminOverview() {
  const [summary, setSummary] = useState<OpsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchOpsSummary();
      setSummary(data);
      setError(null);
      setLastRefreshed(new Date());
    } catch (e: any) {
      setError(e.message || 'Failed to load ops summary');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => clearInterval(interval);
  }, [load]);

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center h-64 text-white/30 text-sm">
        Loading system state...
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="p-8">
        <div className="bg-red-500/10 border border-red-500/20 rounded p-4 text-red-400 text-sm">
          {error.includes('403') || error.includes('Forbidden')
            ? 'Access denied ΓÇö super-admin required.'
            : `Could not reach ops API: ${error}`}
        </div>
      </div>
    );
  }

  if (!summary) return null;

  const errorSeverity = summary.errors.last10mCount === 0 ? 'ok'
    : summary.errors.last10mCount < 5 ? 'warn' : 'crit';

  const uptimeHours = Math.floor(summary.uptime.uptimeMs / 3_600_000);

  return (
    <div className="p-8 space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold uppercase tracking-[0.2em] text-white/90" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            System Overview
          </h1>
          <div className="flex items-center gap-3 mt-1.5">
            <Badge ok label={summary.build.environment} />
            {summary.build.gitSha && (
              <span className="text-[10px] text-white/30 font-mono">{summary.build.gitSha}</span>
            )}
            <span className="text-[10px] text-white/20">v{summary.build.version}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastRefreshed && (
            <span className="text-[10px] text-white/20">
              {lastRefreshed.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={load}
            className="p-2 rounded border border-white/[0.08] text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat
          label="Uptime"
          value={summary.uptime.uptimeFormatted}
          sub={`Started ${new Date(summary.uptime.startedAt).toLocaleString()}`}
          color={uptimeHours >= 1 ? 'text-emerald-400' : 'text-yellow-400'}
        />
        <Stat
          label="Active Sessions"
          value={summary.sessions.active}
          sub="live relay sessions"
          color={summary.sessions.active > 0 ? 'text-cyan-400' : 'text-white/50'}
        />
        <Stat
          label="WebSocket Clients"
          value={summary.sockets.activeConnections ?? 0}
          sub={`${summary.sockets.totalConnected ?? 0} total connected`}
        />
        <Stat
          label="Relay Ingest"
          value={`${(summary.relay.ingestRate ?? 0).toFixed(1)}/s`}
          sub={`${summary.relay.totalFrames.toLocaleString()} total frames`}
        />
        <Stat
          label="Total Drops"
          value={summary.relay.totalDrops}
          sub="all time"
          color={summary.relay.totalDrops > 0 ? 'text-yellow-400' : 'text-white/90'}
        />
        <Stat
          label="Drift Warnings"
          value={summary.relay.totalDriftWarnings}
          sub="clock drift >5s"
          color={summary.relay.totalDriftWarnings > 0 ? 'text-yellow-400' : 'text-white/90'}
        />
        <Stat
          label="Errors (10 min)"
          value={summary.errors.last10mCount}
          sub={Object.entries(summary.errors.bySubsystem).map(([k, v]) => `${k}:${v}`).join(' ')}
          color={errorSeverity === 'ok' ? 'text-white/50' : errorSeverity === 'warn' ? 'text-yellow-400' : 'text-red-400'}
        />
        <Stat
          label="Active Relays"
          value={summary.runtime.activeRelays}
          sub={`${summary.runtime.activeDashboards} dashboards`}
        />
      </div>

      {/* Active sessions table */}
      <div>
        <h2 className="text-xs uppercase tracking-[0.15em] text-white/50 mb-3 flex items-center gap-2">
          <Wifi className="w-3.5 h-3.5" /> Active Sessions
        </h2>
        {summary.sessions.details.length === 0 ? (
          <div className="text-xs text-white/20 py-6 text-center border border-white/[0.05] rounded">
            No active sessions
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['Session ID', 'Track', 'Drivers', 'Age'].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-[10px] uppercase tracking-wider text-white/30 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summary.sessions.details.map((s, i) => (
                  <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="py-2.5 px-3 font-mono text-white/60">{s.sessionId}</td>
                    <td className="py-2.5 px-3 text-white/80">{s.trackName || 'ΓÇö'}</td>
                    <td className="py-2.5 px-3 text-cyan-400">{s.driverCount}</td>
                    <td className="py-2.5 px-3 text-white/40">{formatAge(s.ageMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Hottest sessions */}
      {summary.hottestSessions.length > 0 && (
        <div>
          <h2 className="text-xs uppercase tracking-[0.15em] text-white/50 mb-3 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-yellow-400" /> Hottest Relay Sessions
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['Session', 'State', 'Drivers', 'Frames', 'Drops', 'Errors', 'Age'].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-[10px] uppercase tracking-wider text-white/30 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summary.hottestSessions.map((s, i) => {
                  const totalFrames = Object.values(s.frameCountByStream).reduce((a, b) => a + b, 0);
                  return (
                    <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="py-2.5 px-3 font-mono text-white/60">{s.sessionId}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] ${s.state === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-white/30'}`}>
                          {s.state}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-cyan-400">{s.driverCount}</td>
                      <td className="py-2.5 px-3 text-white/70">{totalFrames.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-yellow-400">{s.dropCount}</td>
                      <td className="py-2.5 px-3 text-red-400">{s.errorCount}</td>
                      <td className="py-2.5 px-3 text-white/40">{formatAge(Date.now() - s.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Event buffer stats */}
      <div>
        <h2 className="text-xs uppercase tracking-[0.15em] text-white/50 mb-3 flex items-center gap-2">
          <Server className="w-3.5 h-3.5" /> Event Ring Buffers
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(summary.eventBuffers).map(([name, buf]: [string, any]) => {
            const pct = buf.capacity > 0 ? Math.round((buf.size / buf.capacity) * 100) : 0;
            return (
              <div key={name} className="bg-white/[0.03] border border-white/[0.07] rounded p-3">
                <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">{name}</div>
                <div className="text-sm font-mono text-white/80">{buf.size} / {buf.capacity}</div>
                <div className="h-1 bg-white/[0.06] rounded-full mt-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick nav */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { to: '/admin/users', label: 'Manage Users', icon: Activity },
          { to: '/admin/entitlements', label: 'Entitlements', icon: Clock },
          { to: '/admin/ops', label: 'Live Ops', icon: Radio },
          { to: '/admin/telemetry', label: 'Telemetry Streams', icon: AlertTriangle },
        ].map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/[0.07] rounded hover:border-white/20 hover:bg-white/[0.05] transition-all group"
          >
            <div className="flex items-center gap-2">
              <Icon className="w-3.5 h-3.5 text-white/40" />
              <span className="text-xs text-white/60 group-hover:text-white/80">{label}</span>
            </div>
            <ChevronRight className="w-3 h-3 text-white/20 group-hover:text-white/50" />
          </Link>
        ))}
      </div>
    </div>
  );
}

function formatAge(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}
