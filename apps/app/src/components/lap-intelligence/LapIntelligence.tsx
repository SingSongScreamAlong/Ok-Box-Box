/**
 * LapIntelligence — F1 Broadcast-Style Lap Time Analysis
 * Inspired by the F1 TV AWS "Lap Time Analysis" graphic.
 * Two-driver side-by-side comparison with track map center,
 * segment delta bars, and speed trace overlay.
 */

import { useState, useMemo } from 'react';
import { X, ChevronDown, ChevronUp, Zap, Target, Timer, Trophy, Users } from 'lucide-react';
import type { LapData, ComparisonMode, OptimalLap } from './types';
import { computeDeltaTrace, speedAtDistance } from '../../hooks/useLapTelemetry';
import { useTrackData, type TrackShape } from '../../hooks/useTrackData';
import { getTrackId } from '../../data/tracks';
import { SpeedMap } from './SpeedMap';
import { DeltaTrace } from './DeltaTrace';
import { TelemetryTraces } from './TelemetryTraces';
import { SegmentAnalysis } from './SegmentAnalysis';
import { TimeGainSimulator } from './TimeGainSimulator';

/* ─── Props ──────────────────────────────────────────────── */

interface LapIntelligenceProps {
  driverName: string;
  driverColor: string;
  completedLaps: LapData[];
  personalBest: LapData | null;
  lastLap: LapData | null;
  optimalLap: OptimalLap | null;
  teammateBest?: LapData | null;
  teammateName?: string;
  onClose: () => void;
  corners?: { name: string; distPct: number }[];
  trackId?: string;
  trackName?: string;
  sessionName?: string;
  className?: string;
}

/* ─── Comparison Modes ───────────────────────────────────── */

const comparisonModes: { mode: ComparisonMode; label: string; icon: typeof Target }[] = [
  { mode: 'personal_best', label: 'Personal Best', icon: Trophy },
  { mode: 'session_best', label: 'Session Best', icon: Timer },
  { mode: 'optimal', label: 'Optimal Lap', icon: Zap },
  { mode: 'teammate', label: 'Teammate', icon: Users },
];

/* ─── Helpers ────────────────────────────────────────────── */

function formatLapTime(seconds: number | null | undefined): string {
  if (seconds == null || seconds <= 0) return '—:—.———';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toFixed(3).padStart(6, '0')}`;
}

function computeDrivingStats(lap: LapData) {
  const { samples } = lap;
  if (samples.length === 0) return { fullThrottle: 0, heavyBraking: 0, cornering: 0 };
  let ft = 0, hb = 0, co = 0;
  for (const s of samples) {
    if (s.throttle > 0.9) ft++;
    if (s.brake > 0.5) hb++;
    if (s.throttle < 0.5 && s.brake < 0.3) co++;
  }
  const n = samples.length;
  return {
    fullThrottle: Math.round((ft / n) * 100),
    heavyBraking: Math.round((hb / n) * 100),
    cornering: Math.round((co / n) * 100),
  };
}

interface SegDelta { label: string; delta: number }

function computeSegmentDeltas(
  driverLap: LapData,
  referenceLap: LapData,
  corners?: { name: string; distPct: number }[]
): SegDelta[] {
  const segCount = (corners && corners.length > 0) ? corners.length : 10;
  const result: SegDelta[] = [];

  for (let i = 0; i < segCount; i++) {
    let startDist: number, endDist: number, label: string;

    if (corners && corners.length > 0) {
      label = corners[i].name;
      startDist = i === 0 ? 0 : (corners[i - 1].distPct + corners[i].distPct) / 2;
      endDist = i === segCount - 1 ? 1 : (corners[i].distPct + corners[i + 1].distPct) / 2;
    } else {
      label = `S${i + 1}`;
      startDist = i / segCount;
      endDist = (i + 1) / segCount;
    }

    const dSamples = driverLap.samples.filter(s => s.distance >= startDist && s.distance <= endDist);
    const rSamples = referenceLap.samples.filter(s => s.distance >= startDist && s.distance <= endDist);

    if (dSamples.length < 2 || rSamples.length < 2) {
      result.push({ label, delta: 0 });
      continue;
    }

    const dTotal = driverLap.samples[driverLap.samples.length - 1]?.timestamp || 1;
    const rTotal = referenceLap.samples[referenceLap.samples.length - 1]?.timestamp || 1;

    const dTime = ((dSamples[dSamples.length - 1].timestamp - dSamples[0].timestamp) / dTotal) * driverLap.lapTime;
    const rTime = ((rSamples[rSamples.length - 1].timestamp - rSamples[0].timestamp) / rTotal) * referenceLap.lapTime;

    result.push({ label, delta: dTime - rTime });
  }
  return result;
}

const TRACE_RES = 200;

function resampleSpeed(lap: LapData): number[] {
  const values: number[] = [];
  for (let i = 0; i <= TRACE_RES; i++) {
    values.push(speedAtDistance(lap.samples, i / TRACE_RES));
  }
  return values;
}

/* ─── Sub-components ─────────────────────────────────────── */

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[9px] text-white/40 uppercase tracking-wider font-medium">{label}</span>
        <span className="text-[10px] font-mono text-white/70 font-bold">{value}%</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${value}%`, backgroundColor: color, opacity: 0.7 }}
        />
      </div>
    </div>
  );
}

function MiniTrackSVG({ shape, driverLap }: { shape: TrackShape; driverLap: LapData }) {
  const { xMin, xMax, yMin, yMax } = shape.bounds;
  const w = xMax - xMin;
  const h = yMax - yMin;
  const pad = 0.15;
  const vb = `${xMin - w * pad} ${yMin - h * pad} ${w * (1 + 2 * pad)} ${h * (1 + 2 * pad)}`;
  const trackPath = shape.centerline.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`
  ).join(' ') + ' Z';

  return (
    <svg viewBox={vb} className="w-full h-full max-h-[220px]" preserveAspectRatio="xMidYMid meet">
      <path d={trackPath} fill="none" stroke="rgba(6,182,212,0.12)" strokeWidth="12" />
      <path d={trackPath} fill="none" stroke="rgba(6,182,212,0.35)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <SpeedMap shape={shape} lap={driverLap} />
    </svg>
  );
}

/* ─── Main Component ─────────────────────────────────────── */

export function LapIntelligence({
  driverName,
  driverColor,
  completedLaps,
  personalBest,
  lastLap,
  optimalLap,
  teammateBest,
  teammateName,
  onClose,
  corners,
  trackId,
  trackName,
  sessionName,
  className = '',
}: LapIntelligenceProps) {
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('personal_best');
  const [selectedLapIndex, setSelectedLapIndex] = useState<number | null>(null);
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [showDetailed, setShowDetailed] = useState(false);

  // Track shape for mini map
  const resolvedTrackId = trackId ? getTrackId(trackId) : undefined;
  const { shape: trackShape } = useTrackData(resolvedTrackId);

  // The lap we're analyzing (default: last completed lap)
  const driverLap = selectedLapIndex !== null
    ? completedLaps[selectedLapIndex] ?? lastLap
    : lastLap;

  // Reference lap based on comparison mode
  const referenceLap = useMemo((): LapData | null => {
    switch (comparisonMode) {
      case 'personal_best': return personalBest;
      case 'session_best': return personalBest;
      case 'teammate': return teammateBest ?? null;
      case 'optimal':
        if (!optimalLap || !personalBest) return null;
        return { ...personalBest, lapTime: optimalLap.lapTime, sectors: optimalLap.sectors, isPersonalBest: false, isSessionBest: false };
      default: return personalBest;
    }
  }, [comparisonMode, personalBest, optimalLap, teammateBest]);

  // Delta trace
  const deltaData = useMemo(() => {
    if (!driverLap || !referenceLap) return [];
    return computeDeltaTrace(driverLap, referenceLap);
  }, [driverLap, referenceLap]);

  // Total delta
  const totalDelta = driverLap && referenceLap ? driverLap.lapTime - referenceLap.lapTime : null;

  // Driving stats
  const driverStats = useMemo(() => driverLap ? computeDrivingStats(driverLap) : null, [driverLap]);
  const refStats = useMemo(() => referenceLap ? computeDrivingStats(referenceLap) : null, [referenceLap]);

  // Segment deltas
  const segmentDeltas = useMemo(() => {
    if (!driverLap || !referenceLap) return [];
    return computeSegmentDeltas(driverLap, referenceLap, corners);
  }, [driverLap, referenceLap, corners]);

  // Speed traces
  const driverSpeeds = useMemo(() => driverLap ? resampleSpeed(driverLap) : [], [driverLap]);
  const refSpeeds = useMemo(() => referenceLap ? resampleSpeed(referenceLap) : [], [referenceLap]);

  const modeLabel = comparisonMode === 'teammate' && teammateName
    ? teammateName
    : comparisonModes.find(m => m.mode === comparisonMode)?.label ?? 'Reference';

  /* ─── Empty state ─────────────────────────────────────── */
  if (!driverLap) {
    return (
      <div className={`bg-[#0a1628] border border-cyan-500/20 rounded-lg overflow-hidden ${className}`}>
        <div className="flex items-center justify-between px-6 py-3 bg-[#0d1b2a] border-b border-cyan-500/10">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-5 bg-red-500 rounded-sm" />
            <span className="text-white font-bold text-xs tracking-widest uppercase">LAP TIME ANALYSIS</span>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-12 text-center">
          <Target size={40} className="mx-auto text-cyan-500/20 mb-4" />
          <div className="text-white/40 text-sm">Waiting for lap data...</div>
          <div className="text-white/20 text-xs mt-1">Complete a lap to see telemetry analysis</div>
        </div>
      </div>
    );
  }

  /* ─── Speed trace SVG helpers ─────────────────────────── */
  const allSpeeds = [...driverSpeeds, ...(refSpeeds.length > 0 ? refSpeeds : [])];
  const speedMin = allSpeeds.length > 0 ? Math.min(...allSpeeds) : 0;
  const speedMax = allSpeeds.length > 0 ? Math.max(...allSpeeds) : 1;
  const speedRange = speedMax - speedMin || 1;
  const TW = 1000;
  const TH = 100;

  function toPolyline(speeds: number[]): string {
    return speeds.map((s, i) => {
      const x = (i / TRACE_RES) * TW;
      const y = TH - ((s - speedMin) / speedRange) * (TH - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }

  // Segment bar dims
  const maxAbsDelta = Math.max(0.01, ...segmentDeltas.map(s => Math.abs(s.delta)));
  const BH = 100;
  const BCY = BH / 2;

  /* ─── RENDER ──────────────────────────────────────────── */
  return (
    <div className={`bg-[#0a1628] border border-cyan-500/20 rounded-lg overflow-hidden ${className}`}>
      {/* ─── HEADER BAR ──────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-2.5 bg-[#0d1b2a] border-b border-cyan-500/10">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-5 bg-red-500 rounded-sm" />
          <span className="text-white font-bold text-[11px] tracking-widest uppercase">
            {trackName || 'Circuit'} • {sessionName || 'Session'} • LAP TIME ANALYSIS
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Comparison mode selector */}
          <div className="relative">
            <button
              onClick={() => setShowModeDropdown(!showModeDropdown)}
              className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded text-[10px] text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              vs {modeLabel}
              <ChevronDown size={10} />
            </button>
            {showModeDropdown && (
              <div className="absolute right-0 top-full mt-1 bg-[#0d1b2a] border border-cyan-500/20 rounded shadow-xl z-50 min-w-[160px]">
                {comparisonModes.map(m => (
                  <button
                    key={m.mode}
                    onClick={() => { setComparisonMode(m.mode); setShowModeDropdown(false); }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-white/10 transition-colors flex items-center gap-2 ${
                      comparisonMode === m.mode ? 'text-cyan-400' : 'text-white/60'
                    }`}
                  >
                    <m.icon size={12} />
                    {m.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Lap selector pills */}
          {completedLaps.length > 1 && (
            <div className="flex items-center gap-0.5">
              {completedLaps.slice(-8).map((lap, i) => {
                const realIdx = Math.max(0, completedLaps.length - 8) + i;
                const isSel = selectedLapIndex === realIdx || (selectedLapIndex === null && realIdx === completedLaps.length - 1);
                return (
                  <button
                    key={lap.lapNumber}
                    onClick={() => setSelectedLapIndex(realIdx)}
                    className={`px-1.5 py-0.5 text-[9px] font-mono rounded transition-colors ${
                      isSel
                        ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/40'
                        : lap.isPersonalBest
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : 'text-white/30 hover:text-white/60 border border-transparent'
                    }`}
                  >
                    L{lap.lapNumber}
                  </button>
                );
              })}
            </div>
          )}

          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors ml-1">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* ─── 3-COLUMN: DRIVER | TRACK MAP | REFERENCE ──── */}
      <div className="grid grid-cols-[1fr_1.2fr_1fr] border-b border-white/5">
        {/* LEFT — Driver Panel */}
        <div className="p-4 border-r border-white/5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-8 rounded-sm" style={{ backgroundColor: driverColor }} />
            <div>
              <div className="text-[9px] text-white/40 uppercase tracking-widest">DRIVER</div>
              <div className="text-white font-bold text-sm leading-tight">{driverName}</div>
            </div>
          </div>
          <div className="mb-4">
            <div className="text-[9px] text-white/30 uppercase tracking-widest mb-0.5">LAP TIME</div>
            <div className="text-2xl font-mono font-bold text-white tracking-tight leading-none">
              {formatLapTime(driverLap.lapTime)}
            </div>
            {totalDelta !== null && (
              <div className={`text-sm font-mono font-bold mt-1 ${
                totalDelta < 0 ? 'text-green-400' : totalDelta > 0 ? 'text-red-400' : 'text-white/40'
              }`}>
                {totalDelta > 0 ? '+' : ''}{totalDelta.toFixed(3)}s
              </div>
            )}
          </div>
          {driverStats && (
            <div className="space-y-2.5">
              <StatBar label="FULL THROTTLE" value={driverStats.fullThrottle} color="#22c55e" />
              <StatBar label="HEAVY BRAKING" value={driverStats.heavyBraking} color="#ef4444" />
              <StatBar label="CORNERING" value={driverStats.cornering} color="#3b82f6" />
            </div>
          )}
        </div>

        {/* CENTER — Track Map */}
        <div className="p-3 flex items-center justify-center bg-[#080f1e]">
          {trackShape ? (
            <MiniTrackSVG shape={trackShape} driverLap={driverLap} />
          ) : (
            <div className="text-white/15 text-xs text-center">
              <Target size={28} className="mx-auto mb-2 text-cyan-500/15" />
              No track map available
            </div>
          )}
        </div>

        {/* RIGHT — Reference Panel */}
        <div className="p-4 border-l border-white/5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-8 rounded-sm bg-slate-500" />
            <div>
              <div className="text-[9px] text-white/40 uppercase tracking-widest">REFERENCE</div>
              <div className="text-white/70 font-bold text-sm leading-tight">{modeLabel}</div>
            </div>
          </div>
          <div className="mb-4">
            <div className="text-[9px] text-white/30 uppercase tracking-widest mb-0.5">LAP TIME</div>
            <div className="text-2xl font-mono font-bold text-white/60 tracking-tight leading-none">
              {referenceLap ? formatLapTime(referenceLap.lapTime) : '—:—.———'}
            </div>
            {totalDelta !== null && referenceLap && (
              <div className={`text-sm font-mono font-bold mt-1 ${
                totalDelta > 0 ? 'text-green-400' : totalDelta < 0 ? 'text-red-400' : 'text-white/40'
              }`}>
                {totalDelta < 0 ? '+' : totalDelta > 0 ? '-' : ''}{Math.abs(totalDelta).toFixed(3)}s
              </div>
            )}
          </div>
          {refStats ? (
            <div className="space-y-2.5">
              <StatBar label="FULL THROTTLE" value={refStats.fullThrottle} color="#22c55e" />
              <StatBar label="HEAVY BRAKING" value={refStats.heavyBraking} color="#ef4444" />
              <StatBar label="CORNERING" value={refStats.cornering} color="#3b82f6" />
            </div>
          ) : comparisonMode === 'teammate' && !teammateBest ? (
            <div className="text-center py-6">
              <Users size={20} className="mx-auto text-cyan-400/20 mb-2" />
              <div className="text-[10px] text-white/25">No teammate data</div>
              <div className="text-[9px] text-white/15 mt-0.5">Needs relay in same session</div>
            </div>
          ) : null}
        </div>
      </div>

      {/* ─── SEGMENT DELTA BARS ──────────────────────────── */}
      {segmentDeltas.length > 0 && (
        <div className="px-4 py-2 border-b border-white/5">
          <svg
            viewBox={`0 0 ${TW} ${BH + 22}`}
            className="w-full"
            style={{ height: 110 }}
            preserveAspectRatio="none"
          >
            {/* Center baseline */}
            <line x1="0" y1={BCY} x2={TW} y2={BCY} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

            {segmentDeltas.map((seg, i) => {
              const slotW = TW / segmentDeltas.length;
              const barW = slotW * 0.65;
              const x = i * slotW + (slotW - barW) / 2;
              const barH = (Math.abs(seg.delta) / maxAbsDelta) * (BH / 2 - 4);
              const isGain = seg.delta < 0;
              const y = isGain ? BCY - barH : BCY;

              return (
                <g key={i}>
                  <rect
                    x={x} y={y} width={barW} height={Math.max(1, barH)}
                    fill={isGain ? 'rgba(59,130,246,0.6)' : 'rgba(147,197,253,0.35)'}
                    rx="2"
                  />
                  {/* Segment label */}
                  <text
                    x={x + barW / 2} y={BH + 6}
                    textAnchor="middle" fill="rgba(255,255,255,0.25)"
                    fontSize="7" fontFamily="monospace"
                  >
                    {seg.label.length > 5 ? seg.label.slice(0, 5) : seg.label}
                  </text>
                  {/* Delta value */}
                  <text
                    x={x + barW / 2} y={BH + 16}
                    textAnchor="middle"
                    fill={isGain ? 'rgba(34,197,94,0.8)' : seg.delta > 0.005 ? 'rgba(239,68,68,0.7)' : 'rgba(255,255,255,0.2)'}
                    fontSize="7" fontFamily="monospace"
                  >
                    {seg.delta > 0 ? '+' : ''}{seg.delta.toFixed(3)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {/* ─── SPEED COMPARISON TRACE ──────────────────────── */}
      {driverSpeeds.length > 0 && (
        <div className="px-4 py-2 border-b border-white/5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] text-white/25 uppercase tracking-wider font-medium">Speed</span>
            <div className="flex items-center gap-3 text-[9px]">
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-[2px] rounded" style={{ backgroundColor: driverColor }} />
                <span className="text-white/35">{driverName}</span>
              </span>
              {referenceLap && (
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-[2px] rounded bg-slate-400/50" />
                  <span className="text-white/25">{modeLabel}</span>
                </span>
              )}
            </div>
          </div>
          <svg
            viewBox={`0 0 ${TW} ${TH}`}
            className="w-full"
            style={{ height: 70 }}
            preserveAspectRatio="none"
          >
            {/* Quarter grid lines */}
            {[0.25, 0.5, 0.75].map(p => (
              <line key={p} x1={p * TW} y1={0} x2={p * TW} y2={TH} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            ))}
            {/* Reference speed line */}
            {refSpeeds.length > 0 && (
              <polyline points={toPolyline(refSpeeds)} fill="none" stroke="rgba(148,163,184,0.4)" strokeWidth="1.5" />
            )}
            {/* Driver speed line */}
            <polyline points={toPolyline(driverSpeeds)} fill="none" stroke={driverColor} strokeWidth="2" />
            {/* Speed labels */}
            <text x="4" y="10" fill="rgba(255,255,255,0.15)" fontSize="8" fontFamily="monospace">{Math.round(speedMax)}</text>
            <text x="4" y={TH - 3} fill="rgba(255,255,255,0.15)" fontSize="8" fontFamily="monospace">{Math.round(speedMin)}</text>
          </svg>
        </div>
      )}

      {/* ─── SECTOR BREAKDOWN (inline) ───────────────────── */}
      {driverLap.sectors.length > 0 && (
        <div className="px-4 py-2 border-b border-white/5">
          <div className="flex items-center gap-3">
            {driverLap.sectors.map((sector, i) => {
              const refSector = referenceLap?.sectors[i];
              const delta = refSector ? sector.time - refSector.time : null;
              const isBest = optimalLap?.sourceLaps[i] === driverLap.lapNumber;
              return (
                <div
                  key={sector.sector}
                  className={`flex-1 py-1.5 px-2 rounded text-center ${
                    isBest ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-white/[0.02] border border-white/5'
                  }`}
                >
                  <div className="text-[9px] text-white/30 font-medium">S{sector.sector}</div>
                  <div className="text-xs font-mono text-white/80">{sector.time.toFixed(3)}</div>
                  {delta !== null && (
                    <div className={`text-[9px] font-mono ${delta > 0.005 ? 'text-red-400/70' : delta < -0.005 ? 'text-green-400/70' : 'text-white/20'}`}>
                      {delta > 0 ? '+' : ''}{delta.toFixed(3)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── DETAILED ANALYSIS (collapsible) ─────────────── */}
      <div>
        <button
          onClick={() => setShowDetailed(!showDetailed)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-[10px] text-white/30 hover:text-white/50 transition-colors uppercase tracking-widest"
        >
          {showDetailed ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {showDetailed ? 'Hide' : 'Show'} Detailed Analysis
        </button>

        {showDetailed && (
          <div className="px-4 pb-4 space-y-4 max-h-[400px] overflow-y-auto border-t border-white/5">
            {deltaData.length > 0 && <DeltaTrace data={deltaData} />}
            <TelemetryTraces driverLap={driverLap} referenceLap={referenceLap} />
            {referenceLap && <SegmentAnalysis driverLap={driverLap} referenceLap={referenceLap} corners={corners} />}
            <TimeGainSimulator lap={driverLap} corners={corners} />
          </div>
        )}
      </div>
    </div>
  );
}
