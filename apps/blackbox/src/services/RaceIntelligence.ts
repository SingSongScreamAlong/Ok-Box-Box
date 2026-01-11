/**
 * Race Intelligence Service
 * Comprehensive analysis engine for racing telemetry, strategy, and competitor tracking
 */

import type { TelemetryData, CompetitorData, CoachingInsight } from '../types';

// ============================================================================
// TYPES
// ============================================================================

export interface IncidentData {
  id: string;
  type: 'crash' | 'spin' | 'off-track' | 'slow-car' | 'debris' | 'yellow-flag' | 'safety-car';
  position: number; // Track position 0-1
  severity: 'minor' | 'moderate' | 'major';
  affectedDrivers: string[];
  timestamp: number;
  distanceAhead?: number; // Distance in meters if ahead of player
  distanceBehind?: number; // Distance in meters if behind player
  message: string;
}

export interface RacingLineData {
  cornerId: number;
  cornerName: string;
  optimalBrakingPoint: number; // Track position
  optimalApex: number;
  optimalExitPoint: number;
  currentBrakingPoint: number;
  currentApex: number;
  currentExitPoint: number;
  brakingDelta: number; // Meters early/late
  apexDelta: number; // Meters inside/outside
  exitDelta: number;
  timeLoss: number; // Estimated time loss in seconds
  recommendation: string;
}

export interface CompetitorStrategy {
  driver: string;
  position: number;
  currentTireCompound: 'soft' | 'medium' | 'hard' | 'wet' | 'intermediate' | 'unknown';
  tireAge: number; // Laps on current tires
  estimatedTireWear: number;
  pitStops: number;
  lastPitLap: number | null;
  predictedPitWindow: { earliest: number; latest: number } | null;
  paceHistory: number[]; // Last 5 lap times
  currentPace: number;
  paceTrend: 'improving' | 'stable' | 'degrading';
  threatLevel: 'high' | 'medium' | 'low' | 'none';
  strategyPrediction: string;
}

export interface TireAnalysis {
  compound: string;
  frontLeftWear: number;
  frontRightWear: number;
  rearLeftWear: number;
  rearRightWear: number;
  avgWear: number;
  wearRate: number; // Per lap
  estimatedLapsRemaining: number;
  temperatureStatus: 'cold' | 'optimal' | 'hot' | 'critical';
  pressureStatus: 'low' | 'optimal' | 'high';
  grainingSeverity: number; // 0-100
  blisteringSeverity: number; // 0-100
  recommendation: string;
  pitUrgency: 'none' | 'soon' | 'next-lap' | 'immediate';
}

export interface FuelAnalysis {
  currentFuel: number; // Liters
  fuelPerLap: number;
  lapsRemaining: number;
  fuelToFinish: number;
  fuelDelta: number; // Positive = excess, negative = short
  savingRequired: boolean;
  savingAmount: number; // Percentage to lift-and-coast
  recommendation: string;
}

export interface StrategyRecommendation {
  id: string;
  name: string;
  description: string;
  pitLaps: number[];
  tireCompounds: string[];
  estimatedFinishPosition: number;
  riskLevel: 'conservative' | 'balanced' | 'aggressive';
  confidence: number;
  pros: string[];
  cons: string[];
  isRecommended: boolean;
}

export interface RaceIntelligenceState {
  incidents: IncidentData[];
  racingLine: RacingLineData[];
  competitorStrategies: CompetitorStrategy[];
  tireAnalysis: TireAnalysis | null;
  fuelAnalysis: FuelAnalysis | null;
  strategyRecommendations: StrategyRecommendation[];
  trackCondition: 'dry' | 'damp' | 'wet' | 'flooded';
  flagStatus: 'green' | 'yellow' | 'red' | 'checkered' | 'blue' | 'white' | 'black';
  safetyCarDeployed: boolean;
  vscDeployed: boolean;
}

// ============================================================================
// RACE INTELLIGENCE SERVICE
// ============================================================================

class RaceIntelligenceService {
  private state: RaceIntelligenceState;
  private telemetryHistory: TelemetryData[] = [];
  private competitorHistory: Map<string, { lapTimes: number[]; positions: number[]; pitLaps: number[] }> = new Map();
  private cornerData: Map<number, { brakePoints: number[]; apexPoints: number[]; exitSpeeds: number[] }> = new Map();
  private lastIncidentCheck = 0;
  private currentLap = 0;

  constructor() {
    this.state = this.getInitialState();
  }

  private getInitialState(): RaceIntelligenceState {
    return {
      incidents: [],
      racingLine: [],
      competitorStrategies: [],
      tireAnalysis: null,
      fuelAnalysis: null,
      strategyRecommendations: [],
      trackCondition: 'dry',
      flagStatus: 'green',
      safetyCarDeployed: false,
      vscDeployed: false,
    };
  }

  // ============================================================================
  // MAIN UPDATE FUNCTION
  // ============================================================================

  update(
    telemetry: TelemetryData | null,
    competitors: CompetitorData[] | null,
    sessionInfo: { totalLaps: number; currentLap: number; track: string }
  ): { state: RaceIntelligenceState; insights: CoachingInsight[] } {
    const insights: CoachingInsight[] = [];

    if (telemetry) {
      this.telemetryHistory.push(telemetry);
      if (this.telemetryHistory.length > 500) {
        this.telemetryHistory = this.telemetryHistory.slice(-500);
      }
      this.currentLap = telemetry.lap;

      // Analyze tire condition
      this.state.tireAnalysis = this.analyzeTires(telemetry);
      if (this.state.tireAnalysis) {
        insights.push(...this.generateTireInsights(this.state.tireAnalysis));
      }

      // Analyze fuel
      this.state.fuelAnalysis = this.analyzeFuel(telemetry, sessionInfo.totalLaps);
      if (this.state.fuelAnalysis) {
        insights.push(...this.generateFuelInsights(this.state.fuelAnalysis));
      }

      // Analyze racing line
      this.updateRacingLineAnalysis(telemetry);
      insights.push(...this.generateRacingLineInsights());

      // Check for incidents
      this.detectIncidents(telemetry, competitors);
      insights.push(...this.generateIncidentInsights());
    }

    if (competitors) {
      // Update competitor strategies
      this.updateCompetitorStrategies(competitors, sessionInfo.currentLap);
      insights.push(...this.generateCompetitorInsights());
    }

    // Generate strategy recommendations
    this.state.strategyRecommendations = this.generateStrategyRecommendations(
      sessionInfo.totalLaps,
      sessionInfo.currentLap
    );

    return { state: this.state, insights };
  }

  // ============================================================================
  // TIRE ANALYSIS
  // ============================================================================

  private analyzeTires(telemetry: TelemetryData): TireAnalysis | null {
    if (!telemetry.tires) return null;

    const { frontLeft, frontRight, rearLeft, rearRight } = telemetry.tires;
    
    const wears = [frontLeft.wear, frontRight.wear, rearLeft.wear, rearRight.wear];
    const temps = [frontLeft.temp, frontRight.temp, rearLeft.temp, rearRight.temp];
    const pressures = [frontLeft.pressure, frontRight.pressure, rearLeft.pressure, rearRight.pressure];
    
    const avgWear = wears.reduce((a, b) => a + b, 0) / 4;
    const avgTemp = temps.reduce((a, b) => a + b, 0) / 4;
    const avgPressure = pressures.reduce((a, b) => a + b, 0) / 4;
    
    // Calculate wear rate from history
    let wearRate = 1.5; // Default
    if (this.telemetryHistory.length > 100) {
      const oldTelemetry = this.telemetryHistory[this.telemetryHistory.length - 100];
      if (oldTelemetry.tires) {
        const oldAvgWear = (
          oldTelemetry.tires.frontLeft.wear +
          oldTelemetry.tires.frontRight.wear +
          oldTelemetry.tires.rearLeft.wear +
          oldTelemetry.tires.rearRight.wear
        ) / 4;
        const lapsDiff = telemetry.lap - oldTelemetry.lap;
        if (lapsDiff > 0) {
          wearRate = (avgWear - oldAvgWear) / lapsDiff;
        }
      }
    }

    const estimatedLapsRemaining = wearRate > 0 ? Math.floor((100 - avgWear) / wearRate) : 99;

    // Temperature status
    let temperatureStatus: TireAnalysis['temperatureStatus'] = 'optimal';
    if (avgTemp < 70) temperatureStatus = 'cold';
    else if (avgTemp > 105) temperatureStatus = 'critical';
    else if (avgTemp > 95) temperatureStatus = 'hot';

    // Pressure status
    let pressureStatus: TireAnalysis['pressureStatus'] = 'optimal';
    if (avgPressure < 23) pressureStatus = 'low';
    else if (avgPressure > 28) pressureStatus = 'high';

    // Graining/blistering estimation
    const grainingSeverity = temperatureStatus === 'cold' ? Math.min(100, avgWear * 1.5) : 0;
    const blisteringSeverity = temperatureStatus === 'hot' || temperatureStatus === 'critical' 
      ? Math.min(100, (avgTemp - 95) * 5) : 0;

    // Pit urgency
    let pitUrgency: TireAnalysis['pitUrgency'] = 'none';
    let recommendation = 'Tires in good condition. Continue pushing.';
    
    if (avgWear > 90 || estimatedLapsRemaining <= 1) {
      pitUrgency = 'immediate';
      recommendation = 'CRITICAL: Pit immediately! Tire failure imminent.';
    } else if (avgWear > 75 || estimatedLapsRemaining <= 3) {
      pitUrgency = 'next-lap';
      recommendation = 'Pit within next 1-2 laps. Significant grip loss.';
    } else if (avgWear > 60 || estimatedLapsRemaining <= 8) {
      pitUrgency = 'soon';
      recommendation = `Plan pit stop. ~${estimatedLapsRemaining} laps of tire life remaining.`;
    }

    if (temperatureStatus === 'cold') {
      recommendation += ' Tires cold - be careful on corner entry.';
    } else if (temperatureStatus === 'critical') {
      recommendation += ' OVERHEATING - reduce aggression immediately!';
    }

    return {
      compound: 'Medium', // Would come from actual data
      frontLeftWear: frontLeft.wear,
      frontRightWear: frontRight.wear,
      rearLeftWear: rearLeft.wear,
      rearRightWear: rearRight.wear,
      avgWear,
      wearRate,
      estimatedLapsRemaining,
      temperatureStatus,
      pressureStatus,
      grainingSeverity,
      blisteringSeverity,
      recommendation,
      pitUrgency,
    };
  }

  private generateTireInsights(analysis: TireAnalysis): CoachingInsight[] {
    const insights: CoachingInsight[] = [];

    if (analysis.pitUrgency === 'immediate') {
      insights.push({
        priority: 'critical',
        confidence: 98,
        title: 'CRITICAL TIRE WEAR',
        description: analysis.recommendation,
        impact: 'High risk of puncture or loss of control',
        category: 'TIRES',
      });
    } else if (analysis.pitUrgency === 'next-lap') {
      insights.push({
        priority: 'critical',
        confidence: 90,
        title: 'Pit Stop Required Soon',
        description: `Tire wear at ${analysis.avgWear.toFixed(0)}%. ${analysis.estimatedLapsRemaining} laps remaining.`,
        impact: 'Grip degradation accelerating',
        category: 'TIRES',
      });
    }

    if (analysis.temperatureStatus === 'critical') {
      insights.push({
        priority: 'critical',
        confidence: 95,
        title: 'Tire Overheating',
        description: 'Tires exceeding safe temperature range. Reduce pace to prevent blistering.',
        impact: 'Risk of sudden grip loss',
        category: 'TIRES',
      });
    }

    // Front/rear balance
    const frontWear = (analysis.frontLeftWear + analysis.frontRightWear) / 2;
    const rearWear = (analysis.rearLeftWear + analysis.rearRightWear) / 2;
    if (Math.abs(frontWear - rearWear) > 10) {
      const heavierEnd = frontWear > rearWear ? 'Front' : 'Rear';
      insights.push({
        priority: 'medium',
        confidence: 75,
        title: `${heavierEnd} Tire Wear Higher`,
        description: `${heavierEnd} tires wearing ${Math.abs(frontWear - rearWear).toFixed(0)}% faster. Consider adjusting driving style.`,
        impact: 'May affect handling balance',
        category: 'TIRES',
      });
    }

    return insights;
  }

  // ============================================================================
  // FUEL ANALYSIS
  // ============================================================================

  private analyzeFuel(telemetry: TelemetryData, totalLaps: number): FuelAnalysis {
    // Estimate fuel from tire wear correlation (in real implementation, would use actual fuel data)
    const estimatedFuel = Math.max(0, 100 - telemetry.lap * 2.5);
    const fuelPerLap = 2.5;
    const remainingLaps = totalLaps - telemetry.lap;
    const fuelToFinish = remainingLaps * fuelPerLap;
    const fuelDelta = estimatedFuel - fuelToFinish;
    
    const savingRequired = fuelDelta < 0;
    const savingAmount = savingRequired ? Math.abs(fuelDelta / fuelToFinish) * 100 : 0;

    let recommendation = 'Fuel on target. Race normally.';
    if (fuelDelta < -10) {
      recommendation = `FUEL SHORT by ${Math.abs(fuelDelta).toFixed(1)}L. Lift-and-coast required in braking zones.`;
    } else if (fuelDelta < -5) {
      recommendation = `Fuel marginal. Light fuel saving recommended.`;
    } else if (fuelDelta > 10) {
      recommendation = `Excess fuel. Can push harder or extend stint.`;
    }

    return {
      currentFuel: estimatedFuel,
      fuelPerLap,
      lapsRemaining: Math.floor(estimatedFuel / fuelPerLap),
      fuelToFinish,
      fuelDelta,
      savingRequired,
      savingAmount,
      recommendation,
    };
  }

  private generateFuelInsights(analysis: FuelAnalysis): CoachingInsight[] {
    const insights: CoachingInsight[] = [];

    if (analysis.fuelDelta < -10) {
      insights.push({
        priority: 'critical',
        confidence: 90,
        title: 'Fuel Critical',
        description: `Short by ${Math.abs(analysis.fuelDelta).toFixed(1)}L. Implement fuel saving NOW.`,
        impact: 'Risk of running out before finish',
        category: 'FUEL',
      });
    } else if (analysis.savingRequired) {
      insights.push({
        priority: 'high',
        confidence: 85,
        title: 'Fuel Saving Required',
        description: `Save ${analysis.savingAmount.toFixed(0)}% per lap. Lift early into braking zones.`,
        impact: 'Necessary to finish race',
        category: 'FUEL',
      });
    }

    return insights;
  }

  // ============================================================================
  // RACING LINE ANALYSIS
  // ============================================================================

  private updateRacingLineAnalysis(telemetry: TelemetryData): void {
    const trackPos = telemetry.trackPosition;
    const steering = Math.abs(telemetry.steering);
    
    // Detect corner entry (significant steering input)
    if (steering > 0.2) {
      const cornerId = Math.floor(trackPos * 20); // Divide track into 20 segments
      
      if (!this.cornerData.has(cornerId)) {
        this.cornerData.set(cornerId, { brakePoints: [], apexPoints: [], exitSpeeds: [] });
      }
      
      const data = this.cornerData.get(cornerId)!;
      
      // Track braking point (when brake > 0.5)
      if (telemetry.brake > 0.5) {
        data.brakePoints.push(trackPos);
        if (data.brakePoints.length > 10) data.brakePoints.shift();
      }
      
      // Track apex (minimum speed point)
      if (telemetry.speed < 150 && steering > 0.3) {
        data.apexPoints.push(trackPos);
        if (data.apexPoints.length > 10) data.apexPoints.shift();
      }
      
      // Track exit speed
      if (telemetry.throttle > 0.8 && steering < 0.2) {
        data.exitSpeeds.push(telemetry.speed);
        if (data.exitSpeeds.length > 10) data.exitSpeeds.shift();
      }
    }

    // Generate racing line analysis for corners with enough data
    this.state.racingLine = [];
    this.cornerData.forEach((data, cornerId) => {
      if (data.brakePoints.length >= 3 && data.exitSpeeds.length >= 3) {
        const avgBrakePoint = data.brakePoints.reduce((a, b) => a + b, 0) / data.brakePoints.length;
        const avgExitSpeed = data.exitSpeeds.reduce((a, b) => a + b, 0) / data.exitSpeeds.length;
        const exitSpeedVariance = this.calculateVariance(data.exitSpeeds);
        
        // Optimal values (would come from reference data in real implementation)
        const optimalBrakePoint = avgBrakePoint - 0.002; // Slightly later
        const optimalExitSpeed = avgExitSpeed + 5; // 5 km/h faster
        
        const brakingDelta = (avgBrakePoint - optimalBrakePoint) * 1000; // Convert to meters approx
        const timeLoss = exitSpeedVariance > 25 ? 0.2 : brakingDelta > 5 ? 0.1 : 0;
        
        let recommendation = 'Good execution.';
        if (brakingDelta > 10) {
          recommendation = 'Braking too early. Try braking 10m later.';
        } else if (exitSpeedVariance > 25) {
          recommendation = 'Inconsistent exit speed. Focus on smooth throttle application.';
        } else if (avgExitSpeed < optimalExitSpeed - 10) {
          recommendation = 'Exit speed low. Carry more speed through apex.';
        }

        this.state.racingLine.push({
          cornerId,
          cornerName: `Turn ${cornerId + 1}`,
          optimalBrakingPoint: optimalBrakePoint,
          optimalApex: avgBrakePoint + 0.01,
          optimalExitPoint: avgBrakePoint + 0.02,
          currentBrakingPoint: avgBrakePoint,
          currentApex: avgBrakePoint + 0.01,
          currentExitPoint: avgBrakePoint + 0.02,
          brakingDelta,
          apexDelta: 0,
          exitDelta: optimalExitSpeed - avgExitSpeed,
          timeLoss,
          recommendation,
        });
      }
    });
  }

  private generateRacingLineInsights(): CoachingInsight[] {
    const insights: CoachingInsight[] = [];
    
    // Find corners with most time loss
    const problemCorners = this.state.racingLine
      .filter(c => c.timeLoss > 0.1)
      .sort((a, b) => b.timeLoss - a.timeLoss)
      .slice(0, 2);

    for (const corner of problemCorners) {
      insights.push({
        priority: corner.timeLoss > 0.2 ? 'high' : 'medium',
        confidence: 75,
        title: `${corner.cornerName}: ${corner.recommendation.split('.')[0]}`,
        description: corner.recommendation,
        impact: `Potential gain: ${corner.timeLoss.toFixed(2)}s per lap`,
        category: 'RACING LINE',
        location: corner.cornerName,
      });
    }

    return insights;
  }

  // ============================================================================
  // INCIDENT DETECTION
  // ============================================================================

  private detectIncidents(telemetry: TelemetryData, competitors: CompetitorData[] | null): void {
    const now = Date.now();
    if (now - this.lastIncidentCheck < 1000) return; // Check every second
    this.lastIncidentCheck = now;

    // Clear old incidents (older than 30 seconds)
    this.state.incidents = this.state.incidents.filter(i => now - i.timestamp < 30000);

    // Detect sudden speed drops in competitors (potential incidents)
    if (competitors) {
      for (const comp of competitors) {
        const history = this.competitorHistory.get(comp.driver);
        if (history && history.lapTimes.length >= 2) {
          const lastLap = parseFloat(comp.lastLap.replace(':', '').replace('.', ''));
          const prevLap = history.lapTimes[history.lapTimes.length - 1];
          
          // Significant lap time increase could indicate incident
          if (lastLap > prevLap * 1.3 && !this.state.incidents.find(i => i.affectedDrivers.includes(comp.driver))) {
            const isAhead = comp.position < telemetry.racePosition;
            this.state.incidents.push({
              id: `incident-${now}-${comp.driver}`,
              type: 'slow-car',
              position: 0.5, // Unknown exact position
              severity: 'minor',
              affectedDrivers: [comp.driver],
              timestamp: now,
              distanceAhead: isAhead ? Math.abs(parseFloat(comp.gap)) * 50 : undefined,
              distanceBehind: !isAhead ? Math.abs(parseFloat(comp.gap)) * 50 : undefined,
              message: `${comp.driver} significantly slower - possible incident`,
            });
          }
        }
      }
    }

    // Detect yellow flag conditions from gap changes
    if (telemetry.gapAhead !== undefined && telemetry.gapAhead < 0.3 && telemetry.speed < 100) {
      if (!this.state.incidents.find(i => i.type === 'slow-car' && i.distanceAhead && i.distanceAhead < 100)) {
        this.state.incidents.push({
          id: `incident-${now}-ahead`,
          type: 'slow-car',
          position: telemetry.trackPosition + 0.01,
          severity: 'moderate',
          affectedDrivers: ['Car Ahead'],
          timestamp: now,
          distanceAhead: telemetry.gapAhead * 50,
          message: 'CAUTION: Slow car ahead! Prepare to take avoiding action.',
        });
      }
    }
  }

  private generateIncidentInsights(): CoachingInsight[] {
    const insights: CoachingInsight[] = [];

    for (const incident of this.state.incidents) {
      if (incident.distanceAhead && incident.distanceAhead < 200) {
        insights.push({
          priority: incident.severity === 'major' ? 'critical' : 'high',
          confidence: 85,
          title: `⚠️ INCIDENT AHEAD`,
          description: incident.message,
          impact: 'Be prepared to take avoiding action',
          category: 'INCIDENT',
          location: `${incident.distanceAhead.toFixed(0)}m ahead`,
        });
      }

      if (incident.distanceBehind && incident.distanceBehind < 100) {
        insights.push({
          priority: 'medium',
          confidence: 80,
          title: 'Incident Behind',
          description: incident.message,
          impact: 'May affect cars behind you',
          category: 'INCIDENT',
          location: `${incident.distanceBehind.toFixed(0)}m behind`,
        });
      }
    }

    return insights;
  }

  // ============================================================================
  // COMPETITOR STRATEGY TRACKING
  // ============================================================================

  private updateCompetitorStrategies(competitors: CompetitorData[], currentLap: number): void {
    this.state.competitorStrategies = [];

    for (const comp of competitors) {
      // Get or create history
      if (!this.competitorHistory.has(comp.driver)) {
        this.competitorHistory.set(comp.driver, { lapTimes: [], positions: [], pitLaps: [] });
      }
      const history = this.competitorHistory.get(comp.driver)!;

      // Parse lap time
      const lapTimeParts = comp.lastLap.match(/(\d+):(\d+\.\d+)/);
      const lapTimeSeconds = lapTimeParts 
        ? parseFloat(lapTimeParts[1]) * 60 + parseFloat(lapTimeParts[2])
        : 0;

      // Track position changes (detect pit stops)
      const prevPosition = history.positions[history.positions.length - 1];
      if (prevPosition && comp.position > prevPosition + 3) {
        // Likely pitted
        history.pitLaps.push(currentLap);
      }

      history.lapTimes.push(lapTimeSeconds);
      history.positions.push(comp.position);

      // Keep last 20 entries
      if (history.lapTimes.length > 20) {
        history.lapTimes.shift();
        history.positions.shift();
      }

      // Calculate pace trend
      let paceTrend: CompetitorStrategy['paceTrend'] = 'stable';
      if (history.lapTimes.length >= 3) {
        const recent = history.lapTimes.slice(-3);
        const avgRecent = recent.reduce((a, b) => a + b, 0) / 3;
        const older = history.lapTimes.slice(-6, -3);
        if (older.length >= 3) {
          const avgOlder = older.reduce((a, b) => a + b, 0) / 3;
          if (avgRecent < avgOlder - 0.3) paceTrend = 'improving';
          else if (avgRecent > avgOlder + 0.3) paceTrend = 'degrading';
        }
      }

      // Estimate tire wear and predict pit window
      const lapsSincePit = history.pitLaps.length > 0 
        ? currentLap - history.pitLaps[history.pitLaps.length - 1]
        : currentLap;
      const estimatedTireWear = Math.min(100, lapsSincePit * 2);
      
      let predictedPitWindow: CompetitorStrategy['predictedPitWindow'] = null;
      if (estimatedTireWear > 40) {
        predictedPitWindow = {
          earliest: currentLap + Math.floor((60 - estimatedTireWear) / 2),
          latest: currentLap + Math.floor((85 - estimatedTireWear) / 2),
        };
      }

      // Determine threat level
      let threatLevel: CompetitorStrategy['threatLevel'] = 'none';
      const gap = parseFloat(comp.gap.replace(/[^0-9.-]/g, '')) || 0;
      if (comp.position === 1) {
        threatLevel = 'none'; // Leader
      } else if (Math.abs(gap) < 2) {
        threatLevel = 'high';
      } else if (Math.abs(gap) < 5) {
        threatLevel = 'medium';
      } else if (Math.abs(gap) < 10) {
        threatLevel = 'low';
      }

      // Generate strategy prediction
      let strategyPrediction = 'Standard strategy expected';
      if (paceTrend === 'degrading' && estimatedTireWear > 50) {
        strategyPrediction = 'Likely to pit soon - tire degradation visible';
      } else if (history.pitLaps.length === 0 && currentLap > 15) {
        strategyPrediction = 'May be attempting one-stop strategy';
      } else if (paceTrend === 'improving') {
        strategyPrediction = 'On fresh tires or finding pace - watch for attack';
      }

      this.state.competitorStrategies.push({
        driver: comp.driver,
        position: comp.position,
        currentTireCompound: 'unknown',
        tireAge: lapsSincePit,
        estimatedTireWear,
        pitStops: history.pitLaps.length,
        lastPitLap: history.pitLaps[history.pitLaps.length - 1] || null,
        predictedPitWindow,
        paceHistory: history.lapTimes.slice(-5),
        currentPace: lapTimeSeconds,
        paceTrend,
        threatLevel,
        strategyPrediction,
      });
    }
  }

  private generateCompetitorInsights(): CoachingInsight[] {
    const insights: CoachingInsight[] = [];

    // Find immediate threats
    const threats = this.state.competitorStrategies.filter(c => c.threatLevel === 'high');
    
    for (const threat of threats.slice(0, 2)) {
      if (threat.paceTrend === 'improving') {
        insights.push({
          priority: 'high',
          confidence: 80,
          title: `${threat.driver} Gaining`,
          description: `${threat.driver} is improving pace. ${threat.strategyPrediction}`,
          impact: 'May challenge for position soon',
          category: 'COMPETITORS',
        });
      }

      if (threat.predictedPitWindow && threat.predictedPitWindow.earliest <= this.currentLap + 3) {
        insights.push({
          priority: 'high',
          confidence: 75,
          title: `${threat.driver} Pit Window`,
          description: `${threat.driver} expected to pit in next ${threat.predictedPitWindow.earliest - this.currentLap}-${threat.predictedPitWindow.latest - this.currentLap} laps.`,
          impact: 'Undercut/overcut opportunity',
          category: 'STRATEGY',
        });
      }
    }

    // Track leader strategy
    const leader = this.state.competitorStrategies.find(c => c.position === 1);
    if (leader && leader.paceTrend === 'degrading') {
      insights.push({
        priority: 'medium',
        confidence: 70,
        title: 'Leader Pace Dropping',
        description: `${leader.driver} showing tire degradation. Gap may close.`,
        impact: 'Potential to gain positions',
        category: 'COMPETITORS',
      });
    }

    return insights;
  }

  // ============================================================================
  // STRATEGY RECOMMENDATIONS
  // ============================================================================

  private generateStrategyRecommendations(totalLaps: number, currentLap: number): StrategyRecommendation[] {
    const remainingLaps = totalLaps - currentLap;
    const tireAnalysis = this.state.tireAnalysis;
    const fuelAnalysis = this.state.fuelAnalysis;
    
    const recommendations: StrategyRecommendation[] = [];

    // One-stop strategy
    if (remainingLaps > 10 && (!tireAnalysis || tireAnalysis.estimatedLapsRemaining > remainingLaps * 0.6)) {
      recommendations.push({
        id: 'one-stop',
        name: 'One-Stop Strategy',
        description: 'Single pit stop, maximize track position',
        pitLaps: [currentLap + Math.floor(remainingLaps * 0.5)],
        tireCompounds: ['Medium', 'Hard'],
        estimatedFinishPosition: 5,
        riskLevel: 'balanced',
        confidence: 75,
        pros: ['Minimal time in pit lane', 'Track position advantage'],
        cons: ['Tire management required', 'Vulnerable to undercut'],
        isRecommended: true,
      });
    }

    // Two-stop strategy
    if (remainingLaps > 20) {
      recommendations.push({
        id: 'two-stop',
        name: 'Two-Stop Strategy',
        description: 'Aggressive pace, fresh tires for final stint',
        pitLaps: [
          currentLap + Math.floor(remainingLaps * 0.33),
          currentLap + Math.floor(remainingLaps * 0.66),
        ],
        tireCompounds: ['Soft', 'Medium', 'Soft'],
        estimatedFinishPosition: 4,
        riskLevel: 'aggressive',
        confidence: 70,
        pros: ['Can push harder', 'Fresh tires for overtaking'],
        cons: ['More time in pit lane', 'Traffic risk'],
        isRecommended: false,
      });
    }

    // No-stop (if possible)
    if (tireAnalysis && tireAnalysis.estimatedLapsRemaining >= remainingLaps && 
        fuelAnalysis && fuelAnalysis.lapsRemaining >= remainingLaps) {
      recommendations.push({
        id: 'no-stop',
        name: 'No-Stop Strategy',
        description: 'Go to the end on current tires',
        pitLaps: [],
        tireCompounds: ['Current'],
        estimatedFinishPosition: 3,
        riskLevel: 'conservative',
        confidence: 60,
        pros: ['Maximum track position', 'No pit stop time loss'],
        cons: ['Tire degradation risk', 'Vulnerable late in race'],
        isRecommended: remainingLaps < 10,
      });
    }

    // Undercut opportunity
    const nearbyCompetitor = this.state.competitorStrategies.find(
      c => c.threatLevel === 'high' && c.predictedPitWindow
    );
    if (nearbyCompetitor && nearbyCompetitor.predictedPitWindow) {
      recommendations.push({
        id: 'undercut',
        name: 'Undercut Strategy',
        description: `Pit before ${nearbyCompetitor.driver} to gain track position`,
        pitLaps: [nearbyCompetitor.predictedPitWindow.earliest - 1],
        tireCompounds: ['Fresh tires'],
        estimatedFinishPosition: nearbyCompetitor.position - 1,
        riskLevel: 'aggressive',
        confidence: 65,
        pros: [`Can jump ${nearbyCompetitor.driver}`, 'Fresh tire advantage'],
        cons: ['Longer final stint', 'May not work if they react'],
        isRecommended: false,
      });
    }

    return recommendations;
  }

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
  }

  getState(): RaceIntelligenceState {
    return this.state;
  }

  reset(): void {
    this.state = this.getInitialState();
    this.telemetryHistory = [];
    this.competitorHistory.clear();
    this.cornerData.clear();
    this.currentLap = 0;
  }
}

// Export singleton instance
export const raceIntelligence = new RaceIntelligenceService();
export default raceIntelligence;
