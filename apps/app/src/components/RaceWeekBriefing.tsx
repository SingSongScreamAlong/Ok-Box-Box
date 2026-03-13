import { useMemo, useState, useEffect, useCallback } from 'react';
import { Calendar, MapPin, ChevronRight, AlertTriangle, CheckCircle, Clock, Target, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { DriverSessionSummary } from '../lib/driverService';

interface TrackBrief {
  trackName: string;
  sessions: number;
  totalLaps: number;
  avgFinish: number;
  bestFinish: number;
  avgIncidents: number;
  avgIRDelta: number;
  lastRacedDaysAgo: number;
  familiarityScore: number;
  familiarityLevel: 'expert' | 'familiar' | 'learning' | 'new';
  strengths: string[];
  risks: string[];
}

function buildTrackBrief(trackName: string, sessions: DriverSessionSummary[]): TrackBrief {
  const now = Date.now();
  const DAY = 86_400_000;

  const trackSessions = sessions.filter(s =>
    s.trackName.toLowerCase() === trackName.toLowerCase()
  ).sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  const count = trackSessions.length;
  const totalLaps = trackSessions.reduce((sum, s) => sum + (s.lapsComplete ?? 0), 0);

  const withFinish = trackSessions.filter(s => s.finishPos != null);
  const avgFinish = withFinish.length > 0
    ? withFinish.reduce((sum, s) => sum + (s.finishPos ?? 0), 0) / withFinish.length : 0;
  const bestFinish = withFinish.length > 0
    ? Math.min(...withFinish.map(s => s.finishPos!)) : 0;

  const withInc = trackSessions.filter(s => s.incidents != null);
  const avgIncidents = withInc.length > 0
    ? withInc.reduce((sum, s) => sum + (s.incidents ?? 0), 0) / withInc.length : 0;

  const withIR = trackSessions.filter(s => s.irDelta != null);
  const avgIRDelta = withIR.length > 0
    ? withIR.reduce((sum, s) => sum + (s.irDelta ?? 0), 0) / withIR.length : 0;

  const lastTs = trackSessions[0] ? new Date(trackSessions[0].startedAt).getTime() : 0;
  const lastRacedDaysAgo = lastTs ? (now - lastTs) / DAY : 999;

  // Familiarity (simplified from TrackFamiliarityCard)
  const sessionScore = Math.min(1, count / 15) * 30;
  const lapScore = Math.min(1, totalLaps / 200) * 10;
  const cleanPts = withInc.length > 0 ? Math.max(0, 25 * (1 - Math.min(1, avgIncidents / 6))) : 12.5;
  const recencyPts = lastRacedDaysAgo < 7 ? 20 : lastRacedDaysAgo < 14 ? 16 : lastRacedDaysAgo < 30 ? 12 : lastRacedDaysAgo < 60 ? 8 : 0;
  const familiarityScore = Math.round(sessionScore + lapScore + cleanPts + recencyPts + 15);

  const familiarityLevel: TrackBrief['familiarityLevel'] =
    familiarityScore >= 70 ? 'expert' :
    familiarityScore >= 45 ? 'familiar' :
    familiarityScore >= 20 ? 'learning' : 'new';

  // Strengths & risks
  const strengths: string[] = [];
  const risks: string[] = [];

  if (avgIRDelta > 10) strengths.push(`Positive iRating trend (+${avgIRDelta.toFixed(0)} avg)`);
  if (avgIncidents < 2 && withInc.length >= 3) strengths.push('Low incident rate at this track');
  if (bestFinish <= 3 && bestFinish > 0) strengths.push(`Podium experience (best P${bestFinish})`);
  if (count >= 10) strengths.push('High track experience');

  if (avgIncidents > 4) risks.push(`High incident rate (${avgIncidents.toFixed(1)}/race)`);
  if (lastRacedDaysAgo > 30) risks.push(`Haven't raced here in ${Math.floor(lastRacedDaysAgo)} days`);
  if (count < 3) risks.push('Limited experience at this track');
  if (avgIRDelta < -20) risks.push('Negative iRating trend here');

  return {
    trackName,
    sessions: count,
    totalLaps,
    avgFinish,
    bestFinish,
    avgIncidents,
    avgIRDelta,
    lastRacedDaysAgo,
    familiarityScore,
    familiarityLevel,
    strengths,
    risks,
  };
}

const FAM_CONFIG = {
  expert:   { color: 'text-green-400', bg: 'bg-green-500/10', label: 'EXPERT' },
  familiar: { color: 'text-blue-400',  bg: 'bg-blue-500/10',  label: 'FAMILIAR' },
  learning: { color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'LEARNING' },
  new:      { color: 'text-red-400',   bg: 'bg-red-500/10',   label: 'NEW TRACK' },
};

const ORBITRON: React.CSSProperties = { fontFamily: "'Orbitron', sans-serif" };
const STORAGE_KEY = 'okbb_upcoming_track';

export function RaceWeekBriefing({ sessions }: { sessions: DriverSessionSummary[] }) {
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);
  const [showSelector, setShowSelector] = useState(false);

  // Load saved track from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setSelectedTrack(saved);
  }, []);

  const selectTrack = useCallback((track: string) => {
    setSelectedTrack(track);
    localStorage.setItem(STORAGE_KEY, track);
    setShowSelector(false);
  }, []);

  // Unique tracks sorted by recency
  const recentTracks = useMemo(() => {
    const trackMap = new Map<string, { count: number; lastTs: number }>();
    for (const s of sessions) {
      if (!s.trackName) continue;
      const existing = trackMap.get(s.trackName);
      const ts = new Date(s.startedAt).getTime();
      if (!existing || ts > existing.lastTs) {
        trackMap.set(s.trackName, { count: (existing?.count ?? 0) + 1, lastTs: ts });
      } else {
        trackMap.set(s.trackName, { ...existing, count: existing.count + 1 });
      }
    }
    return [...trackMap.entries()]
      .sort((a, b) => b[1].lastTs - a[1].lastTs)
      .map(([name]) => name);
  }, [sessions]);

  // Auto-select most recent track if none selected
  useEffect(() => {
    if (!selectedTrack && recentTracks.length > 0) {
      setSelectedTrack(recentTracks[0]);
    }
  }, [selectedTrack, recentTracks]);

  const brief = useMemo(() => {
    if (!selectedTrack) return null;
    return buildTrackBrief(selectedTrack, sessions);
  }, [selectedTrack, sessions]);

  if (sessions.length < 3) return null;

  const fcfg = brief ? FAM_CONFIG[brief.familiarityLevel] : null;

  return (
    <div className="border-2 border-[#f97316]/20 bg-gradient-to-br from-[#f97316]/[0.03] to-transparent backdrop-blur-sm relative overflow-hidden">
      {/* Accent corner */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#f97316]/5 to-transparent" />

      <div className="px-5 py-4 border-b border-[#f97316]/15 flex items-center justify-between relative">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#f97316]/15 border border-[#f97316]/25 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-[#f97316]" />
          </div>
          <div>
            <h2 className="text-sm uppercase tracking-[0.15em] text-[#f97316]" style={ORBITRON}>Race Week Briefing</h2>
            <p className="text-[9px] text-white/25">Your intelligence summary for the next race</p>
          </div>
        </div>
        <button
          onClick={() => setShowSelector(!showSelector)}
          className="text-[10px] text-white/30 hover:text-white/50 uppercase tracking-wider flex items-center gap-1 border border-white/10 px-2 py-1 rounded hover:bg-white/[0.03] transition-colors"
        >
          Change Track <ChevronRight className={`w-3 h-3 transition-transform ${showSelector ? 'rotate-90' : ''}`} />
        </button>
      </div>

      {/* Track selector dropdown */}
      {showSelector && (
        <div className="px-5 py-3 border-b border-white/[0.06] max-h-48 overflow-y-auto">
          <div className="text-[9px] text-white/25 uppercase mb-2">Select upcoming track</div>
          <div className="grid grid-cols-2 gap-1">
            {recentTracks.slice(0, 16).map(track => (
              <button
                key={track}
                onClick={() => selectTrack(track)}
                className={`text-left px-2 py-1.5 rounded text-[10px] transition-colors ${
                  selectedTrack === track
                    ? 'bg-[#f97316]/10 text-[#f97316] border border-[#f97316]/20'
                    : 'text-white/40 hover:text-white/60 hover:bg-white/[0.03]'
                }`}
              >
                {track}
              </button>
            ))}
          </div>
        </div>
      )}

      {brief && fcfg && (
        <div className="p-5 space-y-4 relative">
          {/* Track header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-white/30" />
              <div>
                <div className="text-base font-semibold text-white/90">{brief.trackName}</div>
                <div className="text-[9px] text-white/25 flex items-center gap-2 mt-0.5">
                  <span>{brief.sessions} races</span>
                  <span>{brief.totalLaps} laps</span>
                  {brief.lastRacedDaysAgo < 999 && (
                    <span className="flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {brief.lastRacedDaysAgo < 1 ? 'today' : `${Math.floor(brief.lastRacedDaysAgo)}d ago`}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className={`text-[10px] font-mono px-2 py-1 rounded ${fcfg.bg} ${fcfg.color}`}>
                {fcfg.label}
              </span>
              <div className="text-[9px] text-white/20 mt-1">{brief.familiarityScore}/100</div>
            </div>
          </div>

          {/* Key stats */}
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center">
              <div className="text-lg font-mono font-bold text-white/70">
                {brief.avgFinish > 0 ? `P${brief.avgFinish.toFixed(1)}` : '—'}
              </div>
              <div className="text-[8px] text-white/25 uppercase">Avg Finish</div>
            </div>
            <div className="text-center">
              <div className={`text-lg font-mono font-bold ${
                brief.bestFinish <= 3 && brief.bestFinish > 0 ? 'text-[#f97316]' : 'text-white/70'
              }`}>
                {brief.bestFinish > 0 ? `P${brief.bestFinish}` : '—'}
              </div>
              <div className="text-[8px] text-white/25 uppercase">Best</div>
            </div>
            <div className="text-center">
              <div className={`text-lg font-mono font-bold ${
                brief.avgIncidents > 3 ? 'text-red-400' : 'text-white/70'
              }`}>
                {brief.avgIncidents.toFixed(1)}
              </div>
              <div className="text-[8px] text-white/25 uppercase">Inc/Race</div>
            </div>
            <div className="text-center">
              <div className={`text-lg font-mono font-bold ${
                brief.avgIRDelta > 0 ? 'text-green-400' :
                brief.avgIRDelta < 0 ? 'text-red-400' : 'text-white/50'
              }`}>
                {brief.avgIRDelta > 0 ? '+' : ''}{brief.avgIRDelta.toFixed(0)}
              </div>
              <div className="text-[8px] text-white/25 uppercase">Avg iR Δ</div>
            </div>
          </div>

          {/* Strengths & Risks */}
          {(brief.strengths.length > 0 || brief.risks.length > 0) && (
            <div className="pt-3 border-t border-white/[0.04] grid grid-cols-2 gap-4">
              {brief.strengths.length > 0 && (
                <div>
                  <div className="text-[9px] text-green-400/50 uppercase mb-1.5 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Strengths
                  </div>
                  <div className="space-y-1">
                    {brief.strengths.map((s, i) => (
                      <div key={i} className="text-[10px] text-white/40 leading-relaxed">{s}</div>
                    ))}
                  </div>
                </div>
              )}
              {brief.risks.length > 0 && (
                <div>
                  <div className="text-[9px] text-amber-400/50 uppercase mb-1.5 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Risk Factors
                  </div>
                  <div className="space-y-1">
                    {brief.risks.map((r, i) => (
                      <div key={i} className="text-[10px] text-white/40 leading-relaxed">{r}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* New track guidance */}
          {brief.familiarityLevel === 'new' && (
            <div className="pt-3 border-t border-white/[0.04] bg-red-500/[0.03] -mx-5 px-5 py-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400/50 mt-0.5 shrink-0" />
                <div>
                  <div className="text-[10px] text-red-400/70 font-semibold mb-1">New Track — Practice Recommended</div>
                  <div className="text-[10px] text-white/35 leading-relaxed">
                    Run at least 20 clean laps in practice before entering an official race. Focus on learning brake points and track flow before pushing pace.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-3 border-t border-white/[0.04] flex flex-wrap gap-2">
            <Link
              to="/driver/crew/engineer"
              className="px-3 py-1.5 bg-[#f97316]/10 border border-[#f97316]/25 text-[#f97316] text-[10px] font-semibold uppercase tracking-wider hover:bg-[#f97316]/20 transition-colors flex items-center gap-1.5 rounded"
            >
              <Target className="w-3 h-3" /> Ask Engineer
            </Link>
            <Link
              to="/driver/history"
              className="px-3 py-1.5 border border-white/10 text-white/40 text-[10px] uppercase tracking-wider hover:bg-white/[0.03] transition-colors flex items-center gap-1.5 rounded"
            >
              <Shield className="w-3 h-3" /> Review History
            </Link>
          </div>
        </div>
      )}

      {/* No track selected */}
      {!brief && (
        <div className="p-5 text-center">
          <MapPin className="w-8 h-8 text-white/10 mx-auto mb-2" />
          <p className="text-[11px] text-white/30">Select a track to see your race week briefing</p>
          <button
            onClick={() => setShowSelector(true)}
            className="mt-2 text-[10px] text-[#f97316] hover:text-[#f97316]/80 uppercase tracking-wider"
          >
            Choose Track
          </button>
        </div>
      )}
    </div>
  );
}
