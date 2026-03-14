/**
 * TeamRiskDashboard — Team-level driver risk profiling
 *
 * Aggregates CPI, incident rates, consistency, and behavioral data
 * across all team drivers to surface risk patterns and coverage gaps.
 *
 * Phase 4d: Frontend analysis from team session data
 * TODO Phase 4d+: Server-side CPI aggregation, role-restricted access
 */

import { useState, useMemo } from 'react';
import {
  Shield, AlertTriangle, TrendingUp, TrendingDown,
  ChevronDown, ChevronUp, Users, Target, Zap
} from 'lucide-react';

const ORBITRON = { fontFamily: 'Orbitron, sans-serif' };

interface TeamDriverSession {
  driverId: string;
  driverName: string;
  trackName: string;
  finishPos: number | null;
  startPos: number | null;
  incidents: number | null;
  iRatingChange: number | null;
  eventType: string | null;
  startedAt: string;
  lapsComplete: number | null;
}

interface DriverRiskProfile {
  id: string;
  name: string;
  sessions: number;
  races: number;
  avgIncidents: number;
  incidentTrend: 'improving' | 'stable' | 'worsening';
  avgFinish: number | null;
  avgPosDelta: number;
  consistencyScore: number;
  iRatingDelta: number;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  riskScore: number;
  strengths: string[];
  concerns: string[];
}

interface TeamRiskDashboardProps {
  driverSessions: TeamDriverSession[];
}

function computeDriverRisk(sessions: TeamDriverSession[]): DriverRiskProfile[] {
  const driverMap = new Map<string, TeamDriverSession[]>();
  for (const s of sessions) {
    const existing = driverMap.get(s.driverId) || [];
    existing.push(s);
    driverMap.set(s.driverId, existing);
  }

  return Array.from(driverMap.entries()).map(([id, driverSessions]) => {
    const sorted = [...driverSessions].sort((a, b) =>
      new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
    const races = sorted.filter(s => s.eventType === 'race');
    const name = sorted[0]?.driverName || id;

    // Incident analysis
    const incidentSessions = sorted.filter(s => s.incidents != null);
    const avgIncidents = incidentSessions.length > 0
      ? incidentSessions.reduce((sum, s) => sum + (s.incidents || 0), 0) / incidentSessions.length
      : 0;

    // Incident trend (recent 5 vs previous 5)
    const recent5 = incidentSessions.slice(0, 5).map(s => s.incidents || 0);
    const prev5 = incidentSessions.slice(5, 10).map(s => s.incidents || 0);
    const recentAvg = recent5.length > 0 ? recent5.reduce((a, b) => a + b, 0) / recent5.length : 0;
    const prevAvg = prev5.length > 0 ? prev5.reduce((a, b) => a + b, 0) / prev5.length : 0;
    const incidentTrend: 'improving' | 'stable' | 'worsening' =
      prev5.length < 3 ? 'stable' :
      recentAvg < prevAvg - 0.5 ? 'improving' :
      recentAvg > prevAvg + 0.5 ? 'worsening' : 'stable';

    // Finish position analysis
    const finishes = races.filter(s => s.finishPos != null).map(s => s.finishPos!);
    const avgFinish = finishes.length > 0 ? finishes.reduce((a, b) => a + b, 0) / finishes.length : null;

    // Position delta
    const posDeltas = races
      .filter(s => s.finishPos != null && s.startPos != null)
      .map(s => (s.startPos! - s.finishPos!));
    const avgPosDelta = posDeltas.length > 0 ? posDeltas.reduce((a, b) => a + b, 0) / posDeltas.length : 0;

    // Consistency (finish position std dev)
    let consistencyScore = 50;
    if (finishes.length >= 3) {
      const mean = finishes.reduce((a, b) => a + b, 0) / finishes.length;
      const variance = finishes.reduce((sum, f) => sum + Math.pow(f - mean, 2), 0) / finishes.length;
      const stdDev = Math.sqrt(variance);
      consistencyScore = Math.round(Math.max(0, Math.min(100, 100 - stdDev * 10)));
    }

    // iRating
    const irChanges = races.filter(s => s.iRatingChange != null).map(s => s.iRatingChange!);
    const iRatingDelta = irChanges.reduce((a, b) => a + b, 0);

    // Risk scoring (0-100, higher = more risk)
    let riskScore = 30; // baseline
    if (avgIncidents > 5) riskScore += 25;
    else if (avgIncidents > 3) riskScore += 15;
    else if (avgIncidents > 1.5) riskScore += 5;
    else riskScore -= 10;

    if (incidentTrend === 'worsening') riskScore += 15;
    else if (incidentTrend === 'improving') riskScore -= 10;

    if (consistencyScore < 30) riskScore += 15;
    else if (consistencyScore > 70) riskScore -= 10;

    if (iRatingDelta < -200) riskScore += 10;
    else if (iRatingDelta > 200) riskScore -= 10;

    riskScore = Math.max(0, Math.min(100, riskScore));

    const riskLevel: 'low' | 'moderate' | 'high' | 'critical' =
      riskScore >= 70 ? 'critical' :
      riskScore >= 50 ? 'high' :
      riskScore >= 30 ? 'moderate' : 'low';

    // Strengths & concerns
    const strengths: string[] = [];
    const concerns: string[] = [];

    if (avgIncidents < 1.5) strengths.push('Clean racer');
    if (consistencyScore > 70) strengths.push('Consistent finisher');
    if (avgPosDelta > 1) strengths.push('Strong race craft');
    if (iRatingDelta > 100) strengths.push('Rising form');
    if (incidentTrend === 'improving') strengths.push('Incident rate improving');

    if (avgIncidents > 4) concerns.push('High incident rate');
    if (incidentTrend === 'worsening') concerns.push('Incidents trending up');
    if (consistencyScore < 30) concerns.push('Inconsistent results');
    if (avgPosDelta < -2) concerns.push('Losing positions in races');
    if (iRatingDelta < -200) concerns.push('Significant iRating decline');

    return {
      id, name, sessions: sorted.length, races: races.length,
      avgIncidents, incidentTrend, avgFinish, avgPosDelta,
      consistencyScore, iRatingDelta, riskLevel, riskScore,
      strengths, concerns,
    };
  }).sort((a, b) => b.riskScore - a.riskScore);
}

const RISK_COLORS = {
  low: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400' },
  moderate: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
  high: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400' },
  critical: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400' },
};

export function TeamRiskDashboard({ driverSessions }: TeamRiskDashboardProps) {
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);
  const profiles = useMemo(() => computeDriverRisk(driverSessions), [driverSessions]);

  if (profiles.length === 0) {
    return (
      <div className="border border-white/10 bg-[#0e0e0e]/80">
        <div className="px-5 py-3 border-b border-white/[0.06] flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-[#f97316]/50" />
          <h2 className="text-sm uppercase tracking-[0.15em] text-white/40" style={ORBITRON}>Team Risk</h2>
        </div>
        <div className="px-5 py-6 text-center">
          <Users className="w-6 h-6 text-white/15 mx-auto mb-2" />
          <p className="text-[11px] text-white/25">No driver data available</p>
        </div>
      </div>
    );
  }

  const teamAvgRisk = Math.round(profiles.reduce((sum, p) => sum + p.riskScore, 0) / profiles.length);
  const highRiskCount = profiles.filter(p => p.riskLevel === 'high' || p.riskLevel === 'critical').length;

  return (
    <div className="border border-white/10 bg-[#0e0e0e]/80">
      {/* Header */}
      <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-[#f97316]/50" />
          <h2 className="text-sm uppercase tracking-[0.15em] text-[#f97316]" style={ORBITRON}>Team Risk Profile</h2>
        </div>
        <div className="flex items-center gap-3 text-[9px] text-white/20">
          <span>{profiles.length} drivers</span>
          <span className={teamAvgRisk > 50 ? 'text-yellow-400/50' : 'text-green-400/50'}>
            Avg risk: {teamAvgRisk}
          </span>
          {highRiskCount > 0 && (
            <span className="text-red-400/60 flex items-center gap-1">
              <AlertTriangle className="w-2.5 h-2.5" /> {highRiskCount} elevated
            </span>
          )}
        </div>
      </div>

      {/* Driver risk cards */}
      <div className="divide-y divide-white/[0.04]">
        {profiles.map(driver => {
          const isExpanded = expandedDriver === driver.id;
          const colors = RISK_COLORS[driver.riskLevel];

          return (
            <div key={driver.id}>
              <button
                onClick={() => setExpandedDriver(isExpanded ? null : driver.id)}
                className="w-full px-5 py-3.5 flex items-center gap-4 text-left hover:bg-white/[0.02] transition-colors"
              >
                {/* Risk badge */}
                <div className={`w-10 h-10 border ${colors.border} ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                  <span className={`text-sm font-mono font-bold ${colors.text}`}>{driver.riskScore}</span>
                </div>

                {/* Driver info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] text-white/70 font-medium">{driver.name}</span>
                    <span className={`text-[8px] uppercase tracking-wider px-1.5 py-0.5 border ${colors.border} ${colors.text} ${colors.bg}`}>
                      {driver.riskLevel}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[9px] text-white/25 mt-0.5">
                    <span>{driver.races} races</span>
                    <span>{driver.avgIncidents.toFixed(1)}x avg inc</span>
                    <span className="flex items-center gap-0.5">
                      {driver.incidentTrend === 'improving' ? <TrendingDown className="w-2.5 h-2.5 text-green-400/50" /> :
                       driver.incidentTrend === 'worsening' ? <TrendingUp className="w-2.5 h-2.5 text-red-400/50" /> :
                       <Target className="w-2.5 h-2.5 text-white/20" />}
                      {driver.incidentTrend}
                    </span>
                  </div>
                </div>

                {/* Quick stats */}
                <div className="hidden md:flex items-center gap-4 flex-shrink-0">
                  <div className="text-center w-14">
                    <div className={`text-sm font-mono ${driver.consistencyScore >= 70 ? 'text-green-400' : driver.consistencyScore >= 40 ? 'text-white/60' : 'text-red-400'}`}>
                      {driver.consistencyScore}
                    </div>
                    <div className="text-[7px] text-white/15 uppercase">Consist.</div>
                  </div>
                  <div className="text-center w-14">
                    <div className={`text-sm font-mono ${driver.iRatingDelta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {driver.iRatingDelta >= 0 ? '+' : ''}{driver.iRatingDelta}
                    </div>
                    <div className="text-[7px] text-white/15 uppercase">iR Δ</div>
                  </div>
                </div>

                {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-white/20" /> : <ChevronDown className="w-3.5 h-3.5 text-white/20" />}
              </button>

              {isExpanded && (
                <div className="px-5 pb-4">
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    {/* Strengths */}
                    <div className="border border-green-500/10 p-3">
                      <div className="text-[8px] text-green-400/50 uppercase tracking-wider mb-2">Strengths</div>
                      {driver.strengths.length > 0 ? (
                        <div className="space-y-1">
                          {driver.strengths.map((s, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                              <Zap className="w-2.5 h-2.5 text-green-400/40" />
                              <span className="text-[10px] text-white/40">{s}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[9px] text-white/15">Insufficient data</p>
                      )}
                    </div>

                    {/* Concerns */}
                    <div className="border border-red-500/10 p-3">
                      <div className="text-[8px] text-red-400/50 uppercase tracking-wider mb-2">Concerns</div>
                      {driver.concerns.length > 0 ? (
                        <div className="space-y-1">
                          {driver.concerns.map((c, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                              <AlertTriangle className="w-2.5 h-2.5 text-red-400/40" />
                              <span className="text-[10px] text-white/40">{c}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[9px] text-green-400/30">No concerns identified</p>
                      )}
                    </div>
                  </div>

                  {/* Detailed stats */}
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="p-2 bg-white/[0.02] border border-white/[0.04]">
                      <div className="text-sm font-mono text-white/60">P{driver.avgFinish?.toFixed(1) ?? '—'}</div>
                      <div className="text-[7px] text-white/15 uppercase">Avg Finish</div>
                    </div>
                    <div className="p-2 bg-white/[0.02] border border-white/[0.04]">
                      <div className={`text-sm font-mono ${driver.avgPosDelta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {driver.avgPosDelta >= 0 ? '+' : ''}{driver.avgPosDelta.toFixed(1)}
                      </div>
                      <div className="text-[7px] text-white/15 uppercase">Avg Pos Δ</div>
                    </div>
                    <div className="p-2 bg-white/[0.02] border border-white/[0.04]">
                      <div className={`text-sm font-mono ${driver.avgIncidents < 2 ? 'text-green-400' : driver.avgIncidents > 4 ? 'text-red-400' : 'text-white/60'}`}>
                        {driver.avgIncidents.toFixed(1)}x
                      </div>
                      <div className="text-[7px] text-white/15 uppercase">Avg Inc</div>
                    </div>
                    <div className="p-2 bg-white/[0.02] border border-white/[0.04]">
                      <div className="text-sm font-mono text-white/60">{driver.sessions}</div>
                      <div className="text-[7px] text-white/15 uppercase">Sessions</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
