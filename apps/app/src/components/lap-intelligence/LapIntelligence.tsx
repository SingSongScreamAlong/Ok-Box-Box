/**
 * LapIntelligence
 * Main panel combining delta trace, telemetry comparison, segment analysis,
 * optimal lap model, and coaching insights. Opens when a driver is selected
 * on the Race page.
 */

import { useState, useMemo } from 'react';
import { X, ChevronDown, Zap, Target, Timer, Trophy, Users } from 'lucide-react';
import type { LapData, ComparisonMode, OptimalLap } from './types';
import { computeDeltaTrace } from '../../hooks/useLapTelemetry';
import { DeltaTrace } from './DeltaTrace';
import { TelemetryTraces } from './TelemetryTraces';
import { SegmentAnalysis } from './SegmentAnalysis';
import { TimeGainSimulator } from './TimeGainSimulator';

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
  className?: string;
}

const comparisonModes: { mode: ComparisonMode; label: string; icon: typeof Target }[] = [
  { mode: 'personal_best', label: 'vs Personal Best', icon: Trophy },
  { mode: 'session_best', label: 'vs Session Best', icon: Timer },
  { mode: 'optimal', label: 'vs Optimal Lap', icon: Zap },
  { mode: 'teammate', label: 'vs Teammate', icon: Users },
];

function formatLapTime(seconds: number | null | undefined): string {
  if (seconds == null || seconds <= 0) return '—:—.———';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toFixed(3).padStart(6, '0')}`;
}

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
  className = '',
}: LapIntelligenceProps) {
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('personal_best');
  const [selectedLapIndex, setSelectedLapIndex] = useState<number | null>(null);
  const [showModeDropdown, setShowModeDropdown] = useState(false);

  // The lap we're analyzing (default: last completed lap)
  const driverLap = selectedLapIndex !== null
    ? completedLaps[selectedLapIndex] ?? lastLap
    : lastLap;

  // The reference lap based on comparison mode
  const referenceLap = useMemo((): LapData | null => {
    switch (comparisonMode) {
      case 'personal_best':
        return personalBest;
      case 'session_best':
        // For now, session best = personal best (single driver)
        return personalBest;
      case 'teammate':
        return teammateBest ?? null;
      case 'optimal':
        // Synthesize a virtual LapData from optimal sectors
        if (!optimalLap || !personalBest) return null;
        return {
          ...personalBest,
          lapTime: optimalLap.lapTime,
          sectors: optimalLap.sectors,
          isPersonalBest: false,
          isSessionBest: false,
        };
      default:
        return personalBest;
    }
  }, [comparisonMode, personalBest, optimalLap, teammateBest]);

  // Delta trace data
  const deltaData = useMemo(() => {
    if (!driverLap || !referenceLap) return [];
    return computeDeltaTrace(driverLap, referenceLap);
  }, [driverLap, referenceLap]);

  // Total delta
  const totalDelta = driverLap && referenceLap
    ? driverLap.lapTime - referenceLap.lapTime
    : null;

  const currentModeLabel = comparisonMode === 'teammate' && teammateName
    ? `vs ${teammateName}`
    : comparisonModes.find(m => m.mode === comparisonMode)?.label ?? 'Compare';

  // No laps yet
  if (!driverLap) {
    return (
      <div className={`bg-black/90 backdrop-blur-xl border border-white/10 rounded-lg overflow-hidden ${className}`}>
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: driverColor }} />
            <h2 className="text-white font-semibold text-sm">Lap Intelligence</h2>
            <span className="text-white/40 text-xs">{driverName}</span>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-8 text-center">
          <Target size={32} className="mx-auto text-white/20 mb-3" />
          <div className="text-white/40 text-sm">Waiting for lap data...</div>
          <div className="text-white/20 text-xs mt-1">Complete a lap to see telemetry analysis</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-black/90 backdrop-blur-xl border border-white/10 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: driverColor }} />
          <h2 className="text-white font-semibold text-sm">Lap Intelligence</h2>
          <span className="text-white/40 text-xs">{driverName}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Comparison Mode Selector */}
          <div className="relative">
            <button
              onClick={() => setShowModeDropdown(!showModeDropdown)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded text-[10px] text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              {currentModeLabel}
              <ChevronDown size={10} />
            </button>
            {showModeDropdown && (
              <div className="absolute right-0 top-full mt-1 bg-black/95 border border-white/10 rounded shadow-xl z-50 min-w-[160px]">
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
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Lap Summary Bar */}
      <div className="grid grid-cols-4 gap-px bg-white/5">
        <div className="bg-black/60 p-3 text-center">
          <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Driver Lap</div>
          <div className="text-lg font-mono text-white">{formatLapTime(driverLap.lapTime)}</div>
          <div className="text-[10px] text-white/30">Lap {driverLap.lapNumber}</div>
        </div>
        <div className="bg-black/60 p-3 text-center">
          <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Reference</div>
          <div className="text-lg font-mono text-white/60">{referenceLap ? formatLapTime(referenceLap.lapTime) : '—'}</div>
          <div className="text-[10px] text-white/30">{currentModeLabel}</div>
        </div>
        <div className="bg-black/60 p-3 text-center">
          <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Delta</div>
          <div className={`text-lg font-mono ${
            totalDelta === null ? 'text-white/40'
            : totalDelta > 0 ? 'text-red-400'
            : totalDelta < 0 ? 'text-green-400'
            : 'text-white'
          }`}>
            {totalDelta !== null ? `${totalDelta > 0 ? '+' : ''}${totalDelta.toFixed(3)}s` : '—'}
          </div>
        </div>
        <div className="bg-black/60 p-3 text-center">
          <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Optimal</div>
          <div className="text-lg font-mono text-purple-400">
            {optimalLap ? formatLapTime(optimalLap.lapTime) : '—'}
          </div>
          {optimalLap && driverLap && (
            <div className="text-[10px] text-purple-400/60">
              {(driverLap.lapTime - optimalLap.lapTime).toFixed(3)}s potential
            </div>
          )}
        </div>
      </div>

      {/* Lap Selector */}
      {completedLaps.length > 1 && (
        <div className="px-4 pt-3">
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {completedLaps.map((lap, idx) => (
              <button
                key={lap.lapNumber}
                onClick={() => setSelectedLapIndex(idx)}
                className={`flex-shrink-0 px-2 py-1 text-[10px] font-mono rounded transition-colors ${
                  (selectedLapIndex === idx || (selectedLapIndex === null && idx === completedLaps.length - 1))
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : lap.isPersonalBest
                    ? 'bg-purple-500/10 text-purple-400/60 border border-purple-500/20'
                    : 'bg-white/5 text-white/40 border border-transparent hover:bg-white/10'
                }`}
              >
                L{lap.lapNumber}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="p-4 space-y-4 max-h-[calc(100vh-280px)] overflow-y-auto">
        {/* No teammate data notice */}
        {comparisonMode === 'teammate' && !teammateBest && (
          <div className="bg-cyan-500/10 border border-cyan-500/20 rounded p-3 text-center">
            <Users size={16} className="mx-auto text-cyan-400/40 mb-1" />
            <div className="text-[10px] text-cyan-400/60">No teammate lap data available</div>
            <div className="text-[9px] text-white/30 mt-0.5">Teammate must be running a relay in the same session</div>
          </div>
        )}

        {/* Delta Trace */}
        {deltaData.length > 0 && (
          <DeltaTrace data={deltaData} />
        )}

        {/* Telemetry Traces */}
        <TelemetryTraces
          driverLap={driverLap}
          referenceLap={referenceLap}
        />

        {/* Segment Analysis */}
        {referenceLap && (
          <SegmentAnalysis
            driverLap={driverLap}
            referenceLap={referenceLap}
            corners={corners}
          />
        )}

        {/* Time Gain Simulator */}
        <TimeGainSimulator
          lap={driverLap}
          corners={corners}
        />

        {/* Sector Breakdown */}
        {driverLap.sectors.length > 0 && (
          <div>
            <div className="text-[10px] uppercase text-white/40 tracking-wider font-semibold mb-2">Sector Times</div>
            <div className="grid grid-cols-3 gap-2">
              {driverLap.sectors.map((sector, i) => {
                const refSector = referenceLap?.sectors[i];
                const delta = refSector ? sector.time - refSector.time : null;
                const isBest = optimalLap?.sourceLaps[i] === driverLap.lapNumber;
                return (
                  <div
                    key={sector.sector}
                    className={`p-2 rounded text-center ${
                      isBest ? 'bg-purple-500/15 border border-purple-500/30' : 'bg-white/[0.03] border border-white/5'
                    }`}
                  >
                    <div className="text-[10px] text-white/40 mb-1">S{sector.sector}</div>
                    <div className="text-sm font-mono text-white">{sector.time.toFixed(3)}s</div>
                    {delta !== null && (
                      <div className={`text-[10px] font-mono ${delta > 0 ? 'text-red-400' : delta < 0 ? 'text-green-400' : 'text-white/30'}`}>
                        {delta > 0 ? '+' : ''}{delta.toFixed(3)}s
                      </div>
                    )}
                    {isBest && <div className="text-[9px] text-purple-400 mt-0.5">★ Best</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
