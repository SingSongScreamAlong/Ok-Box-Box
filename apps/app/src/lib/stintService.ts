import { supabase } from './supabase';

// Types
export interface Driver {
  id: string;
  name: string;
  number: string;
  color: string;
  avgLapTime: number; // ms
  fuelPerLap: number; // liters
  maxStintLength: number; // laps
  iRating?: number;
}

export interface Stint {
  id: string;
  strategyId: string;
  driverId: string;
  startLap: number;
  endLap: number;
  fuelLoad: number;
  tireCompound: 'soft' | 'medium' | 'hard' | 'wet';
  estimatedTime: number; // ms
  notes: string;
  order: number;
}

export interface PitStop {
  id: string;
  strategyId: string;
  afterStintId: string;
  fuel: number;
  tires: boolean;
  driverChange: boolean;
  estimatedDuration: number; // seconds
}

export interface RaceStrategy {
  id: string;
  teamId: string;
  eventId?: string;
  name: string;
  raceType: 'laps' | 'timed';
  totalLaps: number;
  totalTime: number; // minutes for timed races
  fuelCapacity: number;
  minPitStops: number;
  maxDriverTime: number; // minutes
  pitLaneTime: number; // seconds
  fuelFlowRate: number; // liters per second
  tireChangeTime: number; // seconds
  driverChangeTime: number; // seconds
  stints: Stint[];
  pitStops: PitStop[];
  createdAt: string;
  updatedAt: string;
}

export interface StrategyValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Demo data
function generateDemoDrivers(): Driver[] {
  return [
    { id: 'd1', name: 'Alex Thompson', number: '42', color: '#3b82f6', avgLapTime: 87000, fuelPerLap: 2.8, maxStintLength: 35, iRating: 4250 },
    { id: 'd2', name: 'Jordan Mitchell', number: '17', color: '#f97316', avgLapTime: 87500, fuelPerLap: 2.9, maxStintLength: 30, iRating: 3890 },
    { id: 'd3', name: 'Sam Rodriguez', number: '88', color: '#22c55e', avgLapTime: 88000, fuelPerLap: 3.0, maxStintLength: 28, iRating: 3650 },
    { id: 'd4', name: 'Casey Williams', number: '23', color: '#a855f7', avgLapTime: 87200, fuelPerLap: 2.85, maxStintLength: 32, iRating: 4100 },
  ];
}

function generateDemoStrategy(teamId: string): RaceStrategy {
  const drivers = generateDemoDrivers();
  return {
    id: `strategy_${Date.now()}`,
    teamId,
    name: 'Default Strategy',
    raceType: 'laps',
    totalLaps: 120,
    totalTime: 180,
    fuelCapacity: 110,
    minPitStops: 2,
    maxDriverTime: 120,
    pitLaneTime: 25,
    fuelFlowRate: 2.5,
    tireChangeTime: 12,
    driverChangeTime: 8,
    stints: [
      { id: 's1', strategyId: '', driverId: drivers[0].id, startLap: 1, endLap: 40, fuelLoad: 110, tireCompound: 'medium', estimatedTime: 40 * 87000, notes: 'Opening stint', order: 1 },
      { id: 's2', strategyId: '', driverId: drivers[1].id, startLap: 41, endLap: 80, fuelLoad: 110, tireCompound: 'medium', estimatedTime: 40 * 87500, notes: 'Middle stint', order: 2 },
      { id: 's3', strategyId: '', driverId: drivers[0].id, startLap: 81, endLap: 120, fuelLoad: 95, tireCompound: 'soft', estimatedTime: 40 * 87000, notes: 'Final stint', order: 3 },
    ],
    pitStops: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

// API Functions
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export async function fetchTeamDrivers(teamId: string): Promise<Driver[]> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE}/api/v1/teams/${teamId}/drivers`, {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    });

    if (!response.ok) throw new Error('Failed to fetch drivers');
    return await response.json();
  } catch (error) {
    console.warn('Using demo driver data:', error);
    return generateDemoDrivers();
  }
}

export async function fetchTeamStrategies(teamId: string): Promise<RaceStrategy[]> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE}/api/v1/teams/${teamId}/strategies`, {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    });

    if (!response.ok) throw new Error('Failed to fetch strategies');
    return await response.json();
  } catch (error) {
    console.warn('Using demo strategy data:', error);
    return [generateDemoStrategy(teamId)];
  }
}

export async function fetchStrategy(strategyId: string): Promise<RaceStrategy | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE}/api/v1/strategies/${strategyId}`, {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    });

    if (!response.ok) throw new Error('Failed to fetch strategy');
    return await response.json();
  } catch (error) {
    console.warn('Using demo strategy:', error);
    return generateDemoStrategy('demo');
  }
}

export async function createStrategy(
  teamId: string,
  strategy: Omit<RaceStrategy, 'id' | 'createdAt' | 'updatedAt'>
): Promise<{ data: RaceStrategy | null; error: string | null }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE}/api/v1/teams/${teamId}/strategies`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(strategy)
    });

    if (!response.ok) throw new Error('Failed to create strategy');
    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    // Demo mode - return mock success
    return {
      data: {
        ...strategy,
        id: `strategy_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as RaceStrategy,
      error: null
    };
  }
}

export async function updateStrategy(
  strategyId: string,
  updates: Partial<RaceStrategy>
): Promise<{ data: RaceStrategy | null; error: string | null }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE}/api/v1/strategies/${strategyId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) throw new Error('Failed to update strategy');
    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    return { data: null, error: 'Failed to update strategy' };
  }
}

export async function deleteStrategy(strategyId: string): Promise<{ error: string | null }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE}/api/v1/strategies/${strategyId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    });

    if (!response.ok) throw new Error('Failed to delete strategy');
    return { error: null };
  } catch (error) {
    return { error: null }; // Demo mode
  }
}

// Validation
export function validateStrategy(strategy: RaceStrategy, drivers: Driver[]): StrategyValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check lap coverage
  const coveredLaps = new Set<number>();
  strategy.stints.forEach(stint => {
    for (let lap = stint.startLap; lap <= stint.endLap; lap++) {
      if (coveredLaps.has(lap)) {
        errors.push(`Lap ${lap} is covered by multiple stints`);
      }
      coveredLaps.add(lap);
    }
  });

  for (let lap = 1; lap <= strategy.totalLaps; lap++) {
    if (!coveredLaps.has(lap)) {
      errors.push(`Lap ${lap} is not covered by any stint`);
      break;
    }
  }

  // Check fuel capacity
  strategy.stints.forEach((stint, idx) => {
    const driver = drivers.find(d => d.id === stint.driverId);
    if (driver) {
      const laps = stint.endLap - stint.startLap + 1;
      const fuelNeeded = laps * driver.fuelPerLap;
      if (fuelNeeded > stint.fuelLoad) {
        errors.push(`Stint ${idx + 1}: Not enough fuel (need ${fuelNeeded.toFixed(1)}L, have ${stint.fuelLoad}L)`);
      }
      if (stint.fuelLoad > strategy.fuelCapacity) {
        errors.push(`Stint ${idx + 1}: Fuel load exceeds tank capacity`);
      }
    }
  });

  // Check max stint length
  strategy.stints.forEach((stint, idx) => {
    const driver = drivers.find(d => d.id === stint.driverId);
    if (driver) {
      const laps = stint.endLap - stint.startLap + 1;
      if (laps > driver.maxStintLength) {
        errors.push(`Stint ${idx + 1}: Exceeds ${driver.name}'s max stint (${laps} > ${driver.maxStintLength} laps)`);
      }
    }
  });

  // Check minimum pit stops
  if (strategy.stints.length - 1 < strategy.minPitStops) {
    errors.push(`Strategy requires minimum ${strategy.minPitStops} pit stops (currently ${strategy.stints.length - 1})`);
  }

  // Check driver time limits
  const driverTimes: Record<string, number> = {};
  strategy.stints.forEach(stint => {
    const driver = drivers.find(d => d.id === stint.driverId);
    if (driver) {
      const laps = stint.endLap - stint.startLap + 1;
      const time = laps * driver.avgLapTime;
      driverTimes[stint.driverId] = (driverTimes[stint.driverId] || 0) + time;
    }
  });

  Object.entries(driverTimes).forEach(([driverId, time]) => {
    const driver = drivers.find(d => d.id === driverId);
    if (driver && time > strategy.maxDriverTime * 60000) {
      errors.push(`${driver.name} exceeds max drive time`);
    }
  });

  // Warnings
  strategy.stints.forEach((stint, idx) => {
    const driver = drivers.find(d => d.id === stint.driverId);
    if (driver) {
      const laps = stint.endLap - stint.startLap + 1;
      const fuelNeeded = laps * driver.fuelPerLap;
      const fuelMargin = stint.fuelLoad - fuelNeeded;
      if (fuelMargin < 5 && fuelMargin >= 0) {
        warnings.push(`Stint ${idx + 1}: Low fuel margin (${fuelMargin.toFixed(1)}L)`);
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Calculation utilities
export function calculateStintTime(stint: Stint, driver: Driver): number {
  const laps = stint.endLap - stint.startLap + 1;
  return laps * driver.avgLapTime;
}

export function calculatePitDuration(
  strategy: RaceStrategy,
  stintBefore: Stint,
  stintAfter: Stint
): number {
  let duration = strategy.pitLaneTime;
  
  // Fuel time
  duration += stintAfter.fuelLoad / strategy.fuelFlowRate;
  
  // Tire change
  if (stintBefore.tireCompound !== stintAfter.tireCompound) {
    duration += strategy.tireChangeTime;
  }
  
  // Driver change
  if (stintBefore.driverId !== stintAfter.driverId) {
    duration += strategy.driverChangeTime;
  }
  
  return duration;
}

export function calculateTotalRaceTime(strategy: RaceStrategy, drivers: Driver[]): number {
  let total = 0;
  
  // Stint times
  strategy.stints.forEach(stint => {
    const driver = drivers.find(d => d.id === stint.driverId);
    if (driver) {
      total += calculateStintTime(stint, driver);
    }
  });
  
  // Pit times
  for (let i = 0; i < strategy.stints.length - 1; i++) {
    total += calculatePitDuration(strategy, strategy.stints[i], strategy.stints[i + 1]) * 1000;
  }
  
  return total;
}

export function autoBalanceStints(
  strategy: RaceStrategy,
  drivers: Driver[]
): Stint[] {
  const totalLaps = strategy.totalLaps;
  const driverCount = new Set(strategy.stints.map(s => s.driverId)).size;
  const stintsPerDriver = Math.ceil(strategy.stints.length / driverCount);
  const lapsPerStint = Math.floor(totalLaps / strategy.stints.length);
  
  return strategy.stints.map((stint, idx) => ({
    ...stint,
    startLap: idx * lapsPerStint + 1,
    endLap: idx === strategy.stints.length - 1 ? totalLaps : (idx + 1) * lapsPerStint,
    fuelLoad: Math.min(strategy.fuelCapacity, lapsPerStint * 3.5) // Estimate with margin
  }));
}

export function optimizeFuelLoads(
  strategy: RaceStrategy,
  drivers: Driver[]
): Stint[] {
  return strategy.stints.map(stint => {
    const driver = drivers.find(d => d.id === stint.driverId);
    if (!driver) return stint;
    
    const laps = stint.endLap - stint.startLap + 1;
    const fuelNeeded = laps * driver.fuelPerLap;
    const optimalFuel = Math.ceil(fuelNeeded + 3); // 3L safety margin
    
    return {
      ...stint,
      fuelLoad: Math.min(strategy.fuelCapacity, optimalFuel)
    };
  });
}
