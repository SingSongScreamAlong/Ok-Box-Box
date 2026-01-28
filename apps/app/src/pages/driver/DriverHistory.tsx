import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useDriverData } from '../../hooks/useDriverData';
import { getDisciplineLabel, DriverDiscipline } from '../../lib/driverService';
import { 
  Calendar, MapPin, Flag, Trophy, AlertTriangle, Loader2,
  TrendingUp, TrendingDown, Minus, Filter, ChevronRight,
  BarChart3, Target, Clock, ArrowLeft, Medal, Award
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

export function DriverHistory() {
  const { sessions, stats, profile, loading } = useDriverData();
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [disciplineFilter, setDisciplineFilter] = useState<DriverDiscipline | 'all'>('all');
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.6;
    }
  }, []);

  // Calculate derived stats
  const filteredSessions = sessions.filter(s => {
    if (disciplineFilter !== 'all' && s.discipline !== disciplineFilter) return false;
    if (timeFilter === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(s.startedAt) >= weekAgo;
    }
    if (timeFilter === 'month') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return new Date(s.startedAt) >= monthAgo;
    }
    return true;
  });

  const totalSessions = filteredSessions.length;
  const wins = filteredSessions.filter(s => s.finishPos === 1).length;
  const podiums = filteredSessions.filter(s => s.finishPos && s.finishPos <= 3).length;
  const top5s = filteredSessions.filter(s => s.finishPos && s.finishPos <= 5).length;
  const avgFinish = totalSessions > 0 
    ? filteredSessions.reduce((acc, s) => acc + (s.finishPos || 0), 0) / totalSessions 
    : 0;
  const avgIncidents = totalSessions > 0
    ? filteredSessions.reduce((acc, s) => acc + (s.incidents || 0), 0) / totalSessions
    : 0;
  const positionsGained = filteredSessions.reduce((acc, s) => {
    if (s.startPos && s.finishPos) return acc + (s.startPos - s.finishPos);
    return acc;
  }, 0);

  // Calculate track stats
  const trackStats: TrackStats[] = Object.values(
    filteredSessions.reduce((acc, s) => {
      if (!acc[s.trackName]) {
        acc[s.trackName] = {
          trackName: s.trackName,
          sessions: 0,
          bestFinish: 99,
          avgFinish: 0,
          totalIncidents: 0,
          lastRaced: s.startedAt,
          _finishes: [] as number[]
        };
      }
      acc[s.trackName].sessions++;
      if (s.finishPos && s.finishPos < acc[s.trackName].bestFinish) {
        acc[s.trackName].bestFinish = s.finishPos;
      }
      if (s.finishPos) acc[s.trackName]._finishes.push(s.finishPos);
      acc[s.trackName].totalIncidents += s.incidents || 0;
      if (new Date(s.startedAt) > new Date(acc[s.trackName].lastRaced)) {
        acc[s.trackName].lastRaced = s.startedAt;
      }
      return acc;
    }, {} as Record<string, TrackStats & { _finishes: number[] }>)
  ).map(t => ({
    ...t,
    avgFinish: t._finishes.length > 0 ? t._finishes.reduce((a, b) => a + b, 0) / t._finishes.length : 0,
    bestFinish: t.bestFinish === 99 ? 0 : t.bestFinish
  })).sort((a, b) => b.sessions - a.sessions);

  // Recent form (last 5 races)
  const recentSessions = filteredSessions.slice(0, 5);
  const recentAvgFinish = recentSessions.length > 0
    ? recentSessions.reduce((acc, s) => acc + (s.finishPos || 0), 0) / recentSessions.length
    : 0;
  const formTrend = recentAvgFinish < avgFinish ? 'improving' : recentAvgFinish > avgFinish ? 'declining' : 'stable';

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

        {/* Quick Stats */}
        <div className="p-4 flex-1 overflow-y-auto">
          <div className="text-[9px] uppercase tracking-wider text-white/30 mb-3">Quick Stats</div>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-white/[0.02] rounded border border-white/[0.06]">
              <span className="text-[10px] text-white/50">Sessions</span>
              <span className="text-sm font-mono text-white/90">{totalSessions}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-white/[0.02] rounded border border-white/[0.06]">
              <span className="text-[10px] text-white/50">Wins</span>
              <span className="text-sm font-mono text-[#f97316]">{wins}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-white/[0.02] rounded border border-white/[0.06]">
              <span className="text-[10px] text-white/50">Podiums</span>
              <span className="text-sm font-mono text-white/90">{podiums}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-white/[0.02] rounded border border-white/[0.06]">
              <span className="text-[10px] text-white/50">Avg Finish</span>
              <span className="text-sm font-mono text-white/90">{avgFinish.toFixed(1)}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-white/[0.02] rounded border border-white/[0.06]">
              <span className="text-[10px] text-white/50">Positions Gained</span>
              <span className={`text-sm font-mono ${positionsGained > 0 ? 'text-green-400' : positionsGained < 0 ? 'text-red-400' : 'text-white/50'}`}>
                {positionsGained > 0 ? '+' : ''}{positionsGained}
              </span>
            </div>
          </div>
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
                {timeFilter === 'all' ? 'All time' : `Last ${timeFilter}`} • {disciplineFilter === 'all' ? 'All disciplines' : getDisciplineLabel(disciplineFilter)}
              </p>
            </div>
            
            {/* Form Indicator */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded border ${
              formTrend === 'improving' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
              formTrend === 'declining' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
              'bg-white/5 border-white/10 text-white/50'
            }`}>
              {formTrend === 'improving' && <TrendingUp className="w-3 h-3" />}
              {formTrend === 'declining' && <TrendingDown className="w-3 h-3" />}
              {formTrend === 'stable' && <Minus className="w-3 h-3" />}
              <span className="text-[10px] uppercase tracking-wider">
                Form: {formTrend}
              </span>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {viewMode === 'overview' && (
            <div className="space-y-4">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white/[0.03] backdrop-blur-xl border border-[#f97316]/30 rounded p-4 shadow-lg shadow-[#f97316]/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase tracking-[0.15em] text-[#f97316]">Wins</span>
                    <Trophy className="w-4 h-4 text-[#f97316]" />
                  </div>
                  <div className="text-3xl font-mono font-bold text-[#f97316]">{wins}</div>
                  <div className="text-[10px] text-white/40 mt-1">
                    {totalSessions > 0 ? ((wins / totalSessions) * 100).toFixed(1) : 0}% win rate
                  </div>
                </div>
                
                <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.10] rounded p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase tracking-[0.15em] text-white/50">Top 5s</span>
                    <Medal className="w-4 h-4 text-white/30" />
                  </div>
                  <div className="text-3xl font-mono font-bold">{top5s}</div>
                  <div className="text-[10px] text-white/40 mt-1">
                    {totalSessions > 0 ? ((top5s / totalSessions) * 100).toFixed(1) : 0}% top 5 rate
                  </div>
                </div>
                
                <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.10] rounded p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase tracking-[0.15em] text-white/50">Avg Finish</span>
                    <Target className="w-4 h-4 text-white/30" />
                  </div>
                  <div className="text-3xl font-mono font-bold">P{avgFinish.toFixed(1)}</div>
                  <div className="text-[10px] text-white/40 mt-1">
                    Recent: P{recentAvgFinish.toFixed(1)}
                  </div>
                </div>
                
                <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.10] rounded p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase tracking-[0.15em] text-white/50">Avg Incidents</span>
                    <AlertTriangle className="w-4 h-4 text-white/30" />
                  </div>
                  <div className="text-3xl font-mono font-bold">{avgIncidents.toFixed(1)}</div>
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
                  {recentSessions.map((session) => {
                    const posChange = (session.startPos ?? 0) - (session.finishPos ?? 0);
                    return (
                      <div 
                        key={session.sessionId}
                        className="flex items-center justify-between p-3 bg-white/[0.02] rounded border border-white/[0.06] hover:border-white/10 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded flex items-center justify-center font-mono font-bold ${
                            session.finishPos === 1 ? 'bg-[#f97316]/20 text-[#f97316]' :
                            session.finishPos && session.finishPos <= 3 ? 'bg-yellow-500/20 text-yellow-400' :
                            session.finishPos && session.finishPos <= 5 ? 'bg-green-500/20 text-green-400' :
                            'bg-white/5 text-white/60'
                          }`}>
                            P{session.finishPos || '-'}
                          </div>
                          <div>
                            <div className="text-sm text-white/90">{session.trackName}</div>
                            <div className="text-[10px] text-white/40">{session.seriesName}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className={`text-xs font-mono ${
                              posChange > 0 ? 'text-green-400' : posChange < 0 ? 'text-red-400' : 'text-white/50'
                            }`}>
                              {posChange > 0 ? '+' : ''}{posChange} pos
                            </div>
                            <div className="text-[10px] text-white/40">{session.incidents || 0}x inc</div>
                          </div>
                          <div className="text-[10px] text-white/30">
                            {new Date(session.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Discipline Breakdown */}
              {stats.length > 0 && (
                <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.10] rounded p-4">
                  <h3 className="text-xs uppercase tracking-[0.15em] text-white/60 flex items-center gap-2 mb-4" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    <Award className="w-4 h-4" />By Discipline
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {stats.map((stat) => (
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
                            <div className="text-lg font-mono font-bold">{stat.avgFinish.toFixed(1)}</div>
                            <div className="text-[9px] text-white/40 uppercase">Avg</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {viewMode === 'sessions' && (
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
                    <th className="px-4 py-3 text-center text-[10px] uppercase tracking-wider text-white/40">Start</th>
                    <th className="px-4 py-3 text-center text-[10px] uppercase tracking-wider text-white/40">Finish</th>
                    <th className="px-4 py-3 text-center text-[10px] uppercase tracking-wider text-white/40">+/-</th>
                    <th className="px-4 py-3 text-center text-[10px] uppercase tracking-wider text-white/40">
                      <div className="flex items-center justify-center gap-1">
                        <AlertTriangle className="w-3 h-3" />Inc
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSessions.map((session) => {
                    const posChange = (session.startPos ?? 0) - (session.finishPos ?? 0);
                    return (
                      <tr 
                        key={session.sessionId} 
                        className="border-b border-white/5 hover:bg-white/5 transition-colors"
                      >
                        <td className="px-4 py-3 text-xs font-mono text-white/60">
                          {new Date(session.startedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">{session.seriesName}</td>
                        <td className="px-4 py-3 text-sm text-white/80">{session.trackName}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs uppercase tracking-wider px-2 py-1 bg-white/5 border border-white/10 rounded">
                            {getDisciplineLabel(session.discipline)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-sm text-white/60">
                          {session.startPos ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-sm">
                          <span className={
                            session.finishPos === 1 ? 'text-[#f97316] font-bold' :
                            session.finishPos && session.finishPos <= 3 ? 'text-yellow-400' :
                            session.finishPos && session.finishPos <= 5 ? 'text-green-400' : ''
                          }>
                            {session.finishPos ?? '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-sm">
                          <span className={
                            posChange > 0 ? 'text-green-400' : 
                            posChange < 0 ? 'text-red-400' : 'text-white/30'
                          }>
                            {posChange > 0 ? '+' : ''}{posChange}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-sm">
                          <span className={session.incidents && session.incidents > 4 ? 'text-red-400' : 'text-white/60'}>
                            {session.incidents ?? '—'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {viewMode === 'tracks' && (
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
              
              {trackStats.length === 0 && (
                <div className="col-span-2 text-center py-12 text-white/40">
                  No track data available for the selected filters
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
