/**
 * RacePrepFlow — One-Click Race Prep workflow modal
 * 
 * Chains existing data sources into a guided preparation workflow:
 * 1. Track history summary (from session list)
 * 2. Relevant goals for this track/discipline
 * 3. Practice focus directive (from performance direction)
 * 4. Prep checklist (localStorage-based for Phase 0)
 * 
 * Phase 0: Frontend-only, localStorage prep state
 * TODO Phase 1: Server-side prep state, schedule integration, auto-generated practice plans
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  X, CheckCircle2, Circle, Target, Flag,
  ChevronRight, AlertTriangle, TrendingUp,
  Clock, MapPin
} from 'lucide-react';
import type { DriverSessionSummary } from '../lib/driverService';

const ORBITRON = { fontFamily: 'Orbitron, sans-serif' };
const PREP_STORAGE_KEY = 'okbb_race_prep_state';

interface PrepState {
  trackName: string;
  historyReviewed: boolean;
  goalsReviewed: boolean;
  practicePlanSet: boolean;
  updatedAt: string;
}

interface RacePrepFlowProps {
  sessions: DriverSessionSummary[];
  isOpen: boolean;
  onClose: () => void;
}

function loadPrepState(trackName: string): PrepState {
  try {
    const stored = localStorage.getItem(PREP_STORAGE_KEY);
    if (stored) {
      const state = JSON.parse(stored) as PrepState;
      if (state.trackName === trackName) return state;
    }
  } catch {}
  return { trackName, historyReviewed: false, goalsReviewed: false, practicePlanSet: false, updatedAt: new Date().toISOString() };
}

function savePrepState(state: PrepState) {
  try {
    localStorage.setItem(PREP_STORAGE_KEY, JSON.stringify({ ...state, updatedAt: new Date().toISOString() }));
  } catch {}
}

export function RacePrepFlow({ sessions, isOpen, onClose }: RacePrepFlowProps) {
  // Determine most likely next track from recent sessions
  const recentTrack = sessions.length > 0 ? sessions[0].trackName : null;
  const [targetTrack, setTargetTrack] = useState(recentTrack || '');
  const [prepState, setPrepState] = useState<PrepState>(() => loadPrepState(targetTrack));

  useEffect(() => {
    if (targetTrack) {
      setPrepState(loadPrepState(targetTrack));
    }
  }, [targetTrack]);

  // Track history for target track
  const trackHistory = useMemo(() => {
    if (!targetTrack) return [];
    return sessions.filter(s =>
      s.trackName.toLowerCase().includes(targetTrack.toLowerCase())
    );
  }, [sessions, targetTrack]);

  const trackStats = useMemo(() => {
    if (trackHistory.length === 0) return null;
    const finishes = trackHistory.filter(s => s.finishPos != null).map(s => s.finishPos!);
    const incidents = trackHistory.filter(s => s.incidents != null).map(s => s.incidents!);
    return {
      sessions: trackHistory.length,
      bestFinish: finishes.length > 0 ? Math.min(...finishes) : null,
      avgFinish: finishes.length > 0 ? finishes.reduce((a, b) => a + b, 0) / finishes.length : null,
      avgIncidents: incidents.length > 0 ? incidents.reduce((a, b) => a + b, 0) / incidents.length : null,
      lastRaced: new Date(trackHistory[0].startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };
  }, [trackHistory]);

  // Unique track names for quick select
  const uniqueTracks = useMemo(() => {
    const trackMap = new Map<string, number>();
    sessions.forEach(s => {
      trackMap.set(s.trackName, (trackMap.get(s.trackName) || 0) + 1);
    });
    return [...trackMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name]) => name);
  }, [sessions]);

  const toggleStep = useCallback((step: keyof Pick<PrepState, 'historyReviewed' | 'goalsReviewed' | 'practicePlanSet'>) => {
    const next = { ...prepState, [step]: !prepState[step] };
    setPrepState(next);
    savePrepState(next);
  }, [prepState]);

  const completedSteps = [prepState.historyReviewed, prepState.goalsReviewed, prepState.practicePlanSet].filter(Boolean).length;
  const totalSteps = 3;

  // Familiarity signal
  const familiarity = trackStats
    ? trackStats.sessions >= 10 ? 'High' : trackStats.sessions >= 5 ? 'Moderate' : trackStats.sessions >= 2 ? 'Low' : 'New'
    : 'Unknown';
  const familiarityColor = familiarity === 'High' ? 'text-green-400' : familiarity === 'Moderate' ? 'text-blue-400' : familiarity === 'Low' ? 'text-yellow-400' : 'text-red-400';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-[#0e0e0e] border border-white/15 shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#0e0e0e] z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#f97316]/20 border border-[#f97316]/30 flex items-center justify-center">
              <Target className="w-4 h-4 text-[#f97316]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[#f97316]" style={ORBITRON}>Race Prep</h2>
              <p className="text-[9px] text-white/30">Prepare for your next session</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 transition-colors">
            <X className="w-4 h-4 text-white/40" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Track selector */}
          <div>
            <div className="text-[9px] text-white/25 uppercase tracking-wider mb-2">Target Track</div>
            <div className="flex flex-wrap gap-2">
              {uniqueTracks.map(track => (
                <button
                  key={track}
                  onClick={() => setTargetTrack(track)}
                  className={`px-3 py-1.5 text-[10px] uppercase tracking-wider border transition-colors ${
                    targetTrack === track
                      ? 'border-[#f97316]/50 bg-[#f97316]/10 text-[#f97316]'
                      : 'border-white/10 text-white/40 hover:text-white/60 hover:border-white/20'
                  }`}
                >
                  {track}
                </button>
              ))}
            </div>
          </div>

          {targetTrack && (
            <>
              {/* Track intelligence */}
              <div className="border border-white/10 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-3.5 h-3.5 text-white/30" />
                  <span className="text-[10px] uppercase tracking-wider text-white/40">Track Intelligence</span>
                </div>
                {trackStats ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-lg font-mono font-bold text-white/80">{trackStats.sessions}</div>
                        <div className="text-[8px] text-white/25 uppercase">Sessions</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-mono font-bold text-white/80">P{trackStats.bestFinish ?? '—'}</div>
                        <div className="text-[8px] text-white/25 uppercase">Best</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-mono font-bold text-white/80">P{trackStats.avgFinish?.toFixed(1) ?? '—'}</div>
                        <div className="text-[8px] text-white/25 uppercase">Avg Finish</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-lg font-mono font-bold ${(trackStats.avgIncidents ?? 0) > 3 ? 'text-red-400' : 'text-white/80'}`}>
                          {trackStats.avgIncidents?.toFixed(1) ?? '—'}x
                        </div>
                        <div className="text-[8px] text-white/25 uppercase">Avg Inc</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                      <span className="text-[9px] text-white/20">Familiarity: <span className={familiarityColor}>{familiarity}</span></span>
                      <span className="text-[9px] text-white/20">Last raced: {trackStats.lastRaced}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <AlertTriangle className="w-6 h-6 text-yellow-400/50 mx-auto mb-2" />
                    <p className="text-[11px] text-white/30">No history at this track</p>
                    <p className="text-[9px] text-yellow-400/50 mt-1">Recommend extra practice time</p>
                  </div>
                )}
              </div>

              {/* Prep checklist */}
              <div className="border border-white/10 p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Flag className="w-3.5 h-3.5 text-white/30" />
                    <span className="text-[10px] uppercase tracking-wider text-white/40">Prep Checklist</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#f97316]">{completedSteps}/{totalSteps}</span>
                </div>
                <div className="space-y-2">
                  <button
                    onClick={() => toggleStep('historyReviewed')}
                    className="w-full flex items-center gap-3 p-3 border border-white/[0.06] hover:bg-white/[0.02] transition-colors text-left"
                  >
                    {prepState.historyReviewed
                      ? <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                      : <Circle className="w-4 h-4 text-white/20 flex-shrink-0" />
                    }
                    <div>
                      <div className={`text-[11px] ${prepState.historyReviewed ? 'text-white/60 line-through' : 'text-white/70'}`}>
                        Review track history
                      </div>
                      <div className="text-[9px] text-white/20">Check past performance, incident patterns, best laps</div>
                    </div>
                  </button>

                  <button
                    onClick={() => toggleStep('goalsReviewed')}
                    className="w-full flex items-center gap-3 p-3 border border-white/[0.06] hover:bg-white/[0.02] transition-colors text-left"
                  >
                    {prepState.goalsReviewed
                      ? <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                      : <Circle className="w-4 h-4 text-white/20 flex-shrink-0" />
                    }
                    <div>
                      <div className={`text-[11px] ${prepState.goalsReviewed ? 'text-white/60 line-through' : 'text-white/70'}`}>
                        Set session goals
                      </div>
                      <div className="text-[9px] text-white/20">Define what you want to achieve in this session</div>
                    </div>
                  </button>

                  <button
                    onClick={() => toggleStep('practicePlanSet')}
                    className="w-full flex items-center gap-3 p-3 border border-white/[0.06] hover:bg-white/[0.02] transition-colors text-left"
                  >
                    {prepState.practicePlanSet
                      ? <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                      : <Circle className="w-4 h-4 text-white/20 flex-shrink-0" />
                    }
                    <div>
                      <div className={`text-[11px] ${prepState.practicePlanSet ? 'text-white/60 line-through' : 'text-white/70'}`}>
                        Practice plan confirmed
                      </div>
                      <div className="text-[9px] text-white/20">Know what you're working on before going on track</div>
                    </div>
                  </button>
                </div>

                {/* Progress bar */}
                <div className="mt-4 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#f97316] rounded-full transition-all duration-500"
                    style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
                  />
                </div>
              </div>

              {/* Quick actions */}
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/driver/history"
                  onClick={onClose}
                  className="px-4 py-2 border border-white/10 text-[11px] uppercase tracking-wider text-white/50 hover:text-white/70 hover:bg-white/5 transition-colors flex items-center gap-2"
                >
                  <Clock className="w-3.5 h-3.5" /> View History
                </Link>
                <Link
                  to="/driver/progress"
                  onClick={onClose}
                  className="px-4 py-2 border border-white/10 text-[11px] uppercase tracking-wider text-white/50 hover:text-white/70 hover:bg-white/5 transition-colors flex items-center gap-2"
                >
                  <TrendingUp className="w-3.5 h-3.5" /> Goals
                </Link>
                <Link
                  to="/driver/crew/engineer"
                  onClick={onClose}
                  className="px-4 py-2 bg-[#f97316] text-black text-[11px] font-semibold uppercase tracking-wider hover:bg-[#ea580c] transition-colors flex items-center gap-2"
                >
                  Ask Engineer <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
