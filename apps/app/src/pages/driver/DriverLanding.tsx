/**
 * DriverLanding — Driver Command Center v0.2 (Intelligence Layer)
 *
 * ZERO-MOCK ENFORCEMENT:
 * This file must NEVER contain hard-coded sample data, placeholder arrays,
 * demo charts, or fake numbers. Every value displayed comes from a real API
 * response or is hidden behind an explicit empty-state. If you see a constant
 * like `const sampleData = [...]` or `const demoSessions = [...]` in this
 * file, DELETE IT — it violates the data-integrity contract.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRelay } from '../../hooks/useRelay';
import { useAuth } from '../../contexts/AuthContext';
import { useDriverData } from '../../hooks/useDriverData';
import { Link } from 'react-router-dom';
import {
  Wifi, WifiOff, Radio, Wrench, Eye, BarChart3, ChevronRight,
  Play, Download, Clock, TrendingUp, Calendar, MapPin, Gauge,
  Shield, Award, AlertTriangle, RefreshCw, Flag,
  Target, ArrowUpRight, ArrowDownRight, Minus, Activity
} from 'lucide-react';
import {
  getLicenseColor,
  fetchPerformanceSnapshot,
  fetchCrewBrief,
  PerformanceSnapshot,
  CrewBrief,
  DriverSessionSummary,
} from '../../lib/driverService';
import {
  computePerformanceDirection,
  computeConsistency,
  computeCrewInsights,
  buildRatingTrend,
} from '../../lib/driverIntelligence';
import { PerformanceDirectionPanel } from '../../components/driver/PerformanceDirectionPanel';
import { RatingTrendGraph } from '../../components/driver/RatingTrendGraph';

// ─── Shared skeleton for loading states (no numeric placeholders) ────────────
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-white/[0.06] rounded ${className}`} />;
}

// ─── A) DRIVER STATUS PANEL ─────────────────────────────────────────────────
function DriverStatusPanel() {
  const { status, session } = useRelay();

  const isLive = status === 'in_session';
  const isConnected = status === 'connected' || status === 'in_session';

  const borderClass = isLive
    ? 'border-green-500/50 bg-green-500/10'
    : isConnected
      ? 'border-blue-500/30 bg-blue-500/5'
      : 'border-white/10 bg-white/[0.02]';

  const iconBoxClass = isLive
    ? 'border-green-500/50 bg-green-500/20'
    : isConnected
      ? 'border-blue-500/30 bg-blue-500/10'
      : 'border-white/20 bg-white/5';

  return (
    <div className={`border p-6 transition-all ${borderClass}`}>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 border flex items-center justify-center ${iconBoxClass}`}>
            {isLive ? (
              <Radio className="w-7 h-7 text-green-500 animate-pulse" />
            ) : isConnected ? (
              <Wifi className="w-7 h-7 text-blue-500" />
            ) : status === 'connecting' ? (
              <Wifi className="w-7 h-7 text-yellow-500 animate-pulse" />
            ) : (
              <WifiOff className="w-7 h-7 text-white/40" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold uppercase tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              {isLive ? 'Session Active' : isConnected ? 'Relay Connected' : status === 'connecting' ? 'Connecting...' : 'Relay Offline'}
            </h2>
            <p className="text-sm text-white/60 mt-1">
              {isLive ? (
                <span className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-green-400" />
                  {session.trackName || 'Track'} — {session.sessionType?.toUpperCase() || 'LIVE'}
                </span>
              ) : isConnected ? (
                'Waiting for iRacing session to start'
              ) : (
                'Start the relay to connect to iRacing'
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isLive && (
            <Link
              to="/driver/cockpit"
              className="px-4 py-2 bg-green-500/20 border border-green-500/30 text-green-400 font-semibold text-sm uppercase tracking-wider hover:bg-green-500/30 flex items-center gap-2"
            >
              <Gauge className="w-4 h-4" />
              Cockpit
            </Link>
          )}
          {status === 'disconnected' && (
            <Link
              to="/download"
              className="px-4 py-2 border border-white/20 text-white/60 font-semibold text-sm uppercase tracking-wider hover:bg-white/5 hover:text-white flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Get Relay
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── B) PERFORMANCE SNAPSHOT (with Consistency Index — Phase 4) ──────────────
function PerformanceSnapshotPanel({ snapshot, snapshotLoading, snapshotError, onRetry }: {
  snapshot: PerformanceSnapshot | null | undefined;
  snapshotLoading: boolean;
  snapshotError: boolean;
  onRetry: () => void;
}) {
  const consistency = useMemo(() => computeConsistency(snapshot ?? null), [snapshot]);

  return (
    <div className="border border-white/10 bg-white/[0.02]">
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
        <h3 className="text-sm uppercase tracking-[0.15em] text-white/60" style={{ fontFamily: 'Orbitron, sans-serif' }}>
          Performance Snapshot
        </h3>
        {snapshot && (
          <span className="text-[10px] text-white/30 uppercase tracking-wider">
            Last {snapshot.session_count} sessions
          </span>
        )}
      </div>

      {snapshotLoading && (
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-5 gap-3">
            {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16" />)}
          </div>
        </div>
      )}

      {snapshotError && (
        <div className="p-8 text-center">
          <AlertTriangle className="w-8 h-8 text-red-400/40 mx-auto mb-3" />
          <p className="text-xs text-white/40">Failed to load performance data</p>
          <button onClick={onRetry} className="mt-3 text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mx-auto">
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

      {!snapshotLoading && !snapshotError && snapshot === null && (
        <div className="p-8 text-center">
          <Target className="w-8 h-8 text-white/20 mx-auto mb-3" />
          <p className="text-sm text-white/50 font-medium">No performance snapshot yet</p>
          <p className="text-xs text-white/30 mt-2">Complete 3 sessions to unlock your snapshot</p>
          <div className="flex items-center justify-center gap-3 mt-4">
            <Link to="/driver/cockpit" className="text-xs text-green-400 hover:text-green-300 uppercase tracking-wider flex items-center gap-1">
              <Gauge className="w-3 h-3" /> Go to Cockpit
            </Link>
            <span className="text-white/20">|</span>
            <Link to="/driver/history" className="text-xs text-blue-400 hover:text-blue-300 uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3 h-3" /> View History
            </Link>
          </div>
        </div>
      )}

      {snapshot && (
        <div className="p-5">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="p-3 bg-white/[0.03] border border-white/[0.06] rounded text-center">
              <div className="text-xl font-bold font-mono text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                P{snapshot.avg_finish}
              </div>
              <div className="text-[10px] text-white/40 uppercase tracking-wider mt-1">Avg Finish</div>
            </div>
            <div className="p-3 bg-white/[0.03] border border-white/[0.06] rounded text-center">
              <div className="text-xl font-bold font-mono text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                {snapshot.avg_incidents}x
              </div>
              <div className="text-[10px] text-white/40 uppercase tracking-wider mt-1">Avg Incidents</div>
            </div>
            <div className="p-3 bg-white/[0.03] border border-white/[0.06] rounded text-center">
              <div className={`text-xl font-bold font-mono flex items-center justify-center gap-1 ${
                snapshot.irating_delta > 0 ? 'text-green-400' : snapshot.irating_delta < 0 ? 'text-red-400' : 'text-white/60'
              }`} style={{ fontFamily: 'Orbitron, sans-serif' }}>
                {snapshot.irating_delta > 0 ? <ArrowUpRight className="w-4 h-4" /> : snapshot.irating_delta < 0 ? <ArrowDownRight className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                {snapshot.irating_delta > 0 ? '+' : ''}{snapshot.irating_delta}
              </div>
              <div className="text-[10px] text-white/40 uppercase tracking-wider mt-1">iR Delta</div>
            </div>
            <div className="p-3 bg-white/[0.03] border border-white/[0.06] rounded text-center">
              <div className="text-xl font-bold font-mono text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                P{snapshot.avg_start}
              </div>
              <div className="text-[10px] text-white/40 uppercase tracking-wider mt-1">Avg Start</div>
            </div>
            {/* Consistency Index (Phase 4) */}
            {consistency && (
              <div className={`p-3 border rounded text-center ${
                consistency.index >= 80 ? 'bg-green-500/[0.06] border-green-500/20' :
                consistency.index >= 50 ? 'bg-yellow-500/[0.06] border-yellow-500/20' :
                'bg-red-500/[0.06] border-red-500/20'
              }`}>
                <div className={`text-xl font-bold font-mono ${
                  consistency.index >= 80 ? 'text-green-400' :
                  consistency.index >= 50 ? 'text-yellow-400' :
                  'text-red-400'
                }`} style={{ fontFamily: 'Orbitron, sans-serif' }}>
                  {consistency.index}
                </div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider mt-1 flex items-center justify-center gap-1">
                  <Activity className="w-3 h-3" />CPI
                </div>
              </div>
            )}
          </div>

          {/* Mini session list */}
          <div className="mt-4 space-y-1">
            {snapshot.sessions.map((s, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-1.5 px-2 rounded hover:bg-white/[0.02]">
                <div className="flex items-center gap-2 text-white/60 truncate">
                  <span className="font-mono text-white/80 w-6">P{s.finish_position}</span>
                  <span className="truncate">{s.track_name}</span>
                </div>
                <div className={`font-mono ${
                  s.irating_change > 0 ? 'text-green-400' : s.irating_change < 0 ? 'text-red-400' : 'text-white/30'
                }`}>
                  {s.irating_change > 0 ? '+' : ''}{s.irating_change || 0}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── C) CREW INTELLIGENCE FEED (Phase 3 — rule-based insights) ──────────────
function CrewIntelFeed({ sessions }: { sessions: DriverSessionSummary[] }) {
  const { status } = useRelay();
  const [briefs, setBriefs] = useState<CrewBrief[] | null | undefined>(undefined);
  const [error, setError] = useState(false);

  const isLive = status === 'in_session';

  const load = useCallback(async () => {
    setError(false);
    try {
      const data = await fetchCrewBrief();
      setBriefs(data);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const hasBriefs = briefs && briefs.length > 0;
  const isLoading = briefs === undefined && !error;

  // Phase 3: Rule-based insights from session data
  const ruleInsights = useMemo(() => computeCrewInsights(sessions), [sessions]);

  const crewRoles = [
    { key: 'engineer' as const, label: 'Engineer', subtitle: 'Strategy & Setup', icon: Wrench, color: '#f97316', link: '/driver/crew/engineer' },
    { key: 'spotter' as const, label: 'Spotter', subtitle: 'Traffic & Awareness', icon: Eye, color: '#3b82f6', link: '/driver/crew/spotter' },
    { key: 'analyst' as const, label: 'Analyst', subtitle: 'Data & Insights', icon: BarChart3, color: '#8b5cf6', link: '/driver/crew/analyst' },
  ];

  return (
    <div className="border border-white/10 bg-white/[0.02]">
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
        <h3 className="text-sm uppercase tracking-[0.15em] text-white/60" style={{ fontFamily: 'Orbitron, sans-serif' }}>
          Crew Intelligence
        </h3>
        {isLive && (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] text-green-400 uppercase tracking-wider">Live</span>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/10">
          {[1,2,3].map(i => <div key={i} className="p-5"><Skeleton className="h-20" /></div>)}
        </div>
      )}

      {error && (
        <div className="p-6 text-center">
          <AlertTriangle className="w-6 h-6 text-red-400/40 mx-auto mb-2" />
          <p className="text-xs text-white/40">Failed to load crew data</p>
          <button onClick={load} className="mt-2 text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mx-auto">
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

      {!isLoading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/10">
          {crewRoles.map((role) => {
            const Icon = role.icon;
            // Prefer real server briefs, fall back to rule-based insights
            const serverBrief = hasBriefs ? briefs.find(b => b.type?.toLowerCase().includes(role.key)) : null;
            const ruleInsight = ruleInsights.find(i => i.role === role.key);

            const displayMessage = serverBrief?.title || ruleInsight?.message || null;

            return (
              <Link key={role.key} to={role.link} className="p-5 hover:bg-white/[0.02] transition-colors group">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 flex items-center justify-center"
                    style={{ backgroundColor: `${role.color}20`, border: `1px solid ${role.color}30` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: role.color }} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold uppercase tracking-wider transition-colors" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                      {role.label}
                    </h4>
                    <p className="text-[10px] text-white/40 uppercase tracking-wider">{role.subtitle}</p>
                  </div>
                </div>
                {displayMessage ? (
                  <p className="text-xs text-white/60 line-clamp-2">{displayMessage}</p>
                ) : (
                  <p className="text-xs text-white/30 italic">
                    {isLive ? 'Monitoring session...' : 'Standing by'}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {!isLoading && !error && !hasBriefs && ruleInsights.length === 0 && !isLive && (
        <div className="px-5 pb-5">
          <div className="p-4 border border-dashed border-white/10 rounded text-center">
            <p className="text-xs text-white/40">Crew is standing by</p>
            <p className="text-[10px] text-white/25 mt-1">Complete a session to activate crew analysis</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── D) RECENT SESSIONS (Phase 5 — enhanced empty state) ────────────────────
function RecentSessionsList({ sessions, loading }: { sessions: DriverSessionSummary[]; loading: boolean }) {
  const recent = sessions.slice(0, 5);
  const hasSessions = recent.length > 0;

  function formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch { return ''; }
  }

  return (
    <div className="border border-white/10 bg-white/[0.02]">
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
        <h3 className="text-sm uppercase tracking-[0.15em] text-white/60" style={{ fontFamily: 'Orbitron, sans-serif' }}>
          Recent Sessions
        </h3>
        {hasSessions && (
          <Link to="/driver/history" className="text-xs text-white/40 hover:text-white/60 uppercase tracking-wider flex items-center gap-1">
            View All <ChevronRight className="w-3 h-3" />
          </Link>
        )}
      </div>

      {loading && (
        <div className="divide-y divide-white/10">
          {[1,2,3].map(i => (
            <div key={i} className="px-5 py-4 flex items-center gap-4">
              <Skeleton className="w-10 h-10 shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && hasSessions && (
        <div className="divide-y divide-white/10">
          {recent.map((s) => (
            <Link
              key={s.sessionId}
              to="/driver/history"
              className="px-5 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className={`w-10 h-10 flex items-center justify-center font-bold text-sm shrink-0 ${
                  s.finishPos === 1 ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' :
                  (s.finishPos ?? 99) <= 3 ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                  (s.finishPos ?? 99) <= 5 ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                  'bg-white/5 text-white/60 border border-white/10'
                }`} style={{ fontFamily: 'Orbitron, sans-serif' }}>
                  {s.finishPos != null ? `P${s.finishPos}` : '—'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{s.trackName || 'Unknown Track'}</p>
                  <p className="text-xs text-white/40 truncate">
                    {s.seriesName || s.eventType || 'Race'}
                    {s.carName ? ` • ${s.carName}` : ''}
                    {s.incidents != null ? ` • ${s.incidents}x` : ''}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0 ml-3">
                <div className={`text-xs font-mono ${
                  (s.iRatingChange ?? 0) > 0 ? 'text-green-400' : (s.iRatingChange ?? 0) < 0 ? 'text-red-400' : 'text-white/30'
                }`}>
                  {s.iRatingChange != null ? `${s.iRatingChange > 0 ? '+' : ''}${s.iRatingChange}` : ''}
                </div>
                <p className="text-[10px] text-white/30 mt-0.5">{formatDate(s.startedAt)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!loading && !hasSessions && (
        <div className="p-8 text-center">
          <Flag className="w-8 h-8 text-white/20 mx-auto mb-3" />
          <p className="text-sm text-white/50 font-medium">No telemetry captured yet</p>
          <p className="text-xs text-white/30 mt-2">Connect relay and complete 1 clean session to activate crew analysis.</p>
          <Link to="/driver/cockpit" className="inline-flex items-center gap-1 mt-4 text-xs text-green-400 hover:text-green-300 uppercase tracking-wider">
            <Gauge className="w-3 h-3" /> Open Cockpit
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── E) IRACING STATS PANEL (Phase 7 — per-license only, no combined SR) ────
function IRacingStatsPanel({ profile }: { profile: ReturnType<typeof useDriverData>['profile'] }) {
  const hasStats = profile && profile.licenses && profile.licenses.length > 0;

  const DISCIPLINE_LABELS: Record<string, string> = {
    sportsCar: 'Road', oval: 'Oval', dirtOval: 'Dirt Oval', dirtRoad: 'Dirt Road', formula: 'Formula',
  };

  return (
    <div className="border border-white/10 bg-white/[0.02]">
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
        <h3 className="text-sm uppercase tracking-[0.15em] text-white/60" style={{ fontFamily: 'Orbitron, sans-serif' }}>
          Licenses
        </h3>
        {hasStats && (
          <Link to="/driver/ratings" className="text-[10px] text-white/40 hover:text-white/60 uppercase tracking-wider flex items-center gap-1">
            Details <ChevronRight className="w-3 h-3" />
          </Link>
        )}
      </div>
      {hasStats ? (
        <div className="p-4 space-y-2">
          {profile!.licenses.map((license) => (
            <div key={license.discipline} className="flex items-center justify-between p-3 bg-white/[0.02] rounded border border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: getLicenseColor(license.licenseClass) }}
                >
                  {license.licenseClass}
                </div>
                <div>
                  <div className="text-xs text-white/80 font-medium">
                    {DISCIPLINE_LABELS[license.discipline] || license.discipline}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex items-center gap-1">
                      <Shield className="w-3 h-3 text-green-400/60" />
                      <span className="text-[10px] font-mono text-green-400/80">{license.safetyRating?.toFixed(2) ?? '—'}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-base font-mono font-bold text-blue-400" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                  {license.iRating ?? '—'}
                </div>
                <div className="text-[10px] text-white/30">iRating</div>
              </div>
            </div>
          ))}
          {profile!.custId && (
            <div className="text-[10px] text-white/30 text-center pt-1">
              iRacing ID: {profile!.custId}
            </div>
          )}
        </div>
      ) : (
        <div className="p-8 text-center">
          <Award className="w-8 h-8 text-white/20 mx-auto mb-3" />
          <p className="text-xs text-white/40">No iRacing data yet</p>
          <p className="text-[10px] text-white/30 mt-1">
            <Link to="/settings" className="text-blue-400 hover:text-blue-300">Connect your iRacing account</Link> to see your stats
          </p>
        </div>
      )}
    </div>
  );
}

// ─── F) UPCOMING EVENTS (Phase 5 — enhanced empty state) ────────────────────
function UpcomingEventsPanel() {
  return (
    <div className="border border-white/10 bg-white/[0.02]">
      <div className="px-5 py-4 border-b border-white/10">
        <h3 className="text-sm uppercase tracking-[0.15em] text-white/60" style={{ fontFamily: 'Orbitron, sans-serif' }}>
          Upcoming
        </h3>
      </div>
      <div className="p-5 text-center">
        <Calendar className="w-8 h-8 text-white/20 mx-auto mb-3" />
        <p className="text-xs text-white/40">No scheduled events</p>
        <p className="text-[10px] text-white/30 mt-1">Join or create a league to unlock strategic prep tools.</p>
      </div>
    </div>
  );
}

// ─── G) QUICK ACCESS ─────────────────────────────────────────────────────────
function QuickAccessPanel() {
  return (
    <div className="border border-white/10 bg-white/[0.02]">
      <div className="px-5 py-4 border-b border-white/10">
        <h3 className="text-sm uppercase tracking-[0.15em] text-white/60" style={{ fontFamily: 'Orbitron, sans-serif' }}>
          Quick Access
        </h3>
      </div>
      <div className="divide-y divide-white/10">
        <Link to="/driver/cockpit" className="px-5 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors group">
          <div className="flex items-center gap-3">
            <Gauge className="w-5 h-5 text-green-400" />
            <span className="text-sm">Cockpit View</span>
          </div>
          <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40" />
        </Link>
        <Link to="/driver/progress" className="px-5 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors group">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            <span className="text-sm">Progress</span>
          </div>
          <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40" />
        </Link>
        <Link to="/driver/history" className="px-5 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors group">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-purple-400" />
            <span className="text-sm">Session History</span>
          </div>
          <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40" />
        </Link>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

export function DriverLanding() {
  const { user } = useAuth();
  const { status } = useRelay();
  const { profile, sessions, loading } = useDriverData();
  const displayName = profile?.displayName || user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Driver';

  const isLive = status === 'in_session';

  // Performance snapshot fetch (lifted so direction panel can use it)
  const [snapshot, setSnapshot] = useState<PerformanceSnapshot | null | undefined>(undefined);
  const [snapshotError, setSnapshotError] = useState(false);

  const loadSnapshot = useCallback(async () => {
    setSnapshotError(false);
    try {
      const data = await fetchPerformanceSnapshot();
      setSnapshot(data);
    } catch {
      setSnapshotError(true);
    }
  }, []);

  useEffect(() => { loadSnapshot(); }, [loadSnapshot]);

  const snapshotLoading = snapshot === undefined && !snapshotError;

  // Phase 1: Performance direction (derived from snapshot)
  const direction = useMemo(() => computePerformanceDirection(snapshot ?? null), [snapshot]);

  // Phase 2: Rating trend (derived from sessions)
  const trendPoints = useMemo(() => buildRatingTrend(sessions), [sessions]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-8">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/40 text-sm uppercase tracking-wider">Welcome back</p>
          <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-wider mt-1" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            {displayName}
          </h1>
        </div>
        {isLive && (
          <Link
            to="/driver/cockpit"
            className="px-6 py-3 bg-green-500 text-black font-bold text-sm uppercase tracking-wider hover:bg-green-400 flex items-center gap-2 animate-pulse"
          >
            <Play className="w-5 h-5" />
            Enter Cockpit
          </Link>
        )}
      </div>

      {/* A) Driver Status Panel */}
      <DriverStatusPanel />

      {/* Phase 1: Performance Direction — above the fold */}
      {!snapshotLoading && !snapshotError && (
        <PerformanceDirectionPanel direction={direction} />
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* B) Performance Snapshot + Consistency Index */}
          <PerformanceSnapshotPanel
            snapshot={snapshot}
            snapshotLoading={snapshotLoading}
            snapshotError={snapshotError}
            onRetry={loadSnapshot}
          />

          {/* Phase 2: iRating Trend Graph */}
          {!loading && <RatingTrendGraph points={trendPoints} />}

          {/* C) Crew Intelligence Feed (Phase 3 — rule-based insights) */}
          <CrewIntelFeed sessions={sessions} />

          {/* D) Recent Sessions */}
          <RecentSessionsList sessions={sessions} loading={loading} />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* E) iRacing Stats (Phase 7 — per-license, no combined SR) */}
          <IRacingStatsPanel profile={profile} />

          {/* G) Quick Access */}
          <QuickAccessPanel />

          {/* F) Upcoming Events */}
          <UpcomingEventsPanel />
        </div>
      </div>
    </div>
  );
}
