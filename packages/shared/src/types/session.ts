/**
 * Session types for Ok, Box Box
 */

export type SessionType = 
  | 'PRACTICE'
  | 'QUALIFYING'
  | 'RACE'
  | 'WARMUP'
  | 'OFFLINE'
  | 'UNKNOWN';

export type SessionState =
  | 'INVALID'
  | 'GET_IN_CAR'
  | 'WARMUP'
  | 'PARADE_LAPS'
  | 'RACING'
  | 'CHECKERED'
  | 'COOL_DOWN';

export type TrackSurface =
  | 'NOT_IN_WORLD'
  | 'OFF_TRACK'
  | 'IN_PIT_STALL'
  | 'APPROACHING_PITS'
  | 'ON_TRACK';

export interface WeatherInfo {
  temperature: number;      // Celsius (air)
  trackTemperature: number; // Celsius
  humidity: number;         // 0-100
  windSpeed: number;        // m/s
  windDirection: number;    // Degrees
  skies: string;            // "Clear", "Cloudy", etc.
}

export interface TrackInfo {
  id: number;
  name: string;
  configName: string;
  lengthKm: number;
  city: string;
  country: string;
}

export interface SessionInfo {
  sessionId: string;
  subsessionId: number;
  
  // Session details
  type: SessionType;
  state: SessionState;
  
  // Track
  track: TrackInfo;
  
  // Timing
  sessionTime: number;      // Current session time in seconds
  sessionTimeRemaining: number;
  sessionLapsRemaining: number;
  totalLaps: number;        // 0 = time-based
  
  // Weather
  weather: WeatherInfo;
  
  // Flags
  isRaceSession: boolean;
  isTimedSession: boolean;
  
  // Timestamps
  startedAt: number;
  updatedAt: number;
}

/**
 * Heartbeat from Relay to Backend
 * Sent every 5 seconds to confirm connection
 */
export interface RelayHeartbeat {
  relayId: string;
  userId: string;
  version: string;
  iRacingConnected: boolean;
  sessionId: string | null;
  timestamp: number;
}

/**
 * Session metadata sent when a new session is detected
 */
export interface SessionMetadata {
  sessionId: string;
  subsessionId: number;
  type: SessionType;
  track: TrackInfo;
  weather: WeatherInfo;
  totalLaps: number;
  isRaceSession: boolean;
  drivers: DriverEntry[];
  timestamp: number;
}

export interface DriverEntry {
  driverId: string;
  driverName: string;
  carNumber: string;
  carName: string;
  carClass: string;
  iRating: number;
  licenseLevel: string;
  teamName?: string;
}
