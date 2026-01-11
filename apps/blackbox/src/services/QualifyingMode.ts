/**
 * Qualifying Mode
 * Single-lap optimization, out-lap/in-lap guidance, tire prep, and qualifying strategy
 */

import type { TelemetryData } from '../types';

export interface QualifyingState {
  session: 'Q1' | 'Q2' | 'Q3' | 'practice';
  currentRun: number;
  runsRemaining: number;
  bestLapTime: number;
  theoreticalBest: number;
  gapToP1: number;
  positionInSession: number;
  tireLife: number;
  fuelLoad: number;
}

export interface OutLapGuidance {
  phase: 'pit_exit' | 'tire_prep' | 'brake_prep' | 'final_sector' | 'start_lap';
  instruction: string;
  targetSpeed: number;
  tireTempStatus: 'cold' | 'warming' | 'optimal' | 'hot';
  brakesTempStatus: 'cold' | 'warming' | 'optimal' | 'hot';
  readyForHotLap: boolean;
}

export interface HotLapGuidance {
  currentDelta: number; // vs best lap
  sectorStatus: 'purple' | 'green' | 'yellow' | 'red';
  projectedLapTime: number;
  projectedPosition: number;
  riskLevel: 'safe' | 'on_limit' | 'over_limit';
  cornerAdvice: string | null;
}

export interface InLapGuidance {
  shouldAbort: boolean;
  abortReason?: string;
  coolDownInstructions: string;
  nextRunStrategy: string;
}

export interface QualifyingStrategy {
  optimalRunCount: number;
  tireSetsAvailable: number;
  recommendedTireSet: number;
  trafficWindow: { start: number; end: number }; // Session time
  weatherRisk: boolean;
  strategyNotes: string[];
}

export interface TirePrepRoutine {
  weavingRequired: boolean;
  brakingZones: number; // Number of hard braking zones needed
  accelerationZones: number;
  estimatedPrepTime: number; // seconds
  currentProgress: number; // 0-100%
}

class QualifyingModeClass {
  private state: QualifyingState = {
    session: 'practice',
    currentRun: 0,
    runsRemaining: 3,
    bestLapTime: 0,
    theoreticalBest: 0,
    gapToP1: 0,
    positionInSession: 0,
    tireLife: 100,
    fuelLoad: 30,
  };

  private isOnOutLap = false;
  private isOnHotLap = false;
  private isOnInLap = false;
  private outLapStartTime = 0;
  private hotLapStartTime = 0;

  private tireTempHistory: number[] = [];
  private brakeTempHistory: number[] = [];
  private sectorTimes: number[] = [];
  private bestSectors: number[] = [0, 0, 0];

  private listeners: Set<(state: QualifyingState) => void> = new Set();
  private guidanceListeners: Set<(guidance: OutLapGuidance | HotLapGuidance | InLapGuidance) => void> = new Set();

  // ============================================================================
  // SESSION MANAGEMENT
  // ============================================================================

  startSession(session: QualifyingState['session'], tireSets: number): void {
    this.state = {
      ...this.state,
      session,
      currentRun: 0,
      runsRemaining: tireSets,
      bestLapTime: 0,
      theoreticalBest: 0,
    };
    this.notifyListeners();
  }

  startRun(): void {
    this.state.currentRun++;
    this.state.runsRemaining--;
    this.isOnOutLap = true;
    this.isOnHotLap = false;
    this.isOnInLap = false;
    this.outLapStartTime = Date.now();
    this.tireTempHistory = [];
    this.brakeTempHistory = [];
    this.sectorTimes = [];
    this.notifyListeners();
  }

  // ============================================================================
  // TELEMETRY UPDATES
  // ============================================================================

  update(telemetry: TelemetryData): void {
    // Track tire temps
    const avgTireTemp = (
      telemetry.tires.frontLeft.temp +
      telemetry.tires.frontRight.temp +
      telemetry.tires.rearLeft.temp +
      telemetry.tires.rearRight.temp
    ) / 4;
    this.tireTempHistory.push(avgTireTemp);
    if (this.tireTempHistory.length > 100) this.tireTempHistory.shift();

    // Detect lap phase transitions
    this.detectPhaseTransitions(telemetry);

    // Generate appropriate guidance
    if (this.isOnOutLap) {
      this.generateOutLapGuidance(telemetry);
    } else if (this.isOnHotLap) {
      this.generateHotLapGuidance(telemetry);
    } else if (this.isOnInLap) {
      this.generateInLapGuidance(telemetry);
    }

    // Update state
    this.state.tireLife = 100 - (
      telemetry.tires.frontLeft.wear +
      telemetry.tires.frontRight.wear +
      telemetry.tires.rearLeft.wear +
      telemetry.tires.rearRight.wear
    ) / 4;
    this.state.fuelLoad = telemetry.fuel;

    // Track sector times
    if (telemetry.sectorTime > 0 && telemetry.sector !== this.sectorTimes.length) {
      this.sectorTimes.push(telemetry.sectorTime);
      
      // Update best sectors
      const sectorIndex = this.sectorTimes.length - 1;
      if (this.bestSectors[sectorIndex] === 0 || telemetry.sectorTime < this.bestSectors[sectorIndex]) {
        this.bestSectors[sectorIndex] = telemetry.sectorTime;
      }
    }

    // Update theoretical best
    this.state.theoreticalBest = this.bestSectors.reduce((a, b) => a + b, 0);

    this.notifyListeners();
  }

  private detectPhaseTransitions(telemetry: TelemetryData): void {
    const trackPos = telemetry.trackPosition;

    // Out lap -> Hot lap transition (crossed start/finish)
    if (this.isOnOutLap && trackPos < 0.05 && this.outLapStartTime > 0) {
      const outLapDuration = Date.now() - this.outLapStartTime;
      if (outLapDuration > 30000) { // At least 30 seconds for out lap
        this.isOnOutLap = false;
        this.isOnHotLap = true;
        this.hotLapStartTime = Date.now();
        this.sectorTimes = [];
      }
    }

    // Hot lap -> In lap transition
    if (this.isOnHotLap && trackPos < 0.05 && this.hotLapStartTime > 0) {
      const hotLapDuration = Date.now() - this.hotLapStartTime;
      if (hotLapDuration > 60000) { // At least 60 seconds for hot lap
        this.isOnHotLap = false;
        this.isOnInLap = true;

        // Record lap time
        if (telemetry.lapTime > 0) {
          if (this.state.bestLapTime === 0 || telemetry.lapTime < this.state.bestLapTime) {
            this.state.bestLapTime = telemetry.lapTime;
          }
        }
      }
    }
  }

  // ============================================================================
  // OUT LAP GUIDANCE
  // ============================================================================

  private generateOutLapGuidance(telemetry: TelemetryData): void {
    const trackPos = telemetry.trackPosition;
    const avgTireTemp = this.tireTempHistory.length > 0
      ? this.tireTempHistory.reduce((a, b) => a + b, 0) / this.tireTempHistory.length
      : 50;

    // Determine tire temp status
    let tireTempStatus: OutLapGuidance['tireTempStatus'] = 'cold';
    if (avgTireTemp > 95) tireTempStatus = 'hot';
    else if (avgTireTemp > 80) tireTempStatus = 'optimal';
    else if (avgTireTemp > 60) tireTempStatus = 'warming';

    // Determine brake temp status (simplified)
    let brakesTempStatus: OutLapGuidance['brakesTempStatus'] = 'warming';
    if (this.brakeTempHistory.length > 10) {
      brakesTempStatus = 'optimal';
    }

    // Determine phase and instruction
    let phase: OutLapGuidance['phase'] = 'pit_exit';
    let instruction = '';
    let targetSpeed = 100;

    if (trackPos < 0.1) {
      phase = 'pit_exit';
      instruction = 'Exit pit lane, begin tire warm-up';
      targetSpeed = 80;
    } else if (trackPos < 0.5) {
      phase = 'tire_prep';
      instruction = 'Weave gently, use throttle to heat rears';
      targetSpeed = 120;
    } else if (trackPos < 0.8) {
      phase = 'brake_prep';
      instruction = 'Hard braking zones to heat brakes and fronts';
      targetSpeed = 150;
    } else {
      phase = 'final_sector';
      instruction = tireTempStatus === 'optimal' 
        ? 'Tires ready - build speed for hot lap'
        : 'Continue warming - one more weave';
      targetSpeed = 180;
    }

    const readyForHotLap = tireTempStatus === 'optimal' && brakesTempStatus === 'optimal';

    const guidance: OutLapGuidance = {
      phase,
      instruction,
      targetSpeed,
      tireTempStatus,
      brakesTempStatus,
      readyForHotLap,
    };

    this.notifyGuidance(guidance);
  }

  // ============================================================================
  // HOT LAP GUIDANCE
  // ============================================================================

  private generateHotLapGuidance(telemetry: TelemetryData): void {
    // Calculate current delta
    let currentDelta = 0;
    if (this.sectorTimes.length > 0 && this.bestSectors[0] > 0) {
      for (let i = 0; i < this.sectorTimes.length; i++) {
        currentDelta += this.sectorTimes[i] - this.bestSectors[i];
      }
    }

    // Determine sector status
    let sectorStatus: HotLapGuidance['sectorStatus'] = 'yellow';
    if (currentDelta < -0.1) sectorStatus = 'purple';
    else if (currentDelta < 0.1) sectorStatus = 'green';
    else if (currentDelta < 0.5) sectorStatus = 'yellow';
    else sectorStatus = 'red';

    // Project lap time
    const completedTime = this.sectorTimes.reduce((a, b) => a + b, 0);
    const remainingSectors = 3 - this.sectorTimes.length;
    let projectedRemaining = 0;
    for (let i = this.sectorTimes.length; i < 3; i++) {
      projectedRemaining += this.bestSectors[i] || 30000;
    }
    const projectedLapTime = completedTime + projectedRemaining;

    // Risk assessment
    let riskLevel: HotLapGuidance['riskLevel'] = 'safe';
    const avgTireTemp = this.tireTempHistory.length > 0
      ? this.tireTempHistory[this.tireTempHistory.length - 1]
      : 80;
    if (avgTireTemp > 100) riskLevel = 'over_limit';
    else if (avgTireTemp > 95) riskLevel = 'on_limit';

    // Corner-specific advice
    let cornerAdvice: string | null = null;
    if (currentDelta > 0.3) {
      cornerAdvice = 'Push harder - time to recover';
    } else if (riskLevel === 'over_limit') {
      cornerAdvice = 'Tires overheating - manage grip';
    }

    const guidance: HotLapGuidance = {
      currentDelta,
      sectorStatus,
      projectedLapTime,
      projectedPosition: this.estimatePosition(projectedLapTime),
      riskLevel,
      cornerAdvice,
    };

    this.notifyGuidance(guidance);
  }

  private estimatePosition(lapTime: number): number {
    // Simplified - would use actual session standings
    if (lapTime < this.state.bestLapTime * 0.99) return 1;
    if (lapTime < this.state.bestLapTime) return 2;
    return 5;
  }

  // ============================================================================
  // IN LAP GUIDANCE
  // ============================================================================

  private generateInLapGuidance(telemetry: TelemetryData): void {
    const shouldAbort = false; // Would check for red flags, etc.
    
    let coolDownInstructions = 'Reduce pace, cool tires and brakes';
    if (this.state.runsRemaining > 0) {
      coolDownInstructions += ' - prepare for next run';
    }

    let nextRunStrategy = '';
    if (this.state.runsRemaining > 0) {
      if (this.state.bestLapTime > 0) {
        nextRunStrategy = `Target: ${(this.state.bestLapTime / 1000).toFixed(3)}s or better`;
      } else {
        nextRunStrategy = 'Focus on clean lap, build confidence';
      }
    } else {
      nextRunStrategy = 'Final run complete - session over';
    }

    const guidance: InLapGuidance = {
      shouldAbort,
      coolDownInstructions,
      nextRunStrategy,
    };

    this.notifyGuidance(guidance);
  }

  // ============================================================================
  // STRATEGY
  // ============================================================================

  getQualifyingStrategy(): QualifyingStrategy {
    const tireSetsAvailable = this.state.runsRemaining;
    
    // Optimal run count based on session
    let optimalRunCount = 2;
    if (this.state.session === 'Q3') optimalRunCount = 2;
    else if (this.state.session === 'Q2') optimalRunCount = 2;
    else optimalRunCount = 3;

    // Traffic window (avoid going out with everyone)
    const trafficWindow = {
      start: 300, // 5 minutes into session
      end: 420, // 7 minutes
    };

    const strategyNotes: string[] = [];
    
    if (tireSetsAvailable >= 2) {
      strategyNotes.push('Save one tire set for final run');
    }
    
    if (this.state.session === 'Q3') {
      strategyNotes.push('Track evolution favors later runs');
    }

    strategyNotes.push('Avoid traffic - time your exit carefully');

    return {
      optimalRunCount,
      tireSetsAvailable,
      recommendedTireSet: this.state.currentRun + 1,
      trafficWindow,
      weatherRisk: false,
      strategyNotes,
    };
  }

  getTirePrepRoutine(): TirePrepRoutine {
    const avgTemp = this.tireTempHistory.length > 0
      ? this.tireTempHistory.reduce((a, b) => a + b, 0) / this.tireTempHistory.length
      : 50;

    const progress = Math.min(100, (avgTemp - 40) / 0.5);

    return {
      weavingRequired: avgTemp < 70,
      brakingZones: avgTemp < 80 ? 3 : 1,
      accelerationZones: avgTemp < 75 ? 4 : 2,
      estimatedPrepTime: Math.max(0, (80 - avgTemp) * 2),
      currentProgress: progress,
    };
  }

  // ============================================================================
  // STATE
  // ============================================================================

  getState(): QualifyingState {
    return { ...this.state };
  }

  isActive(): boolean {
    return this.isOnOutLap || this.isOnHotLap || this.isOnInLap;
  }

  getCurrentPhase(): 'out_lap' | 'hot_lap' | 'in_lap' | 'idle' {
    if (this.isOnOutLap) return 'out_lap';
    if (this.isOnHotLap) return 'hot_lap';
    if (this.isOnInLap) return 'in_lap';
    return 'idle';
  }

  subscribe(listener: (state: QualifyingState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  subscribeToGuidance(listener: (guidance: OutLapGuidance | HotLapGuidance | InLapGuidance) => void): () => void {
    this.guidanceListeners.add(listener);
    return () => this.guidanceListeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(l => l(this.state));
  }

  private notifyGuidance(guidance: OutLapGuidance | HotLapGuidance | InLapGuidance): void {
    this.guidanceListeners.forEach(l => l(guidance));
  }

  reset(): void {
    this.isOnOutLap = false;
    this.isOnHotLap = false;
    this.isOnInLap = false;
    this.outLapStartTime = 0;
    this.hotLapStartTime = 0;
    this.tireTempHistory = [];
    this.brakeTempHistory = [];
    this.sectorTimes = [];
    this.bestSectors = [0, 0, 0];
  }
}

export const QualifyingMode = new QualifyingModeClass();
export default QualifyingMode;
