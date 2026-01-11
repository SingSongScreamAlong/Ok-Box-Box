/**
 * Predictive Lap Time Engine
 * Predicts lap times based on current pace, tire degradation, fuel load, and track conditions
 */

import type { TelemetryData } from '../types';

export interface LapPrediction {
  predictedLapTime: number;
  confidence: number; // 0-1
  factors: {
    basePace: number;
    tireDegradation: number;
    fuelEffect: number;
    trackEvolution: number;
    driverFatigue: number;
    trafficImpact: number;
  };
  trend: 'improving' | 'stable' | 'degrading';
  projectedFinish?: {
    position: number;
    totalTime: number;
    gapToLeader: number;
  };
}

export interface SectorPrediction {
  sector: number;
  predictedTime: number;
  bestTime: number;
  delta: number;
  status: 'purple' | 'green' | 'yellow' | 'red';
}

export interface RacePrediction {
  currentPosition: number;
  predictedFinish: number;
  lapsRemaining: number;
  pitStopsRemaining: number;
  projectedGapToLeader: number;
  projectedGapToNext: number;
  winProbability: number;
  podiumProbability: number;
  pointsFinishProbability: number;
}

interface LapHistory {
  lapNumber: number;
  lapTime: number;
  sector1: number;
  sector2: number;
  sector3: number;
  fuelLoad: number;
  tireWear: number;
  trackPosition: number;
  timestamp: number;
}

class PredictiveLapTimeClass {
  private lapHistory: LapHistory[] = [];
  private sectorHistory: Map<number, number[]> = new Map(); // sector -> times
  private currentLapSectors: number[] = [];
  private lastSector = 0;
  
  private baseLapTime = 0;
  private fuelCorrectionPerKg = 0.035; // seconds per kg of fuel
  private tireDegradationRate = 0.02; // seconds per lap of wear
  private trackEvolutionRate = -0.01; // negative = track getting faster
  
  private listeners: Set<(prediction: LapPrediction) => void> = new Set();

  // ============================================================================
  // LAP TIME PREDICTION
  // ============================================================================

  updateWithTelemetry(telemetry: TelemetryData): LapPrediction {
    // Track sector times
    if (telemetry.sector !== this.lastSector) {
      if (telemetry.sectorTime > 0) {
        this.currentLapSectors.push(telemetry.sectorTime);
        
        // Store sector history
        const sectorTimes = this.sectorHistory.get(telemetry.sector) || [];
        sectorTimes.push(telemetry.sectorTime);
        if (sectorTimes.length > 20) sectorTimes.shift();
        this.sectorHistory.set(telemetry.sector, sectorTimes);
      }
      this.lastSector = telemetry.sector;
    }

    // Detect lap completion
    if (telemetry.lap > (this.lapHistory[this.lapHistory.length - 1]?.lapNumber || 0)) {
      this.recordLap(telemetry);
    }

    return this.predictCurrentLap(telemetry);
  }

  private recordLap(telemetry: TelemetryData): void {
    if (telemetry.lapTime <= 0) return;

    const avgTireWear = (
      telemetry.tires.frontLeft.wear +
      telemetry.tires.frontRight.wear +
      telemetry.tires.rearLeft.wear +
      telemetry.tires.rearRight.wear
    ) / 4;

    this.lapHistory.push({
      lapNumber: telemetry.lap - 1,
      lapTime: telemetry.lapTime,
      sector1: this.currentLapSectors[0] || 0,
      sector2: this.currentLapSectors[1] || 0,
      sector3: this.currentLapSectors[2] || 0,
      fuelLoad: telemetry.fuel,
      tireWear: avgTireWear,
      trackPosition: telemetry.trackPosition,
      timestamp: Date.now(),
    });

    // Keep last 50 laps
    if (this.lapHistory.length > 50) {
      this.lapHistory.shift();
    }

    // Update base lap time (best clean lap)
    this.updateBaseLapTime();

    // Reset sector tracking
    this.currentLapSectors = [];
  }

  private updateBaseLapTime(): void {
    if (this.lapHistory.length < 3) return;

    // Find best lap time from recent laps
    const recentLaps = this.lapHistory.slice(-10);
    const validLaps = recentLaps.filter(l => l.lapTime > 0);
    
    if (validLaps.length > 0) {
      this.baseLapTime = Math.min(...validLaps.map(l => l.lapTime));
    }
  }

  private predictCurrentLap(telemetry: TelemetryData): LapPrediction {
    const avgTireWear = (
      telemetry.tires.frontLeft.wear +
      telemetry.tires.frontRight.wear +
      telemetry.tires.rearLeft.wear +
      telemetry.tires.rearRight.wear
    ) / 4;

    // Calculate factors
    const basePace = this.baseLapTime || telemetry.bestLapTime || 90000;
    
    // Tire degradation effect (more wear = slower)
    const tireDegradation = avgTireWear * this.tireDegradationRate * 1000;
    
    // Fuel effect (less fuel = faster)
    const fuelEffect = -((100 - telemetry.fuel) * this.fuelCorrectionPerKg * 10);
    
    // Track evolution (track gets faster over session)
    const lapsCompleted = this.lapHistory.length;
    const trackEvolution = lapsCompleted * this.trackEvolutionRate * 1000;
    
    // Driver fatigue (estimate based on stint length)
    const stintLength = this.getStintLength();
    const driverFatigue = stintLength > 20 ? (stintLength - 20) * 0.01 * 1000 : 0;
    
    // Traffic impact (based on gaps)
    const trafficImpact = this.estimateTrafficImpact(telemetry);

    // Calculate predicted lap time
    let predictedLapTime = basePace + tireDegradation + fuelEffect + trackEvolution + driverFatigue + trafficImpact;

    // If we have sector data, use it for more accurate prediction
    if (this.currentLapSectors.length > 0) {
      const completedSectorTime = this.currentLapSectors.reduce((a, b) => a + b, 0);
      const remainingSectors = 3 - this.currentLapSectors.length;
      
      if (remainingSectors > 0) {
        const avgRemainingTime = this.predictRemainingSectors(remainingSectors);
        predictedLapTime = completedSectorTime + avgRemainingTime;
      } else {
        predictedLapTime = completedSectorTime;
      }
    }

    // Calculate confidence
    const confidence = this.calculateConfidence();

    // Determine trend
    const trend = this.determineTrend();

    const prediction: LapPrediction = {
      predictedLapTime,
      confidence,
      factors: {
        basePace,
        tireDegradation,
        fuelEffect,
        trackEvolution,
        driverFatigue,
        trafficImpact,
      },
      trend,
    };

    this.notifyListeners(prediction);
    return prediction;
  }

  private predictRemainingSectors(remainingCount: number): number {
    let totalPredicted = 0;
    const startSector = 3 - remainingCount + 1;

    for (let s = startSector; s <= 3; s++) {
      const sectorTimes = this.sectorHistory.get(s) || [];
      if (sectorTimes.length > 0) {
        // Use average of best 3 sector times
        const sorted = [...sectorTimes].sort((a, b) => a - b);
        const best3 = sorted.slice(0, 3);
        totalPredicted += best3.reduce((a, b) => a + b, 0) / best3.length;
      } else {
        // Estimate based on lap time distribution
        totalPredicted += (this.baseLapTime || 90000) / 3;
      }
    }

    return totalPredicted;
  }

  private getStintLength(): number {
    // Count laps since last pit stop (simplified - would need pit detection)
    return this.lapHistory.length;
  }

  private estimateTrafficImpact(telemetry: TelemetryData): number {
    // If gap ahead is small, likely in traffic
    if (telemetry.gapAhead < 1) {
      return 500; // 0.5 second penalty for traffic
    } else if (telemetry.gapAhead < 2) {
      return 200;
    }
    return 0;
  }

  private calculateConfidence(): number {
    // More lap history = higher confidence
    const historyFactor = Math.min(this.lapHistory.length / 10, 1);
    
    // More sector data = higher confidence
    const sectorFactor = this.currentLapSectors.length / 3;
    
    // Consistent lap times = higher confidence
    const consistencyFactor = this.calculateConsistency();

    return (historyFactor * 0.4 + sectorFactor * 0.3 + consistencyFactor * 0.3);
  }

  private calculateConsistency(): number {
    if (this.lapHistory.length < 3) return 0.5;

    const recentLaps = this.lapHistory.slice(-5).map(l => l.lapTime);
    const avg = recentLaps.reduce((a, b) => a + b, 0) / recentLaps.length;
    const variance = recentLaps.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / recentLaps.length;
    const stdDev = Math.sqrt(variance);

    // Lower std dev = more consistent = higher confidence
    const maxStdDev = 2000; // 2 seconds
    return Math.max(0, 1 - (stdDev / maxStdDev));
  }

  private determineTrend(): 'improving' | 'stable' | 'degrading' {
    if (this.lapHistory.length < 5) return 'stable';

    const recent5 = this.lapHistory.slice(-5).map(l => l.lapTime);
    const first3Avg = (recent5[0] + recent5[1] + recent5[2]) / 3;
    const last2Avg = (recent5[3] + recent5[4]) / 2;

    const delta = last2Avg - first3Avg;

    if (delta < -500) return 'improving';
    if (delta > 500) return 'degrading';
    return 'stable';
  }

  // ============================================================================
  // SECTOR PREDICTIONS
  // ============================================================================

  getSectorPredictions(): SectorPrediction[] {
    const predictions: SectorPrediction[] = [];

    for (let sector = 1; sector <= 3; sector++) {
      const sectorTimes = this.sectorHistory.get(sector) || [];
      const bestTime = sectorTimes.length > 0 ? Math.min(...sectorTimes) : 0;
      const avgTime = sectorTimes.length > 0 
        ? sectorTimes.reduce((a, b) => a + b, 0) / sectorTimes.length 
        : 0;

      const currentSectorTime = this.currentLapSectors[sector - 1];
      let status: 'purple' | 'green' | 'yellow' | 'red' = 'yellow';
      let delta = 0;

      if (currentSectorTime) {
        delta = currentSectorTime - bestTime;
        if (delta < 0) status = 'purple';
        else if (delta < 200) status = 'green';
        else if (delta < 500) status = 'yellow';
        else status = 'red';
      }

      predictions.push({
        sector,
        predictedTime: avgTime,
        bestTime,
        delta,
        status,
      });
    }

    return predictions;
  }

  // ============================================================================
  // RACE PREDICTIONS
  // ============================================================================

  predictRaceOutcome(
    currentPosition: number,
    lapsRemaining: number,
    competitorGaps: number[],
    pitStopsRemaining: number
  ): RacePrediction {
    // Simplified race prediction
    const avgPace = this.lapHistory.length > 0
      ? this.lapHistory.slice(-5).reduce((a, l) => a + l.lapTime, 0) / Math.min(5, this.lapHistory.length)
      : 90000;

    // Estimate position changes based on pace differential
    let predictedFinish = currentPosition;
    
    // Factor in tire degradation over remaining laps
    const tireDegOverRace = lapsRemaining * this.tireDegradationRate * 1000;
    
    // Factor in pit stops
    const pitTimeTotal = pitStopsRemaining * 25000; // 25 seconds per stop

    // Calculate probabilities (simplified)
    const positionsFromTop = currentPosition - 1;
    const winProbability = Math.max(0, 1 - (positionsFromTop * 0.15));
    const podiumProbability = currentPosition <= 3 ? 0.8 : Math.max(0, 0.5 - (positionsFromTop - 3) * 0.1);
    const pointsFinishProbability = currentPosition <= 10 ? 0.9 : Math.max(0, 0.7 - (positionsFromTop - 10) * 0.05);

    return {
      currentPosition,
      predictedFinish,
      lapsRemaining,
      pitStopsRemaining,
      projectedGapToLeader: competitorGaps[0] || 0,
      projectedGapToNext: competitorGaps[currentPosition - 2] || 0,
      winProbability,
      podiumProbability,
      pointsFinishProbability,
    };
  }

  // ============================================================================
  // THEORETICAL BEST
  // ============================================================================

  getTheoreticalBest(): number {
    let theoretical = 0;

    for (let sector = 1; sector <= 3; sector++) {
      const sectorTimes = this.sectorHistory.get(sector) || [];
      if (sectorTimes.length > 0) {
        theoretical += Math.min(...sectorTimes);
      }
    }

    return theoretical;
  }

  getDeltaToTheoreticalBest(): number {
    const currentLapTime = this.currentLapSectors.reduce((a, b) => a + b, 0);
    const theoretical = this.getTheoreticalBest();
    
    if (theoretical === 0) return 0;
    
    // Extrapolate current lap
    const completedSectors = this.currentLapSectors.length;
    if (completedSectors === 0) return 0;

    let projectedTime = currentLapTime;
    for (let s = completedSectors + 1; s <= 3; s++) {
      const sectorTimes = this.sectorHistory.get(s) || [];
      if (sectorTimes.length > 0) {
        projectedTime += Math.min(...sectorTimes);
      }
    }

    return projectedTime - theoretical;
  }

  // ============================================================================
  // STATE
  // ============================================================================

  getState() {
    return {
      lapCount: this.lapHistory.length,
      baseLapTime: this.baseLapTime,
      theoreticalBest: this.getTheoreticalBest(),
      currentLapSectors: [...this.currentLapSectors],
      trend: this.determineTrend(),
      consistency: this.calculateConsistency(),
    };
  }

  reset(): void {
    this.lapHistory = [];
    this.sectorHistory.clear();
    this.currentLapSectors = [];
    this.lastSector = 0;
    this.baseLapTime = 0;
  }

  subscribe(listener: (prediction: LapPrediction) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(prediction: LapPrediction): void {
    this.listeners.forEach(l => l(prediction));
  }
}

export const PredictiveLapTime = new PredictiveLapTimeClass();
export default PredictiveLapTime;
