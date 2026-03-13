/**
 * PerformanceConfidenceMeter — Synthesized confidence gauge for Home
 * 
 * Combines CPI index, behavioral stability, and iRating trend direction
 * into a single visual confidence signal.
 * 
 * Phase 0: Uses existing CPI + behavioral data
 * TODO Phase 1: Add fatigue model input, session recency weighting
 */

import { Gauge } from 'lucide-react';

const ORBITRON = { fontFamily: 'Orbitron, sans-serif' };

interface ConfidenceMeterProps {
  /** CPI index 0-100 */
  cpiIndex: number | null;
  /** Behavioral stability 0-100 (from telemetry indices) */
  behavioralStability: number | null;
  /** iRating delta over recent window */
  iRatingDelta: number | null;
  /** Number of sessions in the sample */
  sampleSize: number;
}

function getConfidenceLevel(score: number): { label: string; color: string; ringColor: string } {
  if (score >= 75) return { label: 'High', color: 'text-green-400', ringColor: '#22c55e' };
  if (score >= 55) return { label: 'Moderate', color: 'text-blue-400', ringColor: '#3b82f6' };
  if (score >= 35) return { label: 'Building', color: 'text-yellow-400', ringColor: '#eab308' };
  return { label: 'Low', color: 'text-red-400', ringColor: '#ef4444' };
}

export function PerformanceConfidenceMeter({
  cpiIndex,
  behavioralStability,
  iRatingDelta,
  sampleSize,
}: ConfidenceMeterProps) {
  // Need at least CPI to render
  if (cpiIndex === null || sampleSize < 3) return null;

  // Synthesize confidence score:
  // - CPI contributes 50% (primary signal)
  // - Behavioral stability contributes 30% (if available)
  // - iRating momentum contributes 20%
  const cpiComponent = cpiIndex * 0.5;
  const behavioralComponent = behavioralStability !== null
    ? behavioralStability * 0.3
    : cpiIndex * 0.3; // fallback to CPI weight if no telemetry
  const momentumComponent = iRatingDelta !== null
    ? Math.max(0, Math.min(100, 50 + (iRatingDelta / 4))) * 0.2
    : 50 * 0.2; // neutral if no data

  const confidence = Math.round(cpiComponent + behavioralComponent + momentumComponent);
  const level = getConfidenceLevel(confidence);

  // SVG ring parameters
  const size = 64;
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, confidence));
  const offset = circumference - (progress / 100) * circumference;

  const hasTelemetry = behavioralStability !== null;
  const dataLabel = hasTelemetry
    ? `Telemetry + ${sampleSize} races`
    : `${sampleSize} races analyzed`;

  return (
    <div className="border border-white/10 bg-[#0e0e0e]/80 backdrop-blur-sm">
      <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2">
        <Gauge className="w-3.5 h-3.5 text-white/30" />
        <h2 className="text-sm uppercase tracking-[0.15em] text-white/60" style={ORBITRON}>Performance Confidence</h2>
      </div>
      <div className="px-5 py-4 flex items-center gap-5">
        {/* Ring gauge */}
        <div className="relative flex-shrink-0">
          <svg width={size} height={size} className="transform -rotate-90">
            {/* Background ring */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={strokeWidth}
            />
            {/* Progress ring */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={level.ringColor}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-lg font-bold font-mono ${level.color}`}>{confidence}</span>
          </div>
        </div>

        {/* Labels */}
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-semibold uppercase tracking-wider ${level.color}`} style={ORBITRON}>
            {level.label}
          </div>
          <div className="text-[10px] text-white/30 mt-1">{dataLabel}</div>
          <div className="flex items-center gap-3 mt-2 text-[9px] text-white/20">
            <span>CPI: {cpiIndex}</span>
            {hasTelemetry && <span>Stability: {behavioralStability}%</span>}
            {iRatingDelta !== null && (
              <span className={iRatingDelta > 0 ? 'text-green-400/50' : iRatingDelta < 0 ? 'text-red-400/50' : ''}>
                iR: {iRatingDelta > 0 ? '+' : ''}{iRatingDelta}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
