/**
 * Race Start Assistant
 * Launch control guidance, clutch bite point detection, reaction training
 */

import type { TelemetryData } from '../types';

export interface LaunchSettings {
  optimalRPM: number;
  clutchBitePoint: number; // 0-1
  antiStallRPM: number;
  maxWheelSpin: number; // 0-1 acceptable slip ratio
  gearForLaunch: number;
}

export interface StartProcedure {
  phase: 'grid' | 'formation' | 'lights_out' | 'launch' | 'acceleration' | 'complete';
  instruction: string;
  rpm: number;
  clutch: number;
  throttle: number;
  gear: number;
}

export interface ReactionAnalysis {
  reactionTime: number; // ms from lights out
  rating: 'excellent' | 'good' | 'average' | 'slow' | 'jump_start';
  wheelSpin: number; // 0-100%
  bogDown: boolean;
  positionsGained: number;
  positionsLost: number;
  feedback: string;
}

export interface ClutchCalibration {
  bitePoint: number;
  engagementSpeed: number; // How fast to release
  slipWindow: number; // Range of acceptable slip
  isCalibrated: boolean;
}

export interface StartTrainingSession {
  attempts: ReactionAnalysis[];
  averageReaction: number;
  bestReaction: number;
  consistency: number;
  improvement: number;
}

interface LightsState {
  count: number; // 0-5 lights
  isOut: boolean;
  timestamp: number;
}

class RaceStartAssistantClass {
  private launchSettings: LaunchSettings = {
    optimalRPM: 6500,
    clutchBitePoint: 0.4,
    antiStallRPM: 3000,
    maxWheelSpin: 0.15,
    gearForLaunch: 1,
  };

  private clutchCalibration: ClutchCalibration = {
    bitePoint: 0.4,
    engagementSpeed: 0.3,
    slipWindow: 0.1,
    isCalibrated: false,
  };

  private currentPhase: StartProcedure['phase'] = 'grid';
  private lightsState: LightsState = { count: 0, isOut: false, timestamp: 0 };
  private launchTimestamp = 0;
  private trainingSession: StartTrainingSession = {
    attempts: [],
    averageReaction: 0,
    bestReaction: 0,
    consistency: 0,
    improvement: 0,
  };

  private listeners: Set<(procedure: StartProcedure) => void> = new Set();
  private reactionListeners: Set<(analysis: ReactionAnalysis) => void> = new Set();

  // ============================================================================
  // LAUNCH SETTINGS
  // ============================================================================

  setLaunchSettings(settings: Partial<LaunchSettings>): void {
    this.launchSettings = { ...this.launchSettings, ...settings };
  }

  getLaunchSettings(): LaunchSettings {
    return { ...this.launchSettings };
  }

  // ============================================================================
  // CLUTCH CALIBRATION
  // ============================================================================

  startClutchCalibration(): void {
    this.clutchCalibration.isCalibrated = false;
  }

  updateClutchCalibration(telemetry: TelemetryData): ClutchCalibration {
    const clutch = telemetry.clutch || 0;
    const rpm = telemetry.rpm;
    const speed = telemetry.speed;

    // Detect bite point: where RPM starts to drop when releasing clutch
    if (clutch > 0.2 && clutch < 0.8 && speed < 5) {
      // If RPM is dropping, we're at or past bite point
      if (rpm < this.launchSettings.optimalRPM * 0.9) {
        this.clutchCalibration.bitePoint = clutch;
        this.clutchCalibration.isCalibrated = true;
      }
    }

    return { ...this.clutchCalibration };
  }

  getClutchCalibration(): ClutchCalibration {
    return { ...this.clutchCalibration };
  }

  // ============================================================================
  // START PROCEDURE
  // ============================================================================

  updateLightsState(lightsCount: number, isOut: boolean): void {
    const previousState = { ...this.lightsState };
    
    this.lightsState = {
      count: lightsCount,
      isOut,
      timestamp: Date.now(),
    };

    // Detect lights out
    if (!previousState.isOut && isOut) {
      this.launchTimestamp = Date.now();
      this.currentPhase = 'lights_out';
    }
  }

  update(telemetry: TelemetryData): StartProcedure {
    const speed = telemetry.speed;
    const rpm = telemetry.rpm;
    const throttle = telemetry.throttle;
    const gear = telemetry.gear;

    // Determine current phase
    if (speed > 50) {
      this.currentPhase = 'complete';
    } else if (speed > 10) {
      this.currentPhase = 'acceleration';
    } else if (this.lightsState.isOut) {
      this.currentPhase = throttle > 0.5 ? 'launch' : 'lights_out';
    } else if (this.lightsState.count > 0) {
      this.currentPhase = 'formation';
    } else {
      this.currentPhase = 'grid';
    }

    const procedure = this.generateProcedure(telemetry);
    this.notifyListeners(procedure);

    // Analyze launch if in launch phase
    if (this.currentPhase === 'launch' || this.currentPhase === 'acceleration') {
      this.analyzeLaunch(telemetry);
    }

    return procedure;
  }

  private generateProcedure(telemetry: TelemetryData): StartProcedure {
    const settings = this.launchSettings;

    switch (this.currentPhase) {
      case 'grid':
        return {
          phase: 'grid',
          instruction: 'Select 1st gear, hold brake',
          rpm: settings.antiStallRPM,
          clutch: 1, // Fully depressed
          throttle: 0,
          gear: 1,
        };

      case 'formation':
        return {
          phase: 'formation',
          instruction: `Build RPM to ${settings.optimalRPM}, hold clutch at bite point`,
          rpm: settings.optimalRPM,
          clutch: this.clutchCalibration.bitePoint,
          throttle: 0.4,
          gear: 1,
        };

      case 'lights_out':
        return {
          phase: 'lights_out',
          instruction: 'LIGHTS OUT! Release clutch smoothly',
          rpm: settings.optimalRPM,
          clutch: 0,
          throttle: 0.8,
          gear: 1,
        };

      case 'launch':
        const wheelSpin = this.detectWheelSpin(telemetry);
        let throttleTarget = 1;
        let instruction = 'Full throttle!';

        if (wheelSpin > settings.maxWheelSpin) {
          throttleTarget = 0.7;
          instruction = 'Wheelspin! Reduce throttle';
        }

        return {
          phase: 'launch',
          instruction,
          rpm: telemetry.rpm,
          clutch: 0,
          throttle: throttleTarget,
          gear: 1,
        };

      case 'acceleration':
        const nextGear = this.shouldShift(telemetry);
        return {
          phase: 'acceleration',
          instruction: nextGear ? `Shift to ${nextGear}` : 'Full throttle',
          rpm: telemetry.rpm,
          clutch: 0,
          throttle: 1,
          gear: nextGear || telemetry.gear,
        };

      case 'complete':
      default:
        return {
          phase: 'complete',
          instruction: 'Start complete - race on!',
          rpm: telemetry.rpm,
          clutch: 0,
          throttle: telemetry.throttle,
          gear: telemetry.gear,
        };
    }
  }

  private detectWheelSpin(telemetry: TelemetryData): number {
    // Simplified - would need wheel speed sensors
    // Estimate based on speed vs expected speed for RPM/gear
    const expectedSpeed = (telemetry.rpm / 8000) * 50; // Very simplified
    const actualSpeed = telemetry.speed;
    
    if (expectedSpeed > actualSpeed + 10) {
      return (expectedSpeed - actualSpeed) / expectedSpeed;
    }
    return 0;
  }

  private shouldShift(telemetry: TelemetryData): number | null {
    // Shift at optimal RPM
    if (telemetry.rpm > 7500 && telemetry.gear < 6) {
      return telemetry.gear + 1;
    }
    return null;
  }

  // ============================================================================
  // LAUNCH ANALYSIS
  // ============================================================================

  private launchAnalyzed = false;

  private analyzeLaunch(telemetry: TelemetryData): void {
    if (this.launchAnalyzed || !this.launchTimestamp) return;

    // Wait until we're at speed to analyze
    if (telemetry.speed < 30) return;

    const reactionTime = this.launchTimestamp > 0 
      ? Date.now() - this.launchTimestamp - 500 // Subtract average human reaction
      : 0;

    const wheelSpin = this.detectWheelSpin(telemetry) * 100;
    const bogDown = telemetry.rpm < this.launchSettings.antiStallRPM;

    let rating: ReactionAnalysis['rating'] = 'average';
    if (reactionTime < 0) rating = 'jump_start';
    else if (reactionTime < 200) rating = 'excellent';
    else if (reactionTime < 350) rating = 'good';
    else if (reactionTime < 500) rating = 'average';
    else rating = 'slow';

    let feedback = '';
    if (rating === 'jump_start') {
      feedback = 'Jump start detected - penalty likely';
    } else if (bogDown) {
      feedback = 'Engine bogged - release clutch slower or use more RPM';
    } else if (wheelSpin > 20) {
      feedback = 'Excessive wheelspin - modulate throttle on launch';
    } else if (rating === 'excellent') {
      feedback = 'Perfect start! Great reaction and launch';
    } else if (rating === 'good') {
      feedback = 'Good start - reaction could be slightly faster';
    } else {
      feedback = 'Slow reaction - anticipate lights better';
    }

    const analysis: ReactionAnalysis = {
      reactionTime: Math.max(0, reactionTime),
      rating,
      wheelSpin,
      bogDown,
      positionsGained: 0, // Would need position data
      positionsLost: 0,
      feedback,
    };

    this.recordAttempt(analysis);
    this.notifyReaction(analysis);
    this.launchAnalyzed = true;
  }

  // ============================================================================
  // TRAINING MODE
  // ============================================================================

  startTrainingSession(): void {
    this.trainingSession = {
      attempts: [],
      averageReaction: 0,
      bestReaction: 0,
      consistency: 0,
      improvement: 0,
    };
  }

  private recordAttempt(analysis: ReactionAnalysis): void {
    this.trainingSession.attempts.push(analysis);

    const validAttempts = this.trainingSession.attempts.filter(
      a => a.rating !== 'jump_start'
    );

    if (validAttempts.length > 0) {
      // Average reaction
      this.trainingSession.averageReaction = 
        validAttempts.reduce((sum, a) => sum + a.reactionTime, 0) / validAttempts.length;

      // Best reaction
      this.trainingSession.bestReaction = 
        Math.min(...validAttempts.map(a => a.reactionTime));

      // Consistency (std dev)
      const avg = this.trainingSession.averageReaction;
      const variance = validAttempts.reduce(
        (sum, a) => sum + Math.pow(a.reactionTime - avg, 2), 0
      ) / validAttempts.length;
      this.trainingSession.consistency = 100 - Math.sqrt(variance) / 5;

      // Improvement (compare first half to second half)
      if (validAttempts.length >= 4) {
        const mid = Math.floor(validAttempts.length / 2);
        const firstHalf = validAttempts.slice(0, mid);
        const secondHalf = validAttempts.slice(mid);
        
        const firstAvg = firstHalf.reduce((sum, a) => sum + a.reactionTime, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, a) => sum + a.reactionTime, 0) / secondHalf.length;
        
        this.trainingSession.improvement = firstAvg - secondAvg;
      }
    }
  }

  getTrainingSession(): StartTrainingSession {
    return { ...this.trainingSession };
  }

  simulateLightsSequence(): void {
    // Simulate F1-style lights sequence for training
    this.lightsState = { count: 0, isOut: false, timestamp: 0 };
    this.launchAnalyzed = false;
    this.launchTimestamp = 0;
    this.currentPhase = 'grid';

    // Light 1
    setTimeout(() => {
      this.updateLightsState(1, false);
    }, 1000);

    // Light 2
    setTimeout(() => {
      this.updateLightsState(2, false);
    }, 2000);

    // Light 3
    setTimeout(() => {
      this.updateLightsState(3, false);
    }, 3000);

    // Light 4
    setTimeout(() => {
      this.updateLightsState(4, false);
    }, 4000);

    // Light 5
    setTimeout(() => {
      this.updateLightsState(5, false);
    }, 5000);

    // Lights out (random delay 0.5-3s)
    const randomDelay = 500 + Math.random() * 2500;
    setTimeout(() => {
      this.updateLightsState(0, true);
    }, 5000 + randomDelay);
  }

  // ============================================================================
  // OPTIMAL LAUNCH CALCULATOR
  // ============================================================================

  calculateOptimalLaunch(carData: {
    power: number;
    weight: number;
    gripLevel: number;
    gearRatios: number[];
  }): LaunchSettings {
    // Calculate optimal RPM based on power curve peak
    // Simplified - would use actual dyno data
    const optimalRPM = 6000 + (carData.power / 100) * 500;

    // Calculate max wheel spin based on grip
    const maxWheelSpin = 0.1 + (1 - carData.gripLevel) * 0.1;

    // Anti-stall RPM
    const antiStallRPM = 2500 + (carData.weight / 1000) * 500;

    return {
      optimalRPM: Math.round(optimalRPM),
      clutchBitePoint: this.clutchCalibration.bitePoint,
      antiStallRPM: Math.round(antiStallRPM),
      maxWheelSpin,
      gearForLaunch: 1,
    };
  }

  // ============================================================================
  // STATE
  // ============================================================================

  getState() {
    return {
      phase: this.currentPhase,
      lightsState: { ...this.lightsState },
      launchSettings: { ...this.launchSettings },
      clutchCalibration: { ...this.clutchCalibration },
      trainingSession: { ...this.trainingSession },
    };
  }

  subscribe(listener: (procedure: StartProcedure) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  subscribeToReaction(listener: (analysis: ReactionAnalysis) => void): () => void {
    this.reactionListeners.add(listener);
    return () => this.reactionListeners.delete(listener);
  }

  private notifyListeners(procedure: StartProcedure): void {
    this.listeners.forEach(l => l(procedure));
  }

  private notifyReaction(analysis: ReactionAnalysis): void {
    this.reactionListeners.forEach(l => l(analysis));
  }

  reset(): void {
    this.currentPhase = 'grid';
    this.lightsState = { count: 0, isOut: false, timestamp: 0 };
    this.launchTimestamp = 0;
    this.launchAnalyzed = false;
  }
}

export const RaceStartAssistant = new RaceStartAssistantClass();
export default RaceStartAssistant;
