/**
 * Stint Simulation Engine
 * Simulates different race strategies before the race to find optimal approach
 */

// CompetitorData type available for future competitor simulation features

export interface TireModel {
  compound: 'soft' | 'medium' | 'hard' | 'intermediate' | 'wet';
  initialGrip: number; // 0-100
  degradationRate: number; // grip loss per lap
  optimalTemp: { min: number; max: number };
  warmupLaps: number;
  cliffLap: number; // Lap where performance drops significantly
}

export interface FuelModel {
  consumption: number; // liters per lap
  weightEffect: number; // seconds per 10kg of fuel
  tankCapacity: number;
}

export interface DriverModel {
  consistency: number; // 0-100, affects lap time variance
  tireManagement: number; // 0-100, affects degradation
  fuelEfficiency: number; // 0-100, affects consumption
  racecraft: number; // 0-100, affects overtaking success
}

export interface SimulationConfig {
  totalLaps: number;
  trackLength: number; // meters
  baseLapTime: number; // ms
  pitStopTime: number; // ms
  pitLaneDelta: number; // ms lost in pit lane vs track
  tireModels: TireModel[];
  fuelModel: FuelModel;
  driverModel: DriverModel;
  weatherForecast: Array<{ lap: number; condition: 'dry' | 'damp' | 'wet' }>;
  competitors: SimulatedCompetitor[];
}

export interface SimulatedCompetitor {
  name: string;
  startPosition: number;
  basePace: number; // ms, relative to player
  strategy: SimulatedStrategy;
  aggression: number; // 0-100
}

export interface SimulatedStrategy {
  stops: number;
  pitLaps: number[];
  compounds: TireModel['compound'][];
  startFuel: number;
}

export interface SimulationResult {
  strategy: SimulatedStrategy;
  finishPosition: number;
  totalTime: number;
  lapTimes: number[];
  tireWear: number[];
  fuelLevels: number[];
  pitStops: Array<{ lap: number; duration: number; compound: string }>;
  positionHistory: number[];
  overtakes: number;
  undercuts: number;
  overcuts: number;
  riskEvents: string[];
}

export interface StrategyComparison {
  strategies: SimulationResult[];
  recommended: SimulationResult;
  reasoning: string;
  riskAssessment: string;
}

class StintSimulatorClass {
  private config: SimulationConfig | null = null;
  private results: SimulationResult[] = [];

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  configure(config: SimulationConfig): void {
    this.config = config;
    this.results = [];
  }

  setDefaultConfig(totalLaps: number, baseLapTime: number): void {
    this.config = {
      totalLaps,
      trackLength: 5000,
      baseLapTime,
      pitStopTime: 23000,
      pitLaneDelta: 20000,
      tireModels: [
        { compound: 'soft', initialGrip: 100, degradationRate: 1.5, optimalTemp: { min: 85, max: 105 }, warmupLaps: 1, cliffLap: 20 },
        { compound: 'medium', initialGrip: 95, degradationRate: 0.8, optimalTemp: { min: 80, max: 100 }, warmupLaps: 2, cliffLap: 35 },
        { compound: 'hard', initialGrip: 88, degradationRate: 0.4, optimalTemp: { min: 75, max: 95 }, warmupLaps: 3, cliffLap: 50 },
        { compound: 'intermediate', initialGrip: 85, degradationRate: 0.6, optimalTemp: { min: 60, max: 80 }, warmupLaps: 1, cliffLap: 40 },
        { compound: 'wet', initialGrip: 75, degradationRate: 0.3, optimalTemp: { min: 50, max: 70 }, warmupLaps: 1, cliffLap: 60 },
      ],
      fuelModel: {
        consumption: 2.5,
        weightEffect: 300, // 0.3s per 10kg
        tankCapacity: 110,
      },
      driverModel: {
        consistency: 80,
        tireManagement: 70,
        fuelEfficiency: 75,
        racecraft: 70,
      },
      weatherForecast: [],
      competitors: [],
    };
  }

  // ============================================================================
  // STRATEGY GENERATION
  // ============================================================================

  generateStrategies(): SimulatedStrategy[] {
    if (!this.config) return [];

    const strategies: SimulatedStrategy[] = [];
    const { totalLaps, fuelModel } = this.config;

    // Calculate max stint length based on fuel
    
    // 1-stop strategies
    const oneStopLap = Math.floor(totalLaps / 2);
    strategies.push({
      stops: 1,
      pitLaps: [oneStopLap],
      compounds: ['medium', 'hard'],
      startFuel: Math.min(fuelModel.tankCapacity, (oneStopLap + 2) * fuelModel.consumption),
    });

    strategies.push({
      stops: 1,
      pitLaps: [oneStopLap - 5],
      compounds: ['soft', 'hard'],
      startFuel: Math.min(fuelModel.tankCapacity, (oneStopLap - 3) * fuelModel.consumption),
    });

    // 2-stop strategies
    const twoStopLap1 = Math.floor(totalLaps / 3);
    const twoStopLap2 = Math.floor(totalLaps * 2 / 3);
    strategies.push({
      stops: 2,
      pitLaps: [twoStopLap1, twoStopLap2],
      compounds: ['soft', 'medium', 'soft'],
      startFuel: Math.min(fuelModel.tankCapacity, (twoStopLap1 + 2) * fuelModel.consumption),
    });

    strategies.push({
      stops: 2,
      pitLaps: [twoStopLap1 + 3, twoStopLap2 + 3],
      compounds: ['medium', 'medium', 'soft'],
      startFuel: Math.min(fuelModel.tankCapacity, (twoStopLap1 + 5) * fuelModel.consumption),
    });

    // Aggressive 3-stop (if race is long enough)
    if (totalLaps > 50) {
      const threeStopInterval = Math.floor(totalLaps / 4);
      strategies.push({
        stops: 3,
        pitLaps: [threeStopInterval, threeStopInterval * 2, threeStopInterval * 3],
        compounds: ['soft', 'soft', 'soft', 'soft'],
        startFuel: Math.min(fuelModel.tankCapacity, (threeStopInterval + 2) * fuelModel.consumption),
      });
    }

    return strategies;
  }

  // ============================================================================
  // SIMULATION
  // ============================================================================

  simulateStrategy(strategy: SimulatedStrategy): SimulationResult {
    if (!this.config) {
      throw new Error('Simulator not configured');
    }

    const { totalLaps, baseLapTime, pitStopTime, pitLaneDelta, tireModels, fuelModel, driverModel } = this.config;

    const lapTimes: number[] = [];
    const tireWear: number[] = [];
    const fuelLevels: number[] = [];
    const positionHistory: number[] = [];
    const pitStops: SimulationResult['pitStops'] = [];
    const riskEvents: string[] = [];

    let currentFuel = strategy.startFuel;
    let currentTireAge = 0;
    let currentCompoundIndex = 0;
    let currentPosition = 10; // Start position (would come from qualifying)
    let totalTime = 0;
    let overtakes = 0;
    let undercuts = 0;
    let overcuts = 0;

    for (let lap = 1; lap <= totalLaps; lap++) {
      // Check for pit stop
      if (strategy.pitLaps.includes(lap)) {
        const pitDuration = pitStopTime + pitLaneDelta;
        totalTime += pitDuration;
        pitStops.push({
          lap,
          duration: pitDuration,
          compound: strategy.compounds[currentCompoundIndex + 1] || strategy.compounds[currentCompoundIndex],
        });
        
        // Refuel
        const nextPitLap = strategy.pitLaps.find(p => p > lap) || totalLaps;
        const lapsUntilNextPit = nextPitLap - lap;
        currentFuel = Math.min(fuelModel.tankCapacity, (lapsUntilNextPit + 2) * fuelModel.consumption);
        
        // New tires
        currentTireAge = 0;
        currentCompoundIndex++;
      }

      // Get current tire model
      const compound = strategy.compounds[Math.min(currentCompoundIndex, strategy.compounds.length - 1)];
      const tireModel = tireModels.find(t => t.compound === compound) || tireModels[1];

      // Calculate lap time
      let lapTime = baseLapTime;

      // Tire degradation effect
      const tireGrip = Math.max(60, tireModel.initialGrip - (currentTireAge * tireModel.degradationRate * (100 - driverModel.tireManagement) / 100));
      const tireDelta = (100 - tireGrip) * 20; // 20ms per grip point lost
      lapTime += tireDelta;

      // Tire warmup effect
      if (currentTireAge < tireModel.warmupLaps) {
        lapTime += (tireModel.warmupLaps - currentTireAge) * 500; // 0.5s per warmup lap needed
      }

      // Tire cliff
      if (currentTireAge > tireModel.cliffLap) {
        lapTime += (currentTireAge - tireModel.cliffLap) * 200; // 0.2s per lap over cliff
        riskEvents.push(`Lap ${lap}: Tires past cliff point`);
      }

      // Fuel weight effect
      const fuelWeight = currentFuel * 0.75; // kg per liter
      lapTime += (fuelWeight / 10) * fuelModel.weightEffect;

      // Driver consistency variance
      const variance = (100 - driverModel.consistency) * 10;
      lapTime += (Math.random() - 0.5) * variance;

      // Weather effect
      const weather = this.config.weatherForecast.find(w => w.lap === lap);
      if (weather) {
        if (weather.condition === 'wet' && !['intermediate', 'wet'].includes(compound)) {
          lapTime += 10000; // 10s penalty on wrong tires
          riskEvents.push(`Lap ${lap}: Wrong tires for wet conditions`);
        }
        if (weather.condition === 'damp' && compound === 'soft') {
          lapTime += 3000;
        }
      }

      // Record data
      lapTimes.push(lapTime);
      tireWear.push(100 - tireGrip);
      fuelLevels.push(currentFuel);
      totalTime += lapTime;

      // Simulate position changes
      const positionChange = this.simulatePositionChange(lap, lapTime, currentPosition, driverModel);
      currentPosition = Math.max(1, Math.min(20, currentPosition + positionChange));
      positionHistory.push(currentPosition);

      if (positionChange < 0) overtakes++;

      // Update state for next lap
      currentTireAge++;
      currentFuel -= fuelModel.consumption * (100 - driverModel.fuelEfficiency) / 100;

      // Check for fuel running out
      if (currentFuel < 0) {
        riskEvents.push(`Lap ${lap}: Ran out of fuel!`);
        currentFuel = 0;
        lapTime += 60000; // DNF essentially
      }
    }

    const result: SimulationResult = {
      strategy,
      finishPosition: currentPosition,
      totalTime,
      lapTimes,
      tireWear,
      fuelLevels,
      pitStops,
      positionHistory,
      overtakes,
      undercuts,
      overcuts,
      riskEvents,
    };

    this.results.push(result);
    return result;
  }

  private simulatePositionChange(_lap: number, lapTime: number, currentPosition: number, driverModel: DriverModel): number {
    if (!this.config) return 0;

    // Simplified position simulation
    // In reality would compare to competitor lap times
    const avgLapTime = this.config.baseLapTime + 1000; // Assume field average is 1s slower
    const delta = avgLapTime - lapTime;

    // Faster lap = chance to gain position
    if (delta > 500 && currentPosition > 1) {
      const overtakeChance = (driverModel.racecraft / 100) * (delta / 1000);
      if (Math.random() < overtakeChance) {
        return -1; // Gained a position
      }
    }

    // Slower lap = chance to lose position
    if (delta < -500 && currentPosition < 20) {
      const defendChance = driverModel.racecraft / 100;
      if (Math.random() > defendChance) {
        return 1; // Lost a position
      }
    }

    return 0;
  }

  // ============================================================================
  // COMPARISON
  // ============================================================================

  compareStrategies(): StrategyComparison {
    if (this.results.length === 0) {
      // Generate and simulate default strategies
      const strategies = this.generateStrategies();
      for (const strategy of strategies) {
        this.simulateStrategy(strategy);
      }
    }

    // Sort by finish position, then total time
    const sorted = [...this.results].sort((a, b) => {
      if (a.finishPosition !== b.finishPosition) {
        return a.finishPosition - b.finishPosition;
      }
      return a.totalTime - b.totalTime;
    });

    const recommended = sorted[0];

    // Generate reasoning
    let reasoning = '';
    if (recommended.strategy.stops === 1) {
      reasoning = 'One-stop strategy minimizes time in pit lane. ';
    } else if (recommended.strategy.stops === 2) {
      reasoning = 'Two-stop strategy balances fresh tire pace with pit time. ';
    } else {
      reasoning = 'Aggressive multi-stop maximizes tire performance. ';
    }

    reasoning += `Projected finish: P${recommended.finishPosition}. `;
    reasoning += `${recommended.overtakes} overtakes expected.`;

    // Risk assessment
    let riskAssessment = 'Low risk';
    if (recommended.riskEvents.length > 0) {
      riskAssessment = `Medium risk: ${recommended.riskEvents.length} potential issues`;
    }
    if (recommended.riskEvents.some(e => e.includes('fuel') || e.includes('cliff'))) {
      riskAssessment = 'High risk: Critical issues possible';
    }

    return {
      strategies: this.results,
      recommended,
      reasoning,
      riskAssessment,
    };
  }

  // ============================================================================
  // WHAT-IF ANALYSIS
  // ============================================================================

  simulateScenario(scenario: {
    safetyCarLap?: number;
    rainStartLap?: number;
    rainEndLap?: number;
    competitorPitLap?: number;
  }): SimulationResult[] {
    if (!this.config) return [];

    // Modify config for scenario
    const modifiedConfig = { ...this.config };

    if (scenario.rainStartLap) {
      modifiedConfig.weatherForecast = [
        ...modifiedConfig.weatherForecast,
        { lap: scenario.rainStartLap, condition: 'wet' as const },
      ];
      if (scenario.rainEndLap) {
        modifiedConfig.weatherForecast.push({ lap: scenario.rainEndLap, condition: 'dry' as const });
      }
    }

    // Re-simulate with modified config
    const originalConfig = this.config;
    this.config = modifiedConfig;
    this.results = [];

    const strategies = this.generateStrategies();
    
    // Add wet strategies if rain expected
    if (scenario.rainStartLap) {
      strategies.push({
        stops: 2,
        pitLaps: [scenario.rainStartLap - 1, scenario.rainEndLap || scenario.rainStartLap + 10],
        compounds: ['medium', 'intermediate', 'soft'],
        startFuel: this.config.fuelModel.tankCapacity * 0.5,
      });
    }

    for (const strategy of strategies) {
      this.simulateStrategy(strategy);
    }

    this.config = originalConfig;
    return this.results;
  }

  // ============================================================================
  // COMPETITOR SIMULATION
  // ============================================================================

  simulateWithCompetitors(competitors: SimulatedCompetitor[]): Map<string, SimulationResult> {
    const results = new Map<string, SimulationResult>();

    // Simulate player
    const playerStrategies = this.generateStrategies();
    const playerResult = this.simulateStrategy(playerStrategies[0]);
    results.set('Player', playerResult);

    // Simulate each competitor
    for (const comp of competitors) {
      const compResult = this.simulateStrategy(comp.strategy);
      // Adjust for pace difference
      compResult.totalTime += comp.basePace * this.config!.totalLaps;
      results.set(comp.name, compResult);
    }

    return results;
  }

  // ============================================================================
  // STATE
  // ============================================================================

  getResults(): SimulationResult[] {
    return [...this.results];
  }

  clearResults(): void {
    this.results = [];
  }

  getConfig(): SimulationConfig | null {
    return this.config;
  }
}

export const StintSimulator = new StintSimulatorClass();
export default StintSimulator;
