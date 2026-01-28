// Shared types for the data layer
// These types will be used by both mock and real data services

export interface Driver {
  id: string;
  name: string;
  shortName: string;
  number: string;
  color: string;
  iRatingRoad: number;
  iRatingOval: number;
  safetyRating: number;
  avgLapTime: number; // ms
  fuelPerLap: number; // liters
  maxStintLaps: number;
  available: boolean;
  notes?: string;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  color: string;
  drivers: string[]; // driver IDs
  cars: TeamCar[];
}

export interface TeamCar {
  id: string;
  number: string;
  name: string;
  class: string;
  color: string;
  assignedDrivers: string[]; // driver IDs
}

export interface Track {
  id: string;
  name: string;
  shortName: string;
  config: string;
  length: number; // km
  turns: number;
  pitLaneTime: number; // seconds
}

export interface RaceEvent {
  id: string;
  name: string;
  trackId: string;
  type: 'practice' | 'qualifying' | 'race' | 'endurance';
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed';
  date: string;
  time: string;
  duration: string;
  totalLaps?: number;
  totalTime?: number; // minutes
  raceType: 'laps' | 'timed';
  assignedDrivers: string[];
  notes?: string;
  racePlanId?: string;
}

export interface Stint {
  id: string;
  driverId: string;
  startLap: number;
  endLap: number;
  laps: number;
  fuelLoad: number;
  tireCompound: 'soft' | 'medium' | 'hard' | 'wet' | 'inter';
  estimatedTime: number; // ms
  notes: string;
}

export interface RacePlan {
  id: string;
  eventId: string;
  name: string;
  variant: 'A' | 'B' | 'C';
  isActive: boolean;
  stints: Stint[];
  totalLaps: number;
  estimatedTime: number;
  fuelUsed: number;
  pitStops: number;
}

export interface PlanChange {
  id: string;
  racePlanId: string;
  timestamp: Date;
  type: 'stint_change' | 'driver_change' | 'fuel_change' | 'strategy_change' | 'plan_switch';
  description: string;
  sentToDrivers: boolean;
  confirmedBy: string[];
  pendingConfirmation: string[];
}

export interface LiveTelemetry {
  driverId: string;
  carId: string;
  timestamp: Date;
  position: number | null;
  classPosition: number | null;
  lap: number;
  lastLap: number | null;
  bestLap: number | null;
  gap: string | null;
  interval: string | null;
  speed: number | null;
  fuel: number | null;
  fuelPerLap: number | null;
  lapsRemaining: number | null;
  tireWear: {
    fl: number;
    fr: number;
    rl: number;
    rr: number;
  } | null;
  trackPosition: number; // 0-1
  sector: number;
  inPit: boolean;
  incidents: number;
  stintLaps: number;
  delta: number | null;
}

export interface RadioChannel {
  id: string;
  name: string;
  shortName: string;
  type: 'driver' | 'crew' | 'team' | 'race';
  driverId?: string;
  volume: number;
  muted: boolean;
  active: boolean;
  speaking: boolean;
  color?: string;
}

export interface SessionState {
  status: 'offline' | 'connecting' | 'connected' | 'in_session';
  sessionType: 'practice' | 'qualifying' | 'race' | null;
  trackId: string | null;
  trackName: string | null;
  timeRemaining: number | null;
  lapsRemaining: number | null;
  flagState: 'green' | 'yellow' | 'red' | 'white' | 'checkered' | null;
  airTemp: number | null;
  trackTemp: number | null;
}

// Practice Session Types
export interface RunPlan {
  id: string;
  name: string;
  targetLaps: number;
  completedLaps: number;
  targetTime?: string;
  focus: string[];
  status: 'planned' | 'in_progress' | 'completed';
  notes?: string;
}

export interface SectorTime {
  sector: number;
  time: number; // ms
  deltaToBase: number; // ms, negative = faster
  color: 'purple' | 'green' | 'yellow' | 'red';
}

export interface LapData {
  lapNumber: number;
  lapTime: string;
  lapTimeMs: number;
  sectors: SectorTime[];
  fuelUsed: number;
  tireWear: number;
  isValid: boolean;
  isPersonalBest: boolean;
  isSessionBest: boolean;
  trackTemp: number;
  conditions: 'dry' | 'damp' | 'wet';
}

export interface DriverStint {
  driverId: string;
  driverName: string;
  laps: number;
  bestLap: string;
  bestLapMs: number;
  avgLap: string;
  avgLapMs: number;
  consistency: number;
  incidents: number;
  fuelPerLap: number;
  tireDegPerLap: number;
  sectors: { s1Best: string; s2Best: string; s3Best: string };
  theoreticalBest: string;
  gapToLeader: string;
  lapHistory: LapData[];
}

// Strategy Types
export interface StrategyStint {
  stint: number;
  driverId: string;
  driverName: string;
  startLap: number;
  endLap: number;
  fuelLoad: number;
  tireCompound: 'soft' | 'medium' | 'hard' | 'wet' | 'inter';
  tireAge: number;
  expectedDeg: number;
  pitInWindow: { earliest: number; latest: number };
  fuelSaveMode: boolean;
  notes?: string;
  predictedLapTime: string;
  predictedTotalTime: string;
}

export interface PitStop {
  lap: number;
  duration: number;
  fuelAdded: number;
  tireChange: boolean;
  newCompound?: string;
  driverChange: boolean;
  newDriver?: string;
}

export interface WeatherForecast {
  time: string;
  condition: 'clear' | 'cloudy' | 'light_rain' | 'heavy_rain';
  trackTemp: number;
  airTemp: number;
  humidity: number;
  windSpeed: number;
  rainChance: number;
}

export interface TireDegModel {
  compound: string;
  baseGrip: number;
  degPerLap: number;
  optimalWindow: { start: number; end: number };
  cliffLap: number;
}

export interface StrategyPlan {
  id: string;
  eventId: string;
  eventName: string;
  trackName: string;
  carClass: string;
  raceDuration: string;
  raceType: 'laps' | 'timed' | 'timed_laps';
  totalLaps: number;
  avgLapTime: number;
  fuelPerLap: number;
  fuelPerLapSave: number;
  tankCapacity: number;
  pitTimeLoss: number;
  pitLaneDelta: number;
  minPitTime: number;
  mandatoryStops: number;
  tireSetsAvailable: { soft: number; medium: number; hard: number; wet: number; inter: number };
  stints: StrategyStint[];
  pitStops: PitStop[];
  weatherForecast: WeatherForecast[];
  tireModels: TireDegModel[];
  optimalStrategy: string;
  alternativeStrategies: string[];
  riskAssessment: { level: 'low' | 'medium' | 'high'; factors: string[] };
}

// Roster Types
export interface RosterMember {
  membershipId: string;
  driverId: string;
  userId: string;
  displayName: string;
  role: 'owner' | 'team_principal' | 'driver' | 'engineer' | 'crew';
  accessScope: string;
  joinedAt: string;
  totalSessions?: number;
  totalLaps?: number;
  avgIncidentRate?: number;
  traits?: string[];
  irating?: number;
  safetyRating?: number;
  linkedAccount?: {
    okBoxBoxId: string;
    tier: 'driver' | 'team' | 'league';
    linkedAt: string;
    email?: string;
  } | null;
  idpSummary?: {
    totalGoals: number;
    achieved: number;
    inProgress: number;
    priorityFocus?: string;
  };
}

export interface TeamRoster {
  teamId: string;
  teamName: string;
  memberCount: number;
  members: RosterMember[];
}

// Race Viewer Types
export interface RaceCarState {
  carNumber: string;
  carClass: string;
  currentDriverId: string;
  currentDriverName: string;
  position: number;
  classPosition: number;
  lap: number;
  lastLapTime: number | null;
  bestLapTime: number | null;
  gapToLeader: string;
  gapToClassLeader: string;
  gapAhead: string;
  gapBehind: string;
  fuel: number;
  fuelPerLap: number;
  lapsRemaining: number;
  pitStops: number;
  lastPitLap: number | null;
  trackPosition: number;
  inPit: boolean;
  incidents: number;
  currentStintLaps: number;
}

export interface RaceSessionState {
  eventName: string;
  trackName: string;
  sessionType: 'practice' | 'qualifying' | 'race';
  raceFormat: 'sprint' | 'endurance' | 'multidriver';
  totalLaps: number | null;
  totalTime: number | null;
  currentLap: number;
  timeRemaining: number | null;
  timeElapsed: number;
  flagStatus: 'green' | 'yellow' | 'red' | 'white' | 'checkered';
  trackTemp: number;
  airTemp: number;
  humidity: number;
  windSpeed: number;
  weatherCondition: 'clear' | 'cloudy' | 'light_rain' | 'heavy_rain';
}
