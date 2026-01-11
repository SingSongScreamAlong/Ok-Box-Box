/**
 * Optimal Pit Window Calculator
 * Calculates undercut/overcut opportunities, optimal pit timing, and strategy scenarios
 */

import type { TelemetryData, CompetitorData } from '../types';

export interface PitWindow {
  optimalLap: number;
  windowStart: number;
  windowEnd: number;
  confidence: number;
  reason: string;
}

export interface UndercutAnalysis {
  target: string; // Driver name
  gap: number;
  undercutPotential: number; // seconds gained
  optimalLap: number;
  successProbability: number;
  risks: string[];
}

export interface OvercutAnalysis {
  target: string;
  gap: number;
  overcutPotential: number;
  optimalLap: number;
  successProbability: number;
  conditions: string[]; // What needs to happen for overcut to work
}

export interface PitStrategy {
  stops: number;
  pitLaps: number[];
  tireCompounds: string[];
  estimatedTime: number;
  positionDelta: number; // Expected position change
  riskLevel: 'low' | 'medium' | 'high';
}

export interface StrategyComparison {
  strategies: PitStrategy[];
  recommended: number; // Index of recommended strategy
  reasoning: string;
}

export interface TrafficAnalysis {
  willExitInTraffic: boolean;
  carsAhead: string[];
  estimatedTimeLoss: number;
  alternativeLap?: number;
}

interface CompetitorPitData {
  driver: string;
  hasPitted: boolean;
  pitLap?: number;
  tireAge: number;
  estimatedPitLap?: number;
}

class PitWindowCalculatorClass {
  private currentLap = 0;
  private totalLaps = 0;
  private pitStopTime = 23; // seconds for pit stop
  private tireLifeMax = 30; // laps before significant degradation
  private fuelPerLap = 2.5;
  private maxFuel = 110;
  
  private competitorData: CompetitorPitData[] = [];
  private ownPitStops: number[] = [];
  private currentTireAge = 0;
  private currentFuel = 0;

  private listeners: Set<(window: PitWindow) => void> = new Set();

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  initialize(config: {
    totalLaps: number;
    pitStopTime: number;
    tireLifeMax: number;
    fuelPerLap: number;
    maxFuel: number;
    startFuel: number;
  }): void {
    this.totalLaps = config.totalLaps;
    this.pitStopTime = config.pitStopTime;
    this.tireLifeMax = config.tireLifeMax;
    this.fuelPerLap = config.fuelPerLap;
    this.maxFuel = config.maxFuel;
    this.currentFuel = config.startFuel;
    this.currentLap = 0;
    this.currentTireAge = 0;
    this.ownPitStops = [];
    this.competitorData = [];
  }

  // ============================================================================
  // UPDATES
  // ============================================================================

  update(telemetry: TelemetryData, competitors: CompetitorData[]): PitWindow {
    this.currentLap = telemetry.lap;
    this.currentFuel = telemetry.fuel;

    // Update competitor pit data
    this.updateCompetitorData(competitors);

    // Calculate optimal pit window
    const window = this.calculateOptimalWindow();
    
    this.notifyListeners(window);
    return window;
  }

  recordPitStop(lap: number): void {
    this.ownPitStops.push(lap);
    this.currentTireAge = 0;
  }

  private updateCompetitorData(competitors: CompetitorData[]): void {
    for (const comp of competitors) {
      const existing = this.competitorData.find(c => c.driver === comp.driver);
      
      if (existing) {
        // Check if they pitted (large gap change or pit road flag)
        if (comp.onPitRoad && !existing.hasPitted) {
          existing.hasPitted = true;
          existing.pitLap = this.currentLap;
          existing.tireAge = 0;
        } else {
          existing.tireAge++;
        }
      } else {
        this.competitorData.push({
          driver: comp.driver,
          hasPitted: false,
          tireAge: this.currentLap, // Assume started on lap 1
        });
      }
    }
  }

  // ============================================================================
  // PIT WINDOW CALCULATION
  // ============================================================================

  private calculateOptimalWindow(): PitWindow {
    const lapsRemaining = this.totalLaps - this.currentLap;
    const fuelLapsRemaining = this.currentFuel / this.fuelPerLap;
    const tireLapsRemaining = this.tireLifeMax - this.currentTireAge;

    // Determine limiting factor
    let limitingFactor = 'tire';
    let lapsUntilPit = tireLapsRemaining;

    if (fuelLapsRemaining < tireLapsRemaining) {
      limitingFactor = 'fuel';
      lapsUntilPit = fuelLapsRemaining;
    }

    // Check if we can make it to the end
    const canFinishWithoutStop = lapsRemaining <= Math.min(fuelLapsRemaining, tireLapsRemaining);

    if (canFinishWithoutStop) {
      return {
        optimalLap: -1, // No pit needed
        windowStart: -1,
        windowEnd: -1,
        confidence: 0.95,
        reason: 'Can finish without additional pit stop',
      };
    }

    // Calculate optimal pit lap
    let optimalLap = this.currentLap + Math.floor(lapsUntilPit * 0.85); // Pit at 85% of tire/fuel life

    // Adjust for strategy (undercut/overcut opportunities)
    const undercutOpportunity = this.findUndercutOpportunity();
    if (undercutOpportunity && undercutOpportunity.successProbability > 0.6) {
      optimalLap = undercutOpportunity.optimalLap;
    }

    // Adjust for traffic
    const trafficAnalysis = this.analyzeTraffic(optimalLap);
    if (trafficAnalysis.willExitInTraffic && trafficAnalysis.alternativeLap) {
      optimalLap = trafficAnalysis.alternativeLap;
    }

    // Window is +/- 3 laps from optimal
    const windowStart = Math.max(this.currentLap + 1, optimalLap - 3);
    const windowEnd = Math.min(this.totalLaps - 5, optimalLap + 3);

    return {
      optimalLap,
      windowStart,
      windowEnd,
      confidence: this.calculateConfidence(optimalLap),
      reason: `${limitingFactor === 'tire' ? 'Tire degradation' : 'Fuel'} limiting factor`,
    };
  }

  private calculateConfidence(optimalLap: number): number {
    // Higher confidence if we have more data
    let confidence = 0.5;
    
    // More laps completed = more data
    confidence += Math.min(0.2, this.currentLap * 0.02);
    
    // Competitor data helps
    const pittedCompetitors = this.competitorData.filter(c => c.hasPitted).length;
    confidence += Math.min(0.2, pittedCompetitors * 0.05);
    
    // Closer to optimal lap = higher confidence
    const lapsToOptimal = optimalLap - this.currentLap;
    if (lapsToOptimal < 5) confidence += 0.1;

    return Math.min(0.95, confidence);
  }

  // ============================================================================
  // UNDERCUT/OVERCUT ANALYSIS
  // ============================================================================

  findUndercutOpportunity(): UndercutAnalysis | null {
    // Find car ahead that hasn't pitted
    const carAhead = this.competitorData.find(c => !c.hasPitted && c.tireAge > 15);
    
    if (!carAhead) return null;

    // Undercut works best when:
    // 1. Gap is small (< 3 seconds)
    // 2. Their tires are old
    // 3. Fresh tire advantage is significant

    const freshTireAdvantage = 1.5; // seconds per lap on fresh tires
    const pitLapDelta = 2; // Pit 2 laps before they're expected to

    const estimatedCompetitorPitLap = this.currentLap + (this.tireLifeMax - carAhead.tireAge);
    const undercutLap = estimatedCompetitorPitLap - pitLapDelta;

    // Calculate potential gain
    const lapsOnFreshTires = pitLapDelta;
    const undercutPotential = lapsOnFreshTires * freshTireAdvantage;

    // Success probability based on gap and tire age difference
    const successProbability = Math.min(0.9, 0.3 + (carAhead.tireAge / this.tireLifeMax) * 0.4);

    return {
      target: carAhead.driver,
      gap: 2, // Would come from actual gap data
      undercutPotential,
      optimalLap: undercutLap,
      successProbability,
      risks: [
        'Traffic on out-lap',
        'Competitor may respond immediately',
        'Fresh tire warm-up time',
      ],
    };
  }

  findOvercutOpportunity(): OvercutAnalysis | null {
    // Find car ahead that has pitted recently
    const recentlyPitted = this.competitorData.find(c => 
      c.hasPitted && 
      c.pitLap && 
      this.currentLap - c.pitLap < 5
    );

    if (!recentlyPitted) return null;

    // Overcut works when:
    // 1. Track is improving (more rubber)
    // 2. Your tires still have life
    // 3. You can put in fast laps while they're on cold tires

    const overcutPotential = 1.0; // seconds gained from track position
    const optimalLap = this.currentLap + 3; // Stay out 3 more laps

    return {
      target: recentlyPitted.driver,
      gap: 1,
      overcutPotential,
      optimalLap,
      successProbability: 0.5,
      conditions: [
        'Track grip improving',
        'Current tires still performing',
        'Clean air available',
      ],
    };
  }

  // ============================================================================
  // TRAFFIC ANALYSIS
  // ============================================================================

  analyzeTraffic(pitLap: number): TrafficAnalysis {
    // Estimate where we'll exit pit lane
    const pitExitPosition = this.estimatePitExitPosition(pitLap);

    // Find cars that will be near that position
    const carsNearby = this.competitorData.filter(c => {
      // Simplified - would need actual position data
      return !c.hasPitted && c.tireAge > 10;
    });

    const willExitInTraffic = carsNearby.length > 2;
    const timeLoss = carsNearby.length * 0.5; // 0.5s per car in traffic

    // Find alternative lap with less traffic
    let alternativeLap: number | undefined;
    if (willExitInTraffic) {
      // Try +/- 1-2 laps
      for (const delta of [1, -1, 2, -2]) {
        const altTraffic = this.analyzeTraffic(pitLap + delta);
        if (!altTraffic.willExitInTraffic) {
          alternativeLap = pitLap + delta;
          break;
        }
      }
    }

    return {
      willExitInTraffic,
      carsAhead: carsNearby.map(c => c.driver),
      estimatedTimeLoss: timeLoss,
      alternativeLap,
    };
  }

  private estimatePitExitPosition(pitLap: number): number {
    // Simplified calculation
    return this.currentLap / this.totalLaps;
  }

  // ============================================================================
  // STRATEGY COMPARISON
  // ============================================================================

  compareStrategies(): StrategyComparison {
    const strategies: PitStrategy[] = [];
    const lapsRemaining = this.totalLaps - this.currentLap;

    // 1-stop strategy
    if (lapsRemaining < this.tireLifeMax * 2) {
      const oneStop = this.calculateOneStopStrategy();
      if (oneStop) strategies.push(oneStop);
    }

    // 2-stop strategy
    const twoStop = this.calculateTwoStopStrategy();
    if (twoStop) strategies.push(twoStop);

    // 3-stop strategy (aggressive)
    if (lapsRemaining > 40) {
      const threeStop = this.calculateThreeStopStrategy();
      if (threeStop) strategies.push(threeStop);
    }

    // Determine recommended strategy
    let recommended = 0;
    let bestTime = Infinity;

    strategies.forEach((s, i) => {
      if (s.estimatedTime < bestTime) {
        bestTime = s.estimatedTime;
        recommended = i;
      }
    });

    return {
      strategies,
      recommended,
      reasoning: this.generateStrategyReasoning(strategies, recommended),
    };
  }

  private calculateOneStopStrategy(): PitStrategy | null {
    const lapsRemaining = this.totalLaps - this.currentLap;
    const halfwayLap = this.currentLap + Math.floor(lapsRemaining / 2);

    return {
      stops: 1,
      pitLaps: [halfwayLap],
      tireCompounds: ['medium', 'hard'],
      estimatedTime: this.estimateStrategyTime(1, [halfwayLap]),
      positionDelta: 0,
      riskLevel: 'low',
    };
  }

  private calculateTwoStopStrategy(): PitStrategy {
    const lapsRemaining = this.totalLaps - this.currentLap;
    const stint1 = Math.floor(lapsRemaining / 3);
    const stint2 = Math.floor(lapsRemaining * 2 / 3);

    return {
      stops: 2,
      pitLaps: [this.currentLap + stint1, this.currentLap + stint2],
      tireCompounds: ['soft', 'medium', 'medium'],
      estimatedTime: this.estimateStrategyTime(2, [this.currentLap + stint1, this.currentLap + stint2]),
      positionDelta: -1, // Likely lose a position with extra stop
      riskLevel: 'medium',
    };
  }

  private calculateThreeStopStrategy(): PitStrategy {
    const lapsRemaining = this.totalLaps - this.currentLap;
    const stintLength = Math.floor(lapsRemaining / 4);

    return {
      stops: 3,
      pitLaps: [
        this.currentLap + stintLength,
        this.currentLap + stintLength * 2,
        this.currentLap + stintLength * 3,
      ],
      tireCompounds: ['soft', 'soft', 'soft', 'soft'],
      estimatedTime: this.estimateStrategyTime(3, [
        this.currentLap + stintLength,
        this.currentLap + stintLength * 2,
        this.currentLap + stintLength * 3,
      ]),
      positionDelta: -2,
      riskLevel: 'high',
    };
  }

  private estimateStrategyTime(stops: number, pitLaps: number[]): number {
    // Base time + pit stop time + tire degradation
    const pitTime = stops * this.pitStopTime;
    const lapsRemaining = this.totalLaps - this.currentLap;
    
    // Estimate lap time degradation based on stint lengths
    let degradationTime = 0;
    let lastPitLap = this.currentLap;
    
    for (const pitLap of [...pitLaps, this.totalLaps]) {
      const stintLength = pitLap - lastPitLap;
      // Degradation increases quadratically with stint length
      degradationTime += Math.pow(stintLength / this.tireLifeMax, 2) * 10;
      lastPitLap = pitLap;
    }

    return lapsRemaining * 90 + pitTime + degradationTime; // 90s base lap time
  }

  private generateStrategyReasoning(strategies: PitStrategy[], recommended: number): string {
    const rec = strategies[recommended];
    
    if (rec.stops === 1) {
      return 'One-stop minimizes time in pit lane and is lowest risk';
    } else if (rec.stops === 2) {
      return 'Two-stop balances fresh tire pace with pit time loss';
    } else {
      return 'Three-stop maximizes tire performance but requires clean pit stops';
    }
  }

  // ============================================================================
  // STATE
  // ============================================================================

  getState() {
    return {
      currentLap: this.currentLap,
      totalLaps: this.totalLaps,
      currentTireAge: this.currentTireAge,
      currentFuel: this.currentFuel,
      pitStops: this.ownPitStops,
      competitorData: [...this.competitorData],
    };
  }

  subscribe(listener: (window: PitWindow) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(window: PitWindow): void {
    this.listeners.forEach(l => l(window));
  }

  reset(): void {
    this.currentLap = 0;
    this.currentTireAge = 0;
    this.currentFuel = 0;
    this.ownPitStops = [];
    this.competitorData = [];
  }
}

export const PitWindowCalculator = new PitWindowCalculatorClass();
export default PitWindowCalculator;
