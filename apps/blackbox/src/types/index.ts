// BlackBox-specific types extending shared types

export interface TelemetryData {
  driverId?: string;
  driverName?: string;
  speed: number;
  rpm: number;
  gear: number;
  throttle: number;
  brake: number;
  steering: number;
  clutch?: number;
  fuel: number;
  fuelPerLap?: number;
  tires: {
    frontLeft: { temp: number; wear: number; pressure: number };
    frontRight: { temp: number; wear: number; pressure: number };
    rearLeft: { temp: number; wear: number; pressure: number };
    rearRight: { temp: number; wear: number; pressure: number };
  };
  position: { x: number; y: number; z: number };
  lap: number;
  sector: number;
  lapTime: number;
  sectorTime: number;
  bestLapTime: number;
  bestSectorTimes: number[];
  gForce: { lateral: number; longitudinal: number; vertical: number };
  trackPosition: number;
  racePosition: number;
  gapAhead: number;
  gapBehind: number;
  timestamp: number;
  isOnTrack?: boolean;
  isInPit?: boolean;
  flags?: {
    green: boolean;
    yellow: boolean;
    red: boolean;
    white: boolean;
    checkered: boolean;
    blue: boolean;
  };
}

export interface SessionInfo {
  track: string;
  session: string;
  driver: string;
  car: string;
  weather: {
    temperature: number;
    trackTemperature: number;
    windSpeed: number;
    windDirection: string;
    humidity: number;
    trackGrip: number;
  };
  totalLaps: number;
  sessionTime: number;
  remainingTime: number;
}

export interface CoachingInsight {
  priority: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;
  title: string;
  description: string;
  impact: string;
  location?: string;
  category?: string;
}

export interface DriverSkillAnalysis {
  strengths: Array<{ skill: string; rating: number }>;
  focusAreas: Array<{ skill: string; rating: number }>;
  overallRating: number;
}

export interface CompetitorData {
  position: number;
  driver: string;
  gap: string;
  lastLap: string;
  interval?: string;
  bestLap?: string;
  onPitRoad?: boolean;
}

export interface StrategyData {
  pitWindow: string;
  optimalPit: string;
  tireStrategy: string;
  fuelStrategy: string;
  paceTarget: string;
  positionPrediction: string;
  undercutRisk: string;
  tireLife: number;
}

export interface DriverProfile {
  id: string;
  name: string;
  team: string;
  role: 'primary' | 'secondary' | 'reserve';
  status: 'active' | 'standby' | 'offline';
  avatar?: string;
}
