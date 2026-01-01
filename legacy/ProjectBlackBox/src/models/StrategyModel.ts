/**
 * Strategy system models for race planning and execution
 */

// Pit stop types
export enum PitStopType {
  FUEL_ONLY = 'fuel_only',
  TIRES_ONLY = 'tires_only',
  FUEL_AND_TIRES = 'fuel_and_tires',
  REPAIRS = 'repairs',
  DRIVER_CHANGE = 'driver_change',
  FULL_SERVICE = 'full_service'
}

// Tire compound types (generic, can be extended for specific sims)
export enum TireCompound {
  SOFT = 'soft',
  MEDIUM = 'medium',
  HARD = 'hard',
  INTERMEDIATE = 'intermediate',
  WET = 'wet',
  QUALIFYING = 'qualifying'
}

// Pit stop model
export interface PitStop {
  id: string;
  sessionId: string;
  scheduledLap: number;
  actualLap?: number;
  type: PitStopType;
  estimatedDuration: number; // seconds
  actualDuration?: number; // seconds
  fuel: {
    before: number; // liters
    added: number; // liters
    after: number; // liters
  };
  tires?: {
    change: boolean;
    compound: TireCompound;
    pressures: {
      frontLeft: number; // kPa
      frontRight: number;
      rearLeft: number;
      rearRight: number;
    };
  };
  repairs?: {
    duration: number; // seconds
    components: string[];
  };
  driverChange?: {
    outDriverId: string;
    inDriverId: string;
    estimatedSwapTime: number; // seconds
    actualSwapTime?: number; // seconds
  };
  notes?: string;
  completed: boolean;
  timestamp?: number; // when the stop occurred
}

// Race strategy model
export interface RaceStrategy {
  id: string;
  sessionId: string;
  name: string;
  description?: string;
  totalLaps: number;
  stints: Array<{
    startLap: number;
    endLap: number;
    driverId: string;
    fuelTarget: {
      startLevel: number; // liters
      targetConsumption: number; // liters per lap
      actualConsumption?: number; // liters per lap
    };
    tireTarget: {
      compound: TireCompound;
      pressures: {
        frontLeft: number; // kPa
        frontRight: number;
        rearLeft: number;
        rearRight: number;
      };
      targetWear: number; // 0.0 - 1.0 by end of stint
      actualWear?: number; // 0.0 - 1.0 by end of stint
    };
    pace: {
      target: number; // seconds per lap
      actual?: number; // seconds per lap
    };
  }>;
  pitStops: string[]; // PitStop IDs
  weatherStrategy?: {
    expectedChanges: Array<{
      lap: number;
      condition: 'dry' | 'damp' | 'wet' | 'very_wet';
      temperature: number; // Celsius
      precipitation: number; // 0.0 - 1.0
    }>;
    contingencyPlans: Record<string, string>; // condition -> strategy ID
  };
  active: boolean;
  created: number; // timestamp
  updated: number; // timestamp
}

// Strategy recommendation model
export interface StrategyRecommendation {
  id: string;
  sessionId: string;
  timestamp: number;
  type: 'fuel' | 'tires' | 'pace' | 'pit_window' | 'weather' | 'incident';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  data: any; // Specific data related to the recommendation
  acknowledged: boolean;
  acknowledgedBy?: string; // Driver or engineer ID
  acknowledgedAt?: number; // timestamp
}

// Fuel strategy model
export interface FuelStrategy {
  sessionId: string;
  totalFuelCapacity: number; // liters
  currentFuelLevel: number; // liters
  averageConsumption: number; // liters per lap
  targetConsumption: number; // liters per lap
  lapsRemaining: number;
  estimatedLapsWithCurrentFuel: number;
  fuelRequiredToFinish: number; // liters
  fuelSavingRequired: number; // liters per lap
  fuelSavingTechniques: string[];
  pitWindowLaps: [number, number][]; // Array of [startLap, endLap]
  updated: number; // timestamp
}

// Tire strategy model
export interface TireStrategy {
  sessionId: string;
  currentCompound: TireCompound;
  currentAge: number; // laps
  wear: {
    frontLeft: number; // 0.0 - 1.0
    frontRight: number;
    rearLeft: number;
    rearRight: number;
  };
  optimalPressures: {
    frontLeft: number; // kPa
    frontRight: number;
    rearLeft: number;
    rearRight: number;
  };
  estimatedLifeRemaining: number; // laps
  recommendedNextCompound: TireCompound;
  performanceImpact: number; // seconds per lap
  updated: number; // timestamp
}
