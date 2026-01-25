import { Link } from 'react-router-dom';
import { 
  Flag,
  TrendingUp,
  TrendingDown,
  Target,
  ChevronRight,
  Clock,
  Award,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

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
}

/**
 * DebriefCard - POST_RUN state
 * 
 * Shown immediately after a session ends (within 30 min).
 * Provides immediate debrief: key moments, delta analysis, "work on this".
 */
export function DebriefCard({ sessionMemory, timeSinceSession }: DebriefCardProps) {
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

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
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
          style={{ fontFamily: 'Orbitron, sans-serif' }}
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

        {/* Key Stats */}
        <div className="grid grid-cols-3 gap-4 py-4 border-t border-b border-white/10">
          <div className="text-center">
            <div className="text-xs text-white/40 uppercase mb-1">Best Lap</div>
            <div className="text-xl font-mono font-bold text-purple-400">1:42.847</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-white/40 uppercase mb-1">Avg Pace</div>
            <div className="text-xl font-mono font-bold">1:43.521</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-white/40 uppercase mb-1">Consistency</div>
            <div className="text-xl font-mono font-bold text-green-400">94%</div>
          </div>
        </div>
      </div>

      {/* Engineer Debrief */}
      <div className="bg-white/[0.03] backdrop-blur-xl border border-orange-500/20 rounded p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-orange-500/20 rounded flex items-center justify-center">
            <Award className="w-4 h-4 text-orange-400" />
          </div>
          <h2 className="text-sm font-semibold uppercase tracking-wider">Engineer Says</h2>
        </div>
        <p className="text-sm text-white/70 italic mb-4">
          {sessionMemory.lastPosition && sessionMemory.lastPosition <= 3 
            ? `"Strong result. P${sessionMemory.lastPosition} is exactly where we needed to be. Your consistency in the final stint was excellent."`
            : sessionMemory.lastPosition && sessionMemory.lastPosition <= 10
            ? `"Solid session. P${sessionMemory.lastPosition} gives us good data to work with. I've identified a few areas where we can find time."`
            : `"Good session for data collection. Let's review the key moments and identify where we can improve."`
          }
        </p>
      </div>

      {/* Key Moments */}
      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.12] rounded p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-purple-500/20 rounded flex items-center justify-center">
            <Target className="w-4 h-4 text-purple-400" />
          </div>
          <h2 className="text-sm font-semibold uppercase tracking-wider">Key Moments</h2>
        </div>
        <div className="space-y-2">
          <div className="flex items-start gap-3 p-2 bg-green-500/10 border border-green-500/20 rounded">
            <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-green-400">Personal Best Lap 12</div>
              <div className="text-xs text-white/50">Gained 0.3s through Turn 4 complex</div>
            </div>
          </div>
          <div className="flex items-start gap-3 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded">
            <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-yellow-400">Lap 18 - Tire Degradation</div>
              <div className="text-xs text-white/50">Lost 0.5s in sector 3 due to rear grip</div>
            </div>
          </div>
        </div>
      </div>

      {/* Work On This */}
      <div className="bg-white/[0.03] backdrop-blur-xl border border-blue-500/20 rounded p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-blue-500/20 rounded flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <h2 className="text-sm font-semibold uppercase tracking-wider">Work On This</h2>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <TrendingDown className="w-4 h-4 text-red-400" />
            <span className="text-white/70">Braking into Turn 1 — 8m early vs your best</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <TrendingDown className="w-4 h-4 text-yellow-400" />
            <span className="text-white/70">Throttle application T6 exit — losing 0.15s</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-center gap-4 pt-4">
        <Link 
          to="/driver/crew/analyst"
          className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded text-xs uppercase tracking-wider hover:bg-purple-500/30 transition-colors"
        >
          Deep Dive Analysis
          <ChevronRight className="w-3 h-3" />
        </Link>
        <Link 
          to="/driver/sessions"
          className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded text-xs uppercase tracking-wider hover:bg-white/10 transition-colors"
        >
          Session History
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
