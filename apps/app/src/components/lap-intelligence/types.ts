/**
 * Lap Intelligence Types
 * Data structures for telemetry comparison, delta analysis, and coaching insights.
 */

export interface TelemetrySample {
  distance: number;      // 0.0 – 1.0 (lap distance percentage)
  speed: number;         // mph
  throttle: number;      // 0.0 – 1.0
  brake: number;         // 0.0 – 1.0
  gear: number;
  rpm: number;
  steering?: number;     // degrees, if available
  timestamp: number;     // ms since lap start
}

export interface SectorTime {
  sector: number;        // 1-based
  time: number;          // seconds
}

export interface LapData {
  lapNumber: number;
  lapTime: number;       // total lap time in seconds
  samples: TelemetrySample[];
  sectors: SectorTime[];
  isPersonalBest: boolean;
  isSessionBest: boolean;
  timestamp: number;     // when lap was completed (epoch ms)
}

export interface SegmentDelta {
  label: string;         // e.g. "T1", "T2", "S1-S2"
  startDist: number;     // 0.0 – 1.0
  endDist: number;       // 0.0 – 1.0
  delta: number;         // seconds: positive = time lost, negative = time gained
  cause?: string;        // e.g. "braking early", "throttle hesitation"
  recommendation?: string;
}

export interface DeltaPoint {
  distance: number;      // 0.0 – 1.0
  delta: number;         // cumulative delta in seconds (positive = behind reference)
}

export interface OptimalLap {
  lapTime: number;
  sectors: SectorTime[];
  sourceLaps: number[];  // lap numbers that contributed best sectors
}

export type ComparisonMode =
  | 'personal_best'
  | 'session_best'
  | 'teammate'
  | 'optimal';

export interface ComparisonTarget {
  mode: ComparisonMode;
  label: string;
  lap: LapData | null;
}
