/**
 * Telemetry Intelligence Types & Computation — v1.0
 *
 * Telemetry-derived behavioral metrics for driver performance analysis.
 * This module defines normalized scores (0-100) derived from raw telemetry,
 * NOT raw telemetry streams.
 *
 * Architecture:
 * - Live Telemetry: In-session real-time data
 * - Post-Session Analysis: Processed after race completion
 * - Historical Baseline: Rolling 10-race aggregated metrics
 *
 * Home page uses ONLY aggregated, processed insights.
 * Never raw streams.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 1: TELEMETRY METRIC CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Braking Behavior Metrics ─────────────────────────────────────────────────

export interface BrakingMetrics {
  /** Brake application timing relative to optimal reference (0-100, 100 = perfect) */
  brakeTimingScore: number;
  /** Brake pressure smoothness - inverse of variance (0-100, 100 = smooth) */
  brakePressureSmoothness: number;
  /** Trail braking stability score (0-100, 100 = stable trail) */
  trailBrakingStability: number;
  /** Entry overshoot rate - % of corners with overshoot (0-100, 100 = no overshoot) */
  entryOvershootScore: number;
  /** Sample size for confidence calculation */
  sampleCorners: number;
}

// ─── Throttle Behavior Metrics ────────────────────────────────────────────────

export interface ThrottleMetrics {
  /** Throttle modulation smoothness (0-100, 100 = smooth) */
  throttleModulationScore: number;
  /** Exit traction stability - inverse of wheelspin events (0-100, 100 = stable) */
  exitTractionStability: number;
  /** Early throttle under slip penalty (0-100, 100 = no early application) */
  slipThrottleControl: number;
  /** Sample size for confidence calculation */
  sampleCorners: number;
}

// ─── Steering & Turn-In Metrics ───────────────────────────────────────────────

export interface SteeringMetrics {
  /** Turn-in variance vs reference line (0-100, 100 = consistent) */
  turnInConsistency: number;
  /** Mid-corner steering correction frequency (0-100, 100 = minimal corrections) */
  midCornerStability: number;
  /** Over-rotation vs under-rotation balance (0-100, 50 = balanced, <50 = under, >50 = over) */
  rotationBalance: number;
  /** Sample size for confidence calculation */
  sampleCorners: number;
}

// ─── Consistency & Rhythm Metrics ─────────────────────────────────────────────

export interface RhythmMetrics {
  /** Lap time variance score (0-100, 100 = highly consistent) */
  lapTimeConsistency: number;
  /** Sector variance score (0-100, 100 = consistent across sectors) */
  sectorConsistency: number;
  /** Input variance per lap (0-100, 100 = repeatable inputs) */
  inputRepeatability: number;
  /** Deviation from personal baseline (0-100, 100 = on baseline) */
  baselineAdherence: number;
  /** Sample size for confidence calculation */
  sampleLaps: number;
}

// ─── Combined Session Telemetry ───────────────────────────────────────────────

export interface SessionTelemetryMetrics {
  sessionId: string;
  timestamp: string;
  braking: BrakingMetrics | null;
  throttle: ThrottleMetrics | null;
  steering: SteeringMetrics | null;
  rhythm: RhythmMetrics | null;
  /** Data source indicator */
  source: 'live' | 'post_session' | 'historical';
  /** Overall telemetry confidence (0-100) */
  telemetryConfidence: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 2: BEHAVIORAL INDEX LAYER
// ═══════════════════════════════════════════════════════════════════════════════

export interface BehavioralIndices {
  /** Braking Stability Index (BSI) - composite of braking metrics */
  bsi: number;
  /** Throttle Control Index (TCI) - composite of throttle metrics */
  tci: number;
  /** Cornering Precision Index (CPI-2) - composite of steering metrics */
  cpi2: number;
  /** Rhythm & Consistency Index (RCI) - composite of rhythm metrics */
  rci: number;
  /** Overall Behavioral Stability Score */
  behavioralStability: number;
  /** Confidence level based on telemetry availability */
  confidence: number;
  /** Model type indicator */
  modelType: 'telemetry_informed' | 'results_based';
}

// ─── Updated CPI Weights ──────────────────────────────────────────────────────

export interface CPIWeights {
  incidentDiscipline: number;  // Default: 40%
  finishStability: number;     // Default: 20%
  behavioralStability: number; // Default: 20%
  completionReliability: number; // Default: 20%
}

export const DEFAULT_CPI_WEIGHTS: CPIWeights = {
  incidentDiscipline: 0.40,
  finishStability: 0.20,
  behavioralStability: 0.20,
  completionReliability: 0.20,
};

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 5: TELEMETRY CONFIDENCE MODEL
// ═══════════════════════════════════════════════════════════════════════════════

export interface TelemetryConfidence {
  /** Overall confidence score (0-100) */
  score: number;
  /** Confidence tier */
  tier: 'high' | 'moderate' | 'low' | 'insufficient';
  /** Human-readable label */
  label: string;
  /** Model type for display */
  modelLabel: 'Telemetry-informed model' | 'Results-based model' | 'Hybrid model';
  /** Factors affecting confidence */
  factors: string[];
}

// ─── Confidence Thresholds ────────────────────────────────────────────────────

const TELEMETRY_CONFIDENCE_THRESHOLDS = {
  minLapsForBehavioral: 5,
  minCornersForBraking: 20,
  minCornersForThrottle: 20,
  minCornersForSteering: 20,
  highConfidenceThreshold: 80,
  moderateConfidenceThreshold: 50,
  lowConfidenceThreshold: 25,
};

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 6: LIVE VS HISTORICAL TELEMETRY ARCHITECTURE
// ═══════════════════════════════════════════════════════════════════════════════

export type TelemetrySource = 'live' | 'post_session' | 'historical_baseline';

export interface TelemetryDataAvailability {
  /** Is live telemetry currently streaming? */
  liveActive: boolean;
  /** Number of post-session analyses available */
  postSessionCount: number;
  /** Number of races in historical baseline */
  historicalBaselineRaces: number;
  /** Best available source for current analysis */
  bestSource: TelemetrySource | 'results_only';
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPUTATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute Braking Stability Index (BSI) from braking metrics
 * Weighted composite: timing 30%, smoothness 25%, trail 25%, overshoot 20%
 */
export function computeBSI(braking: BrakingMetrics | null): number {
  if (!braking) return 0;
  return Math.round(
    braking.brakeTimingScore * 0.30 +
    braking.brakePressureSmoothness * 0.25 +
    braking.trailBrakingStability * 0.25 +
    braking.entryOvershootScore * 0.20
  );
}

/**
 * Compute Throttle Control Index (TCI) from throttle metrics
 * Weighted composite: modulation 40%, traction 35%, slip control 25%
 */
export function computeTCI(throttle: ThrottleMetrics | null): number {
  if (!throttle) return 0;
  return Math.round(
    throttle.throttleModulationScore * 0.40 +
    throttle.exitTractionStability * 0.35 +
    throttle.slipThrottleControl * 0.25
  );
}

/**
 * Compute Cornering Precision Index (CPI-2) from steering metrics
 * Weighted composite: turn-in 35%, mid-corner 40%, rotation balance 25%
 * Note: rotation balance is distance from 50 (balanced)
 */
export function computeCPI2(steering: SteeringMetrics | null): number {
  if (!steering) return 0;
  const rotationPenalty = Math.abs(steering.rotationBalance - 50) * 2; // 0-100 penalty
  const rotationScore = Math.max(0, 100 - rotationPenalty);
  return Math.round(
    steering.turnInConsistency * 0.35 +
    steering.midCornerStability * 0.40 +
    rotationScore * 0.25
  );
}

/**
 * Compute Rhythm & Consistency Index (RCI) from rhythm metrics
 * Weighted composite: lap time 30%, sector 25%, input 25%, baseline 20%
 */
export function computeRCI(rhythm: RhythmMetrics | null): number {
  if (!rhythm) return 0;
  return Math.round(
    rhythm.lapTimeConsistency * 0.30 +
    rhythm.sectorConsistency * 0.25 +
    rhythm.inputRepeatability * 0.25 +
    rhythm.baselineAdherence * 0.20
  );
}

/**
 * Compute all behavioral indices from session telemetry
 */
export function computeBehavioralIndices(
  telemetry: SessionTelemetryMetrics | null
): BehavioralIndices {
  if (!telemetry) {
    return {
      bsi: 0,
      tci: 0,
      cpi2: 0,
      rci: 0,
      behavioralStability: 0,
      confidence: 0,
      modelType: 'results_based',
    };
  }

  const bsi = computeBSI(telemetry.braking);
  const tci = computeTCI(telemetry.throttle);
  const cpi2 = computeCPI2(telemetry.steering);
  const rci = computeRCI(telemetry.rhythm);

  // Behavioral stability is average of all indices
  const validIndices = [bsi, tci, cpi2, rci].filter(i => i > 0);
  const behavioralStability = validIndices.length > 0
    ? Math.round(validIndices.reduce((a, b) => a + b, 0) / validIndices.length)
    : 0;

  return {
    bsi,
    tci,
    cpi2,
    rci,
    behavioralStability,
    confidence: telemetry.telemetryConfidence,
    modelType: telemetry.telemetryConfidence >= 50 ? 'telemetry_informed' : 'results_based',
  };
}

/**
 * Compute telemetry confidence based on available data
 */
export function computeTelemetryConfidence(
  telemetry: SessionTelemetryMetrics | null,
  availability: TelemetryDataAvailability
): TelemetryConfidence {
  if (!telemetry || availability.bestSource === 'results_only') {
    return {
      score: 0,
      tier: 'insufficient',
      label: 'No telemetry data',
      modelLabel: 'Results-based model',
      factors: ['Telemetry not available'],
    };
  }

  const factors: string[] = [];
  let score = 0;

  // Check braking sample
  if (telemetry.braking && telemetry.braking.sampleCorners >= TELEMETRY_CONFIDENCE_THRESHOLDS.minCornersForBraking) {
    score += 25;
  } else {
    factors.push('Limited braking data');
  }

  // Check throttle sample
  if (telemetry.throttle && telemetry.throttle.sampleCorners >= TELEMETRY_CONFIDENCE_THRESHOLDS.minCornersForThrottle) {
    score += 25;
  } else {
    factors.push('Limited throttle data');
  }

  // Check steering sample
  if (telemetry.steering && telemetry.steering.sampleCorners >= TELEMETRY_CONFIDENCE_THRESHOLDS.minCornersForSteering) {
    score += 25;
  } else {
    factors.push('Limited steering data');
  }

  // Check rhythm sample
  if (telemetry.rhythm && telemetry.rhythm.sampleLaps >= TELEMETRY_CONFIDENCE_THRESHOLDS.minLapsForBehavioral) {
    score += 25;
  } else {
    factors.push('Limited lap data');
  }

  // Determine tier
  let tier: TelemetryConfidence['tier'];
  let label: string;
  let modelLabel: TelemetryConfidence['modelLabel'];

  if (score >= TELEMETRY_CONFIDENCE_THRESHOLDS.highConfidenceThreshold) {
    tier = 'high';
    label = 'High confidence';
    modelLabel = 'Telemetry-informed model';
  } else if (score >= TELEMETRY_CONFIDENCE_THRESHOLDS.moderateConfidenceThreshold) {
    tier = 'moderate';
    label = 'Moderate confidence';
    modelLabel = 'Hybrid model';
  } else if (score >= TELEMETRY_CONFIDENCE_THRESHOLDS.lowConfidenceThreshold) {
    tier = 'low';
    label = 'Low confidence';
    modelLabel = 'Hybrid model';
  } else {
    tier = 'insufficient';
    label = 'Insufficient data';
    modelLabel = 'Results-based model';
  }

  return { score, tier, label, modelLabel, factors };
}

/**
 * Compute updated CPI with behavioral stability component
 */
export function computeEnhancedCPI(
  incidentScore: number,
  finishStabilityScore: number,
  behavioralStability: number,
  completionScore: number,
  weights: CPIWeights = DEFAULT_CPI_WEIGHTS
): number {
  return Math.round(
    incidentScore * weights.incidentDiscipline +
    finishStabilityScore * weights.finishStability +
    behavioralStability * weights.behavioralStability +
    completionScore * weights.completionReliability
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 3: INTELLIGENCE ENGINE INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

export type ProblemCategory = 
  | 'incident_driven'
  | 'control_driven'
  | 'racecraft_driven'
  | 'pace_driven'
  | 'balanced';

export interface IntelligenceAssessment {
  /** Primary problem category */
  primaryCategory: ProblemCategory;
  /** Status line message */
  statusMessage: string;
  /** Confidence in assessment */
  confidence: number;
  /** Model type */
  modelType: 'telemetry_informed' | 'results_based';
  /** Supporting data points */
  supportingData: string[];
}

/**
 * Generate telemetry-aware status assessment
 * This is the core intelligence engine for the Home page
 */
export function generateIntelligenceAssessment(
  incidentRate: number,
  finishAvg: number,
  iRatingDelta: number,
  behavioral: BehavioralIndices | null
): IntelligenceAssessment {
  const highIncidents = incidentRate > 3;
  const lowIncidents = incidentRate <= 2;
  const poorFinish = finishAvg > 15;
  const goodFinish = finishAvg <= 10;
  const ratingDown = iRatingDelta < -20;
  const ratingUp = iRatingDelta > 20;

  // Behavioral thresholds
  const hasBehavioral = behavioral && behavioral.confidence >= 50;
  const lowBSI = hasBehavioral && behavioral.bsi < 50;
  const lowTCI = hasBehavioral && behavioral.tci < 50;
  const lowCPI2 = hasBehavioral && behavioral.cpi2 < 50;
  const strongBehavioral = hasBehavioral && behavioral.behavioralStability >= 70;
  const unstableBehavioral = hasBehavioral && behavioral.behavioralStability < 50;

  const supportingData: string[] = [];
  let primaryCategory: ProblemCategory = 'balanced';
  let statusMessage = 'Performance within normal variance.';

  // Decision tree for telemetry-aware insights
  if (highIncidents && lowBSI) {
    primaryCategory = 'control_driven';
    statusMessage = 'Braking instability is primary rating limiter.';
    supportingData.push(`BSI: ${behavioral!.bsi}`, `Avg incidents: ${incidentRate.toFixed(1)}`);
  } else if (lowIncidents && lowTCI) {
    primaryCategory = 'control_driven';
    statusMessage = 'Throttle application is reducing exit efficiency.';
    supportingData.push(`TCI: ${behavioral!.tci}`, `Clean racing maintained`);
  } else if (poorFinish && strongBehavioral) {
    primaryCategory = 'racecraft_driven';
    statusMessage = 'Racecraft positioning limiting results — not control.';
    supportingData.push(`Behavioral stability: ${behavioral!.behavioralStability}`, `Avg finish: P${finishAvg.toFixed(1)}`);
  } else if (unstableBehavioral && lowIncidents) {
    primaryCategory = 'control_driven';
    statusMessage = 'Control volatility present — not yet manifesting as contact.';
    supportingData.push(`Behavioral stability: ${behavioral!.behavioralStability}`, `Incidents controlled`);
  } else if (highIncidents && !hasBehavioral) {
    // Fallback to results-based
    primaryCategory = 'incident_driven';
    statusMessage = 'Rating suppressed by incident density.';
    supportingData.push(`Avg incidents: ${incidentRate.toFixed(1)}`);
  } else if (ratingDown && lowIncidents) {
    primaryCategory = 'pace_driven';
    statusMessage = 'Rating decline unrelated to contact — investigate pace.';
    supportingData.push(`iR delta: ${iRatingDelta}`, `Clean racing`);
  } else if (ratingUp && highIncidents) {
    primaryCategory = 'incident_driven';
    statusMessage = 'Positive rating movement despite elevated incident load.';
    supportingData.push(`iR delta: +${iRatingDelta}`, `Avg incidents: ${incidentRate.toFixed(1)}`);
  } else if (ratingUp && strongBehavioral) {
    primaryCategory = 'balanced';
    statusMessage = 'Strong trajectory with controlled inputs.';
    supportingData.push(`iR delta: +${iRatingDelta}`, `Behavioral stability: ${behavioral!.behavioralStability}`);
  } else if (lowCPI2 && poorFinish) {
    primaryCategory = 'control_driven';
    statusMessage = 'Cornering precision affecting race pace.';
    supportingData.push(`CPI-2: ${behavioral!.cpi2}`, `Avg finish: P${finishAvg.toFixed(1)}`);
  }

  return {
    primaryCategory,
    statusMessage,
    confidence: hasBehavioral ? behavioral!.confidence : 60,
    modelType: hasBehavioral ? 'telemetry_informed' : 'results_based',
    supportingData,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 4: CREW ROLE SPECIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface TelemetryCrewInsight {
  role: 'engineer' | 'spotter' | 'analyst';
  message: string;
  confidence: number;
  dataWindow: string;
  modelType: 'telemetry_informed' | 'results_based';
}

/**
 * Generate Engineer insights using telemetry data
 * Focus: BSI, TCI, trail braking variance, entry delta markers
 */
export function generateEngineerInsight(
  behavioral: BehavioralIndices | null,
  telemetry: SessionTelemetryMetrics | null,
  incidentRate: number
): TelemetryCrewInsight {
  const hasTelemetry = behavioral && behavioral.confidence >= 50;

  if (hasTelemetry && behavioral.bsi < 50) {
    return {
      role: 'engineer',
      message: `Braking stability at ${behavioral.bsi}%. Focus on brake application timing and trail braking consistency.`,
      confidence: behavioral.confidence,
      dataWindow: telemetry?.braking ? `${telemetry.braking.sampleCorners} corners analyzed` : 'Recent sessions',
      modelType: 'telemetry_informed',
    };
  }

  if (hasTelemetry && behavioral.tci < 50) {
    return {
      role: 'engineer',
      message: `Throttle control at ${behavioral.tci}%. Exit traction instability detected — modulate throttle application.`,
      confidence: behavioral.confidence,
      dataWindow: telemetry?.throttle ? `${telemetry.throttle.sampleCorners} corners analyzed` : 'Recent sessions',
      modelType: 'telemetry_informed',
    };
  }

  if (hasTelemetry && behavioral.rci < 50) {
    return {
      role: 'engineer',
      message: `Rhythm consistency at ${behavioral.rci}%. Lap-to-lap variance elevated — focus on repeatable inputs.`,
      confidence: behavioral.confidence,
      dataWindow: telemetry?.rhythm ? `${telemetry.rhythm.sampleLaps} laps analyzed` : 'Recent sessions',
      modelType: 'telemetry_informed',
    };
  }

  // Fallback to results-based
  if (incidentRate > 3) {
    return {
      role: 'engineer',
      message: `Avg ${incidentRate.toFixed(1)} incidents per race. Focus on braking entry control and throttle modulation.`,
      confidence: 70,
      dataWindow: 'Last 5 races',
      modelType: 'results_based',
    };
  }

  return {
    role: 'engineer',
    message: 'Stable output — look for marginal gains in corner exit.',
    confidence: 60,
    dataWindow: 'Recent sessions',
    modelType: 'results_based',
  };
}

/**
 * Generate Spotter insights using telemetry data
 * Focus: Proximity + telemetry overlap risk, contact probability model
 */
export function generateSpotterInsight(
  behavioral: BehavioralIndices | null,
  incidentRate: number,
  cleanRaceFinishes: number[],
  incidentRaceFinishes: number[]
): TelemetryCrewInsight {
  const hasTelemetry = behavioral && behavioral.confidence >= 50;
  const cleanAvg = cleanRaceFinishes.length > 0 
    ? cleanRaceFinishes.reduce((a, b) => a + b, 0) / cleanRaceFinishes.length 
    : 0;
  const incidentAvg = incidentRaceFinishes.length > 0 
    ? incidentRaceFinishes.reduce((a, b) => a + b, 0) / incidentRaceFinishes.length 
    : 0;

  // Telemetry-informed: low BSI + high incidents = braking-related contact
  if (hasTelemetry && behavioral.bsi < 50 && incidentRate > 3) {
    return {
      role: 'spotter',
      message: `Contact probability elevated due to braking instability. BSI ${behavioral.bsi}% — late braking in traffic is high risk.`,
      confidence: behavioral.confidence,
      dataWindow: 'Telemetry analysis',
      modelType: 'telemetry_informed',
    };
  }

  // Telemetry-informed: low CPI-2 = mid-corner contact risk
  if (hasTelemetry && behavioral.cpi2 < 50 && incidentRate > 2) {
    return {
      role: 'spotter',
      message: `Mid-corner steering corrections creating overlap risk. CPI-2 at ${behavioral.cpi2}%.`,
      confidence: behavioral.confidence,
      dataWindow: 'Telemetry analysis',
      modelType: 'telemetry_informed',
    };
  }

  // Results-based fallback
  if (incidentRaceFinishes.length > 0 && cleanRaceFinishes.length > 0) {
    const delta = Math.round(incidentAvg - cleanAvg);
    if (delta < -2) {
      return {
        role: 'spotter',
        message: `Incidents occurring while running top-${Math.round(incidentAvg)} positions — competitive risk zones.`,
        confidence: 70,
        dataWindow: `${cleanRaceFinishes.length + incidentRaceFinishes.length}-race sample`,
        modelType: 'results_based',
      };
    }
  }

  return {
    role: 'spotter',
    message: 'Traffic management stable. Maintain situational awareness.',
    confidence: 60,
    dataWindow: 'Recent sessions',
    modelType: 'results_based',
  };
}

/**
 * Generate Analyst insights using telemetry data
 * Focus: Finish delta vs control quality, behavioral vs result divergence
 */
export function generateAnalystInsight(
  behavioral: BehavioralIndices | null,
  finishAvg: number,
  iRatingDelta: number,
  finishVariance: number
): TelemetryCrewInsight {
  const hasTelemetry = behavioral && behavioral.confidence >= 50;

  // Telemetry-informed: strong behavioral but poor results = racecraft issue
  if (hasTelemetry && behavioral.behavioralStability >= 70 && finishAvg > 15) {
    return {
      role: 'analyst',
      message: `Behavioral stability ${behavioral.behavioralStability}% but avg finish P${finishAvg.toFixed(1)}. Control quality exceeds results — racecraft development required.`,
      confidence: behavioral.confidence,
      dataWindow: 'Telemetry + results analysis',
      modelType: 'telemetry_informed',
    };
  }

  // Telemetry-informed: poor behavioral but good results = unsustainable
  if (hasTelemetry && behavioral.behavioralStability < 50 && finishAvg <= 10) {
    return {
      role: 'analyst',
      message: `Results (P${finishAvg.toFixed(1)}) outpacing control quality (${behavioral.behavioralStability}%). Current performance may be unsustainable.`,
      confidence: behavioral.confidence,
      dataWindow: 'Telemetry + results analysis',
      modelType: 'telemetry_informed',
    };
  }

  // Telemetry-informed: aligned behavioral and results
  if (hasTelemetry && Math.abs(behavioral.behavioralStability - (100 - finishAvg * 3)) < 20) {
    return {
      role: 'analyst',
      message: `Control quality and results aligned. Behavioral stability: ${behavioral.behavioralStability}%. Sustainable performance profile.`,
      confidence: behavioral.confidence,
      dataWindow: 'Telemetry + results analysis',
      modelType: 'telemetry_informed',
    };
  }

  // Results-based fallback
  if (finishVariance < 9) {
    return {
      role: 'analyst',
      message: `Finish variance ±${Math.sqrt(finishVariance).toFixed(1)} positions. Highly consistent output.`,
      confidence: 70,
      dataWindow: 'Last 5 races',
      modelType: 'results_based',
    };
  }

  return {
    role: 'analyst',
    message: `Avg finish P${finishAvg.toFixed(1)} with moderate variance. Isolate outlier sessions.`,
    confidence: 60,
    dataWindow: 'Recent sessions',
    modelType: 'results_based',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BACKWARD COMPATIBILITY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check telemetry availability and return best available data source
 */
export function checkTelemetryAvailability(
  liveActive: boolean,
  postSessionCount: number,
  historicalRaces: number
): TelemetryDataAvailability {
  let bestSource: TelemetryDataAvailability['bestSource'] = 'results_only';

  if (liveActive) {
    bestSource = 'live';
  } else if (postSessionCount >= 3) {
    bestSource = 'post_session';
  } else if (historicalRaces >= 5) {
    bestSource = 'historical_baseline';
  }

  return {
    liveActive,
    postSessionCount,
    historicalBaselineRaces: historicalRaces,
    bestSource,
  };
}

/**
 * Generate fallback assessment when no telemetry is available
 * Maintains backward compatibility with results-only users
 */
export function generateResultsOnlyAssessment(
  incidentRate: number,
  finishAvg: number,
  iRatingDelta: number
): IntelligenceAssessment {
  return generateIntelligenceAssessment(incidentRate, finishAvg, iRatingDelta, null);
}
