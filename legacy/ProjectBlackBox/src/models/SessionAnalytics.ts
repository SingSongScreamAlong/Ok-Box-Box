/**
 * Session Analytics model for post-session analysis and reporting
 */
export interface SessionAnalytics {
  // Session identification
  sessionId: string;
  trackId: string;
  date: number; // timestamp
  duration: number; // seconds
  
  // Stint information
  stints: Array<{
    driverId: string;
    startTime: number; // timestamp
    endTime: number; // timestamp
    laps: number;
    avgLapTime: number; // seconds
    bestLapTime: number; // seconds
    consistency: number; // 0.0 - 1.0
    fuelUsed: number; // liters
    tireWear: {
      frontLeft: number; // 0.0 - 1.0
      frontRight: number;
      rearLeft: number;
      rearRight: number;
    };
    incidents: number;
    notes?: string;
  }>;
  
  // Lap data
  laps: Array<{
    lapNumber: number;
    driverId: string;
    time: number; // seconds
    sector1: number; // seconds
    sector2: number; // seconds
    sector3: number; // seconds
    fuelUsed: number; // liters
    tireTemps: {
      frontLeft: number; // Celsius
      frontRight: number;
      rearLeft: number;
      rearRight: number;
    };
    valid: boolean;
    incidents?: Array<{
      type: 'offTrack' | 'contact' | 'spin' | 'mechanicalFailure';
      severity: number; // 1-5
      location: {
        x: number;
        y: number;
        z: number;
      };
      time: number; // seconds into lap
    }>;
  }>;
  
  // Performance metrics
  performance: {
    bestLap: number; // lap number
    bestLapTime: number; // seconds
    bestSectors: [number, number, number]; // seconds
    theoreticalBestLap: number; // seconds
    avgLapTime: number; // seconds
    consistency: number; // 0.0 - 1.0
    fuelEfficiency: number; // liters per lap
    tireWearRate: {
      frontLeft: number; // per lap
      frontRight: number;
      rearLeft: number;
      rearRight: number;
    };
  };
  
  // Strategy data
  strategy: {
    pitStops: Array<{
      lap: number;
      duration: number; // seconds
      fuelAdded: number; // liters
      tiresChanged: boolean;
      repairs?: {
        duration: number; // seconds
        components: string[];
      };
      driverChange?: {
        outDriverId: string;
        inDriverId: string;
      };
    }>;
    fuelStrategy: {
      targetLapsPerStint: number;
      actualLapsPerStint: number;
      fuelSavingRequired: number; // liters per lap
    };
    tireStrategy: {
      compound: string;
      optimalPressures: {
        frontLeft: number; // kPa
        frontRight: number;
        rearLeft: number;
        rearRight: number;
      };
      estimatedLifespan: number; // laps
    };
  };
  
  // Weather and track conditions
  conditions: {
    startWeather: {
      temperature: number; // Celsius
      trackTemperature: number; // Celsius
      windSpeed: number; // km/h
      windDirection: number; // degrees
      humidity: number; // percentage
      trackGrip: number; // 0.0 - 1.0
    };
    endWeather: {
      temperature: number;
      trackTemperature: number;
      windSpeed: number;
      windDirection: number;
      humidity: number;
      trackGrip: number;
    };
    weatherChanges: Array<{
      time: number; // seconds into session
      type: 'temperature' | 'rain' | 'wind' | 'grip';
      value: number;
    }>;
  };
  
  // Analysis and insights
  analysis?: {
    strengths: string[];
    weaknesses: string[];
    improvementAreas: Array<{
      area: string;
      description: string;
      potentialGain: number; // seconds per lap
    }>;
    setupRecommendations: Array<{
      component: string;
      currentValue: number;
      recommendedValue: number;
      expectedGain: number; // seconds per lap
    }>;
    notes: string;
  };
}
