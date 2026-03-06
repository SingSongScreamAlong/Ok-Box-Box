import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useDriverData } from '../../hooks/useDriverData';
import { getDisciplineLabel, getLicenseColor, DriverDiscipline, DriverSessionSummary, fetchCrewBrief, CrewBrief } from '../../lib/driverService';
import { 
  Calendar, MapPin, Flag, Trophy, AlertTriangle, Loader2,
  TrendingUp, TrendingDown, Minus, Filter, ChevronRight,
  BarChart3, Target, Clock, ArrowLeft, Medal, Award, Shield, X
} from 'lucide-react';

type ViewMode = 'overview' | 'sessions' | 'tracks';
type TimeFilter = 'all' | 'week' | 'month' | 'season';

interface TrackStats {
  trackName: string;
  sessions: number;
  bestFinish: number;
  avgFinish: number;
  totalIncidents: number;
  lastRaced: string;
}

interface DisciplineBreakdown {
  discipline: DriverDiscipline;
  starts: number;
  wins: number;
  top5s: number;
  avgFinish: number | null;
}

interface FormMetrics {
  avgFinish: number | null;
  avgIncidents: number | null;
  avgSof: number | null;
  avgStart: number | null;
  avgFinishGap: number | null;
  sessionCount: number;
}

function formatSignedNumber(value: number | null | undefined, digits = 0): string {
  if (value == null || Number.isNaN(value)) return '—';
  if (value === 0) return digits > 0 ? value.toFixed(digits) : '0';
  const absValue = digits > 0 ? Math.abs(value).toFixed(digits) : Math.abs(Math.round(value)).toString();
  return `${value > 0 ? '+' : '-'}${absValue}`;
}

function formatPosition(value: number | null | undefined): string {
  return value != null ? `P${value}` : 'P—';
}

function formatDecimal(value: number | null | undefined, digits = 1): string {
  return value != null && !Number.isNaN(value) ? value.toFixed(digits) : '—';
}

function formatInteger(value: number | null | undefined): string {
  return value != null && !Number.isNaN(value) ? `${Math.round(value)}` : '—';
}

function getSessionPosDelta(session: DriverSessionSummary): number | null {
  if (session.posDelta != null) return session.posDelta;
  if (session.startPos != null && session.finishPos != null) return session.startPos - session.finishPos;
  return null;
}

function calculateWindowMetrics(windowSessions: DriverSessionSummary[]): FormMetrics {
  const finishValues = windowSessions.filter((session) => session.finishPos != null).map((session) => session.finishPos as number);
  const incidentValues = windowSessions.filter((session) => session.incidents != null).map((session) => session.incidents as number);
  const sofValues = windowSessions.filter((session) => session.sof != null).map((session) => session.sof as number);
  const startValues = windowSessions.filter((session) => session.startPos != null).map((session) => session.startPos as number);
  const finishGapValues = windowSessions
    .map((session) => getSessionPosDelta(session))
    .filter((delta): delta is number => delta != null);

  const average = (values: number[]): number | null => values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

  return {
    avgFinish: average(finishValues),
    avgIncidents: average(incidentValues),
    avgSof: average(sofValues),
    avgStart: average(startValues),
    avgFinishGap: average(finishGapValues),
    sessionCount: windowSessions.length,
  };
}

function SessionContextSummary({ session }: { session: DriverSessionSummary }) {
  const posDelta = getSessionPosDelta(session);

  return (
    <>
      <div className={`text-xs font-mono ${
        posDelta != null && posDelta > 0 ? 'text-green-400' :
        posDelta != null && posDelta < 0 ? 'text-red-400' : 'text-white/50'
      }`}>
        {`${formatPosition(session.startPos)} → ${formatPosition(session.finishPos)} (${formatSignedNumber(posDelta)})`}
      </div>
      <div className="text-[10px] text-white/40">
        {`SOF ${formatInteger(session.sof)} • iRΔ ${formatSignedNumber(session.irDelta ?? session.iRatingChange)} • SRΔ ${formatSignedNumber(session.srDelta, 2)}`}
      </div>
    </>
  );
}

function FormMetricRow({ label, recent, baseline, formatter }: { label: string; recent: number | null; baseline: number | null; formatter: (value: number | null) => string }) {
  return (
    <div className="grid grid-cols-[1.2fr,1fr,1fr] gap-3 text-xs items-center">
      <div className="text-white/50 uppercase tracking-wider">{label}</div>
      <div className="text-white/90 font-mono">{formatter(recent)}</div>
      <div className="text-white/65 font-mono">{formatter(baseline)}</div>
    </div>
  );
}

export function DriverHistory() {
  const { sessions, profile, loading } = useDriverData();
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [disciplineFilter, setDisciplineFilter] = useState<DriverDiscipline | 'all'>('all');
  const [crewBriefs, setCrewBriefs] = useState<CrewBrief[]>([]);
  const [isFormDrawerOpen, setIsFormDrawerOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Load crew briefs (session debriefs from AI)
  const loadCrewBriefs = useCallback(async () => {
    const briefs = await fetchCrewBrief();
    if (briefs) setCrewBriefs(briefs);
  }, []);

  useEffect(() => {
    loadCrewBriefs();
  }, [loadCrewBriefs]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.6;
    }
  }, []);

  // Calculate derived stats
  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()),
    [sessions]
  );

  const disciplineScopedSessions = useMemo(
    () => disciplineFilter === 'all' ? sortedSessions : sortedSessions.filter((session) => session.discipline === disciplineFilter),
    [sortedSessions, disciplineFilter]
  );

  const activeSeasonId = useMemo(
    () => disciplineScopedSessions.find((session) => session.seasonId != null)?.seasonId ?? null,
    [disciplineScopedSessions]
  );

  const filteredSessions = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(now);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    return disciplineScopedSessions.filter((session) => {
      const sessionDate = new Date(session.startedAt);

      if (timeFilter === 'week') return sessionDate >= weekAgo;
      if (timeFilter === 'month') return sessionDate >= monthAgo;
      if (timeFilter === 'season') {
        if (activeSeasonId != null) return session.seasonId === activeSeasonId;
        return false;
      }

      return true;
    });
  }, [disciplineScopedSessions, timeFilter, activeSeasonId]);

  const totalSessions = filteredSessions.length;

  const metricSummary = useMemo(() => {
    const finishes = filteredSessions.filter((session) => session.finishPos != null).map((session) => session.finishPos as number);
    const incidents = filteredSessions.filter((session) => session.incidents != null).map((session) => session.incidents as number);
    const deltas = filteredSessions.map((session) => getSessionPosDelta(session)).filter((delta): delta is number => delta != null);

    return {
      wins: filteredSessions.filter((session) => session.finishPos === 1).length,
      podiums: filteredSessions.filter((session) => session.finishPos != null && session.finishPos <= 3).length,
      top5s: filteredSessions.filter((session) => session.finishPos != null && session.finishPos <= 5).length,
      avgFinish: finishes.length > 0 ? finishes.reduce((sum, value) => sum + value, 0) / finishes.length : null,
      avgIncidents: incidents.length > 0 ? incidents.reduce((sum, value) => sum + value, 0) / incidents.length : null,
      positionsGained: deltas.reduce((sum, value) => sum + value, 0),
    };
  }, [filteredSessions]);

  const trackStats: TrackStats[] = useMemo(() => Object.values(
    filteredSessions.reduce((acc, session) => {
      if (!acc[session.trackName]) {
        acc[session.trackName] = {
          trackName: session.trackName,
          sessions: 0,
          bestFinish: 99,
          avgFinish: 0,
          totalIncidents: 0,
          lastRaced: session.startedAt,
          _finishes: [] as number[],
        };
      }

      acc[session.trackName].sessions++;

      if (session.finishPos != null && session.finishPos < acc[session.trackName].bestFinish) {
        acc[session.trackName].bestFinish = session.finishPos;
        acc[session.trackName]._finishes.push(session.finishPos);
      } else if (session.finishPos != null) {
        acc[session.trackName]._finishes.push(session.finishPos);
      }

      acc[session.trackName].totalIncidents += session.incidents ?? 0;

      if (new Date(session.startedAt) > new Date(acc[session.trackName].lastRaced)) {
        acc[session.trackName].lastRaced = session.startedAt;
      }

      return acc;
    }, {} as Record<string, TrackStats & { _finishes: number[] }>)
  ).map((track) => ({
    ...track,
    avgFinish: track._finishes.length > 0 ? track._finishes.reduce((sum, value) => sum + value, 0) / track._finishes.length : 0,
    bestFinish: track.bestFinish === 99 ? 0 : track.bestFinish,
  })).sort((a, b) => b.sessions - a.sessions), [filteredSessions]);

  const recentSessions = useMemo(() => filteredSessions.slice(0, 5), [filteredSessions]);
  const recentMetrics = useMemo(() => calculateWindowMetrics(recentSessions), [recentSessions]);
  const baselineSessions = useMemo(() => {
    const previousSessions = filteredSessions.slice(5, 25);
    if (previousSessions.length > 0) return previousSessions;
    return filteredSessions.slice(0, Math.min(filteredSessions.length, 20));
  }, [filteredSessions]);
  const baselineMetrics = useMemo(() => calculateWindowMetrics(baselineSessions), [baselineSessions]);

  const formTrend = useMemo(() => {
    if (recentMetrics.avgFinish == null || baselineMetrics.avgFinish == null) return 'stable';
    if (recentMetrics.avgFinish < baselineMetrics.avgFinish) return 'improving';
    if (recentMetrics.avgFinish > baselineMetrics.avgFinish) return 'declining';
    return 'stable';
  }, [recentMetrics.avgFinish, baselineMetrics.avgFinish]);

  const disciplineBreakdown = useMemo((): DisciplineBreakdown[] => {
    const grouped = filteredSessions.reduce((acc, session) => {
      if (!acc[session.discipline]) {
        acc[session.discipline] = {
          discipline: session.discipline,
          starts: 0,
          wins: 0,
          top5s: 0,
          finishes: [] as number[],
        };
      }

      const bucket = acc[session.discipline];
      bucket.starts += 1;
      if (session.finishPos === 1) bucket.wins += 1;
      if (session.finishPos != null && session.finishPos <= 5) bucket.top5s += 1;
      if (session.finishPos != null) bucket.finishes.push(session.finishPos);

      return acc;
    }, {} as Record<DriverDiscipline, { discipline: DriverDiscipline; starts: number; wins: number; top5s: number; finishes: number[] }>);

    return Object.values(grouped)
      .map((bucket) => ({
        discipline: bucket.discipline,
        starts: bucket.starts,
        wins: bucket.wins,
        top5s: bucket.top5s,
        avgFinish: bucket.finishes.length > 0 ? bucket.finishes.reduce((sum, value) => sum + value, 0) / bucket.finishes.length : null,
      }))
      .sort((a, b) => b.starts - a.starts);
  }, [filteredSessions]);

  const filterLabel = timeFilter === 'all'
    ? 'All time'
    : timeFilter === 'season'
      ? 'Current season'
      : `Last ${timeFilter}`;

  if (loading) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center bg-[#0e0e0e]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#f97316]" />
          <span className="text-white/50 text-sm">Loading performance data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex relative">
      {/* Background video */}
      <div className="absolute inset-0 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="w-full h-full object-cover opacity-70"
        >
          <source src="/videos/bg-2.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-r from-[#0e0e0e]/80 via-[#0e0e0e]/60 to-[#0e0e0e]/40" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0e0e0e]/80" />
      </div>

      {/* Sidebar */}
      <div className="relative z-10 w-72 border-r border-white/[0.06] bg-[#0e0e0e]/80 backdrop-blur-xl flex flex-col">
        <div className="p-4 border-b border-white/[0.06]">
          <Link to="/driver/home" className="flex items-center gap-2 text-white/50 hover:text-white text-xs mb-4 transition-colors">
            <ArrowLeft className="w-3 h-3" />Back to Cockpit
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/[0.04] border border-white/[0.08] rounded flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-[#f97316]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-white/90" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                Performance
              </h2>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">History & Stats</p>
            </div>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="p-4 border-b border-white/[0.06]">
          <div className="flex gap-1">
            {(['overview', 'sessions', 'tracks'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`flex-1 px-2 py-2 text-[10px] uppercase tracking-wider rounded transition-all ${
                  viewMode === mode 
                    ? 'bg-[#f97316]/20 text-[#f97316] border border-[#f97316]/30' 
                    : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-white/[0.06]">
          <div className="text-[9px] uppercase tracking-wider text-white/30 mb-3 flex items-center gap-2">
            <Filter className="w-3 h-3" />Filters
          </div>
          
          <div className="space-y-3">
            <div>
              <div className="text-[10px] text-white/50 mb-1.5">Time Period</div>
              <div className="grid grid-cols-2 gap-1">
                {(['all', 'week', 'month', 'season'] as TimeFilter[]).map(filter => (
                  <button
                    key={filter}
                    onClick={() => setTimeFilter(filter)}
                    className={`px-2 py-1.5 text-[10px] uppercase tracking-wider rounded transition-all ${
                      timeFilter === filter 
                        ? 'bg-white/[0.08] text-white border border-white/20' 
                        : 'text-white/40 hover:text-white/60 border border-transparent'
                    }`}
                  >
                    {filter === 'all' ? 'All Time' : filter}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[10px] text-white/50 mb-1.5">Discipline</div>
              <select
                value={disciplineFilter}
                onChange={(e) => setDisciplineFilter(e.target.value as DriverDiscipline | 'all')}
                className="w-full px-3 py-2 bg-[#1a1a1a] border border-white/[0.08] rounded text-xs text-white/80 focus:outline-none focus:border-white/20 cursor-pointer"
                style={{ colorScheme: 'dark' }}
              >
                <option value="all" className="bg-[#1a1a1a] text-white">All Disciplines</option>
                <option value="oval" className="bg-[#1a1a1a] text-white">Oval</option>
                <option value="sportsCar" className="bg-[#1a1a1a] text-white">Sports Car</option>
                <option value="formula" className="bg-[#1a1a1a] text-white">Formula</option>
                <option value="dirtOval" className="bg-[#1a1a1a] text-white">Dirt Oval</option>
                <option value="dirtRoad" className="bg-[#1a1a1a] text-white">Dirt Road</option>
              </select>
            </div>
          </div>
        </div>

        {/* Quick Stats or iRacing Profile */}
        <div className="p-4 flex-1 overflow-y-auto">
          {totalSessions > 0 ? (
            <>
              <div className="text-[9px] uppercase tracking-wider text-white/30 mb-3">Quick Stats</div>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-white/[0.02] rounded border border-white/[0.06]">
                  <span className="text-[10px] text-white/50">Sessions</span>
                  <span className="text-sm font-mono text-white/90">{totalSessions}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-white/[0.02] rounded border border-white/[0.06]">
                  <span className="text-[10px] text-white/50">Wins</span>
                  <span className="text-sm font-mono text-[#f97316]">{metricSummary.wins}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-white/[0.02] rounded border border-white/[0.06]">
                  <span className="text-[10px] text-white/50">Podiums</span>
                  <span className="text-sm font-mono text-white/90">{metricSummary.podiums}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-white/[0.02] rounded border border-white/[0.06]">
                  <span className="text-[10px] text-white/50">Avg Finish</span>
                  <span className="text-sm font-mono text-white/90">{formatDecimal(metricSummary.avgFinish)}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-white/[0.02] rounded border border-white/[0.06]">
                  <span className="text-[10px] text-white/50">Positions Gained</span>
                  <span className={`text-sm font-mono ${metricSummary.positionsGained > 0 ? 'text-green-400' : metricSummary.positionsGained < 0 ? 'text-red-400' : 'text-white/50'}`}>
                    {metricSummary.positionsGained > 0 ? '+' : ''}{metricSummary.positionsGained}
                  </span>
                </div>
              </div>
            </>
          ) : profile && profile.licenses && profile.licenses.length > 0 ? (
            <>
              <div className="text-[9px] uppercase tracking-wider text-white/30 mb-3">iRacing Licenses</div>
              <div className="space-y-2">
                {profile.licenses.map((license) => (
                  <div key={license.discipline} className="flex items-center justify-between p-2 bg-white/[0.02] rounded border border-white/[0.06]">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold text-white" style={{ backgroundColor: getLicenseColor(license.licenseClass) }}>
                        {license.licenseClass}
                      </div>
                      <span className="text-[10px] text-white/50">
                        {license.discipline === 'sportsCar' ? 'Road' : license.discipline === 'dirtOval' ? 'Dirt Oval' : license.discipline === 'dirtRoad' ? 'Dirt Road' : 'Oval'}
                      </span>
                    </div>
                    <span className="text-sm font-mono text-blue-400">{license.iRating ?? '—'}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="text-[9px] uppercase tracking-wider text-white/30 mb-3">Quick Stats</div>
              <div className="p-4 text-center">
                <p className="text-[10px] text-white/30">No data yet</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-white/[0.06] bg-[#0e0e0e]/60 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold uppercase tracking-wider text-white/90" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                {viewMode === 'overview' && 'Performance Overview'}
                {viewMode === 'sessions' && 'Session History'}
                {viewMode === 'tracks' && 'Track Performance'}
              </h1>
              <p className="text-xs text-white/40 mt-1">
                {filterLabel} • {disciplineFilter === 'all' ? 'All disciplines' : getDisciplineLabel(disciplineFilter)}
              </p>
            </div>
            
            {/* Form Indicator */}
            <button
              onClick={() => setIsFormDrawerOpen(true)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded border transition-colors ${
                formTrend === 'improving' ? 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/15' :
                formTrend === 'declining' ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/15' :
                'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
              }`}
            >
              {formTrend === 'improving' && <TrendingUp className="w-3 h-3" />}
              {formTrend === 'declining' && <TrendingDown className="w-3 h-3" />}
              {formTrend === 'stable' && <Minus className="w-3 h-3" />}
              <span className="text-[10px] uppercase tracking-wider">
                Form: {formTrend}
              </span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* AI Session Debriefs */}
          {crewBriefs.length > 0 && viewMode === 'overview' && (
            <div className="mb-6 bg-white/[0.03] backdrop-blur-xl border border-[#f97316]/20 rounded p-5">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-4 h-4 text-[#f97316]" />
                <h3 className="text-xs uppercase tracking-[0.15em] text-[#f97316]" style={{ fontFamily: 'Orbitron, sans-serif' }}>Engineer Debriefs</h3>
              </div>
              <div className="space-y-3">
                {crewBriefs.slice(0, 3).map((brief) => (
                  <div key={brief.id} className="p-3 bg-white/[0.02] rounded border border-white/[0.06]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-white/80">{brief.title}</span>
                      <span className="text-[9px] text-white/30">{new Date(brief.created_at).toLocaleDateString()}</span>
                    </div>
                    {brief.content?.summary && (
                      <p className="text-[11px] text-white/50 leading-relaxed">{brief.content.summary}</p>
                    )}
                    {brief.content?.key_insight && (
                      <p className="text-[11px] text-[#f97316]/80 mt-2 italic">"{brief.content.key_insight}"</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* iRacing Profile Summary when no sessions */}
          {totalSessions === 0 && profile && profile.licenses && profile.licenses.length > 0 && (
            <div className="mb-6 bg-white/[0.03] backdrop-blur-xl border border-blue-500/20 rounded p-5">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs uppercase tracking-[0.15em] text-blue-400" style={{ fontFamily: 'Orbitron, sans-serif' }}>iRacing Profile</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded text-center">
                  <div className="text-2xl font-mono font-bold text-blue-400">{profile.iRatingOverall ?? '—'}</div>
                  <div className="text-[10px] text-blue-400/60 uppercase tracking-wider mt-1">iRating</div>
                </div>
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded text-center">
                  <div className="text-2xl font-mono font-bold text-green-400">{profile.safetyRatingOverall?.toFixed(2) ?? '—'}</div>
                  <div className="text-[10px] text-green-400/60 uppercase tracking-wider mt-1">Safety Rating</div>
                </div>
              </div>
              <div className="space-y-2">
                {profile.licenses.map((license) => (
                  <div key={license.discipline} className="flex items-center justify-between p-2.5 bg-white/[0.02] rounded border border-white/[0.06]">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: getLicenseColor(license.licenseClass) }}>
                        {license.licenseClass}
                      </div>
                      <span className="text-xs text-white/70">
                        {license.discipline === 'sportsCar' ? 'Road' : license.discipline === 'dirtOval' ? 'Dirt Oval' : license.discipline === 'dirtRoad' ? 'Dirt Road' : 'Oval'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-sm font-mono text-blue-400">{license.iRating ?? '—'}</span>
                        <span className="text-[10px] text-white/30 ml-1">iR</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Shield className="w-3 h-3 text-green-400" />
                        <span className="text-sm font-mono text-green-400">{license.safetyRating?.toFixed(2) ?? '—'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-white/30 text-center mt-3">Session history will appear here after you race with the relay connected</p>
            </div>
          )}

          {viewMode === 'overview' && totalSessions > 0 && (
            <div className="space-y-4">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white/[0.03] backdrop-blur-xl border border-[#f97316]/30 rounded p-4 shadow-lg shadow-[#f97316]/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase tracking-[0.15em] text-[#f97316]">Wins</span>
                    <Trophy className="w-4 h-4 text-[#f97316]" />
                  </div>
                  <div className="text-3xl font-mono font-bold text-[#f97316]">{metricSummary.wins}</div>
                  <div className="text-[10px] text-white/40 mt-1">
                    {totalSessions > 0 ? ((metricSummary.wins / totalSessions) * 100).toFixed(1) : 0}% win rate
                  </div>
                </div>
                
                <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.10] rounded p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase tracking-[0.15em] text-white/50">Top 5s</span>
                    <Medal className="w-4 h-4 text-white/30" />
                  </div>
                  <div className="text-3xl font-mono font-bold">{metricSummary.top5s}</div>
                  <div className="text-[10px] text-white/40 mt-1">
                    {totalSessions > 0 ? ((metricSummary.top5s / totalSessions) * 100).toFixed(1) : 0}% top 5 rate
                  </div>
                </div>
                
                <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.10] rounded p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase tracking-[0.15em] text-white/50">Avg Finish</span>
                    <Target className="w-4 h-4 text-white/30" />
                  </div>
                  <div className="text-3xl font-mono font-bold">P{formatDecimal(metricSummary.avgFinish)}</div>
                  <div className="text-[10px] text-white/40 mt-1">
                    Recent: P{formatDecimal(recentMetrics.avgFinish)}
                  </div>
                </div>
                
                <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.10] rounded p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase tracking-[0.15em] text-white/50">Avg Incidents</span>
                    <AlertTriangle className="w-4 h-4 text-white/30" />
                  </div>
                  <div className="text-3xl font-mono font-bold">{formatDecimal(metricSummary.avgIncidents)}</div>
                  <div className="text-[10px] text-white/40 mt-1">per session</div>
                </div>
              </div>

              {/* Recent Sessions */}
              <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.10] rounded p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs uppercase tracking-[0.15em] text-white/60 flex items-center gap-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    <Clock className="w-4 h-4" />Recent Sessions
                  </h3>
                  <button 
                    onClick={() => setViewMode('sessions')}
                    className="text-[10px] text-[#f97316] hover:text-[#f97316]/80 flex items-center gap-1"
                  >
                    View All <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="space-y-2">
                  {recentSessions.map((session) => (
                    <div 
                      key={session.sessionId}
                      className="flex items-center justify-between p-3 bg-white/[0.02] rounded border border-white/[0.06] hover:border-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded flex items-center justify-center font-mono font-bold ${
                          session.finishPos === 1 ? 'bg-[#f97316]/20 text-[#f97316]' :
                          session.finishPos != null && session.finishPos <= 3 ? 'bg-yellow-500/20 text-yellow-400' :
                          session.finishPos != null && session.finishPos <= 5 ? 'bg-green-500/20 text-green-400' :
                          'bg-white/5 text-white/60'
                        }`}>
                          {formatPosition(session.finishPos)}
                        </div>
                        <div>
                          <div className="text-sm text-white/90">{session.trackName}</div>
                          <div className="text-[10px] text-white/40">{session.seriesName}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <SessionContextSummary session={session} />
                          <div className="text-[10px] text-white/35 mt-1">Inc {formatInteger(session.incidents)}</div>
                        </div>
                        <div className="text-[10px] text-white/30">
                          {new Date(session.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Discipline Breakdown */}
              {disciplineBreakdown.length > 0 && (
                <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.10] rounded p-4">
                  <h3 className="text-xs uppercase tracking-[0.15em] text-white/60 flex items-center gap-2 mb-4" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    <Award className="w-4 h-4" />By Discipline
                  </h3>
                  <div className="text-[10px] text-white/35 uppercase tracking-wider mb-3">{filterLabel}</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {disciplineBreakdown.map((stat) => (
                      <div 
                        key={stat.discipline}
                        className="p-3 bg-white/[0.02] rounded border border-white/[0.06] hover:border-white/10 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-semibold uppercase tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                            {getDisciplineLabel(stat.discipline)}
                          </span>
                          <span className="text-[10px] text-white/40 font-mono">{stat.starts} starts</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <div className="text-lg font-mono font-bold text-[#f97316]">{stat.wins}</div>
                            <div className="text-[9px] text-white/40 uppercase">Wins</div>
                          </div>
                          <div>
                            <div className="text-lg font-mono font-bold">{stat.top5s}</div>
                            <div className="text-[9px] text-white/40 uppercase">Top 5</div>
                          </div>
                          <div>
                            <div className="text-lg font-mono font-bold">{formatDecimal(stat.avgFinish)}</div>
                            <div className="text-[9px] text-white/40 uppercase">Avg Finish</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {viewMode === 'overview' && totalSessions === 0 && !profile?.licenses?.length && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Clock className="w-12 h-12 text-white/15 mx-auto mb-4" />
                <h3 className="text-sm text-white/50 uppercase tracking-wider mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>No Sessions Yet</h3>
                <p className="text-xs text-white/30 max-w-sm">Complete a session with the relay connected to start tracking your performance.</p>
              </div>
            </div>
          )}

          {viewMode === 'sessions' && totalSessions === 0 && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Clock className="w-10 h-10 text-white/15 mx-auto mb-3" />
                <p className="text-xs text-white/40">No sessions recorded yet</p>
                <p className="text-[10px] text-white/30 mt-1">Race with the relay connected to see your session history</p>
              </div>
            </div>
          )}

          {viewMode === 'sessions' && totalSessions > 0 && (
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.10] rounded overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-white/40">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3" />Date
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-white/40">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-3 h-3" />Series
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-white/40">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3 h-3" />Track
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-white/40">
                      <div className="flex items-center gap-2">
                        <Flag className="w-3 h-3" />Discipline
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-white/40">Result</th>
                    <th className="px-4 py-3 text-center text-[10px] uppercase tracking-wider text-white/40">
                      <div className="flex items-center justify-center gap-1">
                        <AlertTriangle className="w-3 h-3" />Inc
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-[10px] uppercase tracking-wider text-white/40">SOF</th>
                    <th className="px-4 py-3 text-center text-[10px] uppercase tracking-wider text-white/40">iRΔ</th>
                    <th className="px-4 py-3 text-center text-[10px] uppercase tracking-wider text-white/40">SRΔ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSessions.map((session) => (
                    <tr 
                      key={session.sessionId} 
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="px-4 py-3 text-xs font-mono text-white/60 align-top">
                        {new Date(session.startedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium align-top">{session.seriesName}</td>
                      <td className="px-4 py-3 text-sm text-white/80 align-top">{session.trackName}</td>
                      <td className="px-4 py-3 align-top">
                        <span className="text-xs uppercase tracking-wider px-2 py-1 bg-white/5 border border-white/10 rounded">
                          {getDisciplineLabel(session.discipline)}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <SessionContextSummary session={session} />
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-sm align-top">
                        <span className={session.incidents != null && session.incidents > 4 ? 'text-red-400' : 'text-white/60'}>
                          {formatInteger(session.incidents)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-sm text-white/60 align-top">{formatInteger(session.sof)}</td>
                      <td className={`px-4 py-3 text-center font-mono text-sm align-top ${(session.irDelta ?? session.iRatingChange ?? 0) > 0 ? 'text-green-400' : (session.irDelta ?? session.iRatingChange ?? 0) < 0 ? 'text-red-400' : 'text-white/50'}`}>
                        {formatSignedNumber(session.irDelta ?? session.iRatingChange)}
                      </td>
                      <td className={`px-4 py-3 text-center font-mono text-sm align-top ${(session.srDelta ?? 0) > 0 ? 'text-green-400' : (session.srDelta ?? 0) < 0 ? 'text-red-400' : 'text-white/50'}`}>
                        {formatSignedNumber(session.srDelta, 2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {isFormDrawerOpen && (
            <>
              <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setIsFormDrawerOpen(false)} />
              <div className="fixed top-0 right-0 h-full w-full max-w-md bg-[#111111] border-l border-white/10 shadow-2xl z-50 p-6 overflow-y-auto">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-sm uppercase tracking-[0.15em] text-white/80" style={{ fontFamily: 'Orbitron, sans-serif' }}>Form Breakdown</h3>
                    <p className="text-[10px] text-white/35 mt-1">{filterLabel} • {disciplineFilter === 'all' ? 'All disciplines' : getDisciplineLabel(disciplineFilter)}</p>
                  </div>
                  <button onClick={() => setIsFormDrawerOpen(false)} className="p-2 text-white/40 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="mb-4 grid grid-cols-[1.2fr,1fr,1fr] gap-3 text-[10px] uppercase tracking-wider text-white/35 border-b border-white/10 pb-2">
                  <div>Metric</div>
                  <div>Recent</div>
                  <div>Baseline</div>
                </div>

                <div className="space-y-3">
                  <FormMetricRow label="Avg Finish" recent={recentMetrics.avgFinish} baseline={baselineMetrics.avgFinish} formatter={(value) => value == null ? '—' : `P${formatDecimal(value)}`} />
                  <FormMetricRow label="Incidents" recent={recentMetrics.avgIncidents} baseline={baselineMetrics.avgIncidents} formatter={(value) => formatDecimal(value)} />
                  <FormMetricRow label="SOF" recent={recentMetrics.avgSof} baseline={baselineMetrics.avgSof} formatter={(value) => formatInteger(value)} />
                  <FormMetricRow label="Pos Δ" recent={recentMetrics.avgFinishGap} baseline={baselineMetrics.avgFinishGap} formatter={(value) => formatSignedNumber(value)} />
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="p-3 bg-white/[0.03] border border-white/[0.08] rounded">
                    <div className="text-[10px] uppercase tracking-wider text-white/35 mb-1">Recent Window</div>
                    <div className="text-xl font-mono text-white/90">{recentMetrics.sessionCount}</div>
                    <div className="text-[10px] text-white/35 mt-1">sessions</div>
                  </div>
                  <div className="p-3 bg-white/[0.03] border border-white/[0.08] rounded">
                    <div className="text-[10px] uppercase tracking-wider text-white/35 mb-1">Baseline Window</div>
                    <div className="text-xl font-mono text-white/90">{baselineMetrics.sessionCount}</div>
                    <div className="text-[10px] text-white/35 mt-1">sessions</div>
                  </div>
                </div>
              </div>
            </>
          )}

          {viewMode === 'tracks' && trackStats.length === 0 && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <MapPin className="w-10 h-10 text-white/15 mx-auto mb-3" />
                <p className="text-xs text-white/40">No track data yet</p>
                <p className="text-[10px] text-white/30 mt-1">Track performance stats appear after completing sessions</p>
              </div>
            </div>
          )}

          {viewMode === 'tracks' && trackStats.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {trackStats.map((track) => (
                <div 
                  key={track.trackName}
                  className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.10] rounded p-4 hover:border-white/20 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-semibold text-white/90">{track.trackName}</h4>
                      <p className="text-[10px] text-white/40 mt-0.5">
                        Last raced: {new Date(track.lastRaced).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <span className="text-[10px] text-white/40 font-mono bg-white/5 px-2 py-1 rounded">
                      {track.sessions} sessions
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-2 bg-white/[0.02] rounded">
                      <div className={`text-lg font-mono font-bold ${
                        track.bestFinish === 1 ? 'text-[#f97316]' :
                        track.bestFinish <= 3 ? 'text-yellow-400' :
                        track.bestFinish <= 5 ? 'text-green-400' : ''
                      }`}>
                        P{track.bestFinish || '-'}
                      </div>
                      <div className="text-[9px] text-white/40 uppercase">Best</div>
                    </div>
                    <div className="text-center p-2 bg-white/[0.02] rounded">
                      <div className="text-lg font-mono font-bold">P{track.avgFinish.toFixed(1)}</div>
                      <div className="text-[9px] text-white/40 uppercase">Avg</div>
                    </div>
                    <div className="text-center p-2 bg-white/[0.02] rounded">
                      <div className={`text-lg font-mono font-bold ${
                        track.totalIncidents / track.sessions > 4 ? 'text-red-400' : ''
                      }`}>
                        {(track.totalIncidents / track.sessions).toFixed(1)}
                      </div>
                      <div className="text-[9px] text-white/40 uppercase">Inc/Race</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
