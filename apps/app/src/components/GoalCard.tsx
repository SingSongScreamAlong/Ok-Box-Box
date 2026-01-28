/**
 * GoalCard Component
 * 
 * Displays a single goal with progress, actions, and status.
 */

import { useState } from 'react';
import { 
  Target, TrendingUp, Shield, Clock, Trophy, Medal, 
  CheckCircle, Pause, Play, Trash2, MoreVertical, Sparkles
} from 'lucide-react';
import { Goal, deleteGoal, markGoalAchieved, pauseGoal, resumeGoal } from '../lib/goalsService';

interface GoalCardProps {
  goal: Goal;
  onUpdate?: () => void;
  compact?: boolean;
}

const categoryIcons: Record<string, React.ReactNode> = {
  irating: <TrendingUp className="w-4 h-4" />,
  safety_rating: <Shield className="w-4 h-4" />,
  lap_time: <Clock className="w-4 h-4" />,
  consistency: <Target className="w-4 h-4" />,
  wins: <Trophy className="w-4 h-4" />,
  podiums: <Medal className="w-4 h-4" />,
  clean_races: <CheckCircle className="w-4 h-4" />,
  license: <Shield className="w-4 h-4" />,
  custom: <Target className="w-4 h-4" />,
};

const categoryColors: Record<string, string> = {
  irating: 'text-blue-400',
  safety_rating: 'text-green-400',
  lap_time: 'text-purple-400',
  consistency: 'text-yellow-400',
  wins: 'text-amber-400',
  podiums: 'text-orange-400',
  clean_races: 'text-emerald-400',
  license: 'text-cyan-400',
  custom: 'text-gray-400',
};

const statusColors: Record<string, string> = {
  suggested: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  active: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  achieved: 'bg-green-500/20 text-green-300 border-green-500/30',
  failed: 'bg-red-500/20 text-red-300 border-red-500/30',
  dismissed: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  paused: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
};

export function GoalCard({ goal, onUpdate, compact = false }: GoalCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAction = async (action: () => Promise<boolean>) => {
    setLoading(true);
    setShowMenu(false);
    const success = await action();
    setLoading(false);
    if (success && onUpdate) {
      onUpdate();
    }
  };

  const formatValue = (value: number, unit: string | null) => {
    if (unit === 'SR') return value.toFixed(2);
    if (unit === 'iR') return value.toLocaleString();
    if (unit === 'ms') {
      const minutes = Math.floor(value / 60000);
      const seconds = ((value % 60000) / 1000).toFixed(3);
      return `${minutes}:${seconds.padStart(6, '0')}`;
    }
    return value.toString();
  };

  const progressColor = goal.progressPct >= 75 ? 'bg-green-500' : 
                        goal.progressPct >= 50 ? 'bg-blue-500' : 
                        goal.progressPct >= 25 ? 'bg-yellow-500' : 'bg-gray-500';

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-lg border border-white/[0.06]">
        <div className={`${categoryColors[goal.category]} opacity-80`}>
          {categoryIcons[goal.category]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-white/90 truncate">{goal.title}</div>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div 
                className={`h-full ${progressColor} transition-all duration-500`}
                style={{ width: `${goal.progressPct}%` }}
              />
            </div>
            <span className="text-xs text-white/50">{Math.round(goal.progressPct)}%</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative p-4 bg-white/[0.02] rounded-xl border border-white/[0.06] ${loading ? 'opacity-50' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-white/[0.05] ${categoryColors[goal.category]}`}>
            {categoryIcons[goal.category]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-white/90">{goal.title}</h3>
              {goal.source === 'ai_recommended' && (
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColors[goal.status]}`}>
                {goal.status}
              </span>
              {goal.discipline && (
                <span className="text-xs text-white/40">{goal.discipline}</span>
              )}
            </div>
          </div>
        </div>

        {/* Actions Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded-lg hover:bg-white/[0.05] text-white/40 hover:text-white/60 transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-8 z-10 w-40 py-1 bg-[#1a1a1a] border border-white/[0.1] rounded-lg shadow-xl">
              {goal.status === 'active' && (
                <>
                  <button
                    onClick={() => handleAction(() => markGoalAchieved(goal.id))}
                    className="w-full px-3 py-2 text-left text-xs text-white/70 hover:bg-white/[0.05] flex items-center gap-2"
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                    Mark Achieved
                  </button>
                  <button
                    onClick={() => handleAction(() => pauseGoal(goal.id))}
                    className="w-full px-3 py-2 text-left text-xs text-white/70 hover:bg-white/[0.05] flex items-center gap-2"
                  >
                    <Pause className="w-3.5 h-3.5 text-yellow-400" />
                    Pause Goal
                  </button>
                </>
              )}
              {goal.status === 'paused' && (
                <button
                  onClick={() => handleAction(() => resumeGoal(goal.id))}
                  className="w-full px-3 py-2 text-left text-xs text-white/70 hover:bg-white/[0.05] flex items-center gap-2"
                >
                  <Play className="w-3.5 h-3.5 text-blue-400" />
                  Resume Goal
                </button>
              )}
              <button
                onClick={() => handleAction(() => deleteGoal(goal.id))}
                className="w-full px-3 py-2 text-left text-xs text-red-400 hover:bg-white/[0.05] flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Goal
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {goal.description && (
        <p className="mt-3 text-xs text-white/50 line-clamp-2">{goal.description}</p>
      )}

      {/* AI Rationale */}
      {goal.aiRationale && goal.source === 'ai_recommended' && (
        <div className="mt-3 p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
          <p className="text-xs text-purple-300/80 italic">{goal.aiRationale}</p>
        </div>
      )}

      {/* Progress */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-white/50">Progress</span>
          <span className="text-white/70">
            {formatValue(goal.currentValue, goal.unit)} / {formatValue(goal.targetValue, goal.unit)}
            {goal.unit && <span className="text-white/40 ml-1">{goal.unit}</span>}
          </span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div 
            className={`h-full ${progressColor} transition-all duration-500`}
            style={{ width: `${Math.min(100, goal.progressPct)}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-xs text-white/40">
            {Math.round(goal.progressPct)}% complete
          </span>
          {goal.deadline && (
            <span className="text-xs text-white/40">
              Due: {new Date(goal.deadline).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* Click outside to close menu */}
      {showMenu && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
}

export default GoalCard;
