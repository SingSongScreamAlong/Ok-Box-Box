export interface Sample {
  tsMs: number;
  driverId: string;
  pos: { x: number; y: number; z?: number };
  speed?: number;
  heading?: number; // radians
  throttle?: number; // 0..1
  brake?: number; // 0..1
  gear?: number;
  rpm?: number;
  lap?: number;
  sector?: number;
  flags?: Record<string, any>;
  extra?: Record<string, any>;
}

export interface EventMarker {
  tsMs: number;
  type: 'incident' | 'pass' | 'pit' | 'yellow' | string;
  driverIds?: string[];
  meta?: Record<string, any>;
}

export interface TrackLayout {
  id: string;
  name: string;
  polyline: Array<{ x: number; y: number }>;
  scale: number;
  rotation: number; // radians
  offset: { x: number; y: number };
  bounds?: { minX: number; minY: number; maxX: number; maxY: number };
  sectors?: Array<{ id: number; start: number; end: number }>; // polyline indices
}

export interface SessionSummary {
  id: string;
  trackId: string;
  startedAt: string;
  endedAt?: string;
  drivers: Array<{ id: string; name: string; carNumber?: string }>; 
}

export interface PlaybackState {
  playing: boolean;
  rate: number; // 0.25..4
  t0: number; // wall-clock origin
  tMs: number; // virtual time ms relative to session start
}
