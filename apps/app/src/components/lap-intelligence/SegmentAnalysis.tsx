/**
 * SegmentAnalysis
 * Table showing per-segment (turn/sector) time deltas with coaching insights.
 * Analyzes telemetry differences to identify causes and generate recommendations.
 */

import { useMemo } from 'react';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import type { LapData, SegmentDelta } from './types';

interface SegmentAnalysisProps {
  driverLap: LapData;
  referenceLap: LapData;
  segmentCount?: number;
  corners?: { name: string; distPct: number }[];
  className?: string;
}

interface AnalyzedSegment extends SegmentDelta {
  speedDiff: number;     // avg speed difference in segment
  brakeDiff: number;     // avg brake difference
  throttleDiff: number;  // avg throttle difference
}

function analyzeSegment(
  driverLap: LapData,
  referenceLap: LapData,
  startDist: number,
  endDist: number,
  label: string
): AnalyzedSegment {
  // Get samples within this segment
  const driverSamples = driverLap.samples.filter(s => s.distance >= startDist && s.distance <= endDist);
  const refSamples = referenceLap.samples.filter(s => s.distance >= startDist && s.distance <= endDist);

  // Compute averages
  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  
  const driverAvgSpeed = avg(driverSamples.map(s => s.speed));
  const refAvgSpeed = avg(refSamples.map(s => s.speed));
  const driverAvgBrake = avg(driverSamples.map(s => s.brake));
  const refAvgBrake = avg(refSamples.map(s => s.brake));
  const driverAvgThrottle = avg(driverSamples.map(s => s.throttle));
  const refAvgThrottle = avg(refSamples.map(s => s.throttle));

  const speedDiff = driverAvgSpeed - refAvgSpeed;
  const brakeDiff = driverAvgBrake - refAvgBrake;
  const throttleDiff = driverAvgThrottle - refAvgThrottle;

  // Compute time delta for this segment
  const totalDriverTime = driverLap.samples.length > 1
    ? driverLap.samples[driverLap.samples.length - 1].timestamp
    : 1;
  const totalRefTime = referenceLap.samples.length > 1
    ? referenceLap.samples[referenceLap.samples.length - 1].timestamp
    : 1;

  const driverSegStart = driverSamples[0]?.timestamp ?? 0;
  const driverSegEnd = driverSamples[driverSamples.length - 1]?.timestamp ?? 0;
  const refSegStart = refSamples[0]?.timestamp ?? 0;
  const refSegEnd = refSamples[refSamples.length - 1]?.timestamp ?? 0;

  const driverSegTime = ((driverSegEnd - driverSegStart) / totalDriverTime) * driverLap.lapTime;
  const refSegTime = ((refSegEnd - refSegStart) / totalRefTime) * referenceLap.lapTime;
  const delta = driverSegTime - refSegTime;

  // Determine cause and recommendation
  let cause: string | undefined;
  let recommendation: string | undefined;

  if (Math.abs(delta) > 0.005) {
    if (brakeDiff > 0.05) {
      cause = 'braking harder';
      recommendation = 'Reduce brake pressure, trail brake deeper';
    } else if (brakeDiff < -0.05 && delta > 0) {
      cause = 'braking too late';
      recommendation = 'Brake slightly earlier for better rotation';
    } else if (throttleDiff < -0.08) {
      cause = 'throttle hesitation';
      recommendation = 'Apply throttle earlier on exit';
    } else if (speedDiff < -5) {
      cause = 'low corner speed';
      recommendation = 'Carry more speed through apex';
    } else if (speedDiff > 5 && delta > 0) {
      cause = 'entry too fast';
      recommendation = 'Slow entry, faster exit — prioritize traction';
    } else if (delta > 0) {
      cause = 'suboptimal line';
      recommendation = 'Tighten apex to maximize exit speed';
    } else {
      cause = 'strong execution';
    }
  }

  return {
    label,
    startDist,
    endDist,
    delta,
    cause,
    recommendation,
    speedDiff,
    brakeDiff,
    throttleDiff,
  };
}

export function SegmentAnalysis({
  driverLap,
  referenceLap,
  segmentCount = 8,
  corners,
  className = '',
}: SegmentAnalysisProps) {
  const segments = useMemo(() => {
    const segs: AnalyzedSegment[] = [];

    if (corners && corners.length > 0) {
      // Use actual corner data
      for (let i = 0; i < corners.length; i++) {
        const start = i === 0 ? 0 : (corners[i - 1].distPct + corners[i].distPct) / 2;
        const end = i === corners.length - 1 ? 1 : (corners[i].distPct + corners[i + 1].distPct) / 2;
        segs.push(analyzeSegment(driverLap, referenceLap, start, end, corners[i].name));
      }
    } else {
      // Equal segments
      for (let i = 0; i < segmentCount; i++) {
        const start = i / segmentCount;
        const end = (i + 1) / segmentCount;
        segs.push(analyzeSegment(driverLap, referenceLap, start, end, `T${i + 1}`));
      }
    }

    return segs;
  }, [driverLap, referenceLap, segmentCount, corners]);

  // Find the worst segment for highlighted coaching
  const worstSegment = useMemo(() => {
    if (segments.length === 0) return null;
    return segments.reduce((worst, seg) => seg.delta > worst.delta ? seg : worst, segments[0]);
  }, [segments]);

  return (
    <div className={className}>
      <div className="text-[10px] uppercase text-white/40 tracking-wider font-semibold mb-3">Segment Analysis</div>

      {/* Segment Table */}
      <div className="space-y-1 mb-4">
        {segments.map(seg => {
          const isGain = seg.delta < -0.005;
          const isLoss = seg.delta > 0.005;
          return (
            <div
              key={seg.label}
              className={`flex items-center justify-between px-3 py-1.5 rounded text-xs font-mono ${
                isLoss ? 'bg-red-500/10' : isGain ? 'bg-green-500/10' : 'bg-white/[0.03]'
              }`}
            >
              <div className="flex items-center gap-2 w-12">
                <span className="text-white/60 font-semibold">{seg.label}</span>
              </div>
              <div className="flex items-center gap-1.5 w-20 justify-end">
                {isGain ? (
                  <TrendingDown size={10} className="text-green-400" />
                ) : isLoss ? (
                  <TrendingUp size={10} className="text-red-400" />
                ) : (
                  <Minus size={10} className="text-white/30" />
                )}
                <span className={`${isGain ? 'text-green-400' : isLoss ? 'text-red-400' : 'text-white/40'}`}>
                  {seg.delta > 0 ? '+' : ''}{seg.delta.toFixed(3)}s
                </span>
              </div>
              <div className="text-white/30 text-[10px] flex-1 text-right truncate pl-2">
                {seg.cause || '—'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Coaching Insight — worst segment */}
      {worstSegment && worstSegment.delta > 0.01 && worstSegment.recommendation && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <div className="text-[10px] uppercase text-amber-400 font-semibold tracking-wider">Coaching Insight</div>
          </div>
          <div className="text-sm text-white font-medium mb-1">
            {worstSegment.label}: +{worstSegment.delta.toFixed(3)}s lost
          </div>
          <div className="text-xs text-white/50 mb-1">
            Cause: {worstSegment.cause}
          </div>
          <div className="text-xs text-amber-300/80">
            {worstSegment.recommendation}
          </div>
        </div>
      )}
    </div>
  );
}
