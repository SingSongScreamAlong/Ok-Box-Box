import { Link } from 'react-router-dom';
import { 
  TrendingUp,
  Trophy,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';

interface SessionMemory {
  lastSessionEnd: number | null;
  lastSessionType: string | null;
  lastTrackName: string | null;
  lastPosition: number | null;
  sessionCount: number;
}

interface SeasonViewProps {
  sessionMemory: SessionMemory;
}

/**
 * SeasonView - SEASON_LEVEL state
 * 
 * @deprecated Phase 0: This component is not currently routed.
 * DriverLanding now handles SEASON_LEVEL state via its own layout.
 * Retained as a shell for potential Phase 1 season-level intelligence view.
 * All hardcoded mock data has been removed.
 */
export function SeasonView({ sessionMemory }: SeasonViewProps) {
  const daysSinceLastSession = sessionMemory.lastSessionEnd 
    ? Math.floor((Date.now() - sessionMemory.lastSessionEnd) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-5 h-5 text-yellow-400" />
          <span className="text-xs uppercase tracking-wider text-yellow-400">Deprecated Shell</span>
        </div>
        <h1 
          className="text-2xl font-bold uppercase tracking-wider"
          style={{ fontFamily: 'Orbitron, sans-serif' }}
        >
          Season View
        </h1>
        <p className="text-sm text-white/50 mt-2">
          {daysSinceLastSession !== null 
            ? `It's been ${daysSinceLastSession} day${daysSinceLastSession !== 1 ? 's' : ''} since your last session`
            : 'Ready to get back on track?'
          }
        </p>
        <p className="text-sm text-yellow-400/60 mt-1">
          This view is not active. Use the main Home page for your command center.
        </p>
      </div>

      <div className="flex flex-wrap gap-4">
        <Link 
          to="/driver/home"
          className="flex items-center gap-2 px-4 py-2 bg-[#f97316]/20 border border-[#f97316]/30 rounded text-xs uppercase tracking-wider hover:bg-[#f97316]/30 transition-colors"
        >
          Go to Home <ChevronRight className="w-3 h-3" />
        </Link>
        <Link 
          to="/driver/history"
          className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded text-xs uppercase tracking-wider hover:bg-white/10 transition-colors"
        >
          <Trophy className="w-4 h-4" />
          History
        </Link>
        <Link 
          to="/driver/progress"
          className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded text-xs uppercase tracking-wider hover:bg-white/10 transition-colors"
        >
          <TrendingUp className="w-4 h-4" />
          Develop
        </Link>
      </div>
    </div>
  );
}
