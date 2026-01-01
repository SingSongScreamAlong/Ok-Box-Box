/**
 * Comprehensive telemetry data model for sim racing
 */
export interface TelemetryData {
  // Session identification
  sessionId: string;
  timestamp: number;
  simName: string;  // Name of the simulator (iRacing, Assetto Corsa, etc.)
  trackId?: string;  // Unique identifier for the track
  trackName?: string; // Name of the track
  sessionType?: string; // Type of session (race, qualifying, practice, etc.)
  
  // Driver identification
  driverId?: string;
  driverName?: string;
  
  // Basic telemetry
  speed: number;               // km/h
  rpm: number;                 // engine RPM
  gear: number;                // -1 = reverse, 0 = neutral, 1+ = forward gears
  throttle: number;            // 0.0 - 1.0
  brake: number;               // 0.0 - 1.0
  clutch?: number;             // 0.0 - 1.0
  steering: number;            // -1.0 (full left) to 1.0 (full right)
  
  // Position data
  position: {
    x: number;                 // X coordinate on track
    y: number;                 // Y coordinate on track
    z: number;                 // Z coordinate on track
    heading: number;           // Heading in radians
  };
  
  // Lap and timing data
  lap: number;                 // Current lap number
  sector: number;              // Current sector (1, 2, 3)
  lapTime: number;             // Current lap time in seconds
  lastLapTime?: number;        // Last completed lap time in seconds
  sectorTime: number;          // Current sector time in seconds
  bestLapTime: number;         // Best lap time in seconds
  bestSectorTimes: number[];   // Best sector times in seconds
  
  // Tire data
  tires: {
    frontLeft: {
      temp: number;            // Celsius
      wear: number;            // 0.0 - 1.0 (0 = new, 1 = completely worn)
      pressure: number;        // kPa
    };
    frontRight: {
      temp: number;
      wear: number;
      pressure: number;
    };
    rearLeft: {
      temp: number;
      wear: number;
      pressure: number;
    };
    rearRight: {
      temp: number;
      wear: number;
      pressure: number;
    };
  };
  
  // G-force data
  gForce: {
    lateral: number;           // G
    longitudinal: number;      // G
    vertical: number;          // G
  };
  
  // Race position data
  trackPosition: number;       // 0.0 - 1.0 (percentage around track)
  racePosition: number;        // Position in race (1 = first place)
  gapAhead: number;            // Time gap to car ahead in seconds
  gapBehind: number;           // Time gap to car behind in seconds
  
  // Fuel data
  fuel: {
    level: number;             // Current fuel level in liters
    capacity: number;          // Fuel tank capacity in liters
    usagePerLap: number;       // Average fuel usage per lap in liters
    estimatedLapsRemaining: number; // Estimated laps remaining with current fuel
  };
  
  // Extended data (new fields from architecture refactor)
  suspension?: {
    frontLeft: { 
      height: number;          // mm
      load: number;            // N
      damper: number;          // mm/s
    };
    frontRight: { 
      height: number;
      load: number;
      damper: number;
    };
    rearLeft: { 
      height: number;
      load: number;
      damper: number;
    };
    rearRight: { 
      height: number;
      load: number;
      damper: number;
    };
  };
  
  engine?: {
    temperature: number;       // Celsius
    oilPressure: number;       // kPa
    oilTemperature: number;    // Celsius
    waterTemperature: number;  // Celsius
    wear: number;              // 0.0 - 1.0
  };
  
  damage?: {
    aerodynamic: number;       // 0.0 - 1.0
    suspension: number;        // 0.0 - 1.0
    transmission: number;      // 0.0 - 1.0
    engine: number;            // 0.0 - 1.0
  };
  
  driverInputs?: {
    smoothness: number;        // 0.0 - 1.0 (derived metric for input consistency)
    aggression: number;        // 0.0 - 1.0 (derived metric for input intensity)
    precision: number;         // 0.0 - 1.0 (derived metric for input accuracy)
  };
  
  draftingEffect?: number;     // Percentage of drafting benefit/penalty
  
  // Weather and track conditions
  weather?: {
    temperature: number;       // Ambient temperature in Celsius
    trackTemperature: number;  // Track temperature in Celsius
    windSpeed: number;         // Wind speed in km/h
    windDirection: number;     // Wind direction in degrees
    humidity: number;          // Humidity percentage
    trackGrip: number;         // 0.0 - 1.0
  };
}
