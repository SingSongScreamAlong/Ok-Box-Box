/**
 * Ok, Box Box - Shared Data Contracts
 * 
 * These types define the data structures used across the platform.
 * They can be fed by the Relay (live data) or mock data (development).
 */

// ============================================
// SESSION STATE (Live Timing Board)
// ============================================

export interface SessionState {
  sessionId: string;
  sessionType: 'practice' | 'qualifying' | 'race' | 'warmup' | 'offline';
  sessionName: string;
  trackName: string;
  trackId: number;
  isActive: boolean;
  timeRemaining: number | null; // seconds, null if unlimited
  currentLap: number;
  totalLaps: number | null; // null if time-based
  flagState: 'green' | 'yellow' | 'red' | 'white' | 'checkered' | 'black';
  timestamp: number;
}

export interface SessionDriver {
  carIdx: number;
  driverId: string;
  driverName: string;
  carNumber: string;
  carClass: string;
  carClassColor: string;
  position: number;
  classPosition: number;
  lap: number;
  lastLapTime: number | null; // ms
  bestLapTime: number | null; // ms
  gapToLeader: number | null; // seconds
  gapToAhead: number | null; // seconds
  gapToBehind: number | null; // seconds
  inPit: boolean;
  onTrack: boolean;
  incidents: number;
  irating: number;
  safetyRating: number;
}

export interface LiveTimingBoard {
  session: SessionState;
  drivers: SessionDriver[];
  lastUpdate: number;
}

// ============================================
// STINT PLAN (Driver Assignments)
// ============================================

export interface StintPlan {
  id: string;
  eventId: string;
  stintNumber: number;
  driverId: string;
  driverName: string;
  startLap: number;
  endLap: number;
  estimatedDuration: number; // minutes
  fuelLoad: number; // liters
  tireCompound: 'soft' | 'medium' | 'hard' | 'wet' | 'intermediate';
  pitWindowOpen: number; // lap
  pitWindowClose: number; // lap
  notes?: string;
  status: 'planned' | 'active' | 'completed';
}

export interface StrategyPlan {
  id: string;
  eventId: string;
  eventName: string;
  raceDuration: string; // e.g., "24h", "6h", "100 laps"
  totalLaps: number;
  fuelPerLap: number; // liters
  tankCapacity: number; // liters
  pitTimeLoss: number; // seconds
  stints: StintPlan[];
  createdAt: string;
  updatedAt: string;
}

// ============================================
// FUEL MODEL
// ============================================

export interface FuelModel {
  currentFuelLevel: number; // liters
  currentFuelPct: number; // 0-1
  fuelPerLap: number; // liters
  fuelPerLapVariance: number; // +/- liters
  lapsRemaining: number;
  estimatedPitLap: number | null;
  requiredFuelForFinish: number; // liters
  fuelToAdd: number; // liters at next stop
  savingMode: boolean;
  savingTarget: number | null; // liters/lap when saving
}

export interface FuelCalculation {
  raceLaps: number;
  fuelPerLap: number;
  reserve: number;
  tankCapacity: number;
  requiredFuel: number;
  stopsRequired: number;
  maxStintLaps: number;
}

// ============================================
// DRIVER METRICS
// ============================================

export interface DriverMetrics {
  driverId: string;
  driverName: string;
  
  // Pace
  bestLapTime: number | null; // ms
  avgLapTime: number | null; // ms
  medianLapTime: number | null; // ms
  pacePercentile: number | null; // 0-100
  
  // Consistency
  consistencyIndex: number; // 0-100
  lapTimeVariance: number; // ms
  cleanLapPercentage: number; // 0-100
  
  // Safety
  incidentCount: number;
  incidentRate: number; // per hour
  cornersPerIncident: number;
  
  // Targets
  targetLapTime: number | null; // ms
  targetConsistency: number | null; // 0-100
  targetIncidentRate: number | null; // per hour
  
  // Traits (auto-detected)
  traits: DriverTrait[];
  
  // Computed
  computedAt: string;
}

export interface DriverTrait {
  key: string;
  label: string;
  category: 'consistency' | 'risk' | 'pace' | 'endurance' | 'racecraft' | 'style';
  confidence: number; // 0-1
  evidence?: string;
}

// ============================================
// TELEMETRY (Real-time from Relay)
// ============================================

export interface TelemetryData {
  timestamp: number;
  speed: number; // km/h
  rpm: number;
  rpmMax: number;
  gear: number;
  throttle: number; // 0-1
  brake: number; // 0-1
  clutch: number; // 0-1
  steeringAngle: number; // degrees
  
  // Fuel
  fuelLevel: number; // liters
  fuelPct: number; // 0-1
  fuelPerLap: number;
  
  // Tires
  tireWear: {
    fl: number; // 0-1
    fr: number;
    rl: number;
    rr: number;
  };
  tireSurfaceTemp: {
    fl: number; // celsius
    fr: number;
    rl: number;
    rr: number;
  };
  
  // Position
  position: number;
  classPosition: number;
  lap: number;
  lapDistPct: number; // 0-1
  
  // Gaps
  gapAhead: number | null; // seconds
  gapBehind: number | null;
  gapToLeader: number | null;
  
  // Timing
  lastLapTime: number | null; // ms
  bestLapTime: number | null;
  delta: number | null; // seconds, + is slower
  
  // Status
  inPit: boolean;
  onTrack: boolean;
  sessionFlags: string[];
}

// ============================================
// TEAM & ROSTER
// ============================================

export interface TeamRoster {
  teamId: string;
  teamName: string;
  memberCount: number;
  members: TeamMember[];
}

export interface TeamMember {
  membershipId: string;
  userId: string;
  driverId: string | null;
  displayName: string;
  role: 'owner' | 'team_principal' | 'team_engineer' | 'driver' | 'crew';
  accessScope: 'team_deep' | 'team_standard' | 'team_view';
  joinedAt: string;
  
  // Stats (optional, from IDP)
  irating?: number;
  safetyRating?: number;
  totalSessions?: number;
  totalLaps?: number;
  avgIncidentRate?: number;
  traits?: string[];
}

// ============================================
// EVENTS & PLANNING
// ============================================

export interface TeamEvent {
  id: string;
  teamId: string;
  leagueId?: string;
  name: string;
  type: 'practice' | 'qualifying' | 'race' | 'endurance' | 'test';
  track: string;
  trackId?: number;
  scheduledAt: string;
  duration: string; // e.g., "2h", "24h"
  status: 'scheduled' | 'confirmed' | 'live' | 'completed' | 'cancelled';
  assignedDrivers: string[]; // driver IDs
  notes?: string;
  createdAt: string;
}

export interface DriverAvailability {
  driverId: string;
  driverName: string;
  available: boolean;
  notes?: string;
  timezone?: string;
}

// ============================================
// REPORTS & DEBRIEFS
// ============================================

export interface TeamDebrief {
  eventId: string;
  eventName: string;
  sessionId: string;
  driverSummaries: DriverDebrief[];
  teamSummary: {
    overallObservation: string;
    commonPatterns: string[];
    priorityFocus: string;
  } | null;
  status: 'pending' | 'processing' | 'complete' | 'failed';
  generatedAt: string;
}

export interface DriverDebrief {
  driverId: string;
  driverName: string;
  headline: string;
  primaryLimiter: string;
  strengths?: string[];
  areasToImprove?: string[];
}

// ============================================
// ENTITLEMENTS
// ============================================

export type EntitlementTier = 'free' | 'driver' | 'team' | 'league' | 'enterprise';

export interface UserEntitlements {
  userId: string;
  tier: EntitlementTier;
  features: {
    // Free
    account: boolean;
    basicProfile: boolean;
    
    // Driver tier
    driverTelemetry: boolean;
    driverHistory: boolean;
    driverHUD: boolean;
    
    // Team tier
    teamPitwall: boolean;
    teamRoster: boolean;
    teamStrategy: boolean;
    teamReports: boolean;
    shareLinks: boolean;
    
    // League tier
    leagueManagement: boolean;
    leagueEvents: boolean;
    leagueStewards: boolean;
  };
  expiresAt: string | null;
}
