/**
 * Analytics and reporting system models
 */

// Performance metric types
export enum PerformanceMetricType {
  LAP_TIME = 'lap_time',
  SECTOR_TIME = 'sector_time',
  CORNER_SPEED = 'corner_speed',
  STRAIGHT_SPEED = 'straight_speed',
  BRAKING_POINT = 'braking_point',
  THROTTLE_APPLICATION = 'throttle_application',
  CONSISTENCY = 'consistency',
  TIRE_WEAR = 'tire_wear',
  FUEL_EFFICIENCY = 'fuel_efficiency',
  RACE_PACE = 'race_pace',
  QUALIFYING_PACE = 'qualifying_pace',
  RACE_CRAFT = 'race_craft',
  ADAPTABILITY = 'adaptability'
}

// Performance comparison model
export interface PerformanceComparison {
  id: string;
  sessionId: string;
  driverIds: string[];
  trackId: string;
  carId: string;
  timestamp: number;
  metrics: Array<{
    type: PerformanceMetricType;
    values: Record<string, number>; // driverId -> value
    delta: Record<string, number>; // driverId -> delta from best
    trend: Record<string, number>; // driverId -> trend (-1.0 to 1.0)
  }>;
  analysis: {
    strengths: Record<string, string[]>; // driverId -> strengths
    weaknesses: Record<string, string[]>; // driverId -> weaknesses
    recommendations: Record<string, string[]>; // driverId -> recommendations
  };
}

// Lap comparison model
export interface LapComparison {
  id: string;
  sessionId: string;
  trackId: string;
  carId: string;
  referenceLap: {
    driverId: string;
    lapNumber: number;
    lapTime: number; // seconds
    sectors: number[]; // seconds
    valid: boolean;
  };
  comparisonLap: {
    driverId: string;
    lapNumber: number;
    lapTime: number; // seconds
    sectors: number[]; // seconds
    valid: boolean;
  };
  sectorDeltas: number[]; // seconds
  cumulativeDelta: number; // seconds
  telemetryPoints: Array<{
    distance: number; // meters from start/finish
    timeDelta: number; // seconds
    speedDelta: number; // km/h
    lineDeviation: number; // meters
    throttleDelta: number; // -1.0 to 1.0
    brakeDelta: number; // -1.0 to 1.0
    gearDelta: number; // integer
  }>;
  keyFindings: string[];
  created: number; // timestamp
}

// Session report model
export interface SessionReport {
  id: string;
  sessionId: string;
  title: string;
  date: number; // timestamp
  trackId: string;
  carId: string;
  driverIds: string[];
  duration: number; // seconds
  laps: number;
  distance: number; // km
  
  overview: {
    bestLapTime: number; // seconds
    averageLapTime: number; // seconds
    consistency: number; // 0.0 - 1.0
    incidents: number;
    position: number;
    gapToLeader?: number; // seconds
  };
  
  performance: {
    lapTimes: number[]; // seconds
    sectorTimes: number[][]; // seconds per sector per lap
    theoreticalBestLap: number; // seconds
    bestSectors: number[]; // seconds
    lapTimeProgression: Array<{
      lap: number;
      time: number; // seconds
      delta: number; // seconds from best
      trend: number; // moving average
    }>;
  };
  
  driverAnalysis: Record<string, {
    stintCount: number;
    totalLaps: number;
    bestLapTime: number; // seconds
    averageLapTime: number; // seconds
    consistency: number; // 0.0 - 1.0
    fuelEfficiency: number; // liters per lap
    tireManagement: number; // 0.0 - 1.0
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  }>;
  
  setupAnalysis: {
    baseSetup: string; // Setup ID
    setupChanges: Array<{
      component: string;
      before: number | string;
      after: number | string;
      impact: number; // seconds per lap, negative is better
    }>;
    recommendations: Array<{
      component: string;
      currentValue: number | string;
      recommendedValue: number | string;
      expectedGain: number; // seconds per lap
      confidence: number; // 0.0 - 1.0
    }>;
  };
  
  strategyAnalysis: {
    plannedStops: number;
    actualStops: number;
    fuelEfficiency: {
      target: number; // liters per lap
      actual: number; // liters per lap
      delta: number; // liters per lap
    };
    tirePerformance: {
      compound: string;
      targetLaps: number;
      actualLaps: number;
      degradationRate: number; // per lap
    };
    keyDecisions: Array<{
      lap: number;
      decision: string;
      outcome: string;
      impact: number; // seconds, negative is better
    }>;
    alternativeStrategies: Array<{
      description: string;
      estimatedTimeDelta: number; // seconds, negative is better
      confidence: number; // 0.0 - 1.0
    }>;
  };
  
  incidents: Array<{
    lap: number;
    type: string;
    severity: number; // 1-5
    timeImpact: number; // seconds
    description: string;
    preventable: boolean;
    recommendation: string;
  }>;
  
  summary: {
    keyFindings: string[];
    positives: string[];
    negatives: string[];
    actionItems: string[];
  };
  
  created: number; // timestamp
  generatedBy: string; // 'ai' or user ID
}

// Performance trend model
export interface PerformanceTrend {
  driverId: string;
  trackId: string;
  carId: string;
  metric: PerformanceMetricType;
  dataPoints: Array<{
    sessionId: string;
    date: number; // timestamp
    value: number;
    percentile: number; // 0.0 - 1.0 compared to driver's history
  }>;
  trend: number; // -1.0 to 1.0, negative is improving
  analysis: {
    description: string;
    factors: string[];
    recommendations: string[];
  };
  updated: number; // timestamp
}
