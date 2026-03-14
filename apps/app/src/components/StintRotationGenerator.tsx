/**
 * StintRotationGenerator — Auto-generate optimal stint rotations
 *
 * Constraint-based solver that distributes stints across drivers based on:
 * - Driver max stint length preferences
 * - Fuel window constraints
 * - Fair drive-time distribution
 * - Driver strength matching (fast drivers at critical stints)
 *
 * Phase 4c: Frontend-only constraint solver
 * TODO Phase 4c+: Server-side optimization with more advanced heuristics
 */

import { useState, useMemo, useCallback } from 'react';
import {
  RotateCcw, Users, Fuel, Clock, CheckCircle2,
  AlertTriangle, ChevronDown, ChevronUp, Zap,
  Shuffle, Settings
} from 'lucide-react';

const ORBITRON = { fontFamily: 'Orbitron, sans-serif' };

interface DriverConfig {
  id: string;
  name: string;
  avgLapTime: number;      // seconds
  fuelPerLap: number;       // liters
  maxStintLaps: number;     // max laps per stint
  preferredPosition: 'start' | 'middle' | 'end' | 'any';
  strengthRating: number;   // 1-10 (used for critical stint assignment)
}

interface RaceParams {
  totalLaps: number;
  fuelCapacity: number;     // liters
  pitLossSeconds: number;   // time lost per pit stop
  minPitStops: number;
  tireDegLaps: number;      // laps before significant tire deg
}

interface GeneratedStint {
  stintNumber: number;
  driverId: string;
  driverName: string;
  startLap: number;
  endLap: number;
  laps: number;
  fuelRequired: number;
  estimatedTime: string;
  isCritical: boolean;
  notes: string;
}

interface StintPlan {
  stints: GeneratedStint[];
  totalPitStops: number;
  estimatedRaceTime: string;
  fairnessScore: number;    // 0-100, how evenly distributed drive time is
  warnings: string[];
}

function generateStintPlan(
  drivers: DriverConfig[],
  race: RaceParams,
): StintPlan {
  if (drivers.length === 0) {
    return { stints: [], totalPitStops: 0, estimatedRaceTime: '0:00', fairnessScore: 0, warnings: ['No drivers configured'] };
  }

  const warnings: string[] = [];

  // Calculate fuel window (max laps per stint based on fuel)
  const avgFuelPerLap = drivers.reduce((sum, d) => sum + d.fuelPerLap, 0) / drivers.length;
  const fuelWindowLaps = Math.floor(race.fuelCapacity / avgFuelPerLap);

  // Calculate effective max stint for each driver
  const effectiveMax = drivers.map(d => {
    const fuelMax = Math.floor(race.fuelCapacity / d.fuelPerLap);
    return Math.min(d.maxStintLaps, fuelMax, race.tireDegLaps);
  });

  // Determine number of stints needed
  const avgMaxStint = effectiveMax.reduce((a, b) => a + b, 0) / effectiveMax.length;
  const minStints = Math.max(race.minPitStops + 1, Math.ceil(race.totalLaps / avgMaxStint));
  const numStints = Math.max(minStints, drivers.length); // at least one stint per driver

  // Target laps per stint (evenly distributed)
  const baseLapsPerStint = Math.floor(race.totalLaps / numStints);
  let remainder = race.totalLaps - (baseLapsPerStint * numStints);

  // Assign drivers to stints using round-robin weighted by strength
  const stints: GeneratedStint[] = [];
  let currentLap = 1;

  // Sort drivers by preference: start-preferring first, end-preferring last
  const driverOrder = [...drivers].sort((a, b) => {
    const order = { start: 0, any: 1, middle: 1, end: 2 };
    return (order[a.preferredPosition] ?? 1) - (order[b.preferredPosition] ?? 1);
  });

  // Create driver rotation
  const rotation: DriverConfig[] = [];
  for (let i = 0; i < numStints; i++) {
    rotation.push(driverOrder[i % driverOrder.length]);
  }

  // If we have end-preferring drivers, swap them to the last stints
  const endDrivers = drivers.filter(d => d.preferredPosition === 'end');
  if (endDrivers.length > 0) {
    for (let i = 0; i < endDrivers.length && i < rotation.length; i++) {
      const lastIdx = rotation.length - 1 - i;
      const existingIdx = rotation.findIndex(d => d.id === endDrivers[i].id);
      if (existingIdx !== -1 && existingIdx !== lastIdx) {
        [rotation[existingIdx], rotation[lastIdx]] = [rotation[lastIdx], rotation[existingIdx]];
      }
    }
  }

  // Assign stints
  for (let i = 0; i < numStints; i++) {
    const driver = rotation[i];
    const driverEffMax = effectiveMax[drivers.findIndex(d => d.id === driver.id)];
    let stintLaps = baseLapsPerStint + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;

    // Clamp to driver's effective max
    if (stintLaps > driverEffMax) {
      warnings.push(`${driver.name}'s stint ${i + 1} clamped from ${stintLaps} to ${driverEffMax} laps (fuel/tire limit)`);
      stintLaps = driverEffMax;
    }

    const fuelRequired = stintLaps * driver.fuelPerLap;
    const timeSeconds = stintLaps * driver.avgLapTime;
    const isCritical = i === 0 || i === numStints - 1; // first and last stints are critical

    stints.push({
      stintNumber: i + 1,
      driverId: driver.id,
      driverName: driver.name,
      startLap: currentLap,
      endLap: currentLap + stintLaps - 1,
      laps: stintLaps,
      fuelRequired: Math.round(fuelRequired * 10) / 10,
      estimatedTime: formatTime(timeSeconds),
      isCritical,
      notes: isCritical ? (i === 0 ? 'Race start — cold tires, congestion' : 'Final stint — championship pressure') : '',
    });

    currentLap += stintLaps;
  }

  // Verify total laps covered
  const coveredLaps = stints.reduce((sum, s) => sum + s.laps, 0);
  if (coveredLaps < race.totalLaps) {
    // Distribute remaining laps to last stint
    const lastStint = stints[stints.length - 1];
    lastStint.endLap += (race.totalLaps - coveredLaps);
    lastStint.laps += (race.totalLaps - coveredLaps);
    lastStint.fuelRequired = Math.round(lastStint.laps * drivers.find(d => d.id === lastStint.driverId)!.fuelPerLap * 10) / 10;
    lastStint.estimatedTime = formatTime(lastStint.laps * drivers.find(d => d.id === lastStint.driverId)!.avgLapTime);
  }

  // Calculate fairness (how evenly distributed is drive time)
  const driverLaps = new Map<string, number>();
  for (const s of stints) {
    driverLaps.set(s.driverId, (driverLaps.get(s.driverId) || 0) + s.laps);
  }
  const lapCounts = [...driverLaps.values()];
  const avgLaps = lapCounts.reduce((a, b) => a + b, 0) / lapCounts.length;
  const maxDeviation = Math.max(...lapCounts.map(c => Math.abs(c - avgLaps)));
  const fairnessScore = Math.round(Math.max(0, 100 - (maxDeviation / avgLaps) * 100));

  // Fuel warnings
  for (const s of stints) {
    if (s.fuelRequired > race.fuelCapacity) {
      warnings.push(`Stint ${s.stintNumber} requires ${s.fuelRequired}L but tank is ${race.fuelCapacity}L`);
    }
  }

  // Total race time estimate
  const totalRaceSeconds = stints.reduce((sum, s) => {
    const driver = drivers.find(d => d.id === s.driverId)!;
    return sum + (s.laps * driver.avgLapTime);
  }, 0) + ((stints.length - 1) * race.pitLossSeconds);

  return {
    stints,
    totalPitStops: stints.length - 1,
    estimatedRaceTime: formatTime(totalRaceSeconds),
    fairnessScore,
    warnings,
  };
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function StintRotationGenerator() {
  const [showConfig, setShowConfig] = useState(false);
  const [drivers, setDrivers] = useState<DriverConfig[]>([
    { id: '1', name: 'Driver 1', avgLapTime: 95, fuelPerLap: 3.2, maxStintLaps: 30, preferredPosition: 'start', strengthRating: 7 },
    { id: '2', name: 'Driver 2', avgLapTime: 96, fuelPerLap: 3.3, maxStintLaps: 28, preferredPosition: 'any', strengthRating: 6 },
    { id: '3', name: 'Driver 3', avgLapTime: 97, fuelPerLap: 3.1, maxStintLaps: 32, preferredPosition: 'end', strengthRating: 8 },
  ]);
  const [raceParams, setRaceParams] = useState<RaceParams>({
    totalLaps: 120,
    fuelCapacity: 110,
    pitLossSeconds: 45,
    minPitStops: 3,
    tireDegLaps: 35,
  });

  const plan = useMemo(() => generateStintPlan(drivers, raceParams), [drivers, raceParams]);

  const regenerate = useCallback(() => {
    // Shuffle driver order for variety
    setDrivers(prev => {
      const shuffled = [...prev];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
  }, []);

  const updateDriver = useCallback((id: string, field: keyof DriverConfig, value: string | number) => {
    setDrivers(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  }, []);

  const addDriver = useCallback(() => {
    const id = String(drivers.length + 1);
    setDrivers(prev => [...prev, {
      id, name: `Driver ${id}`, avgLapTime: 96, fuelPerLap: 3.2,
      maxStintLaps: 30, preferredPosition: 'any', strengthRating: 5,
    }]);
  }, [drivers.length]);

  const removeDriver = useCallback((id: string) => {
    setDrivers(prev => prev.filter(d => d.id !== id));
  }, []);

  // Compute driver-level summary
  const driverSummary = useMemo(() => {
    const map = new Map<string, { laps: number; time: number; stints: number }>();
    for (const s of plan.stints) {
      const driver = drivers.find(d => d.id === s.driverId);
      if (!driver) continue;
      const existing = map.get(s.driverId) || { laps: 0, time: 0, stints: 0 };
      existing.laps += s.laps;
      existing.time += s.laps * driver.avgLapTime;
      existing.stints += 1;
      map.set(s.driverId, existing);
    }
    return map;
  }, [plan.stints, drivers]);

  return (
    <div className="border border-white/10 bg-[#0e0e0e]/80">
      {/* Header */}
      <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RotateCcw className="w-3.5 h-3.5 text-[#f97316]/50" />
          <h2 className="text-sm uppercase tracking-[0.15em] text-[#f97316]" style={ORBITRON}>Stint Generator</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className={`p-1.5 border transition-colors ${showConfig ? 'border-[#f97316]/30 text-[#f97316]' : 'border-white/10 text-white/30 hover:text-white/50'}`}
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={regenerate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f97316]/10 border border-[#f97316]/30 text-[#f97316] text-[9px] uppercase tracking-wider hover:bg-[#f97316]/20 transition-colors"
          >
            <Shuffle className="w-3 h-3" /> Regenerate
          </button>
        </div>
      </div>

      {/* Config panel */}
      {showConfig && (
        <div className="px-5 py-4 border-b border-white/[0.06] bg-white/[0.01]">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            <div>
              <label className="text-[8px] text-white/20 uppercase block mb-1">Total Laps</label>
              <input type="number" value={raceParams.totalLaps} onChange={e => setRaceParams(p => ({ ...p, totalLaps: +e.target.value }))}
                className="w-full bg-white/[0.03] border border-white/10 px-2 py-1.5 text-xs text-white" />
            </div>
            <div>
              <label className="text-[8px] text-white/20 uppercase block mb-1">Fuel Capacity (L)</label>
              <input type="number" value={raceParams.fuelCapacity} onChange={e => setRaceParams(p => ({ ...p, fuelCapacity: +e.target.value }))}
                className="w-full bg-white/[0.03] border border-white/10 px-2 py-1.5 text-xs text-white" />
            </div>
            <div>
              <label className="text-[8px] text-white/20 uppercase block mb-1">Pit Loss (s)</label>
              <input type="number" value={raceParams.pitLossSeconds} onChange={e => setRaceParams(p => ({ ...p, pitLossSeconds: +e.target.value }))}
                className="w-full bg-white/[0.03] border border-white/10 px-2 py-1.5 text-xs text-white" />
            </div>
            <div>
              <label className="text-[8px] text-white/20 uppercase block mb-1">Min Pit Stops</label>
              <input type="number" value={raceParams.minPitStops} onChange={e => setRaceParams(p => ({ ...p, minPitStops: +e.target.value }))}
                className="w-full bg-white/[0.03] border border-white/10 px-2 py-1.5 text-xs text-white" />
            </div>
            <div>
              <label className="text-[8px] text-white/20 uppercase block mb-1">Tire Deg (laps)</label>
              <input type="number" value={raceParams.tireDegLaps} onChange={e => setRaceParams(p => ({ ...p, tireDegLaps: +e.target.value }))}
                className="w-full bg-white/[0.03] border border-white/10 px-2 py-1.5 text-xs text-white" />
            </div>
          </div>

          {/* Driver configs */}
          <div className="space-y-2">
            {drivers.map(d => (
              <div key={d.id} className="flex items-center gap-2 p-2 border border-white/[0.04]">
                <input value={d.name} onChange={e => updateDriver(d.id, 'name', e.target.value)}
                  className="bg-transparent border-b border-white/10 text-xs text-white/70 w-24 focus:outline-none" />
                <div className="flex items-center gap-1">
                  <span className="text-[7px] text-white/20">Lap:</span>
                  <input type="number" value={d.avgLapTime} onChange={e => updateDriver(d.id, 'avgLapTime', +e.target.value)}
                    className="w-12 bg-white/[0.03] border border-white/10 px-1 py-0.5 text-[10px] text-white" />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[7px] text-white/20">Fuel:</span>
                  <input type="number" step="0.1" value={d.fuelPerLap} onChange={e => updateDriver(d.id, 'fuelPerLap', +e.target.value)}
                    className="w-12 bg-white/[0.03] border border-white/10 px-1 py-0.5 text-[10px] text-white" />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[7px] text-white/20">Max:</span>
                  <input type="number" value={d.maxStintLaps} onChange={e => updateDriver(d.id, 'maxStintLaps', +e.target.value)}
                    className="w-12 bg-white/[0.03] border border-white/10 px-1 py-0.5 text-[10px] text-white" />
                </div>
                <select value={d.preferredPosition} onChange={e => updateDriver(d.id, 'preferredPosition', e.target.value)}
                  className="bg-white/[0.03] border border-white/10 px-1 py-0.5 text-[9px] text-white/60">
                  <option value="start">Start</option>
                  <option value="middle">Middle</option>
                  <option value="end">End</option>
                  <option value="any">Any</option>
                </select>
                {drivers.length > 1 && (
                  <button onClick={() => removeDriver(d.id)} className="text-red-400/40 hover:text-red-400 ml-auto text-[9px]">✕</button>
                )}
              </div>
            ))}
            <button onClick={addDriver} className="text-[9px] text-[#f97316]/50 hover:text-[#f97316] px-2 py-1">+ Add Driver</button>
          </div>
        </div>
      )}

      {/* Plan summary */}
      <div className="px-5 py-3 border-b border-white/[0.06] flex items-center gap-5">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-white/20" />
          <span className="text-[10px] text-white/50">{plan.estimatedRaceTime}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Fuel className="w-3 h-3 text-white/20" />
          <span className="text-[10px] text-white/50">{plan.totalPitStops} stops</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="w-3 h-3 text-white/20" />
          <span className="text-[10px] text-white/50">{drivers.length} drivers</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-[8px] text-white/20 uppercase">Fairness:</span>
          <span className={`text-[11px] font-mono font-bold ${plan.fairnessScore >= 80 ? 'text-green-400' : plan.fairnessScore >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
            {plan.fairnessScore}%
          </span>
        </div>
      </div>

      {/* Stint timeline */}
      <div className="px-5 py-4">
        <div className="space-y-1.5">
          {plan.stints.map(stint => {
            const summary = driverSummary.get(stint.driverId);
            const pctOfRace = (stint.laps / raceParams.totalLaps) * 100;

            return (
              <div key={stint.stintNumber} className={`flex items-center gap-3 p-3 border ${
                stint.isCritical ? 'border-[#f97316]/20 bg-[#f97316]/[0.03]' : 'border-white/[0.05] bg-white/[0.01]'
              }`}>
                <span className="text-[10px] font-mono text-white/20 w-6">S{stint.stintNumber}</span>

                {/* Progress bar showing stint proportion */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-white/60 font-medium">{stint.driverName}</span>
                    <span className="text-[9px] text-white/30">L{stint.startLap}–{stint.endLap} ({stint.laps} laps)</span>
                  </div>
                  <div className="h-2 bg-white/[0.04] overflow-hidden">
                    <div
                      className={`h-full ${stint.isCritical ? 'bg-[#f97316]/40' : 'bg-blue-500/30'}`}
                      style={{ width: `${pctOfRace}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[8px] text-white/20">{stint.estimatedTime}</span>
                    <span className="text-[8px] text-white/20">{stint.fuelRequired}L fuel</span>
                    {stint.notes && <span className="text-[8px] text-[#f97316]/40">{stint.notes}</span>}
                  </div>
                </div>

                {stint.isCritical && <Zap className="w-3 h-3 text-[#f97316]/40 flex-shrink-0" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Driver time distribution */}
      <div className="px-5 py-3 border-t border-white/[0.06]">
        <div className="text-[8px] text-white/20 uppercase tracking-wider mb-2">Drive Time Distribution</div>
        <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
          {drivers.map(d => {
            const summary = driverSummary.get(d.id);
            return (
              <div key={d.id} className="text-center p-2 border border-white/[0.04]">
                <div className="text-[10px] text-white/50 mb-1">{d.name}</div>
                <div className="text-sm font-mono text-white/70">{summary?.laps ?? 0} laps</div>
                <div className="text-[8px] text-white/20">{summary ? formatTime(summary.time) : '—'} • {summary?.stints ?? 0} stints</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Warnings */}
      {plan.warnings.length > 0 && (
        <div className="px-5 py-3 border-t border-yellow-500/20 bg-yellow-500/[0.03]">
          {plan.warnings.map((w, i) => (
            <div key={i} className="flex items-center gap-2 py-1">
              <AlertTriangle className="w-3 h-3 text-yellow-400/60 flex-shrink-0" />
              <span className="text-[10px] text-yellow-400/60">{w}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
