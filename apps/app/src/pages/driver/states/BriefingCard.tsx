import { Link } from 'react-router-dom';
import { useRelay } from '../../../hooks/useRelay';
import { 
  Radio,
  Flag,
  Cloud,
  Wrench,
  Target,
  ChevronRight,
  Clock,
  AlertCircle
} from 'lucide-react';

/**
 * BriefingCard - PRE_SESSION state
 * 
 * Shown when the driver is about to enter a session (relay connecting).
 * Provides proactive briefing: track notes, weather, setup reminders, goals.
 */
export function BriefingCard() {
  const { status } = useRelay();

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded mb-4">
          <Radio className="w-4 h-4 text-yellow-500 animate-pulse" />
          <span className="text-xs uppercase tracking-wider text-yellow-400">
            {status === 'connecting' ? 'Connecting to iRacing...' : 'Pre-Session'}
          </span>
        </div>
        <h1 
          className="text-2xl font-bold uppercase tracking-wider"
          style={{ fontFamily: 'Orbitron, sans-serif' }}
        >
          Session Briefing
        </h1>
        <p className="text-sm text-white/50 mt-2">Your engineer is preparing your briefing</p>
      </div>

      {/* Briefing Cards */}
      <div className="space-y-4">
        {/* Track Info */}
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.12] rounded p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-orange-500/20 rounded flex items-center justify-center">
              <Flag className="w-4 h-4 text-orange-400" />
            </div>
            <h2 className="text-sm font-semibold uppercase tracking-wider">Track</h2>
          </div>
          <div className="text-lg font-semibold">Awaiting session data...</div>
          <p className="text-xs text-white/40 mt-1">Track details will appear when connected</p>
        </div>

        {/* Weather */}
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.12] rounded p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-blue-500/20 rounded flex items-center justify-center">
              <Cloud className="w-4 h-4 text-blue-400" />
            </div>
            <h2 className="text-sm font-semibold uppercase tracking-wider">Conditions</h2>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xs text-white/40 uppercase">Track Temp</div>
              <div className="text-lg font-mono">--°C</div>
            </div>
            <div>
              <div className="text-xs text-white/40 uppercase">Air Temp</div>
              <div className="text-lg font-mono">--°C</div>
            </div>
            <div>
              <div className="text-xs text-white/40 uppercase">Grip</div>
              <div className="text-lg font-mono">--</div>
            </div>
          </div>
        </div>

        {/* Engineer Notes */}
        <div className="bg-white/[0.03] backdrop-blur-xl border border-orange-500/20 rounded p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-orange-500/20 rounded flex items-center justify-center">
              <Wrench className="w-4 h-4 text-orange-400" />
            </div>
            <h2 className="text-sm font-semibold uppercase tracking-wider">Engineer</h2>
          </div>
          <p className="text-sm text-white/70 italic">
            "Standing by. I'll have your briefing ready once we connect to the sim."
          </p>
        </div>

        {/* Session Goals */}
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.12] rounded p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-purple-500/20 rounded flex items-center justify-center">
              <Target className="w-4 h-4 text-purple-400" />
            </div>
            <h2 className="text-sm font-semibold uppercase tracking-wider">Focus Areas</h2>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-white/60">
              <AlertCircle className="w-3 h-3 text-yellow-400" />
              <span>No previous session data available</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center justify-center gap-4 pt-4">
        <Link 
          to="/driver/crew/engineer"
          className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded text-xs uppercase tracking-wider hover:bg-white/10 transition-colors"
        >
          <Wrench className="w-3 h-3" />
          Talk to Engineer
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Waiting indicator */}
      <div className="text-center pt-8">
        <div className="inline-flex items-center gap-2 text-white/30">
          <Clock className="w-4 h-4" />
          <span className="text-xs uppercase tracking-wider">Waiting for session start...</span>
        </div>
      </div>
    </div>
  );
}
