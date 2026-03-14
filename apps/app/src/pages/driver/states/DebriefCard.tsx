import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Flag,
  TrendingUp,
  Target,
  ChevronRight,
  Clock,
  Award,
  AlertCircle,
  CheckCircle,
  Loader2,
  Film
} from 'lucide-react';
import { fetchCrewBrief, type CrewBrief } from '../../../lib/driverService';

interface SessionMemory {
  lastSessionEnd: number | null;
  lastSessionType: string | null;
  lastTrackName: string | null;
  lastPosition: number | null;
  sessionCount: number;
}

interface DebriefCardProps {
  sessionMemory: SessionMemory;
  timeSinceSession: number | null;
  /** When true, renders as an inline card (for Home embed) instead of full-page centered */
  compact?: boolean;
}

/**
 * DebriefCard - POST_RUN state
 *
 * Shown immediately after a session ends (within 30 min).
 * Wired to real crew brief API — no hardcoded mock data.
 *
 * Phase 0: Uses fetchCrewBrief() to get AI-generated session debriefs
 * TODO Phase 1: Add telemetry-specific key moments from session replay data
 */
export function DebriefCard({ sessionMemory, timeSinceSession, compact }: DebriefCardProps) {
  const [brief, setBrief] = useState<CrewBrief | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCrewBrief()
      .then(briefs => {
        if (briefs && briefs.length > 0) {
          // Most recent brief first
          const sorted = [...briefs].sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          setBrief(sorted[0]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const formatTimeSince = (ms: number | null) => {
    if (ms === null) return 'Unknown';
    const minutes = Math.floor(ms / (1000 * 60));
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m ago`;
  };

  const getPositionSuffix = (pos: number) => {
    if (pos === 1) return 'st';
    if (pos === 2) return 'nd';
    if (pos === 3) return 'rd';
    return 'th';
  };

  // Extract replay clips from debrief content
  const getReplayClips = (): { clipId: string; eventType: string; eventLabel: string; tags: string[]; sessionTimeMs: number; reason?: string }[] => {
    const content = brief?.content;
    if (!content || typeof content === 'string') return [];
    const clips = content.replay_clips || content.replayClips || [];
    const refs = content.clip_references || content.clipReferences || [];
    // Merge AI-generated reasons into clips
    return clips.map((c: any) => {
      const ref = refs.find((r: any) => r.clipId === c.clipId);
      return { ...c, reason: ref?.reason };
    });
  };

  const replayClips = getReplayClips();

  // Extract structured debrief points from crew brief content
  const getDebriefPoints = (): {
    engineerSays: string;
    keyImprovement: string | null;
    keyWeakness: string | null;
    biggestMistake: string | null;
    strongestSegment: string | null;
  } => {
    const content = brief?.content;

    // Default position-based engineer message
    const pos = sessionMemory.lastPosition;
    const defaultMsg = pos && pos <= 3
      ? `Strong result at P${pos}. Let's review what worked.`
      : pos && pos <= 10
      ? `P${pos} gives us good data. I've identified areas to improve.`
      : `Good session for data. Let's identify where we can improve.`;

    if (!content) return { engineerSays: defaultMsg, keyImprovement: null, keyWeakness: null, biggestMistake: null, strongestSegment: null };

    // crew brief content may be a string or structured object
    if (typeof content === 'string') {
      return { engineerSays: content, keyImprovement: null, keyWeakness: null, biggestMistake: null, strongestSegment: null };
    }

    // Structured content — try to extract 4-point debrief
    // Supports both new Phase 0 fields AND legacy SessionDebriefResponse shape
    return {
      engineerSays: content.summary || content.headline || content.engineer_says || content.message || defaultMsg,
      keyImprovement: content.key_improvement || content.keyImprovement || content.secondary_observation || null,
      keyWeakness: content.key_weakness || content.keyWeakness || content.primary_limiter || null,
      biggestMistake: content.biggest_mistake || content.biggestMistake || null,
      strongestSegment: content.strongest_segment || content.strongestSegment || null,
    };
  };

  const debrief = getDebriefPoints();

  const ORBITRON = { fontFamily: 'Orbitron, sans-serif' };
  const wrapperClass = compact
    ? 'border border-[#f97316]/30 bg-[#0e0e0e]/80 backdrop-blur-sm'
    : 'max-w-2xl mx-auto px-4 py-8 space-y-6';

  if (compact) {
    // Compact inline card for Home page embed
    return (
      <div className={wrapperClass}>
        <div className="px-5 py-3 border-b border-[#f97316]/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-[#f97316]/50" />
            <h2 className="text-sm uppercase tracking-[0.15em] text-[#f97316]" style={ORBITRON}>Session Debrief</h2>
          </div>
          <span className="text-[10px] text-white/20">{formatTimeSince(timeSinceSession)}</span>
        </div>
        <div className="px-5 py-4">
          {/* Session header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flag className="w-4 h-4 text-white/30" />
              <span className="text-[12px] text-white/60 font-medium">{sessionMemory.lastTrackName || 'Unknown Track'}</span>
              <span className="text-[9px] text-white/20 uppercase">{sessionMemory.lastSessionType || 'Session'}</span>
            </div>
            {sessionMemory.lastPosition && (
              <span className="text-lg font-bold font-mono text-white/80">
                P{sessionMemory.lastPosition}<span className="text-xs text-white/30">{getPositionSuffix(sessionMemory.lastPosition)}</span>
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-3">
              <Loader2 className="w-4 h-4 text-[#f97316]/50 animate-spin" />
              <span className="text-[11px] text-white/30">Processing session debrief...</span>
            </div>
          ) : (
            <>
              {/* Engineer assessment */}
              <div className="mb-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Award className="w-3 h-3 text-[#f97316]/50" />
                  <span className="text-[9px] uppercase tracking-wider text-white/25">Engineer</span>
                </div>
                <p className="text-[11px] text-white/50 italic leading-relaxed">"{debrief.engineerSays}"</p>
              </div>

              {/* 4-point summary grid */}
              <div className="grid grid-cols-2 gap-2">
                {debrief.keyImprovement && (
                  <div className="p-2 border border-green-500/15 bg-green-500/[0.03]">
                    <div className="flex items-center gap-1 mb-1">
                      <CheckCircle className="w-3 h-3 text-green-400" />
                      <span className="text-[8px] uppercase tracking-wider text-green-400/60">Key Improvement</span>
                    </div>
                    <p className="text-[10px] text-white/40 line-clamp-2">{debrief.keyImprovement}</p>
                  </div>
                )}
                {debrief.keyWeakness && (
                  <div className="p-2 border border-yellow-500/15 bg-yellow-500/[0.03]">
                    <div className="flex items-center gap-1 mb-1">
                      <AlertCircle className="w-3 h-3 text-yellow-400" />
                      <span className="text-[8px] uppercase tracking-wider text-yellow-400/60">Key Weakness</span>
                    </div>
                    <p className="text-[10px] text-white/40 line-clamp-2">{debrief.keyWeakness}</p>
                  </div>
                )}
                {debrief.strongestSegment && (
                  <div className="p-2 border border-blue-500/15 bg-blue-500/[0.03]">
                    <div className="flex items-center gap-1 mb-1">
                      <TrendingUp className="w-3 h-3 text-blue-400" />
                      <span className="text-[8px] uppercase tracking-wider text-blue-400/60">Strongest</span>
                    </div>
                    <p className="text-[10px] text-white/40 line-clamp-2">{debrief.strongestSegment}</p>
                  </div>
                )}
                {debrief.biggestMistake && (
                  <div className="p-2 border border-red-500/15 bg-red-500/[0.03]">
                    <div className="flex items-center gap-1 mb-1">
                      <Target className="w-3 h-3 text-red-400" />
                      <span className="text-[8px] uppercase tracking-wider text-red-400/60">Work On</span>
                    </div>
                    <p className="text-[10px] text-white/40 line-clamp-2">{debrief.biggestMistake}</p>
                  </div>
                )}
              </div>

              {/* If no structured points, show a simple message */}
              {!debrief.keyImprovement && !debrief.keyWeakness && !debrief.strongestSegment && !debrief.biggestMistake && brief && (
                <p className="text-[10px] text-white/25 mt-2">Detailed analysis available in full history.</p>
              )}

              {/* Replay clips linked to this debrief */}
              {replayClips.length > 0 && (
                <div className="mt-3 pt-2 border-t border-white/[0.04]">
                  <div className="flex items-center gap-1 mb-1.5">
                    <Film className="w-3 h-3 text-[#f97316]/50" />
                    <span className="text-[8px] uppercase tracking-wider text-white/25">{replayClips.length} Replay Clip{replayClips.length > 1 ? 's' : ''}</span>
                  </div>
                  <div className="space-y-1">
                    {replayClips.slice(0, 3).map((clip: any) => (
                      <Link
                        key={clip.clipId}
                        to={`/driver/replay?clip=${clip.clipId}`}
                        className="flex items-center gap-2 px-2 py-1 bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] transition-colors group"
                      >
                        <Film className="w-2.5 h-2.5 text-red-400/50 group-hover:text-red-400" />
                        <span className="text-[9px] text-white/30 group-hover:text-white/50 truncate flex-1">
                          {clip.reason || clip.eventLabel || clip.eventType}
                        </span>
                        <span className="text-[8px] text-white/15">{Math.floor(clip.sessionTimeMs / 60000)}:{String(Math.floor((clip.sessionTimeMs % 60000) / 1000)).padStart(2, '0')}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Quick actions */}
          <div className="flex items-center gap-3 mt-4 pt-3 border-t border-white/[0.06]">
            <Link to="/driver/history" className="text-[10px] text-white/30 hover:text-white/50 uppercase tracking-wider flex items-center gap-1">
              Full History <ChevronRight className="w-3 h-3" />
            </Link>
            <Link to="/driver/crew/engineer" className="text-[10px] text-[#f97316]/50 hover:text-[#f97316]/80 uppercase tracking-wider flex items-center gap-1">
              Ask Engineer <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Full-page mode (original layout, but with real data)
  return (
    <div className={wrapperClass}>
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/20 border border-orange-500/30 rounded mb-4">
          <Clock className="w-4 h-4 text-orange-400" />
          <span className="text-xs uppercase tracking-wider text-orange-400">
            Session Complete • {formatTimeSince(timeSinceSession)}
          </span>
        </div>
        <h1
          className="text-2xl font-bold uppercase tracking-wider"
          style={ORBITRON}
        >
          Debrief
        </h1>
        <p className="text-sm text-white/50 mt-2">Your engineer has reviewed the session</p>
      </div>

      {/* Session Summary */}
      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.12] rounded p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500/20 rounded flex items-center justify-center">
              <Flag className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <div className="text-lg font-semibold">{sessionMemory.lastTrackName || 'Unknown Track'}</div>
              <div className="text-xs text-white/40 uppercase">{sessionMemory.lastSessionType || 'Session'}</div>
            </div>
          </div>
          {sessionMemory.lastPosition && (
            <div className="text-right">
              <div className="text-3xl font-bold font-mono">
                P{sessionMemory.lastPosition}
                <span className="text-lg text-white/40">{getPositionSuffix(sessionMemory.lastPosition)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.12] rounded p-8 text-center">
          <Loader2 className="w-8 h-8 text-orange-400/50 animate-spin mx-auto mb-3" />
          <p className="text-sm text-white/40">Processing your session debrief...</p>
        </div>
      ) : (
        <>
          {/* Engineer Debrief */}
          <div className="bg-white/[0.03] backdrop-blur-xl border border-orange-500/20 rounded p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-orange-500/20 rounded flex items-center justify-center">
                <Award className="w-4 h-4 text-orange-400" />
              </div>
              <h2 className="text-sm font-semibold uppercase tracking-wider">Engineer Says</h2>
            </div>
            <p className="text-sm text-white/70 italic mb-4">"{debrief.engineerSays}"</p>
          </div>

          {/* 4-point debrief */}
          {(debrief.keyImprovement || debrief.keyWeakness || debrief.strongestSegment || debrief.biggestMistake) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {debrief.keyImprovement && (
                <div className="bg-white/[0.03] border border-green-500/20 rounded p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-xs uppercase tracking-wider text-green-400">Key Improvement</span>
                  </div>
                  <p className="text-sm text-white/60">{debrief.keyImprovement}</p>
                </div>
              )}
              {debrief.keyWeakness && (
                <div className="bg-white/[0.03] border border-yellow-500/20 rounded p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-yellow-400" />
                    <span className="text-xs uppercase tracking-wider text-yellow-400">Key Weakness</span>
                  </div>
                  <p className="text-sm text-white/60">{debrief.keyWeakness}</p>
                </div>
              )}
              {debrief.strongestSegment && (
                <div className="bg-white/[0.03] border border-blue-500/20 rounded p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-blue-400" />
                    <span className="text-xs uppercase tracking-wider text-blue-400">Strongest Segment</span>
                  </div>
                  <p className="text-sm text-white/60">{debrief.strongestSegment}</p>
                </div>
              )}
              {debrief.biggestMistake && (
                <div className="bg-white/[0.03] border border-red-500/20 rounded p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-red-400" />
                    <span className="text-xs uppercase tracking-wider text-red-400">Work On This</span>
                  </div>
                  <p className="text-sm text-white/60">{debrief.biggestMistake}</p>
                </div>
              )}
            </div>
          )}

          {/* Replay clips linked to debrief */}
          {replayClips.length > 0 && (
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.12] rounded p-4">
              <div className="flex items-center gap-2 mb-3">
                <Film className="w-4 h-4 text-red-400" />
                <h2 className="text-sm font-semibold uppercase tracking-wider">Session Replay Clips</h2>
                <span className="text-[10px] text-white/20 ml-auto">{replayClips.length} captured</span>
              </div>
              <div className="space-y-2">
                {replayClips.map((clip: any) => (
                  <Link
                    key={clip.clipId}
                    to={`/driver/replay?clip=${clip.clipId}`}
                    className="flex items-center gap-3 px-3 py-2 bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] rounded transition-colors group"
                  >
                    <Film className="w-4 h-4 text-red-400/40 group-hover:text-red-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-white/60 group-hover:text-white/80 truncate">
                        {clip.reason || clip.eventLabel || clip.eventType}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] text-white/20">
                          {Math.floor(clip.sessionTimeMs / 60000)}:{String(Math.floor((clip.sessionTimeMs % 60000) / 1000)).padStart(2, '0')}
                        </span>
                        {clip.tags?.length > 0 && (
                          <div className="flex gap-1">
                            {clip.tags.slice(0, 3).map((tag: string) => (
                              <span key={tag} className="text-[8px] px-1 py-0.5 bg-white/[0.04] text-white/20 rounded">{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-3 h-3 text-white/10 group-hover:text-white/30" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Actions */}
      <div className="flex items-center justify-center gap-4 pt-4">
        <Link
          to="/driver/idp"
          className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded text-xs uppercase tracking-wider hover:bg-purple-500/30 transition-colors"
        >
          Deep Dive Analysis
          <ChevronRight className="w-3 h-3" />
        </Link>
        <Link
          to="/driver/history"
          className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded text-xs uppercase tracking-wider hover:bg-white/10 transition-colors"
        >
          Session History
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
