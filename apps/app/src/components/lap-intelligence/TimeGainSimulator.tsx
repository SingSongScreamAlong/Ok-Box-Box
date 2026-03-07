/**
 * TimeGainSimulator
 * Interactive tool that lets drivers adjust telemetry inputs per segment
 * (brake point, throttle application, corner speed) and see the projected
 * lap time change in real time. A feature even F1 broadcasts don't offer.
 */

import { useState, useMemo, useCallback } from 'react';
import { RotateCcw, Zap } from 'lucide-react';
import type { LapData, TelemetrySample } from './types';

interface TimeGainSimulatorProps {
  lap: LapData;
  corners?: { name: string; distPct: number }[];
  className?: string;
}

interface SegmentAdjustment {
  label: string;
  startDist: number;
  endDist: number;
  brakeShift: number;    // meters later (positive = later braking = faster)
  throttleShift: number; // percentage earlier (positive = earlier = faster)
  speedAdjust: number;   // mph corner speed gain (positive = faster)
}

/** Estimate time saved from braking later at a given speed */
function brakeTimeSaved(brakeShiftMeters: number, avgSpeedMph: number): number {
  if (brakeShiftMeters === 0 || avgSpeedMph === 0) return 0;
  const avgSpeedMs = avgSpeedMph * 0.44704; // mph → m/s
  return brakeShiftMeters / avgSpeedMs;
}

/** Estimate time saved from earlier throttle application */
function throttleTimeSaved(throttleShiftPct: number, segmentTime: number): number {
  if (throttleShiftPct === 0) return 0;
  // Earlier throttle application saves ~0.5% of segment time per 1% earlier
  return segmentTime * (throttleShiftPct / 100) * 0.005;
}

/** Estimate time saved from higher corner speed */
function cornerSpeedTimeSaved(speedGainMph: number, segmentTime: number, avgSpeedMph: number): number {
  if (speedGainMph === 0 || avgSpeedMph === 0) return 0;
  // Higher corner speed reduces segment time proportionally
  const ratio = speedGainMph / avgSpeedMph;
  return segmentTime * ratio * 0.8; // 0.8 damping factor — not all speed gain translates linearly
}

function buildSegments(
  corners?: { name: string; distPct: number }[]
): SegmentAdjustment[] {
  if (corners && corners.length > 0) {
    return corners.map((c, i) => ({
      label: c.name,
      startDist: i === 0 ? 0 : (corners[i - 1].distPct + c.distPct) / 2,
      endDist: i === corners.length - 1 ? 1 : (c.distPct + corners[i + 1].distPct) / 2,
      brakeShift: 0,
      throttleShift: 0,
      speedAdjust: 0,
    }));
  }

  // Default: 8 equal segments
  const count = 8;
  return Array.from({ length: count }, (_, i) => ({
    label: `T${i + 1}`,
    startDist: i / count,
    endDist: (i + 1) / count,
    brakeShift: 0,
    throttleShift: 0,
    speedAdjust: 0,
  }));
}

function getSegmentSamples(samples: TelemetrySample[], start: number, end: number) {
  return samples.filter(s => s.distance >= start && s.distance <= end);
}

export function TimeGainSimulator({ lap, corners, className = '' }: TimeGainSimulatorProps) {
  const initialSegments = useMemo(() => buildSegments(corners), [corners]);
  const [segments, setSegments] = useState<SegmentAdjustment[]>(initialSegments);
  const [activeSegment, setActiveSegment] = useState<number | null>(null);

  const reset = useCallback(() => {
    setSegments(buildSegments(corners));
    setActiveSegment(null);
  }, [corners]);

  const updateSegment = useCallback((idx: number, field: keyof Pick<SegmentAdjustment, 'brakeShift' | 'throttleShift' | 'speedAdjust'>, value: number) => {
    setSegments(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  }, []);

  // Compute projected lap time
  const { projectedTime, segmentGains, totalGain } = useMemo(() => {
    const gains: number[] = [];
    let total = 0;

    for (const seg of segments) {
      const samples = getSegmentSamples(lap.samples, seg.startDist, seg.endDist);
      if (samples.length < 2) {
        gains.push(0);
        continue;
      }

      const totalTimestamp = lap.samples[lap.samples.length - 1]?.timestamp ?? 1;
      const segStartTime = samples[0].timestamp;
      const segEndTime = samples[samples.length - 1].timestamp;
      const segmentTime = ((segEndTime - segStartTime) / totalTimestamp) * lap.lapTime;
      const avgSpeed = samples.reduce((sum, s) => sum + s.speed, 0) / samples.length;

      const brakeSaved = brakeTimeSaved(seg.brakeShift, avgSpeed);
      const throttleSaved = throttleTimeSaved(seg.throttleShift, segmentTime);
      const speedSaved = cornerSpeedTimeSaved(seg.speedAdjust, segmentTime, avgSpeed);

      const segGain = brakeSaved + throttleSaved + speedSaved;
      gains.push(segGain);
      total += segGain;
    }

    return {
      projectedTime: lap.lapTime - total,
      segmentGains: gains,
      totalGain: total,
    };
  }, [segments, lap]);

  const hasAdjustments = totalGain !== 0;

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-amber-400" />
          <div className="text-[10px] uppercase text-white/40 tracking-wider font-semibold">Time Gain Simulator</div>
        </div>
        {hasAdjustments && (
          <button onClick={reset} className="flex items-center gap-1 text-[10px] text-white/40 hover:text-white transition-colors">
            <RotateCcw size={10} />
            Reset
          </button>
        )}
      </div>

      {/* Projected vs Actual */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-white/[0.03] border border-white/5 rounded p-2 text-center">
          <div className="text-[10px] text-white/40 mb-1">Actual</div>
          <div className="text-sm font-mono text-white">
            {Math.floor(lap.lapTime / 60)}:{(lap.lapTime % 60).toFixed(3).padStart(6, '0')}
          </div>
        </div>
        <div className={`rounded p-2 text-center border ${
          hasAdjustments ? 'bg-green-500/10 border-green-500/30' : 'bg-white/[0.03] border-white/5'
        }`}>
          <div className="text-[10px] text-white/40 mb-1">Projected</div>
          <div className={`text-sm font-mono ${hasAdjustments ? 'text-green-400' : 'text-white'}`}>
            {Math.floor(projectedTime / 60)}:{(projectedTime % 60).toFixed(3).padStart(6, '0')}
          </div>
        </div>
        <div className={`rounded p-2 text-center border ${
          hasAdjustments ? 'bg-green-500/10 border-green-500/30' : 'bg-white/[0.03] border-white/5'
        }`}>
          <div className="text-[10px] text-white/40 mb-1">Gain</div>
          <div className={`text-sm font-mono ${hasAdjustments ? 'text-green-400' : 'text-white/30'}`}>
            {hasAdjustments ? `-${totalGain.toFixed(3)}s` : '—'}
          </div>
        </div>
      </div>

      {/* Segment Adjustments */}
      <div className="space-y-1">
        {segments.map((seg, idx) => {
          const isActive = activeSegment === idx;
          const gain = segmentGains[idx] ?? 0;

          return (
            <div key={seg.label}>
              {/* Segment Header Row */}
              <button
                onClick={() => setActiveSegment(isActive ? null : idx)}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded text-xs transition-colors ${
                  isActive ? 'bg-amber-500/15 border border-amber-500/30' :
                  gain > 0.001 ? 'bg-green-500/5 border border-green-500/20' :
                  'bg-white/[0.02] border border-white/5 hover:bg-white/[0.05]'
                }`}
              >
                <span className="text-white/60 font-semibold font-mono w-10 text-left">{seg.label}</span>
                <div className="flex items-center gap-3">
                  {seg.brakeShift !== 0 && (
                    <span className="text-[9px] text-red-400">BRK {seg.brakeShift > 0 ? '+' : ''}{seg.brakeShift}m</span>
                  )}
                  {seg.throttleShift !== 0 && (
                    <span className="text-[9px] text-green-400">THR {seg.throttleShift > 0 ? '+' : ''}{seg.throttleShift}%</span>
                  )}
                  {seg.speedAdjust !== 0 && (
                    <span className="text-[9px] text-cyan-400">SPD {seg.speedAdjust > 0 ? '+' : ''}{seg.speedAdjust}mph</span>
                  )}
                  {gain > 0.001 && (
                    <span className="text-[10px] font-mono text-green-400">-{gain.toFixed(3)}s</span>
                  )}
                </div>
              </button>

              {/* Expanded Sliders */}
              {isActive && (
                <div className="bg-black/40 border border-white/5 rounded-b mx-1 p-3 space-y-3 -mt-px">
                  {/* Brake Point */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-red-400 font-medium">Brake Later</span>
                      <span className="text-[10px] font-mono text-white/50">{seg.brakeShift}m</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={20}
                      step={1}
                      value={seg.brakeShift}
                      onChange={e => updateSegment(idx, 'brakeShift', Number(e.target.value))}
                      className="w-full h-1 appearance-none bg-white/10 rounded-full cursor-pointer accent-red-500"
                    />
                    <div className="flex justify-between text-[9px] text-white/20 mt-0.5">
                      <span>0m</span>
                      <span>20m</span>
                    </div>
                  </div>

                  {/* Throttle Application */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-green-400 font-medium">Throttle Earlier</span>
                      <span className="text-[10px] font-mono text-white/50">{seg.throttleShift}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={15}
                      step={1}
                      value={seg.throttleShift}
                      onChange={e => updateSegment(idx, 'throttleShift', Number(e.target.value))}
                      className="w-full h-1 appearance-none bg-white/10 rounded-full cursor-pointer accent-green-500"
                    />
                    <div className="flex justify-between text-[9px] text-white/20 mt-0.5">
                      <span>0%</span>
                      <span>15%</span>
                    </div>
                  </div>

                  {/* Corner Speed */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-cyan-400 font-medium">Corner Speed</span>
                      <span className="text-[10px] font-mono text-white/50">+{seg.speedAdjust} mph</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      step={1}
                      value={seg.speedAdjust}
                      onChange={e => updateSegment(idx, 'speedAdjust', Number(e.target.value))}
                      className="w-full h-1 appearance-none bg-white/10 rounded-full cursor-pointer accent-cyan-500"
                    />
                    <div className="flex justify-between text-[9px] text-white/20 mt-0.5">
                      <span>0 mph</span>
                      <span>+10 mph</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      {hasAdjustments && (
        <div className="mt-3 bg-amber-500/10 border border-amber-500/30 rounded p-3">
          <div className="text-[10px] uppercase text-amber-400 font-semibold tracking-wider mb-1">Simulation Summary</div>
          <div className="text-xs text-white/60">
            {segments.filter((_, i) => (segmentGains[i] ?? 0) > 0.001).length} adjustments across{' '}
            {segments.filter((_, i) => (segmentGains[i] ?? 0) > 0.001).map(s => s.label).join(', ')}
          </div>
          <div className="text-sm text-green-400 font-mono mt-1">
            Projected: {Math.floor(projectedTime / 60)}:{(projectedTime % 60).toFixed(3).padStart(6, '0')}
            <span className="text-green-400/60 ml-2">(-{totalGain.toFixed(3)}s)</span>
          </div>
        </div>
      )}
    </div>
  );
}
