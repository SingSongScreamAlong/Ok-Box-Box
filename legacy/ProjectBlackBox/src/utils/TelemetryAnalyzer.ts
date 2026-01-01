import { TelemetryData } from '../models/TelemetryData';

/**
 * Utility class for analyzing telemetry data
 * This class provides methods to analyze telemetry data and generate insights
 * that can be used for race strategy and driver coaching
 */
export class TelemetryAnalyzer {
  // Store historical data for analysis
  private static historyBuffer: TelemetryData[] = [];
  private static maxHistorySize: number = 1000; // Store up to 1000 data points
  
  /**
   * Add telemetry data to the history buffer
   * @param data Telemetry data to add
   */
  public static addToHistory(data: TelemetryData): void {
    if (!data) return;
    
    this.historyBuffer.push(data);
    
    // Keep the buffer size under control
    if (this.historyBuffer.length > this.maxHistorySize) {
      this.historyBuffer.shift(); // Remove oldest data point
    }
  }
  
  /**
   * Clear the history buffer
   */
  public static clearHistory(): void {
    this.historyBuffer = [];
  }
  
  /**
   * Get the history buffer
   * @returns Array of historical telemetry data
   */
  public static getHistory(): TelemetryData[] {
    return this.historyBuffer;
  }
  
  /**
   * Calculate fuel usage statistics
   * @returns Object with fuel usage statistics
   */
  public static calculateFuelUsage(): any {
    if (this.historyBuffer.length < 2) {
      return {
        averagePerLap: 0,
        averagePerMinute: 0,
        estimatedLapsRemaining: 0,
        estimatedTimeRemaining: 0,
        consistency: 0
      };
    }
    
    // Group data by lap
    const lapData: { [lap: number]: TelemetryData[] } = {};
    
    for (const data of this.historyBuffer) {
      if (!lapData[data.lap]) {
        lapData[data.lap] = [];
      }
      lapData[data.lap].push(data);
    }
    
    // Calculate fuel usage per lap
    const fuelUsagePerLap: number[] = [];
    const laps = Object.keys(lapData).map(Number).sort((a, b) => a - b);
    
    for (let i = 1; i < laps.length; i++) {
      const currentLap = laps[i];
      const previousLap = laps[i - 1];
      
      const currentLapStart = lapData[currentLap][0];
      const previousLapStart = lapData[previousLap][0];
      
      if (currentLapStart && previousLapStart) {
        const fuelUsage = previousLapStart.fuel.level - currentLapStart.fuel.level;
        if (fuelUsage > 0) {
          fuelUsagePerLap.push(fuelUsage);
        }
      }
    }
    
    // Calculate statistics
    if (fuelUsagePerLap.length === 0) {
      return {
        averagePerLap: 0,
        averagePerMinute: 0,
        estimatedLapsRemaining: 0,
        estimatedTimeRemaining: 0,
        consistency: 0
      };
    }
    
    const averagePerLap = fuelUsagePerLap.reduce((sum, usage) => sum + usage, 0) / fuelUsagePerLap.length;
    
    // Calculate average lap time
    const lapTimes: number[] = [];
    for (let i = 1; i < laps.length; i++) {
      const currentLap = laps[i];
      const previousLap = laps[i - 1];
      
      const currentLapStart = lapData[currentLap][0];
      const previousLapStart = lapData[previousLap][0];
      
      if (currentLapStart && previousLapStart) {
        const lapTime = (currentLapStart.timestamp - previousLapStart.timestamp) / 1000; // Convert to seconds
        if (lapTime > 0 && lapTime < 300) { // Ignore unreasonable lap times (> 5 minutes)
          lapTimes.push(lapTime);
        }
      }
    }
    
    const averageLapTime = lapTimes.length > 0 ? 
      lapTimes.reduce((sum, time) => sum + time, 0) / lapTimes.length : 
      60; // Default to 60 seconds if no lap times available
    
    const averagePerMinute = averagePerLap / (averageLapTime / 60);
    
    // Calculate consistency (standard deviation as a percentage of the mean)
    const mean = averagePerLap;
    const squaredDiffs = fuelUsagePerLap.map(usage => Math.pow(usage - mean, 2));
    const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / fuelUsagePerLap.length;
    const stdDev = Math.sqrt(variance);
    const consistency = 100 - (stdDev / mean * 100); // Higher is more consistent
    
    // Get current fuel level from most recent data point
    const currentFuelLevel = this.historyBuffer[this.historyBuffer.length - 1]?.fuel.level || 0;
    
    // Calculate estimates
    const estimatedLapsRemaining = averagePerLap > 0 ? currentFuelLevel / averagePerLap : 0;
    const estimatedTimeRemaining = estimatedLapsRemaining * averageLapTime;
    
    return {
      averagePerLap,
      averagePerMinute,
      estimatedLapsRemaining,
      estimatedTimeRemaining,
      consistency,
      fuelLevel: currentFuelLevel,
      usageHistory: fuelUsagePerLap
    };
  }
  
  /**
   * Calculate tire wear statistics
   * @returns Object with tire wear statistics
   */
  public static calculateTireWear(): any {
    if (this.historyBuffer.length < 2) {
      return {
        wearRates: {
          frontLeft: 0,
          frontRight: 0,
          rearLeft: 0,
          rearRight: 0
        },
        estimatedLapsRemaining: {
          frontLeft: 0,
          frontRight: 0,
          rearLeft: 0,
          rearRight: 0
        },
        balance: {
          front: 0,
          rear: 0,
          diagonal: 0
        }
      };
    }
    
    // Group data by lap
    const lapData: { [lap: number]: TelemetryData[] } = {};
    
    for (const data of this.historyBuffer) {
      if (!lapData[data.lap]) {
        lapData[data.lap] = [];
      }
      lapData[data.lap].push(data);
    }
    
    // Calculate wear rates per lap
    const wearRatesPerLap: {
      frontLeft: number[];
      frontRight: number[];
      rearLeft: number[];
      rearRight: number[];
    } = {
      frontLeft: [],
      frontRight: [],
      rearLeft: [],
      rearRight: []
    };
    
    const laps = Object.keys(lapData).map(Number).sort((a, b) => a - b);
    
    for (let i = 1; i < laps.length; i++) {
      const currentLap = laps[i];
      const previousLap = laps[i - 1];
      
      const currentLapStart = lapData[currentLap][0];
      const previousLapStart = lapData[previousLap][0];
      
      if (currentLapStart?.tires && previousLapStart?.tires) {
        const flWear = currentLapStart.tires.frontLeft.wear - previousLapStart.tires.frontLeft.wear;
        const frWear = currentLapStart.tires.frontRight.wear - previousLapStart.tires.frontRight.wear;
        const rlWear = currentLapStart.tires.rearLeft.wear - previousLapStart.tires.rearLeft.wear;
        const rrWear = currentLapStart.tires.rearRight.wear - previousLapStart.tires.rearRight.wear;
        
        if (flWear > 0) wearRatesPerLap.frontLeft.push(flWear);
        if (frWear > 0) wearRatesPerLap.frontRight.push(frWear);
        if (rlWear > 0) wearRatesPerLap.rearLeft.push(rlWear);
        if (rrWear > 0) wearRatesPerLap.rearRight.push(rrWear);
      }
    }
    
    // Calculate average wear rates
    const calculateAverage = (arr: number[]): number => {
      return arr.length > 0 ? arr.reduce((sum, val) => sum + val, 0) / arr.length : 0;
    };
    
    const averageWearRates = {
      frontLeft: calculateAverage(wearRatesPerLap.frontLeft),
      frontRight: calculateAverage(wearRatesPerLap.frontRight),
      rearLeft: calculateAverage(wearRatesPerLap.rearLeft),
      rearRight: calculateAverage(wearRatesPerLap.rearRight)
    };
    
    // Get current tire wear from most recent data point
    const currentData = this.historyBuffer[this.historyBuffer.length - 1];
    const currentWear = currentData?.tires ? {
      frontLeft: currentData.tires.frontLeft.wear,
      frontRight: currentData.tires.frontRight.wear,
      rearLeft: currentData.tires.rearLeft.wear,
      rearRight: currentData.tires.rearRight.wear
    } : {
      frontLeft: 0,
      frontRight: 0,
      rearLeft: 0,
      rearRight: 0
    };
    
    // Calculate estimated laps remaining
    const maxWear = 1.0; // 100% wear
    const safetyMargin = 0.05; // 5% safety margin
    const maxUsableWear = maxWear - safetyMargin;
    
    const estimatedLapsRemaining = {
      frontLeft: averageWearRates.frontLeft > 0 ? (maxUsableWear - currentWear.frontLeft) / averageWearRates.frontLeft : 0,
      frontRight: averageWearRates.frontRight > 0 ? (maxUsableWear - currentWear.frontRight) / averageWearRates.frontRight : 0,
      rearLeft: averageWearRates.rearLeft > 0 ? (maxUsableWear - currentWear.rearLeft) / averageWearRates.rearLeft : 0,
      rearRight: averageWearRates.rearRight > 0 ? (maxUsableWear - currentWear.rearRight) / averageWearRates.rearRight : 0
    };
    
    // Calculate tire balance
    const frontAvg = (currentWear.frontLeft + currentWear.frontRight) / 2;
    const rearAvg = (currentWear.rearLeft + currentWear.rearRight) / 2;
    const leftAvg = (currentWear.frontLeft + currentWear.rearLeft) / 2;
    const rightAvg = (currentWear.frontRight + currentWear.rearRight) / 2;
    
    const balance = {
      front: frontAvg > 0 ? (currentWear.frontLeft - currentWear.frontRight) / frontAvg : 0, // Positive = more wear on left
      rear: rearAvg > 0 ? (currentWear.rearLeft - currentWear.rearRight) / rearAvg : 0,
      frontToRear: (frontAvg - rearAvg) / ((frontAvg + rearAvg) / 2), // Positive = more wear on front
      leftToRight: (leftAvg - rightAvg) / ((leftAvg + rightAvg) / 2) // Positive = more wear on left
    };
    
    return {
      wearRates: averageWearRates,
      currentWear,
      estimatedLapsRemaining,
      balance,
      lowestRemainingLaps: Math.min(
        estimatedLapsRemaining.frontLeft,
        estimatedLapsRemaining.frontRight,
        estimatedLapsRemaining.rearLeft,
        estimatedLapsRemaining.rearRight
      )
    };
  }
  
  /**
   * Calculate driver performance metrics
   * @returns Object with driver performance metrics
   */
  public static calculateDriverPerformance(): any {
    if (this.historyBuffer.length < 10) {
      return {
        consistency: 0,
        aggression: 0,
        smoothness: 0,
        precision: 0,
        fuelEfficiency: 0,
        tireManagement: 0,
        overallScore: 0
      };
    }
    
    // Calculate lap time consistency
    const lapTimes: { [lap: number]: number } = {};
    
    for (const data of this.historyBuffer) {
      if (data.lap > 0 && data.lapTime > 0) {
        lapTimes[data.lap] = data.lapTime;
      }
    }
    
    const lapTimeValues = Object.values(lapTimes);
    
    if (lapTimeValues.length < 2) {
      return {
        consistency: 0,
        aggression: 0,
        smoothness: 0,
        precision: 0,
        fuelEfficiency: 0,
        tireManagement: 0,
        overallScore: 0
      };
    }
    
    // Calculate lap time consistency (inverse of standard deviation as a percentage of the mean)
    const mean = lapTimeValues.reduce((sum, time) => sum + time, 0) / lapTimeValues.length;
    const squaredDiffs = lapTimeValues.map(time => Math.pow(time - mean, 2));
    const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / lapTimeValues.length;
    const stdDev = Math.sqrt(variance);
    const consistency = Math.max(0, Math.min(100, 100 - (stdDev / mean * 100))); // Higher is more consistent
    
    // Calculate aggression based on brake and throttle application
    let aggressionSum = 0;
    let aggressionCount = 0;
    
    for (let i = 1; i < this.historyBuffer.length; i++) {
      const current = this.historyBuffer[i];
      const previous = this.historyBuffer[i - 1];
      
      if (current && previous) {
        // Calculate rate of change for throttle and brake
        const throttleDelta = Math.abs(current.throttle - previous.throttle);
        const brakeDelta = Math.abs(current.brake - previous.brake);
        
        // Higher deltas indicate more aggressive driving
        aggressionSum += (throttleDelta + brakeDelta);
        aggressionCount++;
      }
    }
    
    // Normalize aggression to 0-100 scale
    const rawAggression = aggressionCount > 0 ? aggressionSum / aggressionCount : 0;
    const aggression = Math.min(100, rawAggression * 500); // Scale factor determined empirically
    
    // Calculate smoothness based on steering inputs
    let smoothnessSum = 0;
    let smoothnessCount = 0;
    
    for (let i = 1; i < this.historyBuffer.length; i++) {
      const current = this.historyBuffer[i];
      const previous = this.historyBuffer[i - 1];
      
      if (current && previous) {
        // Calculate rate of change for steering
        const steeringDelta = Math.abs(current.steering - previous.steering);
        
        // Lower deltas indicate smoother driving
        smoothnessSum += steeringDelta;
        smoothnessCount++;
      }
    }
    
    // Normalize smoothness to 0-100 scale (inverse of steering deltas)
    const rawSmoothness = smoothnessCount > 0 ? smoothnessSum / smoothnessCount : 0;
    const smoothness = Math.max(0, 100 - (rawSmoothness * 500)); // Scale factor determined empirically
    
    // Calculate precision based on racing line consistency
    // This is a simplified approximation using track position consistency
    const trackPositions: number[] = [];
    const sectors: { [sector: number]: number[] } = { 1: [], 2: [], 3: [] };
    
    for (const data of this.historyBuffer) {
      if (data.trackPosition >= 0 && data.trackPosition <= 1) {
        trackPositions.push(data.trackPosition);
        
        if (data.sector > 0 && data.sector <= 3) {
          if (!sectors[data.sector]) {
            sectors[data.sector] = [];
          }
          sectors[data.sector].push(data.trackPosition);
        }
      }
    }
    
    // Calculate precision as consistency of track position within each sector
    let precisionSum = 0;
    let precisionCount = 0;
    
    for (const sectorPositions of Object.values(sectors)) {
      if (sectorPositions.length > 1) {
        const sectorMean = sectorPositions.reduce((sum, pos) => sum + pos, 0) / sectorPositions.length;
        const sectorSquaredDiffs = sectorPositions.map(pos => Math.pow(pos - sectorMean, 2));
        const sectorVariance = sectorSquaredDiffs.reduce((sum, diff) => sum + diff, 0) / sectorPositions.length;
        const sectorStdDev = Math.sqrt(sectorVariance);
        
        // Lower standard deviation indicates higher precision
        precisionSum += (1 - sectorStdDev);
        precisionCount++;
      }
    }
    
    // Normalize precision to 0-100 scale
    const precision = precisionCount > 0 ? 
      Math.min(100, (precisionSum / precisionCount) * 100) : 
      0;
    
    // Calculate fuel efficiency
    const fuelUsage = this.calculateFuelUsage();
    const fuelEfficiency = fuelUsage.consistency;
    
    // Calculate tire management
    const tireWear = this.calculateTireWear();
    const tireWearRates = Object.values(tireWear.wearRates) as number[];
    const avgTireWearRate = tireWearRates.reduce((sum: number, rate: number) => sum + rate, 0) / tireWearRates.length;
    
    // Lower wear rate is better, normalize to 0-100 scale
    // Assuming a "good" wear rate is 0.01 per lap and "bad" is 0.05 per lap
    const tireManagement = Math.max(0, 100 - (avgTireWearRate * 2000)); // Scale factor determined empirically
    
    // Calculate overall score as weighted average of all metrics
    const overallScore = (
      consistency * 0.25 +
      smoothness * 0.2 +
      precision * 0.2 +
      fuelEfficiency * 0.15 +
      tireManagement * 0.2
    );
    
    return {
      consistency,
      aggression,
      smoothness,
      precision,
      fuelEfficiency,
      tireManagement,
      overallScore,
      lapTimes: lapTimeValues
    };
  }
  
  /**
   * Generate race strategy recommendations
   * @param remainingLaps Number of laps remaining in the race
   * @param remainingTime Time remaining in the race (seconds)
   * @returns Object with race strategy recommendations
   */
  public static generateStrategyRecommendations(remainingLaps: number, remainingTime: number): any {
    const fuelAnalysis = this.calculateFuelUsage();
    const tireAnalysis = this.calculateTireWear();
    const driverAnalysis = this.calculateDriverPerformance();
    
    // Get lap times from driver analysis
    const lapTimeValues = driverAnalysis.lapTimes || [];
    
    // Calculate if we need to pit for fuel
    const fuelRemaining = fuelAnalysis.fuelLevel;
    const fuelNeeded = fuelAnalysis.averagePerLap * remainingLaps;
    const needFuelStop = fuelNeeded > fuelRemaining;
    
    // Calculate if we need to pit for tires
    const tireLifeRemaining = tireAnalysis.lowestRemainingLaps;
    const needTireStop = tireLifeRemaining < remainingLaps;
    
    // Calculate optimal pit stop lap
    let optimalPitLap = 0;
    
    if (needFuelStop || needTireStop) {
      if (needFuelStop && !needTireStop) {
        // Pit when we're almost out of fuel
        optimalPitLap = Math.floor(fuelAnalysis.estimatedLapsRemaining * 0.9);
      } else if (!needFuelStop && needTireStop) {
        // Pit when tires are almost worn out
        optimalPitLap = Math.floor(tireAnalysis.lowestRemainingLaps * 0.9);
      } else {
        // Need both fuel and tires, pit at the earlier of the two
        optimalPitLap = Math.floor(Math.min(
          fuelAnalysis.estimatedLapsRemaining * 0.9,
          tireAnalysis.lowestRemainingLaps * 0.9
        ));
      }
    }
    
    // Adjust pit strategy based on driver performance
    let driverAdvice = '';
    
    if (driverAnalysis.tireManagement < 50) {
      driverAdvice += 'Consider smoother inputs to extend tire life. ';
      // If tire management is poor, pit earlier
      if (needTireStop) {
        optimalPitLap = Math.floor(optimalPitLap * 0.9);
      }
    }
    
    if (driverAnalysis.fuelEfficiency < 50) {
      driverAdvice += 'Work on consistent throttle application to improve fuel economy. ';
      // If fuel efficiency is poor, pit earlier
      if (needFuelStop) {
        optimalPitLap = Math.floor(optimalPitLap * 0.9);
      }
    }
    
    if (driverAnalysis.consistency < 50) {
      driverAdvice += 'Focus on consistent lap times for better race pace. ';
    }
    
    // Generate final recommendations
    return {
      needFuelStop,
      needTireStop,
      optimalPitLap,
      fuelToAdd: needFuelStop ? (fuelNeeded - fuelRemaining) * 1.1 : 0, // Add 10% safety margin
      changeTires: needTireStop,
      driverAdvice,
      estimatedFinishTime: remainingLaps * (lapTimeValues.length > 0 ? 
        lapTimeValues.reduce((sum: number, time: number) => sum + time, 0) / lapTimeValues.length : 
        60), // Default to 60 seconds if no lap times available
      fuelAnalysis,
      tireAnalysis,
      driverAnalysis
    };
  }
}
