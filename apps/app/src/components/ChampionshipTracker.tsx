/**
 * ChampionshipTracker — Season & Championship Awareness
 *
 * Shows enrolled seasons, current week schedule, standings, and
 * championship projections. Uses session history to auto-detect
 * active series participation.
 *
 * Phase 4a: Frontend-only detection from session history
 * TODO Phase 4a+: Server-side enrollment API, iRacing schedule sync
 */

import { useState, useMemo } from 'react';
import {
  Trophy, Calendar, ChevronDown, ChevronUp,
  TrendingUp, TrendingDown, Target,
  Clock, Star
} from 'lucide-react';
import type { DriverSessionSummary } from '../lib/driverService';

const ORBITRON = { fontFamily: 'Orbitron, sans-serif' };

interface DetectedSeries {
  seriesName: string;
  discipline: string;
  sessions: number;
  races: number;
  recentWeeks: number;
  bestFinish: number | null;
  avgFinish: number | null;
  avgIncidents: number | null;
  iRatingDelta: number;
  wins: number;
  top5s: number;
  podiums: number;
  lastRaced: string;
  tracks: string[];
  positionsGained: number;
}

interface ChampionshipTrackerProps {
  sessions: DriverSessionSummary[];
}

function detectActiveSeries(sessions: DriverSessionSummary[]): DetectedSeries[] {
  const seriesMap = new Map<string, DriverSessionSummary[]>();

  for (const s of sessions) {
    if (!s.seriesName) continue;
    const existing = seriesMap.get(s.seriesName) || [];
    existing.push(s);
    seriesMap.set(s.seriesName, existing);
  }

  const now = Date.now();
  const fourWeeksAgo = now - 28 * 24 * 60 * 60 * 1000;

  return Array.from(seriesMap.entries())
    .map(([name, seriesSessions]) => {
      const sorted = [...seriesSessions].sort((a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      );
      const races = sorted.filter(s => s.eventType === 'race' || s.sessionType === 'Race');
      const recentSessions = sorted.filter(s => new Date(s.startedAt).getTime() > fourWeeksAgo);
      const finishes = races.filter(s => s.finishPos != null).map(s => s.finishPos!);
      const incidents = races.filter(s => s.incidents != null).map(s => s.incidents!);
      const irDeltas = races.filter(s => s.iRatingChange != null || s.irDelta != null)
        .map(s => (s.iRatingChange ?? s.irDelta ?? 0));
      const posDeltas = races.filter(s => s.posDelta != null).map(s => s.posDelta!);
      const trackSet = new Set(sorted.map(s => s.trackName));

      return {
        seriesName: name,
        discipline: sorted[0]?.discipline || 'road',
        sessions: sorted.length,
        races: races.length,
        recentWeeks: recentSessions.length,
        bestFinish: finishes.length > 0 ? Math.min(...finishes) : null,
        avgFinish: finishes.length > 0 ? finishes.reduce((a, b) => a + b, 0) / finishes.length : null,
        avgIncidents: incidents.length > 0 ? incidents.reduce((a, b) => a + b, 0) / incidents.length : null,
        iRatingDelta: irDeltas.reduce((a, b) => a + b, 0),
        wins: finishes.filter(f => f === 1).length,
        top5s: finishes.filter(f => f <= 5).length,
        podiums: finishes.filter(f => f <= 3).length,
        lastRaced: sorted[0]?.startedAt || '',
        tracks: [...trackSet],
        positionsGained: posDeltas.reduce((a, b) => a + b, 0),
      };
    })
    .filter(s => s.races >= 2)
    .sort((a, b) => b.recentWeeks - a.recentWeeks || b.races - a.races);
}

function getSeriesHealth(series: DetectedSeries): { label: string; color: string; icon: typeof TrendingUp } {
  if (series.iRatingDelta > 50 && (series.avgIncidents ?? 0) < 3) return { label: 'Strong', color: 'text-green-400', icon: TrendingUp };
  if (series.iRatingDelta > 0) return { label: 'Positive', color: 'text-blue-400', icon: TrendingUp };
  if (series.iRatingDelta > -50) return { label: 'Neutral', color: 'text-yellow-400', icon: Target };
  return { label: 'Struggling', color: 'text-red-400', icon: TrendingDown };
}

function formatTimeSince(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

export function ChampionshipTracker({ sessions }: ChampionshipTrackerProps) {
  const [expandedSeries, setExpandedSeries] = useState<string | null>(null);

  const activeSeries = useMemo(() => detectActiveSeries(sessions), [sessions]);

  if (activeSeries.length === 0) {
    return (
      <div className="border border-white/10 bg-[#0e0e0e]/80 backdrop-blur-sm">
        <div className="px-5 py-3 border-b border-white/[0.06] flex items-center gap-2">
          <Trophy className="w-3.5 h-3.5 text-[#f97316]/50" />
          <h2 className="text-sm uppercase tracking-[0.15em] text-white/40" style={ORBITRON}>Championship Tracker</h2>
        </div>
        <div className="px-5 py-6 text-center">
          <Calendar className="w-6 h-6 text-white/15 mx-auto mb-2" />
          <p className="text-[11px] text-white/25">No active series detected</p>
          <p className="text-[9px] text-white/15 mt-1">Race in 2+ events in a series to auto-detect</p>
        </div>
      </div>
    );
  }

  const totalRaces = activeSeries.reduce((sum, s) => sum + s.races, 0);
  const netIRating = activeSeries.reduce((sum, s) => sum + s.iRatingDelta, 0);

  return (
    <div className="border border-white/10 bg-[#0e0e0e]/80 backdrop-blur-sm">
      <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-3.5 h-3.5 text-[#f97316]/50" />
          <h2 className="text-sm uppercase tracking-[0.15em] text-[#f97316]" style={ORBITRON}>Championships</h2>
        </div>
        <div className="flex items-center gap-3 text-[9px] text-white/20">
          <span>{activeSeries.length} series</span>
          <span>{totalRaces} races</span>
          <span className={netIRating >= 0 ? 'text-green-400/50' : 'text-red-400/50'}>
            {netIRating >= 0 ? '+' : ''}{netIRating} iR
          </span>
        </div>
      </div>

      <div className="divide-y divide-white/[0.04]">
        {activeSeries.map(series => {
          const isExpanded = expandedSeries === series.seriesName;
          const health = getSeriesHealth(series);
          const HealthIcon = health.icon;

          return (
            <div key={series.seriesName}>
              <button
                onClick={() => setExpandedSeries(isExpanded ? null : series.seriesName)}
                className="w-full px-5 py-3.5 flex items-center gap-4 text-left hover:bg-white/[0.02] transition-colors"
              >
                {/* Health indicator */}
                <div className={`w-8 h-8 border ${
                  health.label === 'Strong' ? 'border-green-500/30 bg-green-500/5' :
                  health.label === 'Positive' ? 'border-blue-500/30 bg-blue-500/5' :
                  health.label === 'Neutral' ? 'border-yellow-500/30 bg-yellow-500/5' :
                  'border-red-500/30 bg-red-500/5'
                } flex items-center justify-center flex-shrink-0`}>
                  <HealthIcon className={`w-3.5 h-3.5 ${health.color}`} />
                </div>

                {/* Series info */}
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] text-white/70 font-medium truncate">{series.seriesName}</div>
                  <div className="flex items-center gap-3 text-[9px] text-white/25 mt-0.5">
                    <span>{series.races} races</span>
                    <span>{series.wins}W {series.podiums}P</span>
                    <span className="flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" /> {formatTimeSince(series.lastRaced)}
                    </span>
                  </div>
                </div>

                {/* Quick metrics */}
                <div className="hidden md:flex items-center gap-4 flex-shrink-0">
                  <div className="text-center w-12">
                    <div className={`text-sm font-mono ${series.avgFinish && series.avgFinish <= 5 ? 'text-green-400' : 'text-white/60'}`}>
                      P{series.avgFinish?.toFixed(1) ?? '—'}
                    </div>
                    <div className="text-[7px] text-white/15 uppercase">Avg</div>
                  </div>
                  <div className="text-center w-12">
                    <div className={`text-sm font-mono ${(series.avgIncidents ?? 0) > 3 ? 'text-red-400' : 'text-white/60'}`}>
                      {series.avgIncidents?.toFixed(1) ?? '—'}x
                    </div>
                    <div className="text-[7px] text-white/15 uppercase">Inc</div>
                  </div>
                  <div className="text-center w-14">
                    <div className={`text-sm font-mono ${series.iRatingDelta > 0 ? 'text-green-400' : series.iRatingDelta < 0 ? 'text-red-400' : 'text-white/60'}`}>
                      {series.iRatingDelta > 0 ? '+' : ''}{series.iRatingDelta}
                    </div>
                    <div className="text-[7px] text-white/15 uppercase">iR Δ</div>
                  </div>
                </div>

                {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-white/20" /> : <ChevronDown className="w-3.5 h-3.5 text-white/20" />}
              </button>

              {isExpanded && (
                <div className="px-5 pb-4">
                  {/* Detailed stats grid */}
                  <div className="grid grid-cols-4 md:grid-cols-6 gap-3 mb-4">
                    <div className="text-center p-2 bg-white/[0.02] border border-white/[0.04]">
                      <div className="text-lg font-mono font-bold text-white/80">{series.races}</div>
                      <div className="text-[7px] text-white/20 uppercase">Races</div>
                    </div>
                    <div className="text-center p-2 bg-white/[0.02] border border-white/[0.04]">
                      <div className="text-lg font-mono font-bold text-[#f97316]">{series.wins}</div>
                      <div className="text-[7px] text-white/20 uppercase">Wins</div>
                    </div>
                    <div className="text-center p-2 bg-white/[0.02] border border-white/[0.04]">
                      <div className="text-lg font-mono font-bold text-white/80">{series.podiums}</div>
                      <div className="text-[7px] text-white/20 uppercase">Podiums</div>
                    </div>
                    <div className="text-center p-2 bg-white/[0.02] border border-white/[0.04]">
                      <div className="text-lg font-mono font-bold text-white/80">P{series.bestFinish ?? '—'}</div>
                      <div className="text-[7px] text-white/20 uppercase">Best</div>
                    </div>
                    <div className="text-center p-2 bg-white/[0.02] border border-white/[0.04] hidden md:block">
                      <div className="text-lg font-mono font-bold text-white/80">{series.top5s}</div>
                      <div className="text-[7px] text-white/20 uppercase">Top 5s</div>
                    </div>
                    <div className="text-center p-2 bg-white/[0.02] border border-white/[0.04] hidden md:block">
                      <div className={`text-lg font-mono font-bold ${series.positionsGained >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {series.positionsGained >= 0 ? '+' : ''}{series.positionsGained}
                      </div>
                      <div className="text-[7px] text-white/20 uppercase">Pos Gained</div>
                    </div>
                  </div>

                  {/* Coaching assessment */}
                  <div className="border border-white/[0.06] p-3 mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="w-3 h-3 text-[#f97316]/50" />
                      <span className="text-[9px] uppercase tracking-wider text-white/30">Season Assessment</span>
                    </div>
                    <p className="text-[11px] text-white/50 leading-relaxed">
                      {series.iRatingDelta > 100 && (series.avgIncidents ?? 0) < 2
                        ? `Excellent season. +${series.iRatingDelta} iR with clean racing (${series.avgIncidents?.toFixed(1)}x avg incidents). You're outperforming the field consistently.`
                        : series.iRatingDelta > 0 && series.wins > 0
                        ? `Solid results — ${series.wins} win${series.wins > 1 ? 's' : ''} and positive iRating movement. Focus on reducing incidents to maximize points.`
                        : series.iRatingDelta > 0
                        ? `Positive trajectory with +${series.iRatingDelta} iR. Converting more top-5 finishes into podiums should be the focus.`
                        : (series.avgIncidents ?? 0) > 4
                        ? `Incident rate is high (${series.avgIncidents?.toFixed(1)}x avg). Prioritize clean racing — even finishing mid-pack cleanly will improve your championship position.`
                        : series.iRatingDelta < -100
                        ? `Tough season so far (${series.iRatingDelta} iR). Consider whether this series matches your current skill level, or focus on track preparation before races.`
                        : `Mixed results. Focus on consistency — your best finish (P${series.bestFinish ?? '?'}) shows the pace is there.`
                      }
                    </p>
                  </div>

                  {/* Tracks raced */}
                  <div className="flex flex-wrap gap-1.5">
                    {series.tracks.slice(0, 8).map(track => (
                      <span key={track} className="px-2 py-1 text-[8px] text-white/30 border border-white/[0.06] bg-white/[0.01] truncate max-w-[150px]">
                        {track}
                      </span>
                    ))}
                    {series.tracks.length > 8 && (
                      <span className="px-2 py-1 text-[8px] text-white/20">+{series.tracks.length - 8} more</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
