import { 
  Brain,
  AlertTriangle,
  Battery,
  TrendingUp,
  Zap,
  Heart
} from 'lucide-react';
import type { MentalState, MentalStateAlert } from '../../services/EngineerCore';

interface MentalStatePanelProps {
  mentalState: MentalState;
  alert: MentalStateAlert | null;
  summary: string;
}

/**
 * MentalStatePanel - Mental State Monitoring Display
 * 
 * Purpose: Show the driver's mental state in real-time
 * 
 * This is rare. This is powerful. No other platform does this well.
 * 
 * Shows:
 * - Tilt level
 * - Fatigue level
 * - Confidence level
 * - Overdriving detection
 * - Active alerts with interventions
 */
export function MentalStatePanel({ mentalState, alert, summary }: MentalStatePanelProps) {
  const getBarColor = (value: number, inverted: boolean = false) => {
    const effectiveValue = inverted ? 1 - value : value;
    if (effectiveValue > 0.7) return 'bg-green-500';
    if (effectiveValue > 0.4) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getTiltColor = (value: number) => {
    if (value > 0.7) return 'bg-red-500';
    if (value > 0.4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-3">
      {/* Active Alert */}
      {alert && (
        <div className={`p-3 rounded border-l-4 ${
          alert.severity === 'critical' 
            ? 'bg-red-500/20 border-red-500' 
            : 'bg-yellow-500/20 border-yellow-500'
        }`}>
          <div className="flex items-start gap-3">
            <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${
              alert.severity === 'critical' ? 'text-red-400' : 'text-yellow-400'
            }`} />
            <div>
              <div className={`text-sm font-semibold ${
                alert.severity === 'critical' ? 'text-red-400' : 'text-yellow-400'
              }`}>
                {alert.message}
              </div>
              <div className="text-xs text-white/60 mt-1 italic">
                "{alert.intervention}"
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mental State Summary */}
      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded p-3">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-4 h-4 text-purple-400" />
          <span className="text-[10px] uppercase tracking-wider text-purple-400">Mental State</span>
        </div>
        <div className="text-sm text-white/70">{summary}</div>
      </div>

      {/* State Meters */}
      <div className="grid grid-cols-2 gap-2">
        {/* Confidence */}
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded p-2">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-3 h-3 text-green-400" />
            <span className="text-[10px] uppercase tracking-wider text-white/40">Confidence</span>
          </div>
          <div className="h-2 bg-white/10 rounded overflow-hidden">
            <div 
              className={`h-full transition-all ${getBarColor(mentalState.confidenceLevel)}`}
              style={{ width: `${mentalState.confidenceLevel * 100}%` }}
            />
          </div>
          <div className="text-[10px] text-white/30 mt-1 text-right">
            {Math.round(mentalState.confidenceLevel * 100)}%
          </div>
        </div>

        {/* Focus */}
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded p-2">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-3 h-3 text-blue-400" />
            <span className="text-[10px] uppercase tracking-wider text-white/40">Focus</span>
          </div>
          <div className="h-2 bg-white/10 rounded overflow-hidden">
            <div 
              className={`h-full transition-all ${getBarColor(mentalState.focusLevel)}`}
              style={{ width: `${mentalState.focusLevel * 100}%` }}
            />
          </div>
          <div className="text-[10px] text-white/30 mt-1 text-right">
            {Math.round(mentalState.focusLevel * 100)}%
          </div>
        </div>

        {/* Tilt */}
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded p-2">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-3 h-3 text-red-400" />
            <span className="text-[10px] uppercase tracking-wider text-white/40">Stress</span>
          </div>
          <div className="h-2 bg-white/10 rounded overflow-hidden">
            <div 
              className={`h-full transition-all ${getTiltColor(mentalState.tiltLevel)}`}
              style={{ width: `${mentalState.tiltLevel * 100}%` }}
            />
          </div>
          <div className="text-[10px] text-white/30 mt-1 text-right">
            {Math.round(mentalState.tiltLevel * 100)}%
          </div>
        </div>

        {/* Fatigue */}
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded p-2">
          <div className="flex items-center gap-2 mb-2">
            <Battery className="w-3 h-3 text-yellow-400" />
            <span className="text-[10px] uppercase tracking-wider text-white/40">Energy</span>
          </div>
          <div className="h-2 bg-white/10 rounded overflow-hidden">
            <div 
              className={`h-full transition-all ${getBarColor(1 - mentalState.fatigueLevel)}`}
              style={{ width: `${(1 - mentalState.fatigueLevel) * 100}%` }}
            />
          </div>
          <div className="text-[10px] text-white/30 mt-1 text-right">
            {Math.round((1 - mentalState.fatigueLevel) * 100)}%
          </div>
        </div>
      </div>

      {/* Overdriving Indicator */}
      {mentalState.overdriving && (
        <div className="bg-yellow-500/20 border border-yellow-500/30 rounded p-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-400" />
          <span className="text-xs text-yellow-400">Overdriving detected</span>
        </div>
      )}

      {/* Session Stats */}
      <div className="flex items-center justify-between text-[10px] text-white/30">
        <span>Incidents: {mentalState.incidentsThisSession}</span>
        {mentalState.lapsSinceIncident > 0 && (
          <span>Clean laps: {mentalState.lapsSinceIncident}</span>
        )}
      </div>
    </div>
  );
}
