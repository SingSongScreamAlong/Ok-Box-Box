/**
 * useLapTelemetry
 * Accumulates relay telemetry samples per lap, stores completed laps,
 * computes personal best, session best, optimal lap, and delta traces.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { TelemetrySample, LapData, DeltaPoint, OptimalLap, SectorTime } from '../components/lap-intelligence/types';

const MAX_STORED_LAPS = 50;
const SECTOR_COUNT = 3;

/** Interpolate time-at-distance from a sorted sample array */
function timeAtDistance(samples: TelemetrySample[], dist: number): number {
  if (samples.length === 0) return 0;
  if (dist <= samples[0].distance) return samples[0].timestamp;
  if (dist >= samples[samples.length - 1].distance) return samples[samples.length - 1].timestamp;

  for (let i = 1; i < samples.length; i++) {
    if (samples[i].distance >= dist) {
      const prev = samples[i - 1];
      const curr = samples[i];
      const t = (dist - prev.distance) / (curr.distance - prev.distance || 1);
      return prev.timestamp + t * (curr.timestamp - prev.timestamp);
    }
  }
  return samples[samples.length - 1].timestamp;
}

/** Compute cumulative delta trace between two laps */
export function computeDeltaTrace(
  driverLap: LapData,
  referenceLap: LapData,
  resolution = 200
): DeltaPoint[] {
  const points: DeltaPoint[] = [];
  for (let i = 0; i <= resolution; i++) {
    const dist = i / resolution;
    const refTime = timeAtDistance(referenceLap.samples, dist);
    const drvTime = timeAtDistance(driverLap.samples, dist);
    // Normalize by total lap time to get real-seconds delta
    const refFrac = referenceLap.lapTime > 0 ? refTime / referenceLap.samples[referenceLap.samples.length - 1]?.timestamp || 1 : 0;
    const drvFrac = driverLap.lapTime > 0 ? drvTime / driverLap.samples[driverLap.samples.length - 1]?.timestamp || 1 : 0;
    const delta = (drvFrac * driverLap.lapTime) - (refFrac * referenceLap.lapTime);
    points.push({ distance: dist, delta });
  }
  return points;
}

/** Compute sector times from samples (equal 1/3 splits) */
function computeSectors(samples: TelemetrySample[], lapTime: number): SectorTime[] {
  if (samples.length < 2) return [];
  const totalTimestamp = samples[samples.length - 1].timestamp;
  if (totalTimestamp === 0) return [];
  const sectors: SectorTime[] = [];
  for (let s = 0; s < SECTOR_COUNT; s++) {
    const startDist = s / SECTOR_COUNT;
    const endDist = (s + 1) / SECTOR_COUNT;
    const startTime = timeAtDistance(samples, startDist);
    const endTime = timeAtDistance(samples, endDist);
    const sectorTime = ((endTime - startTime) / totalTimestamp) * lapTime;
    sectors.push({ sector: s + 1, time: sectorTime });
  }
  return sectors;
}

/** Build the theoretical optimal lap from best sectors across all laps */
function computeOptimalLap(laps: LapData[]): OptimalLap | null {
  if (laps.length === 0) return null;
  const bestSectors: { time: number; lapNumber: number }[] = [];
  for (let s = 0; s < SECTOR_COUNT; s++) {
    let best = { time: Infinity, lapNumber: -1 };
    for (const lap of laps) {
      const sector = lap.sectors[s];
      if (sector && sector.time < best.time) {
        best = { time: sector.time, lapNumber: lap.lapNumber };
      }
    }
    bestSectors.push(best);
  }
  if (bestSectors.some(s => s.time === Infinity)) return null;

  return {
    lapTime: bestSectors.reduce((sum, s) => sum + s.time, 0),
    sectors: bestSectors.map((s, i) => ({ sector: i + 1, time: s.time })),
    sourceLaps: bestSectors.map(s => s.lapNumber),
  };
}

/** Interpolate speed at a given distance */
export function speedAtDistance(samples: TelemetrySample[], dist: number): number {
  if (samples.length === 0) return 0;
  if (dist <= samples[0].distance) return samples[0].speed;
  if (dist >= samples[samples.length - 1].distance) return samples[samples.length - 1].speed;
  for (let i = 1; i < samples.length; i++) {
    if (samples[i].distance >= dist) {
      const prev = samples[i - 1];
      const curr = samples[i];
      const t = (dist - prev.distance) / (curr.distance - prev.distance || 1);
      return prev.speed + t * (curr.speed - prev.speed);
    }
  }
  return samples[samples.length - 1].speed;
}

export function useLapTelemetry(telemetry: {
  speed: number | null;
  throttle: number | null;
  brake: number | null;
  gear: number | null;
  rpm: number | null;
  trackPosition: number | null;
  lap: number | null;
  lastLap: number | null;
  bestLap: number | null;
}) {
  const [completedLaps, setCompletedLaps] = useState<LapData[]>([]);
  const currentSamplesRef = useRef<TelemetrySample[]>([]);
  const currentLapRef = useRef<number | null>(null);
  const lapStartTimeRef = useRef<number>(Date.now());

  // Detect lap change and finalize previous lap
  useEffect(() => {
    const lapNum = telemetry.lap;
    if (lapNum === null) return;

    if (currentLapRef.current !== null && lapNum !== currentLapRef.current && currentSamplesRef.current.length > 10) {
      // Lap changed — finalize previous lap
      const samples = [...currentSamplesRef.current];
      const lapTime = telemetry.lastLap ?? (
        samples.length > 1
          ? (samples[samples.length - 1].timestamp - samples[0].timestamp) / 1000
          : 0
      );

      if (lapTime > 0) {
        const sectors = computeSectors(samples, lapTime);
        const newLap: LapData = {
          lapNumber: currentLapRef.current,
          lapTime,
          samples,
          sectors,
          isPersonalBest: false,
          isSessionBest: false,
          timestamp: Date.now(),
        };

        setCompletedLaps(prev => {
          const updated = [...prev, newLap].slice(-MAX_STORED_LAPS);
          // Mark personal best
          const bestTime = Math.min(...updated.map(l => l.lapTime));
          return updated.map(l => ({
            ...l,
            isPersonalBest: l.lapTime === bestTime,
            isSessionBest: l.lapTime === bestTime,
          }));
        });
      }

      currentSamplesRef.current = [];
      lapStartTimeRef.current = Date.now();
    }

    currentLapRef.current = lapNum;
  }, [telemetry.lap, telemetry.lastLap]);

  // Accumulate samples for the current lap
  useEffect(() => {
    if (
      telemetry.trackPosition === null ||
      telemetry.speed === null ||
      telemetry.throttle === null ||
      telemetry.brake === null
    ) return;

    const sample: TelemetrySample = {
      distance: telemetry.trackPosition,
      speed: telemetry.speed,
      throttle: telemetry.throttle,
      brake: telemetry.brake,
      gear: telemetry.gear ?? 0,
      rpm: telemetry.rpm ?? 0,
      timestamp: Date.now() - lapStartTimeRef.current,
    };

    // Avoid duplicate distance entries (telemetry may repeat)
    const last = currentSamplesRef.current[currentSamplesRef.current.length - 1];
    if (!last || Math.abs(sample.distance - last.distance) > 0.001) {
      currentSamplesRef.current.push(sample);
    }
  }, [telemetry.trackPosition, telemetry.speed, telemetry.throttle, telemetry.brake, telemetry.gear, telemetry.rpm]);

  const personalBest = useMemo(() => {
    if (completedLaps.length === 0) return null;
    return completedLaps.reduce((best, lap) =>
      lap.lapTime < best.lapTime ? lap : best
    , completedLaps[0]);
  }, [completedLaps]);

  const lastLap = useMemo(() => {
    return completedLaps.length > 0 ? completedLaps[completedLaps.length - 1] : null;
  }, [completedLaps]);

  const optimalLap = useMemo(() => computeOptimalLap(completedLaps), [completedLaps]);

  const currentSamples = currentSamplesRef.current;

  const clearLaps = useCallback(() => {
    setCompletedLaps([]);
    currentSamplesRef.current = [];
    currentLapRef.current = null;
  }, []);

  return {
    completedLaps,
    currentSamples,
    personalBest,
    lastLap,
    optimalLap,
    clearLaps,
  };
}
