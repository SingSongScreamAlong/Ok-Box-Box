import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin, Search, ChevronRight, Flag, AlertTriangle,
  TrendingUp, TrendingDown, Shield, Clock, Globe,
  Mountain, CornerDownRight, Gauge
} from 'lucide-react';
import { TRACK_DATA, type TrackData } from '../../data/tracks';
import { fetchDriverSessions, type DriverSessionSummary } from '../../lib/driverService';

const ORBITRON = { fontFamily: 'Orbitron, sans-serif' };

const COUNTRY_FLAGS: Record<string, string> = {
  'USA': '🇺🇸', 'UK': '🇬🇧', 'Belgium': '🇧🇪', 'Italy': '🇮🇹',
  'Germany': '🇩🇪', 'Japan': '🇯🇵', 'Australia': '🇦🇺', 'Brazil': '🇧🇷',
};

interface TrackPerformance {
  sessions: number;
  races: number;
  bestFinish: number | null;
  avgFinish: number | null;
  avgIncidents: number | null;
  totalIncidents: number;
  iRatingDelta: number;
  lastRaced: string | null;
  winRate: number;
  top5Rate: number;
  avgStartPos: number | null;
  avgPosDelta: number | null;
}

function computeTrackPerf(sessions: DriverSessionSummary[], trackData: TrackData): TrackPerformance {
  const trackNorm = trackData.name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const idNorm = trackData.id.toLowerCase().replace(/-/g, '');

  const matching = sessions.filter(s => {
    const sNorm = s.trackName.toLowerCase().replace(/[^a-z0-9]/g, '');
    return sNorm.includes(trackNorm) || trackNorm.includes(sNorm) ||
           sNorm.includes(idNorm) || idNorm.includes(sNorm);
  });

  if (matching.length === 0) {
    return { sessions: 0, races: 0, bestFinish: null, avgFinish: null, avgIncidents: null, totalIncidents: 0, iRatingDelta: 0, lastRaced: null, winRate: 0, top5Rate: 0, avgStartPos: null, avgPosDelta: null };
  }

  const races = matching.filter(s => s.eventType === 'race' || s.sessionType === 'Race');
  const finishes = matching.filter(s => s.finishPos != null).map(s => s.finishPos!);
  const incidents = matching.filter(s => s.incidents != null).map(s => s.incidents!);
  const irDeltas = matching.filter(s => s.iRatingChange != null || s.irDelta != null).map(s => (s.iRatingChange ?? s.irDelta ?? 0));
  const starts = matching.filter(s => s.startPos != null).map(s => s.startPos!);
  const posDeltas = matching.filter(s => s.posDelta != null).map(s => s.posDelta!);
  const wins = finishes.filter(f => f === 1).length;
  const top5s = finishes.filter(f => f <= 5).length;

  return {
    sessions: matching.length,
    races: races.length,
    bestFinish: finishes.length > 0 ? Math.min(...finishes) : null,
    avgFinish: finishes.length > 0 ? finishes.reduce((a, b) => a + b, 0) / finishes.length : null,
    avgIncidents: incidents.length > 0 ? incidents.reduce((a, b) => a + b, 0) / incidents.length : null,
    totalIncidents: incidents.reduce((a, b) => a + b, 0),
    iRatingDelta: irDeltas.reduce((a, b) => a + b, 0),
    lastRaced: matching[0]?.startedAt ?? null,
    winRate: finishes.length > 0 ? wins / finishes.length : 0,
    top5Rate: finishes.length > 0 ? top5s / finishes.length : 0,
    avgStartPos: starts.length > 0 ? starts.reduce((a, b) => a + b, 0) / starts.length : null,
    avgPosDelta: posDeltas.length > 0 ? posDeltas.reduce((a, b) => a + b, 0) / posDeltas.length : null,
  };
}

function getFamiliarityScore(perf: TrackPerformance): { score: number; label: string; color: string } {
  if (perf.sessions === 0) return { score: 0, label: 'Unknown', color: 'text-white/30' };
  const sessionScore = Math.min(40, perf.sessions * 4);
  const cleanScore = perf.avgIncidents !== null ? Math.max(0, 30 - perf.avgIncidents * 6) : 15;
  const competitiveScore = perf.avgFinish !== null ? Math.max(0, 30 - (perf.avgFinish - 5) * 2) : 15;
  const total = Math.round(sessionScore + cleanScore + competitiveScore);
  if (total >= 75) return { score: total, label: 'Expert', color: 'text-green-400' };
  if (total >= 50) return { score: total, label: 'Familiar', color: 'text-blue-400' };
  if (total >= 25) return { score: total, label: 'Learning', color: 'text-yellow-400' };
  return { score: total, label: 'New', color: 'text-red-400' };
}

function formatLength(meters: number): string {
  const miles = meters / 1609.34;
  return `${miles.toFixed(2)} mi`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

type SortKey = 'name' | 'familiarity' | 'sessions' | 'avgFinish' | 'iRatingDelta';

export const TrackSelectorPage: React.FC = () => {
  const [sessions, setSessions] = useState<DriverSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('familiarity');
  const [expandedTrack, setExpandedTrack] = useState<string | null>(null);

  useEffect(() => {
    fetchDriverSessions()
      .then(s => setSessions(s))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const trackEntries = useMemo(() => {
    const entries = Object.entries(TRACK_DATA).map(([id, data]) => ({
      id,
      data,
      perf: computeTrackPerf(sessions, data),
      familiarity: getFamiliarityScore(computeTrackPerf(sessions, data)),
    }));

    // Filter by search
    const filtered = search
      ? entries.filter(e =>
          e.data.name.toLowerCase().includes(search.toLowerCase()) ||
          e.data.country.toLowerCase().includes(search.toLowerCase()) ||
          e.id.toLowerCase().includes(search.toLowerCase())
        )
      : entries;

    // Sort
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.data.name.localeCompare(b.data.name);
        case 'familiarity': return b.familiarity.score - a.familiarity.score;
        case 'sessions': return b.perf.sessions - a.perf.sessions;
        case 'avgFinish': return (a.perf.avgFinish ?? 99) - (b.perf.avgFinish ?? 99);
        case 'iRatingDelta': return (b.perf.iRatingDelta) - (a.perf.iRatingDelta);
        default: return 0;
      }
    });
  }, [sessions, search, sortBy]);

  const totalTracksRaced = trackEntries.filter(e => e.perf.sessions > 0).length;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-1">
          <MapPin size={18} className="text-[#f97316]" />
          <h1 className="text-sm font-bold uppercase tracking-[0.2em] text-[#f97316]" style={ORBITRON}>Track Intelligence</h1>
        </div>
        <p className="text-[11px] text-white/30 mb-6 ml-7">
          Your performance across every circuit. Corner analysis, familiarity scores, and race preparation intelligence.
        </p>

        {/* Stats bar */}
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mb-6">
          <div className="border border-white/10 bg-white/[0.02] px-4 py-3 text-center">
            <div className="text-xl font-mono font-bold text-white/80">{Object.keys(TRACK_DATA).length}</div>
            <div className="text-[8px] text-white/25 uppercase tracking-wider">Tracks</div>
          </div>
          <div className="border border-white/10 bg-white/[0.02] px-4 py-3 text-center">
            <div className="text-xl font-mono font-bold text-[#f97316]">{totalTracksRaced}</div>
            <div className="text-[8px] text-white/25 uppercase tracking-wider">Raced</div>
          </div>
          <div className="border border-white/10 bg-white/[0.02] px-4 py-3 text-center">
            <div className="text-xl font-mono font-bold text-white/80">{sessions.length}</div>
            <div className="text-[8px] text-white/25 uppercase tracking-wider">Total Sessions</div>
          </div>
          <div className="border border-white/10 bg-white/[0.02] px-4 py-3 text-center hidden md:block">
            <div className="text-xl font-mono font-bold text-green-400">
              {trackEntries.filter(e => e.familiarity.score >= 75).length}
            </div>
            <div className="text-[8px] text-white/25 uppercase tracking-wider">Expert Tracks</div>
          </div>
          <div className="border border-white/10 bg-white/[0.02] px-4 py-3 text-center hidden md:block">
            <div className="text-xl font-mono font-bold text-red-400">
              {trackEntries.filter(e => e.perf.sessions === 0).length}
            </div>
            <div className="text-[8px] text-white/25 uppercase tracking-wider">Unvisited</div>
          </div>
        </div>

        {/* Search + Sort */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tracks..."
              className="w-full bg-white/[0.03] border border-white/10 pl-9 pr-4 py-2.5 text-xs text-white placeholder:text-white/20 focus:border-[#f97316]/40 focus:outline-none"
            />
          </div>
          <div className="flex gap-1">
            {([
              ['familiarity', 'Familiarity'],
              ['sessions', 'Experience'],
              ['avgFinish', 'Avg Finish'],
              ['name', 'A-Z'],
            ] as [SortKey, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                className={`px-3 py-2 text-[9px] uppercase tracking-wider border transition-colors ${
                  sortBy === key
                    ? 'border-[#f97316]/50 bg-[#f97316]/10 text-[#f97316]'
                    : 'border-white/10 text-white/30 hover:text-white/50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Track list */}
        {loading ? (
          <div className="text-center py-12 text-white/30 text-xs">Loading session data...</div>
        ) : (
          <div className="space-y-2">
            {trackEntries.map(entry => {
              const { id, data, perf, familiarity } = entry;
              const isExpanded = expandedTrack === id;
              const flag = COUNTRY_FLAGS[data.country] || '🏁';

              return (
                <div key={id} className="border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                  {/* Main row */}
                  <button
                    onClick={() => setExpandedTrack(isExpanded ? null : id)}
                    className="w-full flex items-center gap-4 px-5 py-4 text-left"
                  >
                    {/* Track SVG mini preview */}
                    <div className="w-12 h-12 flex-shrink-0 border border-white/[0.06] bg-white/[0.02] flex items-center justify-center overflow-hidden">
                      <svg viewBox={data.svg.viewBox} className="w-10 h-10">
                        <path d={data.svg.path} fill="none" stroke={familiarity.score >= 50 ? '#f97316' : 'rgba(255,255,255,0.2)'} strokeWidth="12" strokeLinejoin="round" />
                      </svg>
                    </div>

                    {/* Track info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs">{flag}</span>
                        <h3 className="text-sm font-semibold text-white truncate">{data.name}</h3>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] text-white/30">
                        <span>{data.layout}</span>
                        <span>{formatLength(data.length)}</span>
                        <span>{data.corners.length} corners</span>
                        {data.metadata?.elevation && (
                          <span className="flex items-center gap-0.5">
                            <Mountain className="w-2.5 h-2.5" />
                            {data.metadata.elevation.change}m
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Familiarity badge */}
                    <div className="text-center flex-shrink-0 w-16">
                      <div className={`text-lg font-mono font-bold ${familiarity.color}`}>{familiarity.score}</div>
                      <div className={`text-[8px] uppercase tracking-wider ${familiarity.color}`}>{familiarity.label}</div>
                    </div>

                    {/* Quick stats */}
                    <div className="hidden md:flex items-center gap-5 flex-shrink-0">
                      <div className="text-center w-14">
                        <div className="text-sm font-mono text-white/70">{perf.sessions || '—'}</div>
                        <div className="text-[7px] text-white/20 uppercase">Sessions</div>
                      </div>
                      <div className="text-center w-14">
                        <div className={`text-sm font-mono ${perf.avgFinish && perf.avgFinish <= 5 ? 'text-green-400' : 'text-white/70'}`}>
                          {perf.avgFinish ? `P${perf.avgFinish.toFixed(1)}` : '—'}
                        </div>
                        <div className="text-[7px] text-white/20 uppercase">Avg Finish</div>
                      </div>
                      <div className="text-center w-14">
                        <div className={`text-sm font-mono ${(perf.avgIncidents ?? 0) > 3 ? 'text-red-400' : 'text-white/70'}`}>
                          {perf.avgIncidents !== null ? `${perf.avgIncidents.toFixed(1)}x` : '—'}
                        </div>
                        <div className="text-[7px] text-white/20 uppercase">Avg Inc</div>
                      </div>
                      <div className="text-center w-14">
                        <div className={`text-sm font-mono ${perf.iRatingDelta > 0 ? 'text-green-400' : perf.iRatingDelta < 0 ? 'text-red-400' : 'text-white/70'}`}>
                          {perf.iRatingDelta !== 0 ? `${perf.iRatingDelta > 0 ? '+' : ''}${perf.iRatingDelta}` : '—'}
                        </div>
                        <div className="text-[7px] text-white/20 uppercase">iR Delta</div>
                      </div>
                    </div>

                    <ChevronRight className={`w-4 h-4 text-white/20 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-white/[0.06]">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        {/* Performance summary */}
                        <div className="border border-white/[0.06] p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Flag className="w-3.5 h-3.5 text-[#f97316]/50" />
                            <span className="text-[10px] uppercase tracking-wider text-white/40">Your Performance</span>
                          </div>
                          {perf.sessions > 0 ? (
                            <div className="space-y-2">
                              <div className="grid grid-cols-3 gap-3 text-center">
                                <div>
                                  <div className="text-lg font-mono font-bold text-white/80">{perf.races}</div>
                                  <div className="text-[8px] text-white/20 uppercase">Races</div>
                                </div>
                                <div>
                                  <div className="text-lg font-mono font-bold text-white/80">P{perf.bestFinish ?? '—'}</div>
                                  <div className="text-[8px] text-white/20 uppercase">Best</div>
                                </div>
                                <div>
                                  <div className={`text-lg font-mono font-bold ${perf.winRate > 0 ? 'text-[#f97316]' : 'text-white/80'}`}>
                                    {(perf.winRate * 100).toFixed(0)}%
                                  </div>
                                  <div className="text-[8px] text-white/20 uppercase">Win Rate</div>
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-3 text-center pt-2 border-t border-white/[0.04]">
                                <div>
                                  <div className={`text-sm font-mono ${(perf.avgPosDelta ?? 0) > 0 ? 'text-green-400' : (perf.avgPosDelta ?? 0) < 0 ? 'text-red-400' : 'text-white/60'}`}>
                                    {perf.avgPosDelta !== null ? `${perf.avgPosDelta > 0 ? '+' : ''}${perf.avgPosDelta.toFixed(1)}` : '—'}
                                  </div>
                                  <div className="text-[7px] text-white/20 uppercase">Avg Pos Δ</div>
                                </div>
                                <div>
                                  <div className="text-sm font-mono text-white/60">
                                    {perf.avgStartPos !== null ? `P${perf.avgStartPos.toFixed(1)}` : '—'}
                                  </div>
                                  <div className="text-[7px] text-white/20 uppercase">Avg Start</div>
                                </div>
                                <div>
                                  <div className="text-sm font-mono text-white/60">{(perf.top5Rate * 100).toFixed(0)}%</div>
                                  <div className="text-[7px] text-white/20 uppercase">Top 5 Rate</div>
                                </div>
                              </div>
                              <div className="flex items-center justify-between pt-2 border-t border-white/[0.04] text-[9px] text-white/20">
                                <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> Last: {formatDate(perf.lastRaced)}</span>
                                <span>Total: {perf.totalIncidents}x incidents</span>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-4">
                              <AlertTriangle className="w-5 h-5 text-yellow-400/40 mx-auto mb-2" />
                              <p className="text-[11px] text-white/30">No sessions recorded at this track</p>
                              <p className="text-[9px] text-yellow-400/50 mt-1">Practice recommended before racing</p>
                            </div>
                          )}
                        </div>

                        {/* Corner analysis */}
                        <div className="border border-white/[0.06] p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <CornerDownRight className="w-3.5 h-3.5 text-[#f97316]/50" />
                            <span className="text-[10px] uppercase tracking-wider text-white/40">Key Corners</span>
                          </div>
                          <div className="space-y-1.5 max-h-48 overflow-y-auto">
                            {data.corners
                              .filter(c => c.difficulty === 'hard' || c.notes)
                              .slice(0, 6)
                              .map(corner => (
                                <div key={corner.number} className="flex items-center gap-3 py-1.5 border-b border-white/[0.03] last:border-0">
                                  <span className="text-[10px] font-mono text-white/20 w-5">T{corner.number}</span>
                                  <div className="flex-1 min-w-0">
                                    <span className="text-[11px] text-white/60 truncate block">{corner.name}</span>
                                    {corner.notes && <span className="text-[8px] text-white/20 block">{corner.notes}</span>}
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className={`text-[8px] px-1.5 py-0.5 border ${
                                      corner.difficulty === 'hard' ? 'border-red-500/30 text-red-400/60 bg-red-500/5' :
                                      corner.difficulty === 'medium' ? 'border-yellow-500/30 text-yellow-400/60 bg-yellow-500/5' :
                                      'border-green-500/30 text-green-400/60 bg-green-500/5'
                                    }`}>
                                      {corner.difficulty}
                                    </span>
                                    <span className="text-[9px] font-mono text-white/30 w-10 text-right">G{corner.gear}</span>
                                  </div>
                                </div>
                              ))}
                            {data.corners.filter(c => c.difficulty === 'hard' || c.notes).length === 0 && (
                              <p className="text-[10px] text-white/20 py-2">No highlighted corners</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Track metadata + actions */}
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.06]">
                        <div className="flex items-center gap-4 text-[9px] text-white/20">
                          {data.metadata?.direction && <span className="flex items-center gap-1"><Globe className="w-2.5 h-2.5" /> {data.metadata.direction}</span>}
                          {data.metadata?.coordinates && (
                            <span>{data.metadata.coordinates.latitude.toFixed(2)}°, {data.metadata.coordinates.longitude.toFixed(2)}°</span>
                          )}
                          <span>{data.corners.length} corners total</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/track-intel/${id}`}
                            className="px-3 py-1.5 text-[9px] uppercase tracking-wider text-[#f97316] border border-[#f97316]/30 hover:bg-[#f97316]/10 transition-colors flex items-center gap-1"
                          >
                            Full Map <ChevronRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {trackEntries.length === 0 && (
              <div className="text-center py-12 text-white/30 text-xs">No tracks match your search</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
