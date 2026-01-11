/**
 * Weather Integration Service
 * Track conditions, rain probability, grip levels, and weather-based strategy
 */

export interface WeatherConditions {
  airTemp: number; // Celsius
  trackTemp: number;
  humidity: number; // 0-100%
  windSpeed: number; // km/h
  windDirection: number; // degrees
  rainProbability: number; // 0-100%
  currentCondition: 'dry' | 'damp' | 'wet' | 'storm';
  cloudCover: number; // 0-100%
  visibility: number; // km
}

export interface TrackGripState {
  overall: number; // 0-100
  sector1: number;
  sector2: number;
  sector3: number;
  evolution: 'improving' | 'stable' | 'degrading';
  rubberedLine: number; // 0-100, how much rubber on racing line
  offLineGrip: number; // 0-100
}

export interface WeatherForecast {
  time: string;
  conditions: WeatherConditions;
  confidence: number;
}

export interface WeatherStrategy {
  currentTireRecommendation: 'slick' | 'intermediate' | 'wet';
  pitWindowAdjustment: number; // laps earlier/later due to weather
  paceAdjustment: number; // seconds per lap
  riskLevel: 'low' | 'medium' | 'high';
  alerts: WeatherAlert[];
}

export interface WeatherAlert {
  type: 'rain_incoming' | 'track_drying' | 'temp_change' | 'wind_change' | 'grip_drop';
  message: string;
  severity: 'info' | 'warning' | 'critical';
  eta?: number; // minutes until condition
}

interface WeatherHistoryEntry {
  timestamp: number;
  conditions: WeatherConditions;
  gripLevel: number;
}

class WeatherServiceClass {
  private currentConditions: WeatherConditions = {
    airTemp: 22,
    trackTemp: 35,
    humidity: 45,
    windSpeed: 10,
    windDirection: 180,
    rainProbability: 0,
    currentCondition: 'dry',
    cloudCover: 20,
    visibility: 10,
  };

  private gripState: TrackGripState = {
    overall: 95,
    sector1: 95,
    sector2: 95,
    sector3: 95,
    evolution: 'stable',
    rubberedLine: 50,
    offLineGrip: 70,
  };

  private forecast: WeatherForecast[] = [];
  private history: WeatherHistoryEntry[] = [];
  private sessionStartTime = Date.now();

  private listeners: Set<(conditions: WeatherConditions) => void> = new Set();
  private alertListeners: Set<(alert: WeatherAlert) => void> = new Set();

  // ============================================================================
  // WEATHER UPDATES
  // ============================================================================

  updateConditions(conditions: Partial<WeatherConditions>): void {
    const previousConditions = { ...this.currentConditions };
    this.currentConditions = { ...this.currentConditions, ...conditions };

    // Record history
    this.history.push({
      timestamp: Date.now(),
      conditions: { ...this.currentConditions },
      gripLevel: this.gripState.overall,
    });

    // Keep last hour of history
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    this.history = this.history.filter(h => h.timestamp > oneHourAgo);

    // Check for significant changes and generate alerts
    this.checkForAlerts(previousConditions, this.currentConditions);

    // Update grip based on conditions
    this.updateGripFromConditions();

    this.notifyListeners();
  }

  private checkForAlerts(previous: WeatherConditions, current: WeatherConditions): void {
    // Rain incoming
    if (current.rainProbability > 60 && previous.rainProbability <= 60) {
      this.notifyAlert({
        type: 'rain_incoming',
        message: `Rain probability ${current.rainProbability}% - consider pit strategy`,
        severity: current.rainProbability > 80 ? 'critical' : 'warning',
        eta: this.estimateRainETA(),
      });
    }

    // Track drying
    if (previous.currentCondition === 'wet' && current.currentCondition === 'damp') {
      this.notifyAlert({
        type: 'track_drying',
        message: 'Track is drying - intermediate tires may be faster soon',
        severity: 'info',
      });
    }

    // Temperature change
    const tempChange = current.trackTemp - previous.trackTemp;
    if (Math.abs(tempChange) > 5) {
      this.notifyAlert({
        type: 'temp_change',
        message: `Track temp ${tempChange > 0 ? 'rising' : 'falling'} - adjust tire pressures`,
        severity: 'warning',
      });
    }

    // Wind change
    const windChange = current.windSpeed - previous.windSpeed;
    if (Math.abs(windChange) > 10) {
      this.notifyAlert({
        type: 'wind_change',
        message: `Wind ${windChange > 0 ? 'increasing' : 'decreasing'} to ${current.windSpeed} km/h`,
        severity: 'info',
      });
    }
  }

  private estimateRainETA(): number {
    // Simplified - would use actual forecast data
    const probability = this.currentConditions.rainProbability;
    if (probability > 90) return 5;
    if (probability > 70) return 15;
    return 30;
  }

  // ============================================================================
  // GRIP CALCULATIONS
  // ============================================================================

  private updateGripFromConditions(): void {
    const conditions = this.currentConditions;

    // Base grip from track condition
    let baseGrip = 100;
    switch (conditions.currentCondition) {
      case 'dry': baseGrip = 100; break;
      case 'damp': baseGrip = 75; break;
      case 'wet': baseGrip = 55; break;
      case 'storm': baseGrip = 40; break;
    }

    // Temperature effect (optimal around 30-40°C track temp)
    const optimalTemp = 35;
    const tempDiff = Math.abs(conditions.trackTemp - optimalTemp);
    const tempPenalty = tempDiff * 0.5; // 0.5% grip loss per degree from optimal

    // Humidity effect
    const humidityPenalty = conditions.humidity > 70 ? (conditions.humidity - 70) * 0.2 : 0;

    // Wind effect on aero grip
    const windPenalty = conditions.windSpeed > 30 ? (conditions.windSpeed - 30) * 0.1 : 0;

    // Calculate overall grip
    const overall = Math.max(20, baseGrip - tempPenalty - humidityPenalty - windPenalty);

    // Sector variations (simplified)
    this.gripState = {
      overall,
      sector1: overall + (Math.random() - 0.5) * 5,
      sector2: overall + (Math.random() - 0.5) * 5,
      sector3: overall + (Math.random() - 0.5) * 5,
      evolution: this.calculateGripEvolution(),
      rubberedLine: this.calculateRubberedLine(),
      offLineGrip: overall * 0.75,
    };
  }

  private calculateGripEvolution(): 'improving' | 'stable' | 'degrading' {
    if (this.history.length < 5) return 'stable';

    const recent = this.history.slice(-5);
    const firstGrip = recent[0].gripLevel;
    const lastGrip = recent[recent.length - 1].gripLevel;

    if (lastGrip > firstGrip + 2) return 'improving';
    if (lastGrip < firstGrip - 2) return 'degrading';
    return 'stable';
  }

  private calculateRubberedLine(): number {
    // Track rubbers in over time during dry conditions
    const sessionMinutes = (Date.now() - this.sessionStartTime) / 60000;
    
    if (this.currentConditions.currentCondition !== 'dry') {
      return 20; // Rain washes away rubber
    }

    return Math.min(100, 30 + sessionMinutes * 2);
  }

  updateGripFromTelemetry(lateralG: number, expectedG: number): void {
    // Adjust grip estimate based on actual vs expected lateral G
    const gripRatio = lateralG / expectedG;
    const measuredGrip = this.gripState.overall * gripRatio;
    
    // Smooth update
    this.gripState.overall = this.gripState.overall * 0.9 + measuredGrip * 0.1;
  }

  // ============================================================================
  // FORECAST
  // ============================================================================

  setForecast(forecast: WeatherForecast[]): void {
    this.forecast = forecast;
  }

  getForecast(): WeatherForecast[] {
    return this.forecast;
  }

  getConditionsAtTime(minutesFromNow: number): WeatherConditions {
    // Find forecast closest to requested time
    const targetTime = new Date(Date.now() + minutesFromNow * 60000).toISOString();
    
    for (const f of this.forecast) {
      if (f.time >= targetTime) {
        return f.conditions;
      }
    }

    return this.currentConditions;
  }

  // ============================================================================
  // STRATEGY RECOMMENDATIONS
  // ============================================================================

  getWeatherStrategy(): WeatherStrategy {
    const conditions = this.currentConditions;
    const alerts: WeatherAlert[] = [];

    // Tire recommendation
    let tireRec: 'slick' | 'intermediate' | 'wet' = 'slick';
    if (conditions.currentCondition === 'wet' || conditions.currentCondition === 'storm') {
      tireRec = 'wet';
    } else if (conditions.currentCondition === 'damp' || conditions.rainProbability > 50) {
      tireRec = 'intermediate';
    }

    // Pit window adjustment
    let pitAdjustment = 0;
    if (conditions.rainProbability > 70) {
      // Pit earlier if rain is coming
      pitAdjustment = -3;
      alerts.push({
        type: 'rain_incoming',
        message: 'Consider pitting early for wet tires',
        severity: 'warning',
        eta: this.estimateRainETA(),
      });
    }

    // Pace adjustment
    let paceAdjustment = 0;
    if (conditions.currentCondition === 'damp') paceAdjustment = 3;
    if (conditions.currentCondition === 'wet') paceAdjustment = 8;
    if (conditions.currentCondition === 'storm') paceAdjustment = 15;

    // Risk level
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (conditions.rainProbability > 50 || conditions.currentCondition !== 'dry') {
      riskLevel = 'medium';
    }
    if (conditions.currentCondition === 'storm' || conditions.rainProbability > 80) {
      riskLevel = 'high';
    }

    return {
      currentTireRecommendation: tireRec,
      pitWindowAdjustment: pitAdjustment,
      paceAdjustment,
      riskLevel,
      alerts,
    };
  }

  // ============================================================================
  // TIRE PRESSURE PREDICTION
  // ============================================================================

  predictHotPressures(coldPressures: { fl: number; fr: number; rl: number; rr: number }): {
    fl: number; fr: number; rl: number; rr: number;
  } {
    // Pressure increases with temperature
    // Roughly 0.1 PSI per degree C
    const tempIncrease = this.currentConditions.trackTemp - 20; // Assume 20C is baseline cold
    const pressureIncrease = tempIncrease * 0.1;

    // Front tires heat more due to steering
    // Outside tires heat more on tracks with more corners in one direction
    return {
      fl: coldPressures.fl + pressureIncrease + 1.5,
      fr: coldPressures.fr + pressureIncrease + 1.5,
      rl: coldPressures.rl + pressureIncrease + 1.0,
      rr: coldPressures.rr + pressureIncrease + 1.0,
    };
  }

  recommendColdPressures(targetHotPressures: { fl: number; fr: number; rl: number; rr: number }): {
    fl: number; fr: number; rl: number; rr: number;
  } {
    const tempIncrease = this.currentConditions.trackTemp - 20;
    const pressureIncrease = tempIncrease * 0.1;

    return {
      fl: targetHotPressures.fl - pressureIncrease - 1.5,
      fr: targetHotPressures.fr - pressureIncrease - 1.5,
      rl: targetHotPressures.rl - pressureIncrease - 1.0,
      rr: targetHotPressures.rr - pressureIncrease - 1.0,
    };
  }

  // ============================================================================
  // STATE
  // ============================================================================

  getConditions(): WeatherConditions {
    return { ...this.currentConditions };
  }

  getGripState(): TrackGripState {
    return { ...this.gripState };
  }

  getState() {
    return {
      conditions: this.currentConditions,
      grip: this.gripState,
      forecast: this.forecast,
      strategy: this.getWeatherStrategy(),
    };
  }

  subscribe(listener: (conditions: WeatherConditions) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  subscribeToAlerts(listener: (alert: WeatherAlert) => void): () => void {
    this.alertListeners.add(listener);
    return () => this.alertListeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(l => l(this.currentConditions));
  }

  private notifyAlert(alert: WeatherAlert): void {
    this.alertListeners.forEach(l => l(alert));
  }

  reset(): void {
    this.sessionStartTime = Date.now();
    this.history = [];
    this.forecast = [];
    this.currentConditions = {
      airTemp: 22,
      trackTemp: 35,
      humidity: 45,
      windSpeed: 10,
      windDirection: 180,
      rainProbability: 0,
      currentCondition: 'dry',
      cloudCover: 20,
      visibility: 10,
    };
    this.gripState = {
      overall: 95,
      sector1: 95,
      sector2: 95,
      sector3: 95,
      evolution: 'stable',
      rubberedLine: 50,
      offLineGrip: 70,
    };
  }
}

export const WeatherService = new WeatherServiceClass();
export default WeatherService;
