/**
 * Driver Memory System Types
 * 
 * These types define the living memory that makes the engineer "know" the driver.
 * This is NOT static profile data - it LEARNS and CHANGES.
 */

// ========================
// DRIVING TENDENCIES
// ========================

export type BrakingStyle = 'early' | 'late' | 'trail' | 'threshold' | 'unknown';
export type ThrottleStyle = 'aggressive' | 'smooth' | 'hesitant' | 'unknown';
export type CornerEntryStyle = 'aggressive' | 'conservative' | 'variable';
export type OvertakingStyle = 'opportunistic' | 'patient' | 'aggressive' | 'defensive';
export type RecoverySpeed = 'fast' | 'moderate' | 'slow';
export type FeedbackStyle = 'brief' | 'detailed' | 'motivational' | 'blunt' | 'balanced';
export type CalloutFrequency = 'minimal' | 'moderate' | 'frequent';
export type DataVsFeeling = 'data' | 'feeling' | 'balanced';
export type ConfidenceTrend = 'rising' | 'falling' | 'stable' | 'volatile';
export type SkillTrajectory = 'ascending' | 'plateaued' | 'breaking_through' | 'declining' | 'developing';
export type DriverArchetype = 'calculated_racer' | 'aggressive_hunter' | 'consistent_grinder' | 'raw_talent' | 'developing';

// ========================
// ERROR PATTERNS
// ========================

export interface CommonError {
  type: string;
  frequency: number;
  context: string;
}

export interface HighRiskCorner {
  track: string;
  corner: string;
  incidentRate: number;
}

// ========================
// DRIVER MEMORY (Core)
// ========================

export interface DriverMemory {
  id: string;
  driverProfileId: string;
  
  // Braking behavior
  brakingStyle: BrakingStyle;
  brakingConsistency: number | null;
  brakeBiasPreference: 'forward' | 'rear' | 'neutral' | null;
  
  // Throttle behavior
  throttleStyle: ThrottleStyle;
  throttleOnExitTendency: 'early' | 'late' | 'optimal' | null;
  tractionManagement: number | null;
  
  // Cornering
  cornerEntryStyle: CornerEntryStyle | null;
  apexHitRate: number | null;
  cornerExitQuality: number | null;
  
  // Racecraft
  overtakingStyle: OvertakingStyle | null;
  defensiveAwareness: number | null;
  trafficComfort: number | null;
  incidentProneness: number | null;
  
  // Post-incident behavior
  postIncidentTiltRisk: number | null;
  recoverySpeed: RecoverySpeed | null;
  
  // Fatigue patterns
  lateRaceDegradation: number | null;
  sessionLengthSweetSpot: number | null;
  fatigueOnsetLap: number | null;
  
  // Common mistakes
  commonErrorTypes: CommonError[];
  highRiskCorners: HighRiskCorner[];
  
  // Strengths & Weaknesses
  strengthTrackTypes: string[];
  weaknessTrackTypes: string[];
  strengthCornerTypes: string[];
  weaknessCornerTypes: string[];
  qualifyingVsRaceDelta: number | null;
  practiceToRaceImprovement: number | null;
  
  // Communication preferences
  preferredFeedbackStyle: FeedbackStyle;
  preferredCalloutFrequency: CalloutFrequency;
  respondsWellToCriticism: boolean;
  needsConfidenceBuilding: boolean;
  prefersDataVsFeeling: DataVsFeeling;
  
  // Confidence & Mental state
  baselineConfidence: number;
  confidenceVolatility: number;
  currentConfidence: number;
  confidenceTrend: ConfidenceTrend;
  
  // Learning metadata
  sessionsAnalyzed: number;
  lapsAnalyzed: number;
  lastLearningUpdate: string | null;
  memoryConfidence: number;
  
  createdAt: string;
  updatedAt: string;
}

// ========================
// DRIVER IDENTITY (Narrative Layer)
// ========================

export interface DriverIdentity {
  id: string;
  driverProfileId: string;
  
  // Core identity
  driverArchetype: DriverArchetype | null;
  archetypeConfidence: number | null;
  archetypeEvidence: string | null;
  
  // Skill arc
  skillTrajectory: SkillTrajectory;
  trajectorySince: string | null;
  trajectoryEvidence: string | null;
  
  // Readiness signals
  readyForLongerRaces: boolean;
  readyForHigherSplits: boolean;
  readyForNewDiscipline: boolean;
  readinessNotes: string | null;
  
  // Development focus
  currentDevelopmentFocus: string | null;
  focusSetAt: string | null;
  focusProgress: number;
  
  // Narrative elements
  definingMoment: string | null;
  currentChapter: string | null;
  nextMilestone: string | null;
  
  createdAt: string;
  updatedAt: string;
}

// ========================
// ENGINEER OPINIONS
// ========================

export type OpinionSentiment = 'positive' | 'neutral' | 'concern' | 'critical';
export type OpinionDomain = 'pace' | 'consistency' | 'racecraft' | 'mental' | 'technique' | 'development';

export interface EngineerOpinion {
  id: string;
  driverProfileId: string;
  
  opinionDomain: OpinionDomain;
  opinionContext: string | null;
  
  opinionSummary: string;
  opinionDetail: string | null;
  opinionConfidence: number;
  opinionSentiment: OpinionSentiment;
  
  isActionable: boolean;
  suggestedAction: string | null;
  priority: number;
  
  validFrom: string;
  validUntil: string | null;
  
  evidenceSessions: string[];
  evidenceSummary: string | null;
  
  createdAt: string;
  updatedAt: string;
}

// ========================
// SESSION BEHAVIORS
// ========================

export interface DriverSessionBehavior {
  id: string;
  sessionId: string;
  driverProfileId: string;
  
  sessionType: 'practice' | 'qualifying' | 'race' | null;
  trackName: string | null;
  carName: string | null;
  
  avgBrakePointDeltaM: number | null;
  brakeConsistencyScore: number | null;
  throttleApplicationScore: number | null;
  cornerEntryAggression: number | null;
  cornerExitQuality: number | null;
  
  lapTimeVarianceTrend: 'improving' | 'degrading' | 'stable' | 'erratic' | null;
  incidentClustering: boolean;
  postIncidentPaceDelta: number | null;
  lateSessionPaceDelta: number | null;
  
  overtakesAttempted: number | null;
  overtakesCompleted: number | null;
  positionsLostToMistakes: number | null;
  defensiveIncidents: number | null;
  
  estimatedConfidence: number | null;
  confidenceTrajectory: 'rising' | 'falling' | 'stable' | null;
  
  computedAt: string;
}

// ========================
// MEMORY EVENTS (Learning Log)
// ========================

export type MemoryEventType = 'tendency_update' | 'pattern_detected' | 'preference_inferred' | 'confidence_shift';
export type EvidenceType = 'session_analysis' | 'incident_review' | 'interaction_pattern' | 'explicit_feedback';

export interface DriverMemoryEvent {
  id: string;
  driverProfileId: string;
  
  eventType: MemoryEventType;
  memoryField: string;
  previousValue: string | null;
  newValue: string;
  
  evidenceType: EvidenceType;
  evidenceSessionId: string | null;
  evidenceSummary: string;
  
  learningConfidence: number;
  
  createdAt: string;
}

// ========================
// COMPOSITE TYPES
// ========================

export interface DriverMemoryState {
  memory: DriverMemory | null;
  identity: DriverIdentity | null;
  opinions: EngineerOpinion[];
  recentEvents: DriverMemoryEvent[];
  loading: boolean;
  error: string | null;
}

export interface EngineerPersonality {
  // Derived from driver memory - how the engineer should communicate
  toneStyle: 'supportive' | 'direct' | 'analytical' | 'motivational';
  verbosity: 'terse' | 'balanced' | 'detailed';
  confidenceLevel: 'high' | 'moderate' | 'building';
  focusArea: string | null;
  currentConcern: string | null;
}
