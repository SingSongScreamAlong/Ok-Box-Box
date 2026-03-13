import { useMemo } from 'react';
import { Flag, AlertTriangle, Shield, CheckCircle } from 'lucide-react';
import type { DriverSessionSummary } from '../lib/driverService';

interface RaceStartAnalysis {
  totalRaces: number;
  avgPositionDelta: number;       // avg (startPos - finishPos) — positive = gained
  posGainedPct: number;           // % of races where gained positions
  posLostPct: number;
  avgIncidentsRace: number;       // avg incidents in races
  avgIncidentsPractice: number;   // avg incidents in practice
  raceIncidentPremium: number;    // how much higher race incidents are vs practice

  // Start position correlation
  backGridAvgInc: number;         // avg incidents when starting P15+
  midGridAvgInc: number;          // avg incidents when starting P8-14
  frontGridAvgInc: number;        // avg incidents when starting P1-7
  worstStartZone: 'back' | 'mid' | 'front' | null;

  // Coaching tips
  tips: string[];
  survivalScore: number;          // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

function analyzeRaceStarts(sessions: DriverSessionSummary[]): RaceStartAnalysis | null {
  const races = sessions.filter(s =>
    (s.sessionType === 'official_race' || s.sessionType === 'unofficial_race' || s.eventType === 'race') &&
    s.startPos != null && s.finishPos != null
  );

  if (races.length < 5) return null;

  const totalRaces = races.length;

  // Position delta
  const deltas = races.map(r => (r.startPos ?? 0) - (r.finishPos ?? 0));
  const avgPositionDelta = deltas.reduce((s, d) => s + d, 0) / deltas.length;
  const posGainedPct = (deltas.filter(d => d > 0).length / totalRaces) * 100;
  const posLostPct = (deltas.filter(d => d < 0).length / totalRaces) * 100;

  // Race vs practice incidents
  const raceInc = races.filter(r => r.incidents != null);
  const practice = sessions.filter(s =>
    (s.sessionType === 'practice' || s.sessionType === 'qualifying') &&
    s.incidents != null
  );
  const avgIncidentsRace = raceInc.length > 0
    ? raceInc.reduce((s, r) => s + (r.incidents ?? 0), 0) / raceInc.length : 0;
  const avgIncidentsPractice = practice.length > 0
    ? practice.reduce((s, r) => s + (r.incidents ?? 0), 0) / practice.length : 0;
  const raceIncidentPremium = avgIncidentsPractice > 0
    ? ((avgIncidentsRace - avgIncidentsPractice) / avgIncidentsPractice) * 100 : 0;

  // Start position zones
  const front = raceInc.filter(r => (r.startPos ?? 99) <= 7);
  const mid = raceInc.filter(r => (r.startPos ?? 99) >= 8 && (r.startPos ?? 99) <= 14);
  const back = raceInc.filter(r => (r.startPos ?? 99) >= 15);

  const avgInc = (arr: typeof raceInc) =>
    arr.length >= 2 ? arr.reduce((s, r) => s + (r.incidents ?? 0), 0) / arr.length : 0;

  const frontGridAvgInc = avgInc(front);
  const midGridAvgInc = avgInc(mid);
  const backGridAvgInc = avgInc(back);

  let worstStartZone: 'back' | 'mid' | 'front' | null = null;
  const zones = [
    { zone: 'back' as const, avg: backGridAvgInc, count: back.length },
    { zone: 'mid' as const, avg: midGridAvgInc, count: mid.length },
    { zone: 'front' as const, avg: frontGridAvgInc, count: front.length },
  ].filter(z => z.count >= 2);
  if (zones.length > 0) {
    worstStartZone = zones.sort((a, b) => b.avg - a.avg)[0].zone;
  }

  // Survival score (0-100)
  // Based on: clean race rate, position gain rate, low incident premium
  const cleanRaceRate = raceInc.filter(r => (r.incidents ?? 0) <= 2).length / Math.max(1, raceInc.length);
  const gainRate = posGainedPct / 100;
  const incidentPenalty = Math.min(1, avgIncidentsRace / 8);
  const survivalScore = Math.round(
    (cleanRaceRate * 40) +
    (gainRate * 30) +
    ((1 - incidentPenalty) * 30)
  );

  const grade: 'A' | 'B' | 'C' | 'D' | 'F' =
    survivalScore >= 80 ? 'A' :
    survivalScore >= 65 ? 'B' :
    survivalScore >= 50 ? 'C' :
    survivalScore >= 35 ? 'D' : 'F';

  // Generate coaching tips
  const tips: string[] = [];

  if (avgPositionDelta < -0.5) {
    tips.push('You tend to lose positions during races. Focus on clean first laps — avoid aggressive moves until lap 3.');
  } else if (avgPositionDelta > 1) {
    tips.push('Strong racecraft — you consistently gain positions. Keep this discipline.');
  }

  if (raceIncidentPremium > 50) {
    tips.push(`Race incidents are ${Math.round(raceIncidentPremium)}% higher than practice. The adrenaline of racing may be causing overdriving.`);
  }

  if (worstStartZone === 'back' && backGridAvgInc > 3) {
    tips.push('Starting from the back correlates with higher incidents. Qualify better, or be extra patient in traffic on lap 1.');
  } else if (worstStartZone === 'front' && frontGridAvgInc > 2) {
    tips.push('Incidents are high even from the front. You may be defending too aggressively on lap 1.');
  }

  if (cleanRaceRate < 0.3) {
    tips.push('Less than 30% of races are clean. Set a goal: finish one race this week with 0 incidents.');
  }

  if (tips.length === 0) {
    tips.push('Solid race start survival. Continue maintaining clean first laps and patient overtaking.');
  }

  return {
    totalRaces,
    avgPositionDelta,
    posGainedPct,
    posLostPct,
    avgIncidentsRace,
    avgIncidentsPractice,
    raceIncidentPremium,
    backGridAvgInc,
    midGridAvgInc,
    frontGridAvgInc,
    worstStartZone,
    tips,
    survivalScore,
    grade,
  };
}

const GRADE_CONFIG = {
  A: { color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
  B: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  C: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  D: { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  F: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
};

const ORBITRON: React.CSSProperties = { fontFamily: "'Orbitron', sans-serif" };

export function RaceStartCoach({ sessions }: { sessions: DriverSessionSummary[] }) {
  const analysis = useMemo(() => analyzeRaceStarts(sessions), [sessions]);

  if (!analysis) return null;

  const gcfg = GRADE_CONFIG[analysis.grade];

  return (
    <div className={`border ${gcfg.border} bg-[#0e0e0e]/80 backdrop-blur-sm`}>
      <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Flag className="w-4 h-4 text-white/30" />
          <h2 className="text-sm uppercase tracking-[0.15em] text-white/60" style={ORBITRON}>Race Start Coach</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-lg font-mono font-bold ${gcfg.color}`}>{analysis.grade}</span>
          <span className="text-[9px] text-white/20">{analysis.survivalScore}/100</span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Key stats */}
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center">
            <div className={`text-lg font-mono font-bold ${
              analysis.avgPositionDelta > 0 ? 'text-green-400' :
              analysis.avgPositionDelta < 0 ? 'text-red-400' : 'text-white/50'
            }`}>
              {analysis.avgPositionDelta > 0 ? '+' : ''}{analysis.avgPositionDelta.toFixed(1)}
            </div>
            <div className="text-[8px] text-white/25 uppercase">Avg Pos Delta</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-mono font-bold text-green-400/70">{analysis.posGainedPct.toFixed(0)}%</div>
            <div className="text-[8px] text-white/25 uppercase">Gain Rate</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-mono font-bold ${analysis.avgIncidentsRace > 3 ? 'text-red-400' : 'text-white/60'}`}>
              {analysis.avgIncidentsRace.toFixed(1)}
            </div>
            <div className="text-[8px] text-white/25 uppercase">Race Inc</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-mono font-bold text-white/50">{analysis.totalRaces}</div>
            <div className="text-[8px] text-white/25 uppercase">Races</div>
          </div>
        </div>

        {/* Race vs Practice premium */}
        {analysis.avgIncidentsPractice > 0 && (
          <div className="pt-3 border-t border-white/[0.04] flex items-center justify-between">
            <span className="text-[9px] text-white/25 uppercase">Race vs Practice incidents</span>
            <span className={`text-[10px] font-mono ${
              analysis.raceIncidentPremium > 30 ? 'text-amber-400/70' : 'text-white/40'
            }`}>
              {analysis.raceIncidentPremium > 0 ? '+' : ''}{analysis.raceIncidentPremium.toFixed(0)}%
              <span className="text-white/20 ml-1">({analysis.avgIncidentsRace.toFixed(1)} vs {analysis.avgIncidentsPractice.toFixed(1)})</span>
            </span>
          </div>
        )}

        {/* Grid position breakdown */}
        {analysis.worstStartZone && (
          <div className="pt-3 border-t border-white/[0.04]">
            <div className="text-[9px] text-white/25 uppercase mb-2">Incidents by grid position</div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Front (P1-7)', avg: analysis.frontGridAvgInc, zone: 'front' },
                { label: 'Mid (P8-14)', avg: analysis.midGridAvgInc, zone: 'mid' },
                { label: 'Back (P15+)', avg: analysis.backGridAvgInc, zone: 'back' },
              ].map(z => (
                <div key={z.zone} className={`text-center p-2 rounded border ${
                  z.zone === analysis.worstStartZone ? 'border-red-500/20 bg-red-500/5' : 'border-white/[0.06] bg-white/[0.02]'
                }`}>
                  <div className={`text-sm font-mono font-bold ${
                    z.avg > 4 ? 'text-red-400' : z.avg > 2 ? 'text-amber-400' : 'text-green-400'
                  }`}>
                    {z.avg > 0 ? z.avg.toFixed(1) : '—'}
                  </div>
                  <div className="text-[7px] text-white/25 uppercase mt-0.5">{z.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Coaching tips */}
        <div className="pt-3 border-t border-white/[0.04] space-y-2">
          {analysis.tips.map((tip, i) => (
            <div key={i} className="flex items-start gap-2">
              {tip.includes('Strong') || tip.includes('Solid') ? (
                <CheckCircle className="w-3 h-3 text-green-400/50 mt-0.5 shrink-0" />
              ) : tip.includes('higher') || tip.includes('lose') || tip.includes('Less than') ? (
                <AlertTriangle className="w-3 h-3 text-amber-400/50 mt-0.5 shrink-0" />
              ) : (
                <Shield className="w-3 h-3 text-blue-400/50 mt-0.5 shrink-0" />
              )}
              <p className="text-[10px] text-white/45 leading-relaxed">{tip}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
