/**
 * Setup Engine Service
 * Analyzes telemetry data to recommend car setup changes
 * Works during practice, qualifying, and race sessions
 */

import type { TelemetryData } from '../types';

// ============================================================================
// TYPES
// ============================================================================

export interface TireTemperatureData {
  innerTemp: number;
  middleTemp: number;
  outerTemp: number;
  avgTemp: number;
  spread: number; // Difference between inner and outer
}

export interface HandlingCharacteristic {
  type: 'understeer' | 'oversteer' | 'neutral';
  severity: 'mild' | 'moderate' | 'severe';
  phase: 'entry' | 'mid' | 'exit' | 'all';
  confidence: number;
}

export interface SetupRecommendation {
  id: string;
  category: 'suspension' | 'aero' | 'differential' | 'brakes' | 'tires' | 'alignment' | 'springs' | 'dampers' | 'arb';
  component: string;
  currentIssue: string;
  recommendation: string;
  adjustment: string; // e.g., "+2 clicks", "-0.5 degrees"
  impact: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;
  sessionType: 'practice' | 'qualifying' | 'race' | 'all';
}

export interface CornerAnalysis {
  cornerId: number;
  cornerType: 'slow' | 'medium' | 'fast';
  entryHandling: HandlingCharacteristic | null;
  midHandling: HandlingCharacteristic | null;
  exitHandling: HandlingCharacteristic | null;
  brakingStability: 'stable' | 'unstable' | 'lockup-prone';
  tractionLevel: 'good' | 'wheelspin' | 'poor';
  avgSpeed: number;
  minSpeed: number;
}

export interface BrakeAnalysis {
  frontBias: number; // Current estimated bias
  lockupFrequency: { front: number; rear: number }; // Per lap average
  brakingEfficiency: number; // 0-100
  trailBrakingUsage: number; // 0-100
  recommendedBias: number;
  recommendation: string;
}

export interface AeroBalance {
  currentBalance: 'front-heavy' | 'rear-heavy' | 'balanced';
  highSpeedStability: number; // 0-100
  lowSpeedRotation: number; // 0-100
  dragLevel: 'low' | 'medium' | 'high';
  recommendedFrontWing: string;
  recommendedRearWing: string;
}

export interface TireSetupAnalysis {
  frontLeft: TireTemperatureData;
  frontRight: TireTemperatureData;
  rearLeft: TireTemperatureData;
  rearRight: TireTemperatureData;
  frontCamberRecommendation: string;
  rearCamberRecommendation: string;
  frontPressureRecommendation: string;
  rearPressureRecommendation: string;
  frontToeRecommendation: string;
  rearToeRecommendation: string;
}

export interface DifferentialAnalysis {
  powerOversteer: number; // 0-100, how much oversteer on power
  coastOversteer: number; // 0-100, how much oversteer on coast/lift
  tractionRating: number; // 0-100
  rotationOnPower: 'too-much' | 'good' | 'too-little';
  rotationOnCoast: 'too-much' | 'good' | 'too-little';
  recommendedPreload: string;
  recommendedPower: string;
  recommendedCoast: string;
  recommendation: string;
}

export interface GearAnalysis {
  gearData: {
    gear: number;
    minRpm: number;
    maxRpm: number;
    avgRpm: number;
    timeInGear: number; // percentage
    optimalShiftPoint: number;
    currentShiftPoint: number;
    recommendation: string;
  }[];
  topSpeedRpm: number;
  topSpeedGear: number;
  overallRecommendation: string;
  finalDriveRecommendation: string;
}

export interface SetupSnapshot {
  id: string;
  name: string;
  timestamp: number;
  sessionType: 'practice' | 'qualifying' | 'race';
  lapsAnalyzed: number;
  avgLapTime: number;
  bestLapTime: number;
  handling: HandlingCharacteristic | null;
  recommendations: SetupRecommendation[];
  notes: string;
}

export interface SetupComparison {
  setup1: SetupSnapshot | null;
  setup2: SetupSnapshot | null;
  lapTimeDelta: number;
  handlingChanges: string[];
  improvementAreas: string[];
  regressionAreas: string[];
}

export interface SetupAnalysisState {
  overallHandling: HandlingCharacteristic | null;
  cornerAnalysis: CornerAnalysis[];
  brakeAnalysis: BrakeAnalysis | null;
  aeroBalance: AeroBalance | null;
  tireAnalysis: TireSetupAnalysis | null;
  differentialAnalysis: DifferentialAnalysis | null;
  gearAnalysis: GearAnalysis | null;
  recommendations: SetupRecommendation[];
  sessionType: 'practice' | 'qualifying' | 'race';
  lapsAnalyzed: number;
  confidence: number;
  lastUpdated: number;
}

// ============================================================================
// TELEMETRY HISTORY FOR ANALYSIS
// ============================================================================

interface TelemetrySnapshot {
  timestamp: number;
  speed: number;
  throttle: number;
  brake: number;
  steering: number;
  gear: number;
  rpm: number;
  trackPosition: number;
  lateralG: number;
  longitudinalG: number;
  yawRate?: number;
  tires: {
    fl: { temp: number; wear: number; pressure: number };
    fr: { temp: number; wear: number; pressure: number };
    rl: { temp: number; wear: number; pressure: number };
    rr: { temp: number; wear: number; pressure: number };
  };
  lap: number;
}

interface CornerData {
  cornerId: number;
  snapshots: TelemetrySnapshot[];
  entrySpeed: number;
  minSpeed: number;
  exitSpeed: number;
  maxBrake: number;
  maxThrottle: number;
  maxSteering: number;
  maxLateralG: number;
}

// ============================================================================
// SETUP ENGINE SERVICE
// ============================================================================

class SetupEngineService {
  private state: SetupAnalysisState;
  private telemetryHistory: TelemetrySnapshot[] = [];
  private cornerHistory: Map<number, CornerData[]> = new Map();
  private lockupEvents: { timestamp: number; position: 'front' | 'rear' }[] = [];
  private wheelspinEvents: { timestamp: number; severity: number }[] = [];
  private currentCorner: number = 0;
  private inCorner: boolean = false;
  private cornerSnapshots: TelemetrySnapshot[] = [];
  private lapsCompleted: number = 0;
  private lastLap: number = 0;

  constructor() {
    this.state = this.getInitialState();
  }

  private getInitialState(): SetupAnalysisState {
    return {
      overallHandling: null,
      cornerAnalysis: [],
      brakeAnalysis: null,
      aeroBalance: null,
      tireAnalysis: null,
      differentialAnalysis: null,
      gearAnalysis: null,
      recommendations: [],
      sessionType: 'practice',
      lapsAnalyzed: 0,
      confidence: 0,
      lastUpdated: Date.now(),
    };
  }

  // ============================================================================
  // MAIN UPDATE FUNCTION
  // ============================================================================

  update(telemetry: TelemetryData | null, sessionType: 'practice' | 'qualifying' | 'race' = 'practice'): SetupAnalysisState {
    if (!telemetry) return this.state;

    this.state.sessionType = sessionType;

    // Convert to snapshot
    const snapshot = this.createSnapshot(telemetry);
    this.telemetryHistory.push(snapshot);

    // Keep last 3000 snapshots (~5 minutes at 10Hz)
    if (this.telemetryHistory.length > 3000) {
      this.telemetryHistory = this.telemetryHistory.slice(-3000);
    }

    // Track lap completions
    if (telemetry.lap > this.lastLap && this.lastLap > 0) {
      this.lapsCompleted++;
      this.state.lapsAnalyzed = this.lapsCompleted;
    }
    this.lastLap = telemetry.lap;

    // Detect corners and collect data
    this.detectCorners(snapshot);

    // Detect lockups and wheelspin
    this.detectLockups(snapshot);
    this.detectWheelspin(snapshot);

    // Run analysis every ~100 snapshots (10 seconds)
    if (this.telemetryHistory.length % 100 === 0 && this.lapsCompleted >= 1) {
      this.runFullAnalysis();
    }

    return this.state;
  }

  private createSnapshot(telemetry: TelemetryData): TelemetrySnapshot {
    return {
      timestamp: telemetry.timestamp,
      speed: telemetry.speed,
      throttle: telemetry.throttle,
      brake: telemetry.brake,
      steering: telemetry.steering,
      gear: telemetry.gear,
      rpm: telemetry.rpm,
      trackPosition: telemetry.trackPosition,
      lateralG: telemetry.gForce?.lateral || 0,
      longitudinalG: telemetry.gForce?.longitudinal || 0,
      tires: {
        fl: { temp: telemetry.tires.frontLeft.temp, wear: telemetry.tires.frontLeft.wear, pressure: telemetry.tires.frontLeft.pressure },
        fr: { temp: telemetry.tires.frontRight.temp, wear: telemetry.tires.frontRight.wear, pressure: telemetry.tires.frontRight.pressure },
        rl: { temp: telemetry.tires.rearLeft.temp, wear: telemetry.tires.rearLeft.wear, pressure: telemetry.tires.rearLeft.pressure },
        rr: { temp: telemetry.tires.rearRight.temp, wear: telemetry.tires.rearRight.wear, pressure: telemetry.tires.rearRight.pressure },
      },
      lap: telemetry.lap,
    };
  }

  // ============================================================================
  // CORNER DETECTION
  // ============================================================================

  private detectCorners(snapshot: TelemetrySnapshot): void {
    const steeringThreshold = 0.15;
    const isCorner = Math.abs(snapshot.steering) > steeringThreshold;

    if (isCorner && !this.inCorner) {
      // Entering corner
      this.inCorner = true;
      this.currentCorner = Math.floor(snapshot.trackPosition * 20); // 20 corners max
      this.cornerSnapshots = [snapshot];
    } else if (isCorner && this.inCorner) {
      // In corner
      this.cornerSnapshots.push(snapshot);
    } else if (!isCorner && this.inCorner) {
      // Exiting corner - save data
      this.inCorner = false;
      if (this.cornerSnapshots.length > 5) {
        this.saveCornerData();
      }
      this.cornerSnapshots = [];
    }
  }

  private saveCornerData(): void {
    const snapshots = this.cornerSnapshots;
    const speeds = snapshots.map(s => s.speed);
    const brakes = snapshots.map(s => s.brake);
    const throttles = snapshots.map(s => s.throttle);
    const steerings = snapshots.map(s => Math.abs(s.steering));
    const lateralGs = snapshots.map(s => Math.abs(s.lateralG));

    const cornerData: CornerData = {
      cornerId: this.currentCorner,
      snapshots: [...snapshots],
      entrySpeed: speeds[0],
      minSpeed: Math.min(...speeds),
      exitSpeed: speeds[speeds.length - 1],
      maxBrake: Math.max(...brakes),
      maxThrottle: Math.max(...throttles),
      maxSteering: Math.max(...steerings),
      maxLateralG: Math.max(...lateralGs),
    };

    if (!this.cornerHistory.has(this.currentCorner)) {
      this.cornerHistory.set(this.currentCorner, []);
    }
    const history = this.cornerHistory.get(this.currentCorner)!;
    history.push(cornerData);

    // Keep last 10 passes per corner
    if (history.length > 10) {
      this.cornerHistory.set(this.currentCorner, history.slice(-10));
    }
  }

  // ============================================================================
  // LOCKUP & WHEELSPIN DETECTION
  // ============================================================================

  private detectLockups(snapshot: TelemetrySnapshot): void {
    // Detect lockup: heavy braking + high deceleration + specific patterns
    if (snapshot.brake > 0.8 && snapshot.longitudinalG < -1.5) {
      // Check for sudden G-force spike indicating lockup
      const recentSnapshots = this.telemetryHistory.slice(-10);
      const gVariance = this.calculateVariance(recentSnapshots.map(s => s.longitudinalG));
      
      if (gVariance > 0.5) {
        // Determine front or rear based on steering response
        const position = Math.abs(snapshot.steering) > 0.2 ? 'front' : 'rear';
        this.lockupEvents.push({ timestamp: snapshot.timestamp, position });
        
        // Keep last 50 events
        if (this.lockupEvents.length > 50) {
          this.lockupEvents = this.lockupEvents.slice(-50);
        }
      }
    }
  }

  private detectWheelspin(snapshot: TelemetrySnapshot): void {
    // Detect wheelspin: high throttle + low gear + low speed + high RPM
    if (snapshot.throttle > 0.9 && snapshot.gear <= 3 && snapshot.speed < 120) {
      const expectedAccel = snapshot.throttle * 0.5; // Simplified expected acceleration
      const actualAccel = snapshot.longitudinalG;
      
      if (actualAccel < expectedAccel * 0.5) {
        // Traction loss detected
        const severity = 1 - (actualAccel / expectedAccel);
        this.wheelspinEvents.push({ timestamp: snapshot.timestamp, severity });
        
        if (this.wheelspinEvents.length > 50) {
          this.wheelspinEvents = this.wheelspinEvents.slice(-50);
        }
      }
    }
  }

  // ============================================================================
  // FULL ANALYSIS
  // ============================================================================

  private runFullAnalysis(): void {
    this.analyzeHandling();
    this.analyzeCorners();
    this.analyzeBrakes();
    this.analyzeAero();
    this.analyzeTires();
    this.analyzeDifferential();
    this.analyzeGears();
    this.generateRecommendations();
    
    this.state.lastUpdated = Date.now();
    this.state.confidence = Math.min(100, this.lapsCompleted * 15 + 10);
  }

  // ============================================================================
  // HANDLING ANALYSIS (Understeer/Oversteer)
  // ============================================================================

  private analyzeHandling(): void {
    if (this.telemetryHistory.length < 100) return;

    const recentData = this.telemetryHistory.slice(-500);
    
    // Analyze steering vs lateral G relationship
    // Understeer: High steering input, low lateral G
    // Oversteer: Low steering input, high lateral G (or sudden yaw)
    
    let understeerScore = 0;
    let oversteerScore = 0;
    let samples = 0;

    for (const snapshot of recentData) {
      if (Math.abs(snapshot.steering) > 0.2 && snapshot.speed > 60) {
        samples++;
        const expectedLateralG = Math.abs(snapshot.steering) * 2.5; // Simplified model
        const actualLateralG = Math.abs(snapshot.lateralG);
        
        if (actualLateralG < expectedLateralG * 0.7) {
          understeerScore++;
        } else if (actualLateralG > expectedLateralG * 1.3) {
          oversteerScore++;
        }
      }
    }

    if (samples < 20) return;

    const understeerRatio = understeerScore / samples;
    const oversteerRatio = oversteerScore / samples;

    let type: HandlingCharacteristic['type'] = 'neutral';
    let severity: HandlingCharacteristic['severity'] = 'mild';

    if (understeerRatio > oversteerRatio + 0.1) {
      type = 'understeer';
      severity = understeerRatio > 0.4 ? 'severe' : understeerRatio > 0.25 ? 'moderate' : 'mild';
    } else if (oversteerRatio > understeerRatio + 0.1) {
      type = 'oversteer';
      severity = oversteerRatio > 0.4 ? 'severe' : oversteerRatio > 0.25 ? 'moderate' : 'mild';
    }

    this.state.overallHandling = {
      type,
      severity,
      phase: 'all',
      confidence: Math.min(95, samples / 2),
    };
  }

  // ============================================================================
  // CORNER-BY-CORNER ANALYSIS
  // ============================================================================

  private analyzeCorners(): void {
    this.state.cornerAnalysis = [];

    this.cornerHistory.forEach((history, cornerId) => {
      if (history.length < 3) return;

      const avgMinSpeed = history.reduce((sum, c) => sum + c.minSpeed, 0) / history.length;

      // Determine corner type
      let cornerType: CornerAnalysis['cornerType'] = 'medium';
      if (avgMinSpeed < 80) cornerType = 'slow';
      else if (avgMinSpeed > 150) cornerType = 'fast';

      // Analyze handling at each phase
      const entryHandling = this.analyzeCornerPhase(history, 'entry');
      const midHandling = this.analyzeCornerPhase(history, 'mid');
      const exitHandling = this.analyzeCornerPhase(history, 'exit');

      // Analyze braking stability
      const brakeVariance = this.calculateVariance(history.map(c => c.maxBrake));
      let brakingStability: CornerAnalysis['brakingStability'] = 'stable';
      if (brakeVariance > 0.1) brakingStability = 'unstable';

      // Analyze traction
      const exitSpeedVariance = this.calculateVariance(history.map(c => c.exitSpeed));
      let tractionLevel: CornerAnalysis['tractionLevel'] = 'good';
      if (exitSpeedVariance > 100) tractionLevel = 'wheelspin';
      else if (exitSpeedVariance > 50) tractionLevel = 'poor';

      this.state.cornerAnalysis.push({
        cornerId,
        cornerType,
        entryHandling,
        midHandling,
        exitHandling,
        brakingStability,
        tractionLevel,
        avgSpeed: avgMinSpeed,
        minSpeed: Math.min(...history.map(c => c.minSpeed)),
      });
    });
  }

  private analyzeCornerPhase(history: CornerData[], phase: 'entry' | 'mid' | 'exit'): HandlingCharacteristic | null {
    // Simplified phase analysis
    let understeerCount = 0;
    let oversteerCount = 0;

    for (const corner of history) {
      const snapshots = corner.snapshots;
      const phaseStart = phase === 'entry' ? 0 : phase === 'mid' ? Math.floor(snapshots.length * 0.33) : Math.floor(snapshots.length * 0.66);
      const phaseEnd = phase === 'entry' ? Math.floor(snapshots.length * 0.33) : phase === 'mid' ? Math.floor(snapshots.length * 0.66) : snapshots.length;
      
      const phaseSnapshots = snapshots.slice(phaseStart, phaseEnd);
      
      for (const s of phaseSnapshots) {
        const expectedG = Math.abs(s.steering) * 2.5;
        const actualG = Math.abs(s.lateralG);
        
        if (actualG < expectedG * 0.7) understeerCount++;
        else if (actualG > expectedG * 1.3) oversteerCount++;
      }
    }

    const total = understeerCount + oversteerCount;
    if (total < 10) return null;

    const understeerRatio = understeerCount / total;
    
    if (understeerRatio > 0.6) {
      return { type: 'understeer', severity: understeerRatio > 0.8 ? 'severe' : 'moderate', phase, confidence: 70 };
    } else if (understeerRatio < 0.4) {
      return { type: 'oversteer', severity: understeerRatio < 0.2 ? 'severe' : 'moderate', phase, confidence: 70 };
    }
    
    return { type: 'neutral', severity: 'mild', phase, confidence: 60 };
  }

  // ============================================================================
  // BRAKE ANALYSIS
  // ============================================================================

  private analyzeBrakes(): void {
    if (this.telemetryHistory.length < 200) return;

    const recentLockups = this.lockupEvents.filter(e => 
      Date.now() - e.timestamp < 300000 // Last 5 minutes
    );

    const frontLockups = recentLockups.filter(e => e.position === 'front').length;
    const rearLockups = recentLockups.filter(e => e.position === 'rear').length;

    // Estimate current brake bias from lockup pattern
    let currentBias = 55; // Default
    if (frontLockups > rearLockups * 2) currentBias = 58;
    else if (rearLockups > frontLockups * 2) currentBias = 52;

    // Calculate recommended bias
    let recommendedBias = currentBias;
    let recommendation = 'Brake bias appears well balanced.';

    if (frontLockups > rearLockups + 3) {
      recommendedBias = currentBias - 2;
      recommendation = `Front lockups detected. Reduce brake bias by 2% to ${recommendedBias}%.`;
    } else if (rearLockups > frontLockups + 3) {
      recommendedBias = currentBias + 2;
      recommendation = `Rear instability under braking. Increase brake bias by 2% to ${recommendedBias}%.`;
    }

    // Calculate braking efficiency
    const brakingSnapshots = this.telemetryHistory.filter(s => s.brake > 0.5);
    const avgDecel = brakingSnapshots.length > 0 
      ? Math.abs(brakingSnapshots.reduce((sum, s) => sum + s.longitudinalG, 0) / brakingSnapshots.length)
      : 0;
    const brakingEfficiency = Math.min(100, avgDecel * 50);

    // Trail braking usage
    const trailBrakingSnapshots = this.telemetryHistory.filter(s => 
      s.brake > 0.1 && s.brake < 0.5 && Math.abs(s.steering) > 0.2
    );
    const trailBrakingUsage = Math.min(100, (trailBrakingSnapshots.length / this.telemetryHistory.length) * 500);

    this.state.brakeAnalysis = {
      frontBias: currentBias,
      lockupFrequency: { 
        front: frontLockups / Math.max(1, this.lapsCompleted),
        rear: rearLockups / Math.max(1, this.lapsCompleted),
      },
      brakingEfficiency,
      trailBrakingUsage,
      recommendedBias,
      recommendation,
    };
  }

  // ============================================================================
  // AERO BALANCE ANALYSIS
  // ============================================================================

  private analyzeAero(): void {
    if (this.cornerHistory.size < 3) return;

    // Analyze high-speed vs low-speed handling
    const slowCorners = this.state.cornerAnalysis.filter(c => c.cornerType === 'slow');
    const fastCorners = this.state.cornerAnalysis.filter(c => c.cornerType === 'fast');

    let slowUndersteer = 0;
    let slowOversteer = 0;
    let fastUndersteer = 0;
    let fastOversteer = 0;

    for (const corner of slowCorners) {
      if (corner.midHandling?.type === 'understeer') slowUndersteer++;
      if (corner.midHandling?.type === 'oversteer') slowOversteer++;
    }

    for (const corner of fastCorners) {
      if (corner.midHandling?.type === 'understeer') fastUndersteer++;
      if (corner.midHandling?.type === 'oversteer') fastOversteer++;
    }

    // Determine aero balance
    let currentBalance: AeroBalance['currentBalance'] = 'balanced';
    let recommendedFrontWing = 'Current setting OK';
    let recommendedRearWing = 'Current setting OK';

    if (fastUndersteer > fastOversteer + 1) {
      currentBalance = 'rear-heavy';
      recommendedFrontWing = 'Increase front wing +1-2 clicks for high-speed grip';
    } else if (fastOversteer > fastUndersteer + 1) {
      currentBalance = 'front-heavy';
      recommendedRearWing = 'Increase rear wing +1-2 clicks for high-speed stability';
    }

    // High speed stability score
    const highSpeedStability = fastCorners.length > 0
      ? Math.max(0, 100 - fastOversteer * 20)
      : 75;

    // Low speed rotation score
    const lowSpeedRotation = slowCorners.length > 0
      ? Math.max(0, 100 - slowUndersteer * 20)
      : 75;

    this.state.aeroBalance = {
      currentBalance,
      highSpeedStability,
      lowSpeedRotation,
      dragLevel: 'medium',
      recommendedFrontWing,
      recommendedRearWing,
    };
  }

  // ============================================================================
  // TIRE ANALYSIS FOR SETUP
  // ============================================================================

  private analyzeTires(): void {
    if (this.telemetryHistory.length < 100) return;

    const recentData = this.telemetryHistory.slice(-200);
    
    // Calculate average temps for each tire
    const avgTemps = {
      fl: this.calculateAverage(recentData.map(s => s.tires.fl.temp)),
      fr: this.calculateAverage(recentData.map(s => s.tires.fr.temp)),
      rl: this.calculateAverage(recentData.map(s => s.tires.rl.temp)),
      rr: this.calculateAverage(recentData.map(s => s.tires.rr.temp)),
    };

    // Simulate inner/middle/outer temps (in real implementation, iRacing provides these)
    // For now, estimate based on handling characteristics
    const createTireData = (avgTemp: number, isOuter: boolean): TireTemperatureData => {
      const spread = isOuter ? 8 : 5;
      return {
        innerTemp: avgTemp + (isOuter ? -spread/2 : spread/2),
        middleTemp: avgTemp,
        outerTemp: avgTemp + (isOuter ? spread/2 : -spread/2),
        avgTemp,
        spread,
      };
    };

    const handling = this.state.overallHandling;
    const isUndersteer = handling?.type === 'understeer';

    this.state.tireAnalysis = {
      frontLeft: createTireData(avgTemps.fl, isUndersteer),
      frontRight: createTireData(avgTemps.fr, isUndersteer),
      rearLeft: createTireData(avgTemps.rl, !isUndersteer),
      rearRight: createTireData(avgTemps.rr, !isUndersteer),
      frontCamberRecommendation: this.getCamberRecommendation('front', avgTemps.fl, avgTemps.fr),
      rearCamberRecommendation: this.getCamberRecommendation('rear', avgTemps.rl, avgTemps.rr),
      frontPressureRecommendation: this.getPressureRecommendation('front', recentData),
      rearPressureRecommendation: this.getPressureRecommendation('rear', recentData),
      frontToeRecommendation: isUndersteer ? 'Add +0.5mm toe-out for better turn-in' : 'Current toe OK',
      rearToeRecommendation: !isUndersteer ? 'Add +1mm toe-in for stability' : 'Current toe OK',
    };
  }

  private getCamberRecommendation(axle: 'front' | 'rear', leftTemp: number, rightTemp: number): string {
    const diff = Math.abs(leftTemp - rightTemp);
    if (diff > 10) {
      const hotSide = leftTemp > rightTemp ? 'left' : 'right';
      return `${hotSide.charAt(0).toUpperCase() + hotSide.slice(1)} tire running hot. Add -0.3° camber to ${hotSide} ${axle}.`;
    }
    return 'Camber appears balanced across axle.';
  }

  private getPressureRecommendation(axle: 'front' | 'rear', data: TelemetrySnapshot[]): string {
    const pressures = axle === 'front' 
      ? data.map(s => (s.tires.fl.pressure + s.tires.fr.pressure) / 2)
      : data.map(s => (s.tires.rl.pressure + s.tires.rr.pressure) / 2);
    
    const avgPressure = this.calculateAverage(pressures);
    
    if (avgPressure > 27) {
      return `${axle.charAt(0).toUpperCase() + axle.slice(1)} pressures high (${avgPressure.toFixed(1)} psi). Reduce by 1-2 psi for better grip.`;
    } else if (avgPressure < 23) {
      return `${axle.charAt(0).toUpperCase() + axle.slice(1)} pressures low (${avgPressure.toFixed(1)} psi). Increase by 1-2 psi to reduce wear.`;
    }
    return `${axle.charAt(0).toUpperCase() + axle.slice(1)} pressures in optimal range.`;
  }

  // ============================================================================
  // GENERATE RECOMMENDATIONS
  // ============================================================================

  private generateRecommendations(): void {
    const recommendations: SetupRecommendation[] = [];
    const handling = this.state.overallHandling;
    const brakes = this.state.brakeAnalysis;
    const aero = this.state.aeroBalance;
    const tires = this.state.tireAnalysis;

    // Handling-based recommendations
    if (handling) {
      if (handling.type === 'understeer') {
        if (handling.severity === 'severe') {
          recommendations.push({
            id: 'us-arb-front',
            category: 'arb',
            component: 'Front Anti-Roll Bar',
            currentIssue: 'Severe understeer detected throughout corners',
            recommendation: 'Soften front anti-roll bar significantly',
            adjustment: '-3 to -4 clicks',
            impact: 'Major improvement in front grip and turn-in',
            priority: 'critical',
            confidence: handling.confidence,
            sessionType: 'all',
          });
          recommendations.push({
            id: 'us-arb-rear',
            category: 'arb',
            component: 'Rear Anti-Roll Bar',
            currentIssue: 'Rear too stable, causing push',
            recommendation: 'Stiffen rear anti-roll bar',
            adjustment: '+2 to +3 clicks',
            impact: 'Induces rotation to balance understeer',
            priority: 'high',
            confidence: handling.confidence,
            sessionType: 'all',
          });
        } else if (handling.severity === 'moderate') {
          recommendations.push({
            id: 'us-springs',
            category: 'springs',
            component: 'Front Springs',
            currentIssue: 'Moderate understeer affecting corner speed',
            recommendation: 'Soften front springs slightly',
            adjustment: '-50 to -100 lbs/in',
            impact: 'Better front mechanical grip',
            priority: 'high',
            confidence: handling.confidence,
            sessionType: 'all',
          });
        } else {
          recommendations.push({
            id: 'us-diff',
            category: 'differential',
            component: 'Differential Preload',
            currentIssue: 'Mild understeer on power',
            recommendation: 'Reduce differential preload',
            adjustment: '-5 to -10 Nm',
            impact: 'Better rotation on throttle',
            priority: 'medium',
            confidence: handling.confidence,
            sessionType: 'all',
          });
        }
      } else if (handling.type === 'oversteer') {
        if (handling.severity === 'severe') {
          recommendations.push({
            id: 'os-arb-rear',
            category: 'arb',
            component: 'Rear Anti-Roll Bar',
            currentIssue: 'Severe oversteer - rear unstable',
            recommendation: 'Soften rear anti-roll bar significantly',
            adjustment: '-3 to -4 clicks',
            impact: 'Major improvement in rear stability',
            priority: 'critical',
            confidence: handling.confidence,
            sessionType: 'all',
          });
        } else {
          recommendations.push({
            id: 'os-dampers',
            category: 'dampers',
            component: 'Rear Rebound Damping',
            currentIssue: 'Rear stepping out on corner exit',
            recommendation: 'Increase rear rebound damping',
            adjustment: '+2 clicks',
            impact: 'Better rear stability on weight transfer',
            priority: 'high',
            confidence: handling.confidence,
            sessionType: 'all',
          });
        }
      }
    }

    // Brake recommendations
    if (brakes && brakes.recommendedBias !== brakes.frontBias) {
      recommendations.push({
        id: 'brake-bias',
        category: 'brakes',
        component: 'Brake Bias',
        currentIssue: brakes.recommendation,
        recommendation: `Adjust brake bias to ${brakes.recommendedBias}%`,
        adjustment: `${brakes.recommendedBias > brakes.frontBias ? '+' : ''}${brakes.recommendedBias - brakes.frontBias}%`,
        impact: 'Reduced lockups and better braking stability',
        priority: 'high',
        confidence: 80,
        sessionType: 'all',
      });
    }

    // Aero recommendations
    if (aero) {
      if (aero.currentBalance === 'rear-heavy') {
        recommendations.push({
          id: 'aero-front',
          category: 'aero',
          component: 'Front Wing',
          currentIssue: 'High-speed understeer detected',
          recommendation: aero.recommendedFrontWing,
          adjustment: '+1 to +2 clicks',
          impact: 'Better high-speed front grip',
          priority: 'medium',
          confidence: 70,
          sessionType: 'qualifying',
        });
      } else if (aero.currentBalance === 'front-heavy') {
        recommendations.push({
          id: 'aero-rear',
          category: 'aero',
          component: 'Rear Wing',
          currentIssue: 'High-speed oversteer detected',
          recommendation: aero.recommendedRearWing,
          adjustment: '+1 to +2 clicks',
          impact: 'Better high-speed stability',
          priority: 'medium',
          confidence: 70,
          sessionType: 'race',
        });
      }
    }

    // Tire recommendations
    if (tires) {
      if (tires.frontCamberRecommendation.includes('Add')) {
        recommendations.push({
          id: 'tire-camber-front',
          category: 'alignment',
          component: 'Front Camber',
          currentIssue: 'Uneven front tire temperatures',
          recommendation: tires.frontCamberRecommendation,
          adjustment: '-0.3°',
          impact: 'More even tire wear and better grip',
          priority: 'medium',
          confidence: 65,
          sessionType: 'practice',
        });
      }
      if (tires.frontPressureRecommendation.includes('Reduce') || tires.frontPressureRecommendation.includes('Increase')) {
        recommendations.push({
          id: 'tire-pressure-front',
          category: 'tires',
          component: 'Front Tire Pressure',
          currentIssue: 'Front tire pressures not optimal',
          recommendation: tires.frontPressureRecommendation,
          adjustment: tires.frontPressureRecommendation.includes('Reduce') ? '-1 to -2 psi' : '+1 to +2 psi',
          impact: 'Optimized tire operating window',
          priority: 'medium',
          confidence: 75,
          sessionType: 'practice',
        });
      }
    }

    // Wheelspin recommendations
    if (this.wheelspinEvents.length > 5) {
      recommendations.push({
        id: 'traction-diff',
        category: 'differential',
        component: 'Differential Power',
        currentIssue: 'Excessive wheelspin on corner exit',
        recommendation: 'Reduce differential power setting',
        adjustment: '-5 to -10%',
        impact: 'Better traction out of slow corners',
        priority: 'high',
        confidence: 75,
        sessionType: 'all',
      });
    }

    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    this.state.recommendations = recommendations;
  }

  // ============================================================================
  // DIFFERENTIAL ANALYSIS
  // ============================================================================

  private analyzeDifferential(): void {
    if (this.telemetryHistory.length < 200) return;

    const recentData = this.telemetryHistory.slice(-500);
    
    // Analyze power-on oversteer (throttle > 50%, steering applied)
    let powerOversteerEvents = 0;
    let powerUndersteerEvents = 0;
    let powerSamples = 0;
    
    // Analyze coast/lift-off oversteer (throttle < 20%, was > 50% recently)
    let coastOversteerEvents = 0;
    let coastUndersteerEvents = 0;
    let coastSamples = 0;
    
    // Traction analysis
    let tractionLossEvents = 0;
    let tractionSamples = 0;

    for (let i = 10; i < recentData.length; i++) {
      const current = recentData[i];
      const prev = recentData[i - 10];
      
      // Power-on analysis (accelerating out of corners)
      if (current.throttle > 0.5 && Math.abs(current.steering) > 0.15 && current.speed > 50) {
        powerSamples++;
        const expectedLateralG = Math.abs(current.steering) * 2.0;
        const actualLateralG = Math.abs(current.lateralG);
        
        if (actualLateralG > expectedLateralG * 1.3) {
          powerOversteerEvents++;
        } else if (actualLateralG < expectedLateralG * 0.6) {
          powerUndersteerEvents++;
        }
        
        // Traction check
        tractionSamples++;
        if (current.longitudinalG < current.throttle * 0.3) {
          tractionLossEvents++;
        }
      }
      
      // Coast/lift-off analysis (lifting throttle mid-corner)
      if (current.throttle < 0.2 && prev.throttle > 0.5 && Math.abs(current.steering) > 0.2) {
        coastSamples++;
        const expectedLateralG = Math.abs(current.steering) * 2.0;
        const actualLateralG = Math.abs(current.lateralG);
        
        if (actualLateralG > expectedLateralG * 1.4) {
          coastOversteerEvents++;
        } else if (actualLateralG < expectedLateralG * 0.5) {
          coastUndersteerEvents++;
        }
      }
    }

    // Calculate scores
    const powerOversteer = powerSamples > 0 ? (powerOversteerEvents / powerSamples) * 100 : 0;
    const coastOversteer = coastSamples > 0 ? (coastOversteerEvents / coastSamples) * 100 : 0;
    const tractionRating = tractionSamples > 0 ? Math.max(0, 100 - (tractionLossEvents / tractionSamples) * 200) : 100;

    // Determine rotation characteristics
    let rotationOnPower: 'too-much' | 'good' | 'too-little' = 'good';
    if (powerOversteer > 30) rotationOnPower = 'too-much';
    else if (powerUndersteerEvents > powerOversteerEvents * 2) rotationOnPower = 'too-little';

    let rotationOnCoast: 'too-much' | 'good' | 'too-little' = 'good';
    if (coastOversteer > 25) rotationOnCoast = 'too-much';
    else if (coastUndersteerEvents > coastOversteerEvents * 2) rotationOnCoast = 'too-little';

    // Generate recommendations
    let recommendedPreload = 'Current preload OK';
    let recommendedPower = 'Current power setting OK';
    let recommendedCoast = 'Current coast setting OK';
    let recommendation = 'Differential settings appear well balanced.';

    if (rotationOnPower === 'too-much') {
      recommendedPower = 'Reduce power setting by 5-10%';
      recommendation = 'Car is oversteering on power application. Reduce diff power to improve traction.';
    } else if (rotationOnPower === 'too-little') {
      recommendedPower = 'Increase power setting by 5-10%';
      recommendation = 'Car is understeering on power. Increase diff power for better rotation.';
    }

    if (rotationOnCoast === 'too-much') {
      recommendedCoast = 'Reduce coast setting by 5-10%';
      if (rotationOnPower !== 'too-much') {
        recommendation = 'Car is snapping loose on lift-off. Reduce diff coast setting.';
      }
    } else if (rotationOnCoast === 'too-little') {
      recommendedCoast = 'Increase coast setting by 5-10%';
    }

    if (tractionRating < 60) {
      recommendedPreload = 'Reduce preload by 5-10 Nm';
      recommendation = 'Significant traction loss detected. Consider reducing diff preload.';
    }

    this.state.differentialAnalysis = {
      powerOversteer,
      coastOversteer,
      tractionRating,
      rotationOnPower,
      rotationOnCoast,
      recommendedPreload,
      recommendedPower,
      recommendedCoast,
      recommendation,
    };
  }

  // ============================================================================
  // GEAR RATIO ANALYSIS
  // ============================================================================

  private analyzeGears(): void {
    if (this.telemetryHistory.length < 300) return;

    const recentData = this.telemetryHistory.slice(-1000);
    
    // Collect data per gear
    const gearStats: Map<number, { rpms: number[]; speeds: number[]; shiftUpRpms: number[] }> = new Map();
    
    for (let i = 1; i < recentData.length; i++) {
      const current = recentData[i];
      const prev = recentData[i - 1];
      
      if (current.gear >= 1 && current.gear <= 7) {
        if (!gearStats.has(current.gear)) {
          gearStats.set(current.gear, { rpms: [], speeds: [], shiftUpRpms: [] });
        }
        
        const stats = gearStats.get(current.gear)!;
        stats.rpms.push(current.rpm);
        stats.speeds.push(current.speed);
        
        // Detect upshift
        if (prev.gear === current.gear - 1 && current.gear > 1) {
          stats.shiftUpRpms.push(prev.rpm);
        }
      }
    }

    // Analyze each gear
    const gearData: GearAnalysis['gearData'] = [];
    let topSpeedRpm = 0;
    let topSpeedGear = 1;
    let maxSpeed = 0;

    gearStats.forEach((stats, gear) => {
      if (stats.rpms.length < 10) return;

      const minRpm = Math.min(...stats.rpms);
      const maxRpm = Math.max(...stats.rpms);
      const avgRpm = this.calculateAverage(stats.rpms);
      const timeInGear = (stats.rpms.length / recentData.length) * 100;
      
      // Optimal shift point (assume redline around 8000-8500 for most cars)
      const optimalShiftPoint = 7800;
      const currentShiftPoint = stats.shiftUpRpms.length > 0 
        ? this.calculateAverage(stats.shiftUpRpms) 
        : maxRpm;

      let recommendation = 'Shift timing OK';
      if (currentShiftPoint < optimalShiftPoint - 500) {
        recommendation = `Shift later - you're leaving ${Math.round(optimalShiftPoint - currentShiftPoint)} RPM on the table`;
      } else if (currentShiftPoint > optimalShiftPoint + 300) {
        recommendation = 'Shift slightly earlier to stay in power band';
      }

      // Track top speed
      const gearMaxSpeed = Math.max(...stats.speeds);
      if (gearMaxSpeed > maxSpeed) {
        maxSpeed = gearMaxSpeed;
        topSpeedRpm = maxRpm;
        topSpeedGear = gear;
      }

      gearData.push({
        gear,
        minRpm,
        maxRpm,
        avgRpm,
        timeInGear,
        optimalShiftPoint,
        currentShiftPoint,
        recommendation,
      });
    });

    // Sort by gear number
    gearData.sort((a, b) => a.gear - b.gear);

    // Overall recommendations
    let overallRecommendation = 'Gear ratios appear well suited to this track.';
    let finalDriveRecommendation = 'Final drive ratio OK';

    // Check if hitting rev limiter in top gear
    if (topSpeedRpm > 8200) {
      finalDriveRecommendation = 'Consider longer final drive ratio - hitting limiter on straights';
      overallRecommendation = 'You are hitting the rev limiter. Lengthen final drive for more top speed.';
    } else if (topSpeedRpm < 7000 && topSpeedGear === gearData.length) {
      finalDriveRecommendation = 'Consider shorter final drive ratio - not using full rev range';
      overallRecommendation = 'Not reaching optimal RPM on straights. Shorten final drive for better acceleration.';
    }

    // Check for gear gaps
    for (let i = 1; i < gearData.length; i++) {
      const prevGear = gearData[i - 1];
      const currGear = gearData[i];
      const rpmDrop = prevGear.maxRpm - currGear.minRpm;
      
      if (rpmDrop > 2500) {
        overallRecommendation = `Large RPM drop between gear ${prevGear.gear} and ${currGear.gear}. Consider adjusting ratios.`;
        break;
      }
    }

    this.state.gearAnalysis = {
      gearData,
      topSpeedRpm,
      topSpeedGear,
      overallRecommendation,
      finalDriveRecommendation,
    };
  }

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  getState(): SetupAnalysisState {
    return this.state;
  }

  reset(): void {
    this.state = this.getInitialState();
    this.telemetryHistory = [];
    this.cornerHistory.clear();
    this.lockupEvents = [];
    this.wheelspinEvents = [];
    this.lapsCompleted = 0;
    this.lastLap = 0;
  }

  // ============================================================================
  // SETUP SNAPSHOTS & COMPARISON
  // ============================================================================

  private savedSetups: SetupSnapshot[] = [];
  private currentComparison: SetupComparison = {
    setup1: null,
    setup2: null,
    lapTimeDelta: 0,
    handlingChanges: [],
    improvementAreas: [],
    regressionAreas: [],
  };

  saveSetup(name: string, avgLapTime: number, bestLapTime: number, notes: string = ''): SetupSnapshot {
    const snapshot: SetupSnapshot = {
      id: `setup-${Date.now()}`,
      name,
      timestamp: Date.now(),
      sessionType: this.state.sessionType,
      lapsAnalyzed: this.state.lapsAnalyzed,
      avgLapTime,
      bestLapTime,
      handling: this.state.overallHandling,
      recommendations: [...this.state.recommendations],
      notes,
    };

    this.savedSetups.push(snapshot);
    
    // Keep max 20 setups
    if (this.savedSetups.length > 20) {
      this.savedSetups = this.savedSetups.slice(-20);
    }

    return snapshot;
  }

  getSavedSetups(): SetupSnapshot[] {
    return this.savedSetups;
  }

  deleteSetup(id: string): void {
    this.savedSetups = this.savedSetups.filter(s => s.id !== id);
  }

  compareSetups(setup1Id: string, setup2Id: string): SetupComparison {
    const setup1 = this.savedSetups.find(s => s.id === setup1Id) || null;
    const setup2 = this.savedSetups.find(s => s.id === setup2Id) || null;

    if (!setup1 || !setup2) {
      return this.currentComparison;
    }

    const lapTimeDelta = setup2.bestLapTime - setup1.bestLapTime;
    const handlingChanges: string[] = [];
    const improvementAreas: string[] = [];
    const regressionAreas: string[] = [];

    // Compare handling
    if (setup1.handling && setup2.handling) {
      if (setup1.handling.type !== setup2.handling.type) {
        handlingChanges.push(`Handling changed from ${setup1.handling.type} to ${setup2.handling.type}`);
      }
      if (setup1.handling.severity !== setup2.handling.severity) {
        const severityOrder = { mild: 1, moderate: 2, severe: 3 };
        if (severityOrder[setup2.handling.severity] < severityOrder[setup1.handling.severity]) {
          improvementAreas.push(`${setup1.handling.type} severity reduced from ${setup1.handling.severity} to ${setup2.handling.severity}`);
        } else {
          regressionAreas.push(`${setup2.handling.type} severity increased to ${setup2.handling.severity}`);
        }
      }
    }

    // Compare recommendations
    const setup1Issues = new Set(setup1.recommendations.map(r => r.category));
    const setup2Issues = new Set(setup2.recommendations.map(r => r.category));

    setup1Issues.forEach(issue => {
      if (!setup2Issues.has(issue)) {
        improvementAreas.push(`${issue} issues resolved`);
      }
    });

    setup2Issues.forEach(issue => {
      if (!setup1Issues.has(issue)) {
        regressionAreas.push(`New ${issue} issues detected`);
      }
    });

    // Lap time comparison
    if (lapTimeDelta < -0.1) {
      improvementAreas.push(`Lap time improved by ${Math.abs(lapTimeDelta).toFixed(3)}s`);
    } else if (lapTimeDelta > 0.1) {
      regressionAreas.push(`Lap time slower by ${lapTimeDelta.toFixed(3)}s`);
    }

    this.currentComparison = {
      setup1,
      setup2,
      lapTimeDelta,
      handlingChanges,
      improvementAreas,
      regressionAreas,
    };

    return this.currentComparison;
  }

  getComparison(): SetupComparison {
    return this.currentComparison;
  }

  // ============================================================================
  // SESSION-SPECIFIC RECOMMENDATIONS
  // ============================================================================

  getSessionSpecificRecommendations(): SetupRecommendation[] {
    const sessionType = this.state.sessionType;
    const allRecs = this.state.recommendations;

    // Filter and adjust recommendations based on session type
    return allRecs.map(rec => {
      const adjustedRec = { ...rec };

      if (sessionType === 'qualifying') {
        // For qualifying, prioritize single-lap performance
        if (rec.category === 'aero') {
          adjustedRec.priority = 'high';
          adjustedRec.recommendation += ' (Critical for qualifying pace)';
        }
        if (rec.category === 'tires' && rec.component.includes('Pressure')) {
          adjustedRec.recommendation = rec.recommendation.replace('optimal range', 'qualifying optimal (slightly lower for grip)');
        }
      } else if (sessionType === 'race') {
        // For race, prioritize tire life and consistency
        if (rec.category === 'tires') {
          adjustedRec.priority = 'high';
          adjustedRec.recommendation += ' (Important for race stint consistency)';
        }
        if (rec.category === 'differential' && rec.component.includes('Power')) {
          adjustedRec.recommendation += ' (Balance traction vs tire wear for race)';
        }
      }

      return adjustedRec;
    }).filter(rec => rec.sessionType === 'all' || rec.sessionType === sessionType);
  }
}

// Export singleton instance
export const setupEngine = new SetupEngineService();
export default setupEngine;
