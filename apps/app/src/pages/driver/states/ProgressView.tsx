import { Link } from 'react-router-dom';
import { 
  TrendingUp,
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

interface ProgressViewProps {
  sessionMemory: SessionMemory;
  timeSinceSession: number | null;
}

/**
 * ProgressView - BETWEEN_SESSIONS state
 * 
 * @deprecated Phase 0: This component is not currently routed. 
 * DriverLanding now handles BETWEEN_SESSIONS state via its own layout.
 * Retained as a shell for potential Phase 1 standalone progress view.
 * All hardcoded mock data has been removed.
 */
export function ProgressView({ sessionMemory, timeSinceSession }: ProgressViewProps) {
  const formatTimeSince = (ms: number | null) => {
    if (ms === null) return 'No recent sessions';
    const hours = Math.floor(ms / (1000 * 60 * 60));
    if (hours < 1) return 'Less than an hour ago';
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

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
          Progress
        </h1>
        <p className="text-sm text-white/50 mt-2">
          Last session: {formatTimeSince(timeSinceSession)}
          {sessionMemory.lastTrackName && ` at ${sessionMemory.lastTrackName}`}
        </p>
        <p className="text-sm text-yellow-400/60 mt-1">
          This view is not active. Use the main Home page or the Develop section for real progress data.
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
          to="/driver/progress"
          className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded text-xs uppercase tracking-wider hover:bg-white/10 transition-colors"
        >
          <TrendingUp className="w-4 h-4" />
          Develop
        </Link>
        <Link 
          to="/driver/idp"
          className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded text-xs uppercase tracking-wider hover:bg-purple-500/30 transition-colors"
        >
          Driver Intelligence <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
