import { 
  Target,
  AlertCircle,
  Flag,
  CheckCircle
} from 'lucide-react';
import type { SessionBriefing } from '../../services/EngineerCore';

interface BriefingPanelProps {
  briefing: SessionBriefing;
  trackName: string | null;
  sessionType: string | null;
}

/**
 * BriefingPanel - Pre-Session Engineer Briefing
 * 
 * Purpose: Focus the driver
 * 
 * Shows:
 * - One primary focus
 * - One secondary watch item
 * - Confidence framing
 * - Session goal
 * 
 * Does NOT show:
 * - Tables
 * - Long stats
 * - Full telemetry
 * 
 * Should feel like: "Helmet on. Here's what matters."
 */
export function BriefingPanel({ briefing, trackName, sessionType }: BriefingPanelProps) {
  const getGoalLabel = (goal: SessionBriefing['sessionGoal']) => {
    switch (goal) {
      case 'pace': return 'Find Pace';
      case 'consistency': return 'Build Consistency';
      case 'survival': return 'Survive & Learn';
      case 'data_collection': return 'Collect Data';
    }
  };

  const getGoalColor = (goal: SessionBriefing['sessionGoal']) => {
    switch (goal) {
      case 'pace': return 'text-purple-400 bg-purple-500/20 border-purple-500/30';
      case 'consistency': return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'survival': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'data_collection': return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-4">
      {/* Header */}
      <div className="text-center">
        <div className="text-[10px] uppercase tracking-wider text-orange-400 mb-1">Engineer Briefing</div>
        <h2 className="text-lg font-bold uppercase tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>
          {trackName || 'Session'}
        </h2>
        {sessionType && (
          <div className="text-xs text-white/40 uppercase mt-1">{sessionType}</div>
        )}
      </div>

      {/* Session Goal */}
      <div className={`text-center py-2 px-4 rounded border ${getGoalColor(briefing.sessionGoal)}`}>
        <div className="text-[10px] uppercase tracking-wider opacity-60 mb-1">Session Goal</div>
        <div className="text-sm font-semibold uppercase tracking-wider">
          {getGoalLabel(briefing.sessionGoal)}
        </div>
      </div>

      {/* Primary Focus */}
      <div className="bg-white/[0.03] backdrop-blur-xl border border-orange-500/30 rounded p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-orange-500/20 rounded flex items-center justify-center flex-shrink-0">
            <Target className="w-4 h-4 text-orange-400" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-orange-400 mb-1">Primary Focus</div>
            <div className="text-sm text-white/90">{briefing.primaryFocus}</div>
          </div>
        </div>
      </div>

      {/* Secondary Watch */}
      {briefing.secondaryWatch && (
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-yellow-500/20 rounded flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-4 h-4 text-yellow-400" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-yellow-400 mb-1">Watch For</div>
              <div className="text-sm text-white/70">{briefing.secondaryWatch}</div>
            </div>
          </div>
        </div>
      )}

      {/* Track Reminder */}
      {briefing.trackReminder && (
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-500/20 rounded flex items-center justify-center flex-shrink-0">
              <Flag className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-blue-400 mb-1">Track Note</div>
              <div className="text-sm text-white/70">{briefing.trackReminder}</div>
            </div>
          </div>
        </div>
      )}

      {/* Confidence Statement */}
      <div className="text-center py-4">
        <div className="text-sm text-white/60 italic">"{briefing.confidenceStatement}"</div>
        <div className="text-[10px] text-orange-400/60 uppercase tracking-wider mt-2">— Your Engineer</div>
      </div>

      {/* Ready Indicator */}
      <div className="flex items-center justify-center gap-2 text-green-400">
        <CheckCircle className="w-4 h-4" />
        <span className="text-xs uppercase tracking-wider">Ready when you are</span>
      </div>
    </div>
  );
}
