import { useMemo } from 'react';
import { Activity, Moon, AlertTriangle, TrendingDown, CheckCircle } from 'lucide-react';
import type { DriverSessionSummary } from '../lib/driverService';

interface FatigueModel {
  // Session load
  sessions7d: number;
  sessions14d: number;
  sessions30d: number;
  avgSessionsPerWeek: number;

  // Performance correlation
  recentIncidentRate: number;   // avg incidents in last 7 days
  baselineIncidentRate: number; // avg incidents in prior 8-30 days
  incidentTrend: 'rising' | 'falling' | 'stable';
  recentIRDelta: number;        // avg iR change in last 7 days
  baselineIRDelta: number;      // avg iR change in prior 8-30 days

  // Load level
  loadLevel: 'low' | 'moderate' | 'elevated' | 'high';
  recommendation: string;
  daysSinceLastSession: number | null;
}

function computeFatigueModel(sessions: DriverSessionSummary[]): FatigueModel | null {
  if (sessions.length < 3) return null;

  const now = Date.now();
  const DAY = 86_400_000;

  const withDates = sessions
    .filter(s => s.startedAt)
    .map(s => ({ ...s, ts: new Date(s.startedAt).getTime() }))
    .filter(s => !isNaN(s.ts))
    .sort((a, b) => b.ts - a.ts);

  if (withDates.length < 3) return null;

  const daysSinceLastSession = withDates.length > 0 ? (now - withDates[0].ts) / DAY : null;

  // Rolling counts
  const sessions7d = withDates.filter(s => now - s.ts <= 7 * DAY).length;
  const sessions14d = withDates.filter(s => now - s.ts <= 14 * DAY).length;
  const sessions30d = withDates.filter(s => now - s.ts <= 30 * DAY).length;

  // Average sessions per week over last 30 days
  const avgSessionsPerWeek = sessions30d > 0 ? sessions30d / (30 / 7) : 0;

  // Performance in recent (0-7d) vs baseline (8-30d)
  const recent = withDates.filter(s => now - s.ts <= 7 * DAY);
  const baseline = withDates.filter(s => now - s.ts > 7 * DAY && now - s.ts <= 30 * DAY);

  const avgIncidents = (arr: typeof withDates) => {
    const withInc = arr.filter(s => s.incidents != null);
    if (withInc.length === 0) return 0;
    return withInc.reduce((sum, s) => sum + (s.incidents ?? 0), 0) / withInc.length;
  };

  const avgIRDelta = (arr: typeof withDates) => {
    const withIR = arr.filter(s => s.irDelta != null);
    if (withIR.length === 0) return 0;
    return withIR.reduce((sum, s) => sum + (s.irDelta ?? 0), 0) / withIR.length;
  };

  const recentIncidentRate = avgIncidents(recent);
  const baselineIncidentRate = avgIncidents(baseline);
  const recentIRDelta = avgIRDelta(recent);
  const baselineIRDelta = avgIRDelta(baseline);

  // Incident trend
  const incidentDiff = recentIncidentRate - baselineIncidentRate;
  const incidentTrend: 'rising' | 'falling' | 'stable' =
    incidentDiff > 0.5 ? 'rising' : incidentDiff < -0.5 ? 'falling' : 'stable';

  // Load level determination
  let loadLevel: 'low' | 'moderate' | 'elevated' | 'high';
  let recommendation: string;

  if (sessions7d >= 10) {
    loadLevel = 'high';
    recommendation = 'Heavy session load this week. Consider a rest day to maintain focus and reduce incident risk.';
  } else if (sessions7d >= 7 || (sessions7d >= 5 && incidentTrend === 'rising')) {
    loadLevel = 'elevated';
    recommendation = 'Elevated session density. Watch for performance degradation — incidents are trending up.';
  } else if (sessions7d >= 4) {
    loadLevel = 'moderate';
    recommendation = 'Healthy session pace. Maintain consistency and keep sessions intentional.';
  } else {
    loadLevel = 'low';
    recommendation = 'Light session load. Good opportunity for focused practice or competitive racing.';
  }

  // Override: if incidents are rising significantly even at moderate load
  if (loadLevel === 'moderate' && incidentTrend === 'rising' && recentIncidentRate > baselineIncidentRate + 1) {
    loadLevel = 'elevated';
    recommendation = 'Incident rate rising despite moderate load. Consider slowing down or reviewing fundamentals.';
  }

  // Override: if no sessions in 5+ days, suggest getting back
  if (daysSinceLastSession != null && daysSinceLastSession > 5) {
    loadLevel = 'low';
    recommendation = `${Math.floor(daysSinceLastSession)} days since last session. A practice session can help rebuild rhythm before racing.`;
  }

  return {
    sessions7d,
    sessions14d,
    sessions30d,
    avgSessionsPerWeek,
    recentIncidentRate,
    baselineIncidentRate,
    incidentTrend,
    recentIRDelta,
    baselineIRDelta,
    loadLevel,
    recommendation,
    daysSinceLastSession,
  };
}

const LOAD_CONFIG = {
  low: { color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', icon: CheckCircle, label: 'LOW' },
  moderate: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: Activity, label: 'MODERATE' },
  elevated: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: AlertTriangle, label: 'ELEVATED' },
  high: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: Moon, label: 'HIGH' },
};

const ORBITRON: React.CSSProperties = { fontFamily: "'Orbitron', sans-serif" };

export function FatigueAwarenessCard({ sessions }: { sessions: DriverSessionSummary[] }) {
  const model = useMemo(() => computeFatigueModel(sessions), [sessions]);

  if (!model) return null;

  const cfg = LOAD_CONFIG[model.loadLevel];
  const Icon = cfg.icon;

  // 7-day load bar (max = 14 sessions for full bar)
  const loadBarPct = Math.min(100, (model.sessions7d / 14) * 100);

  return (
    <div className={`border ${cfg.border} bg-[#0e0e0e]/80 backdrop-blur-sm`}>
      <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-lg ${cfg.bg} flex items-center justify-center`}>
            <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
          </div>
          <div>
            <h2 className="text-sm uppercase tracking-[0.15em] text-white/60" style={ORBITRON}>Session Load</h2>
          </div>
        </div>
        <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-1 rounded ${cfg.bg} ${cfg.color}`}>
          {cfg.label}
        </span>
      </div>

      <div className="p-5 space-y-4">
        {/* Load bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] uppercase tracking-wider text-white/30">7-day load</span>
            <span className="text-[10px] font-mono text-white/50">{model.sessions7d} sessions</span>
          </div>
          <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                model.loadLevel === 'high' ? 'bg-red-500' :
                model.loadLevel === 'elevated' ? 'bg-amber-500' :
                model.loadLevel === 'moderate' ? 'bg-blue-500' : 'bg-green-500'
              }`}
              style={{ width: `${loadBarPct}%` }}
            />
          </div>
        </div>

        {/* Rolling stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-lg font-mono font-bold text-white/70">{model.sessions7d}</div>
            <div className="text-[8px] text-white/25 uppercase">7 days</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-mono font-bold text-white/70">{model.sessions14d}</div>
            <div className="text-[8px] text-white/25 uppercase">14 days</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-mono font-bold text-white/70">{model.sessions30d}</div>
            <div className="text-[8px] text-white/25 uppercase">30 days</div>
          </div>
        </div>

        {/* Performance correlation */}
        {model.sessions7d >= 2 && model.baselineIncidentRate > 0 && (
          <div className="pt-3 border-t border-white/[0.04] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[9px] uppercase tracking-wider text-white/30">Incident rate vs baseline</span>
              <span className={`text-[10px] font-mono ${
                model.incidentTrend === 'rising' ? 'text-red-400/70' :
                model.incidentTrend === 'falling' ? 'text-green-400/70' : 'text-white/40'
              }`}>
                {model.recentIncidentRate.toFixed(1)}x vs {model.baselineIncidentRate.toFixed(1)}x
              </span>
            </div>
            {model.incidentTrend === 'rising' && (
              <div className="flex items-center gap-1.5 text-[10px] text-amber-400/60">
                <TrendingDown className="w-3 h-3" />
                <span>Incidents rising with session density — fatigue signal</span>
              </div>
            )}
          </div>
        )}

        {/* Recommendation */}
        <div className="pt-3 border-t border-white/[0.04]">
          <p className="text-[11px] text-white/45 leading-relaxed">{model.recommendation}</p>
        </div>

        {/* Avg sessions per week */}
        <div className="flex items-center justify-between text-[9px] text-white/20">
          <span>Avg pace: {model.avgSessionsPerWeek.toFixed(1)} sessions/week</span>
          {model.daysSinceLastSession != null && (
            <span>Last session: {model.daysSinceLastSession < 1 ? 'today' : `${Math.floor(model.daysSinceLastSession)}d ago`}</span>
          )}
        </div>
      </div>
    </div>
  );
}
