import { Link } from 'react-router-dom';
import { 
  TrendingUp,
  Trophy,
  ChevronRight,
  Calendar,
  Award,
  BarChart3,
  Target,
  Flag
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
 * Shown when it's been 24+ hours since last session.
 * Provides season summary, rating trajectory, series recommendations.
 */
export function SeasonView({ sessionMemory }: SeasonViewProps) {
  const daysSinceLastSession = sessionMemory.lastSessionEnd 
    ? Math.floor((Date.now() - sessionMemory.lastSessionEnd) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <span className="text-xs uppercase tracking-wider text-yellow-400">Season Overview</span>
        </div>
        <h1 
          className="text-2xl font-bold uppercase tracking-wider"
          style={{ fontFamily: 'Orbitron, sans-serif' }}
        >
          Welcome Back
        </h1>
        <p className="text-sm text-white/50 mt-2">
          {daysSinceLastSession !== null 
            ? `It's been ${daysSinceLastSession} day${daysSinceLastSession !== 1 ? 's' : ''} since your last session`
            : 'Ready to get back on track?'
          }
        </p>
      </div>

      {/* Season Stats */}
      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.12] rounded p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-yellow-500/20 rounded flex items-center justify-center">
            <Trophy className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">2026 Season 1</h2>
            <div className="text-xs text-white/40 uppercase">Week 8 of 12</div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 py-4 border-t border-white/10">
          <div className="text-center">
            <div className="text-xs text-white/40 uppercase mb-1">Races</div>
            <div className="text-2xl font-bold font-mono">{sessionMemory.sessionCount || 0}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-white/40 uppercase mb-1">Wins</div>
            <div className="text-2xl font-bold font-mono text-yellow-400">3</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-white/40 uppercase mb-1">Podiums</div>
            <div className="text-2xl font-bold font-mono text-orange-400">8</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-white/40 uppercase mb-1">Top 5</div>
            <div className="text-2xl font-bold font-mono">14</div>
          </div>
        </div>
      </div>

      {/* Rating Trajectory */}
      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.12] rounded p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-blue-500/20 rounded flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <h2 className="text-sm font-semibold uppercase tracking-wider">Rating Trajectory</h2>
        </div>
        
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/60">iRating</span>
              <div className="flex items-center gap-1 text-green-400">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-semibold">+247</span>
              </div>
            </div>
            <div className="text-3xl font-bold font-mono text-blue-400">2,847</div>
            <div className="text-xs text-white/40 mt-1">Started season at 2,600</div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/60">Safety Rating</span>
              <div className="flex items-center gap-1 text-green-400">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-semibold">+0.42</span>
              </div>
            </div>
            <div className="text-3xl font-bold font-mono text-green-400">A 3.21</div>
            <div className="text-xs text-white/40 mt-1">Started season at B 2.79</div>
          </div>
        </div>
      </div>

      {/* Series Performance */}
      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.12] rounded p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-orange-500/20 rounded flex items-center justify-center">
            <Flag className="w-4 h-4 text-orange-400" />
          </div>
          <h2 className="text-sm font-semibold uppercase tracking-wider">Your Series</h2>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/[0.08] rounded">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500/20 rounded flex items-center justify-center text-xs font-bold">GT3</div>
              <div>
                <div className="text-sm font-semibold">IMSA Michelin Pilot Challenge</div>
                <div className="text-xs text-white/40">Class B • 12 races</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-yellow-400">P3</div>
              <div className="text-xs text-white/40">Championship</div>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/[0.08] rounded">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-500/20 rounded flex items-center justify-center text-xs font-bold">F3</div>
              <div>
                <div className="text-sm font-semibold">FIA F3 Championship</div>
                <div className="text-xs text-white/40">Class A • 8 races</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold">P7</div>
              <div className="text-xs text-white/40">Championship</div>
            </div>
          </div>
        </div>
      </div>

      {/* Engineer Message */}
      <div className="bg-white/[0.03] backdrop-blur-xl border border-orange-500/20 rounded p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-orange-500/20 rounded flex items-center justify-center">
            <Award className="w-4 h-4 text-orange-400" />
          </div>
          <h2 className="text-sm font-semibold uppercase tracking-wider">Engineer Says</h2>
        </div>
        <p className="text-sm text-white/70 italic">
          {daysSinceLastSession && daysSinceLastSession > 3
            ? `"It's been ${daysSinceLastSession} days. Your competitors are putting in laps. Let's get back on track — I've got some new data to share with you."`
            : `"Good to see you. The season is progressing well. Your consistency has improved significantly. Ready when you are."`
          }
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-4">
        <Link 
          to="/driver/sessions"
          className="flex items-center justify-center gap-2 p-4 bg-white/[0.03] border border-white/[0.12] rounded text-xs uppercase tracking-wider hover:bg-white/[0.06] transition-colors"
        >
          <Calendar className="w-4 h-4" />
          Session History
        </Link>
        <Link 
          to="/driver/stats"
          className="flex items-center justify-center gap-2 p-4 bg-white/[0.03] border border-white/[0.12] rounded text-xs uppercase tracking-wider hover:bg-white/[0.06] transition-colors"
        >
          <BarChart3 className="w-4 h-4" />
          Full Stats
        </Link>
        <Link 
          to="/driver/crew/engineer"
          className="flex items-center justify-center gap-2 p-4 bg-orange-500/20 border border-orange-500/30 rounded text-xs uppercase tracking-wider hover:bg-orange-500/30 transition-colors"
        >
          <Target className="w-4 h-4" />
          Talk to Engineer
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
