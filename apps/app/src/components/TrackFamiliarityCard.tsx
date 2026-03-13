import { useMemo, useState } from 'react';
import { MapPin, ChevronRight, ChevronDown, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { DriverSessionSummary } from '../lib/driverService';

interface TrackFamiliarity {
  trackName: string;
  sessions: number;
  totalLaps: number;
  avgIncidents: number;
  avgFinish: number;
  bestFinish: number;
  avgIRDelta: number;
  lastRacedDaysAgo: number;
  compositeScore: number;       // 0-100
  level: 'expert' | 'familiar' | 'learning' | 'new';
  riskFactors: string[];
}

function computeTrackFamiliarity(sessions: DriverSessionSummary[]): TrackFamiliarity[] {
  const now = Date.now();
  const DAY = 86_400_000;

  // Group by track
  const byTrack = new Map<string, DriverSessionSummary[]>();
  for (const s of sessions) {
    if (!s.trackName) continue;
    const existing = byTrack.get(s.trackName) || [];
    existing.push(s);
    byTrack.set(s.trackName, existing);
  }

  const results: TrackFamiliarity[] = [];

  for (const [trackName, trackSessions] of byTrack) {
    const sorted = [...trackSessions].sort((a, b) =>
      new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );

    const sessionCount = sorted.length;
    const totalLaps = sorted.reduce((sum, s) => sum + (s.lapsComplete ?? 0), 0);

    const withFinish = sorted.filter(s => s.finishPos != null);
    const avgFinish = withFinish.length > 0
      ? withFinish.reduce((sum, s) => sum + (s.finishPos ?? 0), 0) / withFinish.length
      : 0;
    const bestFinish = withFinish.length > 0
      ? Math.min(...withFinish.map(s => s.finishPos!))
      : 0;

    const withInc = sorted.filter(s => s.incidents != null);
    const avgIncidents = withInc.length > 0
      ? withInc.reduce((sum, s) => sum + (s.incidents ?? 0), 0) / withInc.length
      : 0;

    const withIR = sorted.filter(s => s.irDelta != null);
    const avgIRDelta = withIR.length > 0
      ? withIR.reduce((sum, s) => sum + (s.irDelta ?? 0), 0) / withIR.length
      : 0;

    const lastTs = sorted[0] ? new Date(sorted[0].startedAt).getTime() : 0;
    const lastRacedDaysAgo = lastTs ? (now - lastTs) / DAY : 999;

    // Composite score (0-100) from weighted factors:
    // - Exposure (sessions + laps): 30%
    // - Clean racing (low incidents): 25%
    // - Competitiveness (avg finish, iR delta): 25%
    // - Recency (how recently raced): 20%

    // Exposure: 0-30 pts
    const sessionScore = Math.min(1, sessionCount / 15);    // 15+ sessions = full
    const lapScore = Math.min(1, totalLaps / 200);           // 200+ laps = full
    const exposurePts = (sessionScore * 0.6 + lapScore * 0.4) * 30;

    // Clean racing: 0-25 pts (lower incidents = higher score)
    const cleanPts = withInc.length > 0
      ? Math.max(0, 25 * (1 - Math.min(1, avgIncidents / 6)))
      : 12.5; // Unknown = neutral

    // Competitiveness: 0-25 pts
    let compPts = 12.5; // neutral default
    if (withFinish.length >= 2) {
      const finishScore = Math.max(0, 1 - (avgFinish - 1) / 25); // P1=1.0, P26=0
      const irScore = avgIRDelta >= 0 ? Math.min(1, avgIRDelta / 50 + 0.5) : Math.max(0, 0.5 + avgIRDelta / 100);
      compPts = (finishScore * 0.6 + irScore * 0.4) * 25;
    }

    // Recency: 0-20 pts (recent = higher)
    const recencyPts = lastRacedDaysAgo < 7 ? 20
      : lastRacedDaysAgo < 14 ? 16
      : lastRacedDaysAgo < 30 ? 12
      : lastRacedDaysAgo < 60 ? 8
      : lastRacedDaysAgo < 90 ? 4
      : 0;

    const compositeScore = Math.round(exposurePts + cleanPts + compPts + recencyPts);

    // Level
    const level: TrackFamiliarity['level'] =
      compositeScore >= 70 ? 'expert' :
      compositeScore >= 45 ? 'familiar' :
      compositeScore >= 20 ? 'learning' : 'new';

    // Risk factors
    const riskFactors: string[] = [];
    if (avgIncidents > 4) riskFactors.push('High incident rate');
    if (lastRacedDaysAgo > 30) riskFactors.push('Not raced recently');
    if (sessionCount < 3) riskFactors.push('Limited experience');
    if (avgIRDelta < -20) riskFactors.push('Negative iRating trend');

    results.push({
      trackName,
      sessions: sessionCount,
      totalLaps,
      avgIncidents,
      avgFinish,
      bestFinish,
      avgIRDelta,
      lastRacedDaysAgo,
      compositeScore,
      level,
      riskFactors,
    });
  }

  return results.sort((a, b) => b.compositeScore - a.compositeScore);
}

const LEVEL_CONFIG = {
  expert:   { color: 'text-green-400', bg: 'bg-green-500/10', label: 'EXPERT' },
  familiar: { color: 'text-blue-400',  bg: 'bg-blue-500/10',  label: 'FAMILIAR' },
  learning: { color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'LEARNING' },
  new:      { color: 'text-red-400',   bg: 'bg-red-500/10',   label: 'NEW' },
};

const ORBITRON: React.CSSProperties = { fontFamily: "'Orbitron', sans-serif" };

export function TrackFamiliarityCard({ sessions }: { sessions: DriverSessionSummary[] }) {
  const tracks = useMemo(() => computeTrackFamiliarity(sessions), [sessions]);
  const [expanded, setExpanded] = useState(false);

  if (tracks.length === 0) return null;

  const displayTracks = expanded ? tracks : tracks.slice(0, 5);
  const hasMore = tracks.length > 5;

  // Summary stats
  const expertCount = tracks.filter(t => t.level === 'expert').length;
  const familiarCount = tracks.filter(t => t.level === 'familiar').length;
  const learningCount = tracks.filter(t => t.level === 'learning').length;
  const newCount = tracks.filter(t => t.level === 'new').length;

  return (
    <div className="border border-white/10 bg-[#0e0e0e]/80 backdrop-blur-sm">
      <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <MapPin className="w-4 h-4 text-white/30" />
          <h2 className="text-sm uppercase tracking-[0.15em] text-white/60" style={ORBITRON}>Track Familiarity</h2>
        </div>
        <Link to="/driver/history" className="text-[10px] text-white/30 hover:text-white/50 uppercase tracking-wider flex items-center gap-1">
          All Tracks <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Summary bar */}
      <div className="px-5 py-3 border-b border-white/[0.04] flex items-center gap-4">
        <span className="text-[9px] text-white/25 uppercase">
          {tracks.length} tracks
        </span>
        {expertCount > 0 && (
          <span className="text-[9px] text-green-400/50 flex items-center gap-1">
            <CheckCircle className="w-2.5 h-2.5" /> {expertCount} expert
          </span>
        )}
        {familiarCount > 0 && (
          <span className="text-[9px] text-blue-400/50">{familiarCount} familiar</span>
        )}
        {learningCount > 0 && (
          <span className="text-[9px] text-amber-400/50">{learningCount} learning</span>
        )}
        {newCount > 0 && (
          <span className="text-[9px] text-red-400/50 flex items-center gap-1">
            <AlertTriangle className="w-2.5 h-2.5" /> {newCount} new
          </span>
        )}
      </div>

      {/* Track list */}
      <div className="divide-y divide-white/[0.04]">
        {displayTracks.map(track => {
          const cfg = LEVEL_CONFIG[track.level];
          const barWidth = Math.max(4, track.compositeScore);

          return (
            <div key={track.trackName} className="px-5 py-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-[11px] text-white/70 truncate">{track.trackName}</span>
                  {track.riskFactors.length > 0 && (
                    <AlertTriangle className="w-3 h-3 text-amber-400/40 shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color}`}>
                    {cfg.label}
                  </span>
                  <span className="text-[10px] font-mono text-white/40">{track.compositeScore}</span>
                </div>
              </div>

              {/* Score bar */}
              <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden mb-1.5">
                <div
                  className={`h-full rounded-full transition-all ${
                    track.level === 'expert' ? 'bg-green-500' :
                    track.level === 'familiar' ? 'bg-blue-500' :
                    track.level === 'learning' ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-3 text-[8px] text-white/25">
                <span>{track.sessions} races</span>
                <span>{track.totalLaps} laps</span>
                <span>{track.avgIncidents.toFixed(1)} inc/race</span>
                {track.bestFinish > 0 && <span>Best P{track.bestFinish}</span>}
                <span className="flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  {track.lastRacedDaysAgo < 1 ? 'today' : `${Math.floor(track.lastRacedDaysAgo)}d ago`}
                </span>
              </div>

              {/* Risk factors */}
              {track.riskFactors.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {track.riskFactors.map(rf => (
                    <span key={rf} className="text-[7px] px-1 py-0.5 rounded bg-amber-500/5 text-amber-400/40">
                      {rf}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Show more toggle */}
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-5 py-2.5 border-t border-white/[0.04] text-[10px] text-white/30 hover:text-white/50 hover:bg-white/[0.02] transition-colors flex items-center justify-center gap-1"
        >
          {expanded ? 'Show less' : `Show all ${tracks.length} tracks`}
          <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      )}
    </div>
  );
}
