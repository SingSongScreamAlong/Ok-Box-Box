/**
 * Fuel Saving Coach
 * Real-time guidance for lift-and-coast, fuel management, and efficiency
 */

import type { TelemetryData } from '../types';

export interface FuelState {
  currentFuel: number; // liters
  fuelPerLap: number;
  lapsRemaining: number;
  fuelToFinish: number;
  surplus: number; // positive = extra fuel, negative = short
  targetDelta: number; // seconds to save per lap
  mode: 'normal' | 'save' | 'push' | 'critical';
}

export interface LiftAndCoastZone {
  cornerNumber: number;
  cornerName: string;
  liftPoint: number; // track position 0-1
  coastDistance: number; // meters
  timeCost: number; // seconds lost
  fuelSaved: number; // liters saved
  priority: 'high' | 'medium' | 'low';
}

export interface FuelCoachingMessage {
  type: 'lift' | 'coast' | 'short_shift' | 'normal' | 'push';
  message: string;
  urgency: 'immediate' | 'upcoming' | 'info';
  trackPosition?: number;
}

export interface FuelStrategy {
  mode: 'normal' | 'save' | 'push';
  targetDelta: number;
  liftZones: LiftAndCoastZone[];
  shortShiftGear: number | null;
  mixSetting: number; // 1-10, lower = more saving
  estimatedFinish: 'comfortable' | 'tight' | 'short';
}

interface FuelHistoryEntry {
  lap: number;
  fuelUsed: number;
  lapTime: number;
  mode: string;
}

class FuelSavingCoachClass {
  private fuelHistory: FuelHistoryEntry[] = [];
  private currentLapFuelStart = 0;
  private lastLap = 0;
  private totalLaps = 0;
  private trackLength = 0; // meters
  
  private liftZones: LiftAndCoastZone[] = [];
  private currentStrategy: FuelStrategy = {
    mode: 'normal',
    targetDelta: 0,
    liftZones: [],
    shortShiftGear: null,
    mixSetting: 5,
    estimatedFinish: 'comfortable',
  };

  private listeners: Set<(state: FuelState) => void> = new Set();
  private messageListeners: Set<(msg: FuelCoachingMessage) => void> = new Set();

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  initialize(totalLaps: number, trackLength: number, startFuel: number): void {
    this.totalLaps = totalLaps;
    this.trackLength = trackLength;
    this.currentLapFuelStart = startFuel;
    this.fuelHistory = [];
    this.lastLap = 0;
    
    // Generate default lift zones based on track
    this.generateDefaultLiftZones();
  }

  private generateDefaultLiftZones(): void {
    // Default zones at typical braking points
    // Would be customized per track with real data
    this.liftZones = [
      {
        cornerNumber: 1,
        cornerName: 'Turn 1',
        liftPoint: 0.08,
        coastDistance: 50,
        timeCost: 0.15,
        fuelSaved: 0.02,
        priority: 'medium',
      },
      {
        cornerNumber: 3,
        cornerName: 'Turn 3',
        liftPoint: 0.25,
        coastDistance: 40,
        timeCost: 0.12,
        fuelSaved: 0.015,
        priority: 'low',
      },
      {
        cornerNumber: 5,
        cornerName: 'Turn 5',
        liftPoint: 0.45,
        coastDistance: 60,
        timeCost: 0.18,
        fuelSaved: 0.025,
        priority: 'high',
      },
      {
        cornerNumber: 8,
        cornerName: 'Turn 8',
        liftPoint: 0.72,
        coastDistance: 55,
        timeCost: 0.16,
        fuelSaved: 0.022,
        priority: 'medium',
      },
      {
        cornerNumber: 10,
        cornerName: 'Final Corner',
        liftPoint: 0.92,
        coastDistance: 45,
        timeCost: 0.14,
        fuelSaved: 0.018,
        priority: 'high',
      },
    ];
  }

  // ============================================================================
  // REAL-TIME UPDATES
  // ============================================================================

  update(telemetry: TelemetryData): FuelState {
    // Detect lap completion
    if (telemetry.lap > this.lastLap && this.lastLap > 0) {
      this.recordLapFuel(telemetry);
    }
    this.lastLap = telemetry.lap;

    // Calculate fuel state
    const state = this.calculateFuelState(telemetry);

    // Generate coaching messages
    this.generateCoachingMessages(telemetry, state);

    // Update strategy if needed
    this.updateStrategy(state);

    this.notifyListeners(state);
    return state;
  }

  private recordLapFuel(telemetry: TelemetryData): void {
    const fuelUsed = this.currentLapFuelStart - telemetry.fuel;
    
    if (fuelUsed > 0 && fuelUsed < 10) { // Sanity check
      this.fuelHistory.push({
        lap: telemetry.lap - 1,
        fuelUsed,
        lapTime: telemetry.lapTime,
        mode: this.currentStrategy.mode,
      });

      // Keep last 20 laps
      if (this.fuelHistory.length > 20) {
        this.fuelHistory.shift();
      }
    }

    this.currentLapFuelStart = telemetry.fuel;
  }

  private calculateFuelState(telemetry: TelemetryData): FuelState {
    const currentFuel = telemetry.fuel;
    const lapsRemaining = this.totalLaps - telemetry.lap;

    // Calculate average fuel per lap
    let fuelPerLap = 2.5; // Default estimate
    if (this.fuelHistory.length >= 3) {
      const recentLaps = this.fuelHistory.slice(-5);
      fuelPerLap = recentLaps.reduce((sum, l) => sum + l.fuelUsed, 0) / recentLaps.length;
    }

    const fuelToFinish = fuelPerLap * lapsRemaining;
    const surplus = currentFuel - fuelToFinish;

    // Determine mode
    let mode: FuelState['mode'] = 'normal';
    let targetDelta = 0;

    if (surplus < -2) {
      mode = 'critical';
      targetDelta = this.calculateRequiredSaving(surplus, lapsRemaining);
    } else if (surplus < 0) {
      mode = 'save';
      targetDelta = this.calculateRequiredSaving(surplus, lapsRemaining);
    } else if (surplus > 5) {
      mode = 'push';
      targetDelta = -0.2; // Can push 0.2s per lap
    }

    return {
      currentFuel,
      fuelPerLap,
      lapsRemaining,
      fuelToFinish,
      surplus,
      targetDelta,
      mode,
    };
  }

  private calculateRequiredSaving(deficit: number, lapsRemaining: number): number {
    if (lapsRemaining <= 0) return 0;

    // Each 0.1L of fuel saving costs approximately 0.1s per lap
    const fuelToSavePerLap = Math.abs(deficit) / lapsRemaining;
    return fuelToSavePerLap * 1; // 1 second per liter saved
  }

  // ============================================================================
  // COACHING MESSAGES
  // ============================================================================

  private generateCoachingMessages(telemetry: TelemetryData, state: FuelState): void {
    if (state.mode === 'normal' || state.mode === 'push') return;

    const trackPos = telemetry.trackPosition;

    // Check if approaching a lift zone
    for (const zone of this.currentStrategy.liftZones) {
      const distanceToLift = zone.liftPoint - trackPos;
      
      // Upcoming lift zone (within 5% of track)
      if (distanceToLift > 0 && distanceToLift < 0.05) {
        this.notifyMessage({
          type: 'lift',
          message: `Lift in ${Math.round(distanceToLift * this.trackLength)}m for ${zone.cornerName}`,
          urgency: 'upcoming',
          trackPosition: zone.liftPoint,
        });
      }
      
      // At lift point
      if (Math.abs(trackPos - zone.liftPoint) < 0.01) {
        this.notifyMessage({
          type: 'lift',
          message: 'LIFT NOW',
          urgency: 'immediate',
          trackPosition: zone.liftPoint,
        });
      }
    }

    // Short shift reminder
    if (this.currentStrategy.shortShiftGear && telemetry.gear === this.currentStrategy.shortShiftGear - 1) {
      if (telemetry.rpm > 7500) { // Would be car-specific
        this.notifyMessage({
          type: 'short_shift',
          message: `Short shift to ${this.currentStrategy.shortShiftGear}`,
          urgency: 'immediate',
        });
      }
    }
  }

  // ============================================================================
  // STRATEGY
  // ============================================================================

  private updateStrategy(state: FuelState): void {
    this.currentStrategy.mode = state.mode === 'critical' ? 'save' : state.mode;
    this.currentStrategy.targetDelta = state.targetDelta;

    // Select lift zones based on required saving
    if (state.mode === 'save' || state.mode === 'critical') {
      const requiredSaving = Math.abs(state.surplus) / Math.max(1, state.lapsRemaining);
      
      // Sort zones by efficiency (fuel saved / time cost)
      const sortedZones = [...this.liftZones].sort((a, b) => {
        const effA = a.fuelSaved / a.timeCost;
        const effB = b.fuelSaved / b.timeCost;
        return effB - effA;
      });

      // Select zones until we have enough saving
      let totalSaving = 0;
      const selectedZones: LiftAndCoastZone[] = [];
      
      for (const zone of sortedZones) {
        if (totalSaving >= requiredSaving) break;
        selectedZones.push(zone);
        totalSaving += zone.fuelSaved;
      }

      this.currentStrategy.liftZones = selectedZones;

      // Determine if short shifting is needed
      if (state.mode === 'critical') {
        this.currentStrategy.shortShiftGear = 5; // Short shift before top gear
        this.currentStrategy.mixSetting = 1;
      } else {
        this.currentStrategy.shortShiftGear = null;
        this.currentStrategy.mixSetting = 3;
      }
    } else {
      this.currentStrategy.liftZones = [];
      this.currentStrategy.shortShiftGear = null;
      this.currentStrategy.mixSetting = 5;
    }

    // Estimate finish
    if (state.surplus < -3) {
      this.currentStrategy.estimatedFinish = 'short';
    } else if (state.surplus < 1) {
      this.currentStrategy.estimatedFinish = 'tight';
    } else {
      this.currentStrategy.estimatedFinish = 'comfortable';
    }
  }

  getStrategy(): FuelStrategy {
    return { ...this.currentStrategy };
  }

  // ============================================================================
  // LIFT AND COAST GUIDANCE
  // ============================================================================

  getLiftZonesForTrack(trackId: string): LiftAndCoastZone[] {
    // Would load track-specific zones
    // For now, return default zones
    return this.liftZones;
  }

  setCustomLiftZone(zone: LiftAndCoastZone): void {
    const existingIndex = this.liftZones.findIndex(z => z.cornerNumber === zone.cornerNumber);
    if (existingIndex >= 0) {
      this.liftZones[existingIndex] = zone;
    } else {
      this.liftZones.push(zone);
    }
  }

  // ============================================================================
  // FUEL CALCULATIONS
  // ============================================================================

  calculateFuelForLaps(laps: number): number {
    if (this.fuelHistory.length === 0) return laps * 2.5; // Default estimate
    
    const avgFuel = this.fuelHistory.reduce((sum, l) => sum + l.fuelUsed, 0) / this.fuelHistory.length;
    return avgFuel * laps * 1.05; // 5% safety margin
  }

  calculateLapsWithFuel(fuel: number): number {
    if (this.fuelHistory.length === 0) return fuel / 2.5;
    
    const avgFuel = this.fuelHistory.reduce((sum, l) => sum + l.fuelUsed, 0) / this.fuelHistory.length;
    return fuel / avgFuel;
  }

  getFuelEfficiencyByMode(): { normal: number; save: number; push: number } {
    const byMode = {
      normal: [] as number[],
      save: [] as number[],
      push: [] as number[],
    };

    for (const entry of this.fuelHistory) {
      if (entry.mode in byMode) {
        byMode[entry.mode as keyof typeof byMode].push(entry.fuelUsed);
      }
    }

    return {
      normal: byMode.normal.length > 0 
        ? byMode.normal.reduce((a, b) => a + b, 0) / byMode.normal.length 
        : 2.5,
      save: byMode.save.length > 0 
        ? byMode.save.reduce((a, b) => a + b, 0) / byMode.save.length 
        : 2.2,
      push: byMode.push.length > 0 
        ? byMode.push.reduce((a, b) => a + b, 0) / byMode.push.length 
        : 2.8,
    };
  }

  // ============================================================================
  // STATE
  // ============================================================================

  getState() {
    return {
      fuelHistory: [...this.fuelHistory],
      currentStrategy: { ...this.currentStrategy },
      liftZones: [...this.liftZones],
    };
  }

  subscribe(listener: (state: FuelState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  subscribeToMessages(listener: (msg: FuelCoachingMessage) => void): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  private notifyListeners(state: FuelState): void {
    this.listeners.forEach(l => l(state));
  }

  private notifyMessage(msg: FuelCoachingMessage): void {
    this.messageListeners.forEach(l => l(msg));
  }

  reset(): void {
    this.fuelHistory = [];
    this.currentLapFuelStart = 0;
    this.lastLap = 0;
    this.currentStrategy = {
      mode: 'normal',
      targetDelta: 0,
      liftZones: [],
      shortShiftGear: null,
      mixSetting: 5,
      estimatedFinish: 'comfortable',
    };
  }
}

export const FuelSavingCoach = new FuelSavingCoachClass();
export default FuelSavingCoach;
