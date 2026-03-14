/**
 * PaceProjection — Long Run Pace & Competitiveness Window
 *
 * Projects tire degradation, fuel load effect, and pace window
 * based on accumulated stint data. Shows when the driver's
 * competitive window opens/closes relative to cars ahead/behind.
 *
 * Phase 4e: Uses live telemetry from useRelay
 * Designed for embedding in DriverCockpit or DriverBlackBox
 */

import { useMemo } from 'react';
import {
  TrendingDown, Fuel, Timer,
  ChevronRight, Target
} from 'lucide-react';

const ORBITRON = { fontFamily: 'Orbitron, sans-serif' };

interface LapSample {
  lap: number;
  lapTime: number;
  fuelRemaining: number;
  tireWearMin: number;     // worst tire wear 0-1
}

interface PaceProjectionProps {
  laps: LapSample[];
  currentFuel: number;
  fuelPerLap: number;
  currentTireWear: number; // worst corner 0-1
  tireDegPerLap: number;
  gapAhead: number;
  gapBehind: number;
  totalRaceLaps?: number;
  currentLap: number;
}

interface ProjectionResult {
  projectedLapsRemaining: number;
  fuelLapsLeft: number;
  tireLapsLeft: number;
  limitingFactor: 'fuel' | 'tires' | 'race_end';
  paceWindow: {
    currentPace: number;
    projectedPace5: number;  // pace in 5 laps
    projectedPace10: number; // pace in 10 laps
    degradationRate: number; // seconds per lap degradation
  };
  competitiveness: {
    lapsToClose: number | null;     // laps to catch car ahead
    lapsUntilCaught: number | null; // laps before car behind catches
    windowOpen: boolean;            // still competitive vs ahead
    threatLevel: 'safe' | 'watch' | 'danger';
  };
  recommendation: string;
}

function computeProjection(props: PaceProjectionProps): ProjectionResult {
  const {
    laps, currentFuel, fuelPerLap, currentTireWear,
    tireDegPerLap, gapAhead, gapBehind, totalRaceLaps, currentLap,
  } = props;

  // Fuel projection
  const fuelLapsLeft = fuelPerLap > 0 ? Math.floor(currentFuel / fuelPerLap) : 99;

  // Tire projection (cliff at ~15% wear remaining)
  const tireCliffThreshold = 0.15;
  const tireLapsLeft = tireDegPerLap > 0
    ? Math.floor((currentTireWear - tireCliffThreshold) / tireDegPerLap)
    : 99;

  // Race laps remaining
  const raceLapsLeft = totalRaceLaps ? totalRaceLaps - currentLap : 99;

  // Limiting factor
  const limitingFactor: 'fuel' | 'tires' | 'race_end' =
    fuelLapsLeft <= tireLapsLeft && fuelLapsLeft <= raceLapsLeft ? 'fuel' :
    tireLapsLeft <= raceLapsLeft ? 'tires' : 'race_end';

  const projectedLapsRemaining = Math.min(fuelLapsLeft, tireLapsLeft, raceLapsLeft);

  // Pace analysis from recent laps
  const cleanLaps = laps.filter(l => l.lapTime > 0).slice(-10);
  const currentPace = cleanLaps.length >= 2
    ? cleanLaps.slice(-3).reduce((sum, l) => sum + l.lapTime, 0) / Math.min(3, cleanLaps.length)
    : 0;

  // Degradation rate (pace loss per lap from tire wear)
  let degradationRate = 0;
  if (cleanLaps.length >= 5) {
    const firstHalf = cleanLaps.slice(0, Math.floor(cleanLaps.length / 2));
    const secondHalf = cleanLaps.slice(Math.floor(cleanLaps.length / 2));
    const firstAvg = firstHalf.reduce((s, l) => s + l.lapTime, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((s, l) => s + l.lapTime, 0) / secondHalf.length;
    degradationRate = (secondAvg - firstAvg) / (cleanLaps.length / 2);
  }

  // Project future pace
  const projectedPace5 = currentPace + (degradationRate * 5);
  const projectedPace10 = currentPace + (degradationRate * 10);

  // Competitiveness analysis
  let lapsToClose: number | null = null;
  let lapsUntilCaught: number | null = null;

  if (gapAhead > 0 && degradationRate < 0.1 && currentPace > 0) {
    // Assume car ahead degrades at similar rate — closing rate is pace delta
    const closingRate = 0.1; // conservative: 0.1s per lap closing
    lapsToClose = closingRate > 0 ? Math.ceil(gapAhead / closingRate) : null;
  }

  if (gapBehind > 0 && gapBehind < 5) {
    const threatRate = 0.1;
    lapsUntilCaught = threatRate > 0 ? Math.ceil(gapBehind / threatRate) : null;
  }

  const windowOpen = lapsToClose !== null && lapsToClose <= projectedLapsRemaining;
  const threatLevel: 'safe' | 'watch' | 'danger' =
    lapsUntilCaught !== null && lapsUntilCaught < 5 ? 'danger' :
    lapsUntilCaught !== null && lapsUntilCaught < 15 ? 'watch' : 'safe';

  // Recommendation
  let recommendation = '';
  if (limitingFactor === 'fuel' && fuelLapsLeft < 5) {
    recommendation = 'BOX THIS LAP — fuel critical';
  } else if (limitingFactor === 'tires' && tireLapsLeft < 3) {
    recommendation = 'Tires at cliff — pit or nurse them home';
  } else if (windowOpen && lapsToClose && lapsToClose < 10) {
    recommendation = `Push now — ${lapsToClose} laps to close ${gapAhead.toFixed(1)}s gap`;
  } else if (threatLevel === 'danger') {
    recommendation = 'Under threat — defend or find pace';
  } else if (degradationRate > 0.15) {
    recommendation = 'High deg — manage tires, avoid curbs';
  } else if (projectedLapsRemaining > 20) {
    recommendation = 'Maintain pace — stint looks comfortable';
  } else {
    recommendation = `${projectedLapsRemaining} laps remaining in window`;
  }

  return {
    projectedLapsRemaining,
    fuelLapsLeft,
    tireLapsLeft,
    limitingFactor,
    paceWindow: { currentPace, projectedPace5, projectedPace10, degradationRate },
    competitiveness: { lapsToClose, lapsUntilCaught, windowOpen, threatLevel },
    recommendation,
  };
}

function formatLapTime(seconds: number): string {
  if (seconds <= 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toFixed(3);
  return m > 0 ? `${m}:${s.padStart(6, '0')}` : `${s}s`;
}

export function PaceProjection(props: PaceProjectionProps) {
  const projection = useMemo(() => computeProjection(props), [props]);
  const { paceWindow, competitiveness, limitingFactor } = projection;

  if (props.laps.length < 3) {
    return (
      <div className="border border-white/10 bg-[#0e0e0e]/80">
        <div className="px-5 py-3 border-b border-white/[0.06] flex items-center gap-2">
          <TrendingDown className="w-3.5 h-3.5 text-[#f97316]/50" />
          <h2 className="text-sm uppercase tracking-[0.15em] text-white/40" style={ORBITRON}>Pace Projection</h2>
        </div>
        <div className="px-5 py-4 text-center">
          <p className="text-[11px] text-white/25">Need 3+ laps for projection</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-white/10 bg-[#0e0e0e]/80">
      {/* Header */}
      <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingDown className="w-3.5 h-3.5 text-[#f97316]/50" />
          <h2 className="text-sm uppercase tracking-[0.15em] text-[#f97316]" style={ORBITRON}>Pace Projection</h2>
        </div>
        <span className={`text-[9px] px-2 py-0.5 border ${
          limitingFactor === 'fuel' ? 'border-yellow-500/30 text-yellow-400/60' :
          limitingFactor === 'tires' ? 'border-red-500/30 text-red-400/60' :
          'border-green-500/30 text-green-400/60'
        }`}>
          {limitingFactor === 'fuel' ? 'Fuel limited' : limitingFactor === 'tires' ? 'Tire limited' : 'To finish'}
        </span>
      </div>

      {/* Pace window */}
      <div className="px-5 py-3 grid grid-cols-4 gap-3 border-b border-white/[0.04]">
        <div className="text-center">
          <div className="text-sm font-mono text-white/70">{formatLapTime(paceWindow.currentPace)}</div>
          <div className="text-[7px] text-white/20 uppercase">Current</div>
        </div>
        <div className="text-center">
          <div className={`text-sm font-mono ${paceWindow.projectedPace5 > paceWindow.currentPace + 0.3 ? 'text-red-400' : 'text-white/70'}`}>
            {formatLapTime(paceWindow.projectedPace5)}
          </div>
          <div className="text-[7px] text-white/20 uppercase">+5 Laps</div>
        </div>
        <div className="text-center">
          <div className={`text-sm font-mono ${paceWindow.projectedPace10 > paceWindow.currentPace + 0.5 ? 'text-red-400' : 'text-white/70'}`}>
            {formatLapTime(paceWindow.projectedPace10)}
          </div>
          <div className="text-[7px] text-white/20 uppercase">+10 Laps</div>
        </div>
        <div className="text-center">
          <div className={`text-sm font-mono ${paceWindow.degradationRate > 0.1 ? 'text-red-400' : paceWindow.degradationRate > 0.05 ? 'text-yellow-400' : 'text-green-400'}`}>
            {paceWindow.degradationRate > 0 ? '+' : ''}{paceWindow.degradationRate.toFixed(3)}s
          </div>
          <div className="text-[7px] text-white/20 uppercase">Deg/Lap</div>
        </div>
      </div>

      {/* Resource gauges */}
      <div className="px-5 py-3 grid grid-cols-2 gap-4 border-b border-white/[0.04]">
        {/* Fuel */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Fuel className="w-3 h-3 text-white/20" />
              <span className="text-[9px] text-white/30 uppercase">Fuel</span>
            </div>
            <span className={`text-[10px] font-mono ${projection.fuelLapsLeft < 5 ? 'text-red-400' : projection.fuelLapsLeft < 10 ? 'text-yellow-400' : 'text-white/60'}`}>
              {projection.fuelLapsLeft} laps
            </span>
          </div>
          <div className="h-2 bg-white/[0.06] overflow-hidden">
            <div
              className={`h-full transition-all ${projection.fuelLapsLeft < 5 ? 'bg-red-500/60' : projection.fuelLapsLeft < 10 ? 'bg-yellow-500/60' : 'bg-green-500/40'}`}
              style={{ width: `${Math.min(100, (projection.fuelLapsLeft / 30) * 100)}%` }}
            />
          </div>
        </div>

        {/* Tires */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Timer className="w-3 h-3 text-white/20" />
              <span className="text-[9px] text-white/30 uppercase">Tires</span>
            </div>
            <span className={`text-[10px] font-mono ${projection.tireLapsLeft < 3 ? 'text-red-400' : projection.tireLapsLeft < 8 ? 'text-yellow-400' : 'text-white/60'}`}>
              {projection.tireLapsLeft} laps
            </span>
          </div>
          <div className="h-2 bg-white/[0.06] overflow-hidden">
            <div
              className={`h-full transition-all ${projection.tireLapsLeft < 3 ? 'bg-red-500/60' : projection.tireLapsLeft < 8 ? 'bg-yellow-500/60' : 'bg-blue-500/40'}`}
              style={{ width: `${Math.min(100, (projection.tireLapsLeft / 35) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Competitiveness */}
      <div className="px-5 py-3 flex items-center gap-4 border-b border-white/[0.04]">
        <div className="flex items-center gap-2 flex-1">
          <Target className="w-3 h-3 text-white/20" />
          <span className="text-[9px] text-white/30 uppercase">Gap ahead</span>
          <span className="text-[11px] font-mono text-white/60">{props.gapAhead.toFixed(1)}s</span>
          {competitiveness.lapsToClose !== null && (
            <span className={`text-[9px] ${competitiveness.windowOpen ? 'text-green-400/50' : 'text-white/20'}`}>
              ~{competitiveness.lapsToClose} laps to close
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-1 justify-end">
          <span className="text-[9px] text-white/30 uppercase">Behind</span>
          <span className="text-[11px] font-mono text-white/60">{props.gapBehind.toFixed(1)}s</span>
          <span className={`text-[8px] px-1.5 py-0.5 border ${
            competitiveness.threatLevel === 'danger' ? 'border-red-500/30 text-red-400/60 bg-red-500/5' :
            competitiveness.threatLevel === 'watch' ? 'border-yellow-500/30 text-yellow-400/60 bg-yellow-500/5' :
            'border-green-500/30 text-green-400/60 bg-green-500/5'
          }`}>
            {competitiveness.threatLevel}
          </span>
        </div>
      </div>

      {/* Recommendation */}
      <div className={`px-5 py-3 flex items-center gap-2 ${
        projection.recommendation.includes('BOX') ? 'bg-red-500/[0.05] border-t border-red-500/20' :
        projection.recommendation.includes('Push') ? 'bg-green-500/[0.03] border-t border-green-500/20' :
        ''
      }`}>
        <ChevronRight className="w-3 h-3 text-[#f97316]/50 flex-shrink-0" />
        <span className="text-[11px] text-white/50">{projection.recommendation}</span>
      </div>
    </div>
  );
}
