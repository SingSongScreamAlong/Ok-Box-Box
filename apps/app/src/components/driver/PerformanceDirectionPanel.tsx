/**
 * PerformanceDirectionPanel
 *
 * Turns raw performance stats into an actionable development focus.
 * All logic is rule-based and deterministic — no mock data.
 */

import { Target, AlertTriangle, TrendingDown, Zap, ArrowUpRight, ChevronRight } from 'lucide-react';
import type { PerformanceDirection, FocusFlag } from '../../lib/driverIntelligence';

const FOCUS_CONFIG: Record<FocusFlag, { icon: typeof Target; color: string; accent: string }> = {
  incident_management: { icon: AlertTriangle, color: 'text-red-400', accent: 'border-red-500/30 bg-red-500/5' },
  racecraft_traffic: { icon: Zap, color: 'text-yellow-400', accent: 'border-yellow-500/30 bg-yellow-500/5' },
  plateau_detection: { icon: TrendingDown, color: 'text-orange-400', accent: 'border-orange-500/30 bg-orange-500/5' },
  strong_momentum: { icon: ArrowUpRight, color: 'text-green-400', accent: 'border-green-500/30 bg-green-500/5' },
  needs_data: { icon: Target, color: 'text-white/40', accent: 'border-white/10 bg-white/[0.02]' },
};

interface Props {
  direction: PerformanceDirection;
}

export function PerformanceDirectionPanel({ direction }: Props) {
  const config = FOCUS_CONFIG[direction.primaryFocus];
  const Icon = config.icon;

  return (
    <div className={`border ${config.accent} transition-all`}>
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-white/50" />
          <h3 className="text-sm uppercase tracking-[0.15em] text-white/60" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            Current Development Focus
          </h3>
        </div>
      </div>
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 border border-white/10 flex items-center justify-center shrink-0 ${config.accent}`}>
            <Icon className={`w-6 h-6 ${config.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className={`text-lg font-semibold uppercase tracking-wider ${config.color}`} style={{ fontFamily: 'Orbitron, sans-serif' }}>
              {direction.label}
            </div>
            <div className="mt-3 space-y-1.5">
              {direction.reasons.map((reason, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-white/50">
                  <ChevronRight className="w-3 h-3 mt-0.5 shrink-0 text-white/30" />
                  <span>{reason}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-white/[0.06]">
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Recommended Action</p>
              <p className="text-xs text-white/60">{direction.action}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
