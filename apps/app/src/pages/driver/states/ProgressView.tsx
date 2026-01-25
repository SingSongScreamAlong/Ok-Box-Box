import { Link } from 'react-router-dom';
import { 
  TrendingUp,
  TrendingDown,
  Target,
  ChevronRight,
  Calendar,
  Award,
  BarChart3,
  Clock,
  Zap
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
 * Shown when no session is imminent (2+ hours since last session).
 * Provides trend analysis, skill gaps, suggested practice.
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
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-5 h-5 text-blue-400" />
          <span className="text-xs uppercase tracking-wider text-blue-400">Between Sessions</span>
        </div>
        <h1 
          className="text-2xl font-bold uppercase tracking-wider"
          style={{ fontFamily: 'Orbitron, sans-serif' }}
        >
          Your Progress
        </h1>
        <p className="text-sm text-white/50 mt-2">
          Last session: {formatTimeSince(timeSinceSession)}
          {sessionMemory.lastTrackName && ` at ${sessionMemory.lastTrackName}`}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.12] rounded p-4 text-center">
          <div className="text-xs text-white/40 uppercase mb-1">Sessions</div>
          <div className="text-2xl font-bold font-mono">{sessionMemory.sessionCount || 0}</div>
        </div>
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.12] rounded p-4 text-center">
          <div className="text-xs text-white/40 uppercase mb-1">iRating</div>
          <div className="text-2xl font-bold font-mono text-blue-400">2,847</div>
        </div>
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.12] rounded p-4 text-center">
          <div className="text-xs text-white/40 uppercase mb-1">Safety</div>
          <div className="text-2xl font-bold font-mono text-green-400">A 3.21</div>
        </div>
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.12] rounded p-4 text-center">
          <div className="text-xs text-white/40 uppercase mb-1">Win Rate</div>
          <div className="text-2xl font-bold font-mono">12%</div>
        </div>
      </div>

      {/* Trend Analysis */}
      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.12] rounded p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-green-500/20 rounded flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-green-400" />
          </div>
          <h2 className="text-sm font-semibold uppercase tracking-wider">This Week</h2>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-xs text-green-400 uppercase">Improving</span>
            </div>
            <div className="text-sm font-semibold">Lap Consistency</div>
            <div className="text-xs text-white/50">+8% vs last week</div>
          </div>
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-yellow-400 uppercase">Needs Work</span>
            </div>
            <div className="text-sm font-semibold">Qualifying Pace</div>
            <div className="text-xs text-white/50">-0.2s vs field avg</div>
          </div>
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded">
            <div className="flex items-center gap-2 mb-1">
              <Award className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-blue-400 uppercase">Strong</span>
            </div>
            <div className="text-sm font-semibold">Race Craft</div>
            <div className="text-xs text-white/50">+15 positions gained</div>
          </div>
        </div>
      </div>

      {/* Skill Gaps */}
      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.12] rounded p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-purple-500/20 rounded flex items-center justify-center">
            <Target className="w-4 h-4 text-purple-400" />
          </div>
          <h2 className="text-sm font-semibold uppercase tracking-wider">Focus Areas</h2>
        </div>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm">Trail Braking</span>
              <span className="text-xs text-white/40">68%</span>
            </div>
            <div className="h-2 bg-white/10 rounded overflow-hidden">
              <div className="h-full bg-yellow-500" style={{ width: '68%' }} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm">Throttle Control</span>
              <span className="text-xs text-white/40">82%</span>
            </div>
            <div className="h-2 bg-white/10 rounded overflow-hidden">
              <div className="h-full bg-green-500" style={{ width: '82%' }} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm">Tire Management</span>
              <span className="text-xs text-white/40">71%</span>
            </div>
            <div className="h-2 bg-white/10 rounded overflow-hidden">
              <div className="h-full bg-yellow-500" style={{ width: '71%' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Suggested Practice */}
      <div className="bg-white/[0.03] backdrop-blur-xl border border-orange-500/20 rounded p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-orange-500/20 rounded flex items-center justify-center">
            <Calendar className="w-4 h-4 text-orange-400" />
          </div>
          <h2 className="text-sm font-semibold uppercase tracking-wider">Engineer Suggests</h2>
        </div>
        <p className="text-sm text-white/70 italic mb-4">
          "You haven't practiced {sessionMemory.lastTrackName || 'recently'}. Your competitors are putting in laps. 
          I'd recommend a 20-minute practice session focusing on trail braking into Turn 1."
        </p>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-white/40" />
          <span className="text-xs text-white/40">Suggested: 20 min practice session</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-4">
        <Link 
          to="/driver/sessions"
          className="flex items-center justify-center gap-2 p-4 bg-white/[0.03] border border-white/[0.12] rounded text-xs uppercase tracking-wider hover:bg-white/[0.06] transition-colors"
        >
          <BarChart3 className="w-4 h-4" />
          Session History
        </Link>
        <Link 
          to="/driver/stats"
          className="flex items-center justify-center gap-2 p-4 bg-white/[0.03] border border-white/[0.12] rounded text-xs uppercase tracking-wider hover:bg-white/[0.06] transition-colors"
        >
          <TrendingUp className="w-4 h-4" />
          Full Stats
        </Link>
        <Link 
          to="/driver/crew/analyst"
          className="flex items-center justify-center gap-2 p-4 bg-purple-500/20 border border-purple-500/30 rounded text-xs uppercase tracking-wider hover:bg-purple-500/30 transition-colors"
        >
          <Target className="w-4 h-4" />
          Talk to Analyst
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
