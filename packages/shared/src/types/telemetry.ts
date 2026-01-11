/**
 * Core telemetry types for Ok, Box Box
 * These are the contracts between Relay -> Backend -> Apps
 */

export interface TireData {
  temp: number;      // Celsius
  wear: number;      // 0-100 percentage
  pressure: number;  // PSI
}

export interface TireSet {
  frontLeft: TireData;
  frontRight: TireData;
  rearLeft: TireData;
  rearRight: TireData;
}

export interface Position3D {
  x: number;
  y: number;
  z: number;
}

export interface GForce {
  lateral: number;
  longitudinal: number;
  vertical: number;
}

/**
 * Basic telemetry packet from Relay
 * This is what flows through the spine: Relay -> Backend -> Apps
 */
export interface TelemetryPacket {
  // Identity
  sessionId: string;
  driverId: string;
  driverName: string;
  carNumber: string;
  
  // Timing
  timestamp: number;        // Unix ms
  lap: number;
  sector: number;
  lapTime: number;          // Current lap time in ms
  lastLapTime: number;      // Previous lap time in ms
  bestLapTime: number;      // Session best in ms
  sectorTimes: number[];    // Current lap sector times
  bestSectorTimes: number[];
  
  // Position
  racePosition: number;
  classPosition: number;
  trackPosition: number;    // 0-1 around track
  gapAhead: number;         // Seconds to car ahead
  gapBehind: number;        // Seconds to car behind
  
  // Car state
  speed: number;            // km/h
  rpm: number;
  gear: number;             // -1 = reverse, 0 = neutral, 1+ = gears
  throttle: number;         // 0-100
  brake: number;            // 0-100
  clutch: number;           // 0-100
  steering: number;         // -1 to 1
  
  // Tires
  tires: TireSet;
  
  // Fuel
  fuelLevel: number;        // Liters
  fuelPerLap: number;       // Liters per lap average
  fuelLapsRemaining: number;
  
  // Flags
  onPitRoad: boolean;
  inPitStall: boolean;
  onTrack: boolean;
  
  // Physics (optional, for BlackBox)
  position?: Position3D;
  gForce?: GForce;
}

/**
 * Simplified timing data for RaceBox display
 * Derived from TelemetryPacket on the backend
 */
export interface TimingEntry {
  driverId: string;
  driverName: string;
  carNumber: string;
  position: number;
  classPosition: number;
  gap: string;              // "+1.234" or "LAP" or "OUT"
  interval: string;         // Gap to car ahead
  lastLap: string;          // Formatted lap time
  bestLap: string;          // Formatted best lap
  sector1: string;
  sector2: string;
  sector3: string;
  onPitRoad: boolean;
  inPit: boolean;
  lastSeen: number;         // Timestamp for stale detection
}

/**
 * Bulk timing update for the entire field
 */
export interface TimingUpdate {
  sessionId: string;
  timestamp: number;
  entries: TimingEntry[];
}
