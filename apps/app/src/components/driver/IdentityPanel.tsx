import { 
  Trophy,
  TrendingUp,
  TrendingDown,
  Target,
  Star,
  Award,
  Zap,
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { DriverIdentity } from '../../types/driver-memory';

interface IdentityPanelProps {
  identity: DriverIdentity;
}

/**
 * IdentityPanel - Driver Identity & Narrative
 * 
 * Purpose: Give meaning to the grind
 * 
 * Shows:
 * - Driver archetype ("What kind of driver you are becoming")
 * - Skill trajectory
 * - Current chapter
 * - Next milestone
 * 
 * Drivers chase IDENTITY, not numbers.
 */
export function IdentityPanel({ identity }: IdentityPanelProps) {
  const getArchetypeDisplay = (archetype: DriverIdentity['driverArchetype']) => {
    switch (archetype) {
      case 'calculated_racer': return {
        label: 'Calculated Racer',
        description: 'You think before you act. Patience is your weapon.',
        icon: Target,
        color: 'text-blue-400',
      };
      case 'aggressive_hunter': return {
        label: 'Aggressive Hunter',
        description: 'You make things happen. Opportunities don\'t wait.',
        icon: Zap,
        color: 'text-red-400',
      };
      case 'consistent_grinder': return {
        label: 'Consistent Grinder',
        description: 'You finish races. Reliability is your edge.',
        icon: Award,
        color: 'text-green-400',
      };
      case 'raw_talent': return {
        label: 'Raw Talent',
        description: 'You have pace. Now it\'s about control.',
        icon: Star,
        color: 'text-purple-400',
      };
      default: return {
        label: 'Developing',
        description: 'Your identity is forming. Keep racing.',
        icon: TrendingUp,
        color: 'text-white/60',
      };
    }
  };

  const getTrajectoryDisplay = (trajectory: DriverIdentity['skillTrajectory']) => {
    switch (trajectory) {
      case 'ascending': return {
        label: 'On the Rise',
        icon: TrendingUp,
        color: 'text-green-400',
      };
      case 'plateaued': return {
        label: 'Plateau',
        icon: TrendingDown,
        color: 'text-yellow-400',
      };
      case 'breaking_through': return {
        label: 'Breaking Through',
        icon: Zap,
        color: 'text-purple-400',
      };
      case 'declining': return {
        label: 'Needs Attention',
        icon: TrendingDown,
        color: 'text-red-400',
      };
      default: return {
        label: 'Developing',
        icon: TrendingUp,
        color: 'text-blue-400',
      };
    }
  };

  const archetype = getArchetypeDisplay(identity.driverArchetype);
  const trajectory = getTrajectoryDisplay(identity.skillTrajectory);
  const ArchetypeIcon = archetype.icon;
  const TrajectoryIcon = trajectory.icon;

  return (
    <div className="space-y-4">
      {/* Archetype Card */}
      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded p-4">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 bg-white/10 rounded-full flex items-center justify-center`}>
            <ArchetypeIcon className={`w-6 h-6 ${archetype.color}`} />
          </div>
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">You Are Becoming</div>
            <div className={`text-lg font-bold ${archetype.color}`}>{archetype.label}</div>
            <div className="text-sm text-white/60 mt-1">{archetype.description}</div>
            {identity.archetypeConfidence && (
              <div className="text-[10px] text-white/30 mt-2">
                Confidence: {Math.round(identity.archetypeConfidence * 100)}%
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Trajectory */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded p-3">
          <div className="flex items-center gap-2 mb-2">
            <TrajectoryIcon className={`w-4 h-4 ${trajectory.color}`} />
            <span className="text-[10px] uppercase tracking-wider text-white/40">Trajectory</span>
          </div>
          <div className={`text-sm font-semibold ${trajectory.color}`}>{trajectory.label}</div>
        </div>

        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded p-3">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-orange-400" />
            <span className="text-[10px] uppercase tracking-wider text-white/40">Focus</span>
          </div>
          <div className="text-sm font-semibold text-white/80">
            {identity.currentDevelopmentFocus || 'Not set'}
          </div>
          {identity.focusProgress > 0 && (
            <div className="mt-2 h-1 bg-white/10 rounded overflow-hidden">
              <div 
                className="h-full bg-orange-500"
                style={{ width: `${identity.focusProgress * 100}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Current Chapter */}
      {identity.currentChapter && (
        <div className="bg-white/[0.03] backdrop-blur-xl border border-purple-500/20 rounded p-4">
          <div className="text-[10px] uppercase tracking-wider text-purple-400 mb-2">Current Chapter</div>
          <div className="text-sm text-white/80 italic">"{identity.currentChapter}"</div>
        </div>
      )}

      {/* Next Milestone */}
      {identity.nextMilestone && (
        <div className="bg-white/[0.03] backdrop-blur-xl border border-green-500/20 rounded p-4">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-4 h-4 text-green-400" />
            <span className="text-[10px] uppercase tracking-wider text-green-400">Next Milestone</span>
          </div>
          <div className="text-sm text-white/80">{identity.nextMilestone}</div>
        </div>
      )}

      {/* Defining Moment */}
      {identity.definingMoment && (
        <div className="text-center py-2">
          <div className="text-[10px] uppercase tracking-wider text-white/30 mb-1">Defining Moment</div>
          <div className="text-xs text-white/50 italic">"{identity.definingMoment}"</div>
        </div>
      )}

      {/* Readiness Signals */}
      {(identity.readyForLongerRaces || identity.readyForHigherSplits || identity.readyForNewDiscipline) && (
        <div className="bg-green-500/10 border border-green-500/20 rounded p-3">
          <div className="text-[10px] uppercase tracking-wider text-green-400 mb-2">Ready For</div>
          <div className="flex flex-wrap gap-2">
            {identity.readyForLongerRaces && (
              <span className="px-2 py-1 bg-green-500/20 rounded text-[10px] uppercase text-green-400">
                Longer Races
              </span>
            )}
            {identity.readyForHigherSplits && (
              <span className="px-2 py-1 bg-green-500/20 rounded text-[10px] uppercase text-green-400">
                Higher Splits
              </span>
            )}
            {identity.readyForNewDiscipline && (
              <span className="px-2 py-1 bg-green-500/20 rounded text-[10px] uppercase text-green-400">
                New Discipline
              </span>
            )}
          </div>
        </div>
      )}

      {/* Deep Dive Link */}
      <div className="text-center">
        <Link 
          to="/driver/stats"
          className="inline-flex items-center gap-2 text-[10px] uppercase tracking-wider text-white/40 hover:text-white/60"
        >
          View Full Stats <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
