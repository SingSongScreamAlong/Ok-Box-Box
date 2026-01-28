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
