import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Activity, Clock, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { fetchDriverProfileForTeam, type TeamDriverProfile } from '../../lib/teamService';
import { VIDEO_PLAYBACK_RATE } from '../../lib/config';

// Trait category colors
const traitCategoryColors: Record<string, string> = {
  consistency: 'bg-green-500/20 text-green-400 border-green-500/30',
  risk: 'bg-red-500/20 text-red-400 border-red-500/30',
  pace: 'bg-[#3b82f6]/20 text-[#3b82f6] border-[#3b82f6]/30',
  endurance: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  racecraft: 'bg-[#f97316]/20 text-[#f97316] border-[#f97316]/30',
  style: 'bg-white/10 text-white/60 border-white/20'
};

// Format lap time from ms
function formatLapTime(ms: number | null): string {
  if (!ms) return '—';
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(3);
  return `${minutes}:${seconds.padStart(6, '0')}`;
}

// Derive performance metrics from aggregate data
function derivePerformance(global: any) {
  if (!global) return null;
  const pace = global.avg_pace_percentile != null ? Math.round(global.avg_pace_percentile) : null;
  const consistency = global.consistency_index != null
    ? Math.round(global.consistency_index)
    : global.avg_std_dev_ms != null
      ? Math.max(0, Math.min(100, Math.round(100 - (global.avg_std_dev_ms / 50))))
      : null;
  const risk = global.risk_index != null
    ? Math.round(global.risk_index)
    : global.avg_incidents_per_100_laps != null
      ? Math.max(0, Math.min(100, Math.round(global.avg_incidents_per_100_laps * 10)))
      : null;
  const posGained = global.avg_positions_gained ?? 0;

  return { pace, consistency, risk, posGained };
}

// Derive iRating trend from sessions
function deriveIRatingTrend(sessions: TeamDriverProfile['sessions']) {
  const withIR = sessions.filter(s => s.irating_change != null).slice(0, 10);
  if (withIR.length < 2) return null;
  const totalChange = withIR.reduce((sum, s) => sum + (s.irating_change || 0), 0);
  return totalChange > 20 ? 'up' as const : totalChange < -20 ? 'down' as const : 'stable' as const;
}

export function DriverProfilePage() {
  const { teamId, driverId } = useParams<{ teamId: string; driverId: string }>();
  const [data, setData] = useState<TeamDriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = VIDEO_PLAYBACK_RATE;
  }, []);

  useEffect(() => {
    if (!driverId) return;
    setLoading(true);
    fetchDriverProfileForTeam(driverId).then(result => {
      setData(result);
      setLoading(false);
    });
  }, [driverId]);

  const profile = data?.profile || null;
  const sessions = data?.sessions || [];
  const traits = data?.performance?.traits || [];
  const performance = useMemo(() => derivePerformance(data?.performance?.global), [data]);
  const irTrend = useMemo(() => deriveIRatingTrend(sessions), [sessions]);

  // Compute recent iRating change from last few sessions
  const recentIRChange = useMemo(() => {
    return sessions.slice(0, 5).reduce((sum, s) => sum + (s.irating_change || 0), 0);
  }, [sessions]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          <span className="text-white/50 text-sm">Loading profile...</span>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6 text-center">
        <p className="text-white/40">Driver not found</p>
        <Link to={`/team/${teamId}/pitwall/roster`} className="text-[#3b82f6] hover:underline mt-2 inline-block">
          ← Back to Roster
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] relative">
      {/* Background video */}
      <div className="fixed inset-0 z-0">
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="w-full h-full object-cover opacity-50"
        >
          <source src="/videos/bg-3.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-r from-[#0e0e0e]/95 via-[#0e0e0e]/80 to-[#0e0e0e]/70" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0e0e0e]/95" />
      </div>

      <div className="relative z-10 p-6 max-w-7xl mx-auto">
        {/* Back Link */}
        <Link
          to={`/team/${teamId}/pitwall/roster`}
          className="inline-flex items-center gap-1 text-sm text-white/40 hover:text-white mb-6"
        >
          <ChevronLeft size={16} />
          Back to Roster
        </Link>

        {/* Header Card */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded mb-6">
          <div className="p-6">
            <div className="flex items-start gap-6">
              <div className="w-20 h-20 bg-white/10 border border-white/20 flex items-center justify-center text-2xl font-bold text-white/70">
                {profile.display_name.split(' ').map((n: string) => n[0]).join('')}
              </div>
              <div className="flex-1">
                <h1 
                  className="text-2xl font-bold text-white tracking-wide"
                  style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                  {profile.display_name}
                </h1>
                <div className="flex items-center gap-4 mt-2 text-sm text-white/40">
                  <span className="capitalize">{profile.primary_discipline}</span>
                  <span>•</span>
                  <span>{profile.total_sessions} sessions</span>
                  <span>•</span>
                  <span>{profile.total_laps.toLocaleString()} laps</span>
                </div>
                {profile.bio && (
                  <p className="mt-3 text-white/50 max-w-2xl">{profile.bio}</p>
                )}
              </div>
              {/* iRating trend badge */}
              {irTrend && (
                <div className={`flex items-center gap-1 px-3 py-1.5 text-xs font-mono ${
                  irTrend === 'up' ? 'bg-green-500/10 text-green-400 border border-green-500/30' :
                  irTrend === 'down' ? 'bg-red-500/10 text-red-400 border border-red-500/30' :
                  'bg-white/5 text-white/40 border border-white/10'
                }`}>
                  {irTrend === 'up' ? <TrendingUp size={12} /> : irTrend === 'down' ? <TrendingDown size={12} /> : null}
                  {recentIRChange > 0 ? '+' : ''}{recentIRChange} iR (last 5)
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded p-1 w-fit mb-6">
          {(['overview', 'history'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs uppercase tracking-wider font-semibold transition-colors ${
                activeTab === tab ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab === 'overview' ? 'Overview' : 'Race History'}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <>
            {/* Analysis + Stats Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Analysis Card */}
              <div className="bg-[#0a0a0a]" style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.15)' }}>
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity size={16} className="text-white/40" />
                    <span 
                      className="font-medium text-sm uppercase tracking-wider text-white"
                      style={{ fontFamily: 'Orbitron, sans-serif' }}
                    >
                      Analysis
                    </span>
                  </div>
                  <span className="text-xs text-white/30">by Ok, Box Box</span>
                </div>
                <div className="p-5">
                  {performance && (performance.pace != null || performance.consistency != null) ? (
                    <>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        {performance.pace != null && <MetricBar label="Pace" value={performance.pace} color="blue" />}
                        {performance.consistency != null && <MetricBar label="Consistency" value={performance.consistency} color="green" />}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {performance.risk != null && <MetricBar label="Risk" value={performance.risk} color="red" inverted />}
                        <div className="bg-[#0a0a0a] border border-white/5 p-3">
                          <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Avg Pos. Gained</div>
                          <div className={`text-xl font-bold font-mono ${performance.posGained > 0 ? 'text-green-400' : performance.posGained < 0 ? 'text-red-400' : 'text-white/40'}`}>
                            {performance.posGained > 0 ? '+' : ''}{performance.posGained.toFixed(1)}
                          </div>
                        </div>
                      </div>
                      {/* Traits */}
                      {traits.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-white/5">
                          <div className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Detected Traits</div>
                          <div className="flex flex-wrap gap-2">
                            {traits.map((trait: { key: string; label: string; category: string; confidence: number }, i: number) => (
                              <span key={i} className={`text-[10px] px-2.5 py-1 border uppercase tracking-wider ${traitCategoryColors[trait.category] || traitCategoryColors.style}`}>
                                {trait.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-white/30 text-center py-8">No analysis data available yet. Data builds after sessions are recorded.</p>
                  )}
                </div>
              </div>

              {/* Stats Card */}
              <div className="bg-[#0a0a0a]" style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.15)' }}>
                <div className="px-4 py-3 border-b border-white/10">
                  <span className="font-medium text-sm uppercase tracking-wider text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    Career Stats
                  </span>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-[#0a0a0a] border border-white/5 p-4 text-center">
                      <div className="text-[10px] text-white/40 uppercase tracking-wider">Sessions</div>
                      <div className="text-3xl font-bold text-white font-mono mt-1">{profile.total_sessions}</div>
                    </div>
                    <div className="bg-[#0a0a0a] border border-white/5 p-4 text-center">
                      <div className="text-[10px] text-white/40 uppercase tracking-wider">Laps</div>
                      <div className="text-3xl font-bold text-white font-mono mt-1">{profile.total_laps.toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#0a0a0a] border border-white/5 p-4 text-center">
                      <div className="text-[10px] text-white/40 uppercase tracking-wider">Incidents</div>
                      <div className="text-3xl font-bold text-white font-mono mt-1">{profile.total_incidents}</div>
                    </div>
                    <div className="bg-[#0a0a0a] border border-white/5 p-4 text-center">
                      <div className="text-[10px] text-white/40 uppercase tracking-wider">Inc / 100 Laps</div>
                      <div className="text-3xl font-bold text-white font-mono mt-1">
                        {profile.total_laps > 0 ? ((profile.total_incidents / profile.total_laps) * 100).toFixed(1) : '—'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Sessions */}
            <div className="bg-[#0a0a0a]" style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.15)' }}>
              <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-white/40" />
                  <span className="font-medium text-sm uppercase tracking-wider text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    Recent Sessions
                  </span>
                </div>
                <span className="text-xs text-white/40">{sessions.length} sessions</span>
              </div>
              {sessions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#0a0a0a] text-white/50 text-[10px] font-semibold uppercase tracking-widest">
                        <th className="text-left py-3 px-5">Session</th>
                        <th className="text-left py-3 px-3">Track</th>
                        <th className="text-right py-3 px-3">Laps</th>
                        <th className="text-right py-3 px-3">Best Time</th>
                        <th className="text-right py-3 px-3">Inc</th>
                        <th className="text-right py-3 px-3">Pos</th>
                        <th className="text-right py-3 px-5">iR Δ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.slice(0, 10).map((s, idx) => (
                        <tr key={s.id || idx} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-3 px-5 font-medium text-white">{s.session_name || 'Session'}</td>
                          <td className="py-3 px-3 text-white/50">{s.track_name || '—'}</td>
                          <td className="py-3 px-3 text-right font-mono text-white/70">{s.total_laps}</td>
                          <td className="py-3 px-3 text-right font-mono text-green-400">{formatLapTime(s.best_lap_time_ms)}</td>
                          <td className="py-3 px-3 text-right font-mono text-white/70">{s.incident_count}</td>
                          <td className="py-3 px-3 text-right font-mono text-white/70">
                            {s.finish_position ? `P${s.finish_position}` : '—'}
                          </td>
                          <td className={`py-3 px-5 text-right font-mono ${s.irating_change && s.irating_change > 0 ? 'text-green-400' : s.irating_change && s.irating_change < 0 ? 'text-red-400' : 'text-white/30'}`}>
                            {s.irating_change != null ? (s.irating_change > 0 ? '+' : '') + s.irating_change : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-white/30">
                  No session history available
                </div>
              )}
            </div>
          </> 
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="bg-[#0a0a0a]" style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.15)' }}>
            <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
              <Clock size={16} className="text-white/40" />
              <span className="font-medium text-sm uppercase tracking-wider text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                Full Race History
              </span>
            </div>
            {sessions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#0a0a0a] text-white/50 text-[10px] font-semibold uppercase tracking-widest">
                      <th className="text-left py-3 px-5">Date</th>
                      <th className="text-left py-3 px-3">Session</th>
                      <th className="text-left py-3 px-3">Track</th>
                      <th className="text-right py-3 px-3">Start</th>
                      <th className="text-right py-3 px-3">Finish</th>
                      <th className="text-right py-3 px-3">+/-</th>
                      <th className="text-right py-3 px-3">Best</th>
                      <th className="text-right py-3 px-3">Inc</th>
                      <th className="text-right py-3 px-5">iR Δ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s, idx) => {
                      const posChange = s.start_position && s.finish_position ? s.start_position - s.finish_position : null;
                      return (
                        <tr key={s.id || idx} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-3 px-5 text-white/50 text-xs">{s.date ? new Date(s.date).toLocaleDateString() : '—'}</td>
                          <td className="py-3 px-3 font-medium text-white">{s.session_name || 'Session'}</td>
                          <td className="py-3 px-3 text-white/50">{s.track_name || '—'}</td>
                          <td className="py-3 px-3 text-right font-mono text-white/70">{s.start_position ? `P${s.start_position}` : '—'}</td>
                          <td className="py-3 px-3 text-right font-mono text-white/70">{s.finish_position ? `P${s.finish_position}` : '—'}</td>
                          <td className={`py-3 px-3 text-right font-mono ${posChange && posChange > 0 ? 'text-green-400' : posChange && posChange < 0 ? 'text-red-400' : 'text-white/30'}`}>
                            {posChange != null ? (posChange > 0 ? '+' : '') + posChange : '—'}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-green-400">{formatLapTime(s.best_lap_time_ms)}</td>
                          <td className="py-3 px-3 text-right font-mono text-white/70">{s.incident_count}x</td>
                          <td className={`py-3 px-5 text-right font-mono ${s.irating_change && s.irating_change > 0 ? 'text-green-400' : s.irating_change && s.irating_change < 0 ? 'text-red-400' : 'text-white/30'}`}>
                            {s.irating_change != null ? (s.irating_change > 0 ? '+' : '') + s.irating_change : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-white/30">
                No race history available
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Metric bar component
function MetricBar({ label, value, color, inverted = false }: { label: string; value: number; color: string; inverted?: boolean }) {
  const colorClasses: Record<string, string> = {
    'blue': 'bg-[#3b82f6]',
    'green': 'bg-green-500',
    'red': 'bg-red-500',
    'orange': 'bg-[#f97316]'
  };
  const textColorClasses: Record<string, string> = {
    'blue': 'text-[#3b82f6]',
    'green': 'text-green-400',
    'red': 'text-red-400',
    'orange': 'text-[#f97316]'
  };

  return (
    <div className="bg-[#0a0a0a] border border-white/5 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-white/40 uppercase tracking-wider">{label}</span>
        <span className={`text-sm font-bold font-mono ${textColorClasses[color]}`}>{value}%</span>
      </div>
      <div className="h-2 bg-white/10 overflow-hidden">
        <div
          className={`h-full transition-all ${colorClasses[color]}`}
          style={{ width: `${inverted ? 100 - value : value}%` }}
        />
      </div>
    </div>
  );
}
