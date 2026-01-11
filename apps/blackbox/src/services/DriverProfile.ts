/**
 * Driver Profile & Analytics System
 * Tracks driver performance over time, identifies patterns, and provides personalized insights
 */

import type { TelemetryData } from '../types';

export interface DriverDNA {
  id: string;
  name: string;
  createdAt: string;
  lastUpdated: string;
  
  // Driving style metrics (0-100)
  style: {
    aggression: number; // Late braking, close battles
    consistency: number; // Lap time variance
    smoothness: number; // Input smoothness
    adaptability: number; // Performance in changing conditions
    racecraft: number; // Overtaking, defending
    tireManagement: number; // Tire wear rate vs pace
    fuelEfficiency: number; // Fuel consumption management
  };

  // Skill ratings by category
  skills: {
    braking: number;
    trailBraking: number;
    cornerEntry: number;
    apexSpeed: number;
    cornerExit: number;
    throttleControl: number;
    carControl: number;
    wetDriving: number;
    qualifying: number;
    racePace: number;
    overtaking: number;
    defending: number;
    tirePreservation: number;
    fuelSaving: number;
    consistency: number;
  };

  // Track-specific performance
  trackPerformance: Map<string, TrackPerformance>;

  // Historical trends
  trends: {
    overallImprovement: number; // % improvement over time
    recentForm: 'improving' | 'stable' | 'declining';
    bestTrackType: 'street' | 'technical' | 'high-speed' | 'mixed';
    weakestArea: string;
    strongestArea: string;
  };

  // Session patterns
  patterns: {
    avgLapTimeVariance: number;
    fatigueOnset: number; // Lap number when pace typically drops
    optimalStintLength: number;
    coldTirePerformance: number; // Performance on out-laps
    pressurePerformance: number; // Performance in close battles
  };
}

export interface TrackPerformance {
  trackId: string;
  trackName: string;
  sessionsCount: number;
  totalLaps: number;
  bestLapTime: number;
  averageLapTime: number;
  consistency: number; // Std dev of lap times
  improvementRate: number; // Seconds improved per session
  lastVisit: string;
  cornerRatings: Map<number, number>; // Corner number -> rating
  troubleSpots: string[];
  strengths: string[];
}

export interface SessionAnalysis {
  sessionId: string;
  date: string;
  trackId: string;
  duration: number;
  lapsCompleted: number;
  bestLap: number;
  averageLap: number;
  consistency: number;
  improvement: number; // vs previous session
  insights: string[];
  areasWorkedOn: string[];
  progressMade: string[];
}

export interface PerformanceTrend {
  date: string;
  trackId: string;
  lapTime: number;
  consistency: number;
  skillRating: number;
}

interface TelemetrySnapshot {
  timestamp: number;
  throttle: number;
  brake: number;
  steering: number;
  speed: number;
  gear: number;
  trackPosition: number;
  lateralG: number;
  longitudinalG: number;
}

class DriverProfileClass {
  private profile: DriverDNA | null = null;
  private currentSessionData: TelemetrySnapshot[] = [];
  private sessionHistory: SessionAnalysis[] = [];
  private performanceTrends: PerformanceTrend[] = [];
  
  private listeners: Set<(profile: DriverDNA) => void> = new Set();

  // ============================================================================
  // PROFILE MANAGEMENT
  // ============================================================================

  createProfile(name: string): DriverDNA {
    this.profile = {
      id: `driver-${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      style: {
        aggression: 50,
        consistency: 50,
        smoothness: 50,
        adaptability: 50,
        racecraft: 50,
        tireManagement: 50,
        fuelEfficiency: 50,
      },
      skills: {
        braking: 50,
        trailBraking: 50,
        cornerEntry: 50,
        apexSpeed: 50,
        cornerExit: 50,
        throttleControl: 50,
        carControl: 50,
        wetDriving: 50,
        qualifying: 50,
        racePace: 50,
        overtaking: 50,
        defending: 50,
        tirePreservation: 50,
        fuelSaving: 50,
        consistency: 50,
      },
      trackPerformance: new Map(),
      trends: {
        overallImprovement: 0,
        recentForm: 'stable',
        bestTrackType: 'mixed',
        weakestArea: 'unknown',
        strongestArea: 'unknown',
      },
      patterns: {
        avgLapTimeVariance: 0,
        fatigueOnset: 30,
        optimalStintLength: 25,
        coldTirePerformance: 50,
        pressurePerformance: 50,
      },
    };

    this.saveToStorage();
    this.notifyListeners();
    return this.profile;
  }

  loadProfile(): DriverDNA | null {
    try {
      const stored = localStorage.getItem('blackbox_driver_profile');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Restore Maps
        parsed.trackPerformance = new Map(parsed.trackPerformance || []);
        this.profile = parsed;
        
        // Load session history
        const historyStored = localStorage.getItem('blackbox_session_history');
        if (historyStored) {
          this.sessionHistory = JSON.parse(historyStored);
        }

        const trendsStored = localStorage.getItem('blackbox_performance_trends');
        if (trendsStored) {
          this.performanceTrends = JSON.parse(trendsStored);
        }
      }
    } catch (e) {
      console.warn('Failed to load driver profile:', e);
    }
    return this.profile;
  }

  private saveToStorage(): void {
    if (!this.profile) return;

    try {
      const toStore = {
        ...this.profile,
        trackPerformance: Array.from(this.profile.trackPerformance.entries()),
      };
      localStorage.setItem('blackbox_driver_profile', JSON.stringify(toStore));
      localStorage.setItem('blackbox_session_history', JSON.stringify(this.sessionHistory));
      localStorage.setItem('blackbox_performance_trends', JSON.stringify(this.performanceTrends));
    } catch (e) {
      console.warn('Failed to save driver profile:', e);
    }
  }

  // ============================================================================
  // TELEMETRY ANALYSIS
  // ============================================================================

  recordTelemetry(telemetry: TelemetryData): void {
    this.currentSessionData.push({
      timestamp: Date.now(),
      throttle: telemetry.throttle,
      brake: telemetry.brake,
      steering: telemetry.steering,
      speed: telemetry.speed,
      gear: telemetry.gear,
      trackPosition: telemetry.trackPosition,
      lateralG: telemetry.gForce.lateral,
      longitudinalG: telemetry.gForce.longitudinal,
    });

    // Keep last 5 minutes of data
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    this.currentSessionData = this.currentSessionData.filter(d => d.timestamp > fiveMinutesAgo);
  }

  analyzeSession(trackId: string, trackName: string, lapTimes: number[]): SessionAnalysis {
    if (!this.profile) {
      this.createProfile('Driver');
    }

    const validLaps = lapTimes.filter(t => t > 0);
    const bestLap = validLaps.length > 0 ? Math.min(...validLaps) : 0;
    const averageLap = validLaps.length > 0 
      ? validLaps.reduce((a, b) => a + b, 0) / validLaps.length 
      : 0;
    
    // Calculate consistency (std dev)
    const variance = validLaps.reduce((sum, t) => sum + Math.pow(t - averageLap, 2), 0) / validLaps.length;
    const consistency = Math.sqrt(variance);

    // Get previous session for comparison
    const previousSession = this.sessionHistory.find(s => s.trackId === trackId);
    const improvement = previousSession ? previousSession.bestLap - bestLap : 0;

    // Analyze driving style from telemetry
    this.analyzeStyle();

    // Update track performance
    this.updateTrackPerformance(trackId, trackName, validLaps);

    // Generate insights
    const insights = this.generateInsights(trackId, validLaps);

    const analysis: SessionAnalysis = {
      sessionId: `session-${Date.now()}`,
      date: new Date().toISOString(),
      trackId,
      duration: this.currentSessionData.length > 0 
        ? (this.currentSessionData[this.currentSessionData.length - 1].timestamp - this.currentSessionData[0].timestamp) / 1000
        : 0,
      lapsCompleted: validLaps.length,
      bestLap,
      averageLap,
      consistency,
      improvement,
      insights,
      areasWorkedOn: this.identifyAreasWorkedOn(),
      progressMade: this.identifyProgress(trackId),
    };

    this.sessionHistory.unshift(analysis);
    if (this.sessionHistory.length > 100) {
      this.sessionHistory.pop();
    }

    // Record trend
    this.performanceTrends.push({
      date: new Date().toISOString(),
      trackId,
      lapTime: bestLap,
      consistency,
      skillRating: this.calculateOverallRating(),
    });

    // Update profile trends
    this.updateTrends();

    this.saveToStorage();
    this.notifyListeners();

    return analysis;
  }

  private analyzeStyle(): void {
    if (!this.profile || this.currentSessionData.length < 100) return;

    const data = this.currentSessionData;

    // Analyze aggression (brake pressure, late braking)
    const avgBrake = data.reduce((sum, d) => sum + d.brake, 0) / data.length;
    const maxBrake = Math.max(...data.map(d => d.brake));
    this.profile.style.aggression = Math.min(100, (avgBrake * 0.5 + maxBrake * 0.5) * 100);

    // Analyze smoothness (input variance)
    const throttleChanges = this.calculateInputVariance(data.map(d => d.throttle));
    const steeringChanges = this.calculateInputVariance(data.map(d => d.steering));
    this.profile.style.smoothness = Math.max(0, 100 - (throttleChanges + steeringChanges) * 50);

    // Update skills based on telemetry patterns
    this.updateSkillsFromTelemetry(data);
  }

  private calculateInputVariance(values: number[]): number {
    let totalChange = 0;
    for (let i = 1; i < values.length; i++) {
      totalChange += Math.abs(values[i] - values[i - 1]);
    }
    return totalChange / values.length;
  }

  private updateSkillsFromTelemetry(data: TelemetrySnapshot[]): void {
    if (!this.profile) return;

    // Analyze braking zones
    const brakingEvents = this.findBrakingEvents(data);
    if (brakingEvents.length > 0) {
      const avgBrakeForce = brakingEvents.reduce((sum, e) => sum + e.maxBrake, 0) / brakingEvents.length;
      const avgTrailBrake = brakingEvents.reduce((sum, e) => sum + e.trailBrakeRatio, 0) / brakingEvents.length;
      
      this.profile.skills.braking = this.smoothUpdate(this.profile.skills.braking, avgBrakeForce * 100);
      this.profile.skills.trailBraking = this.smoothUpdate(this.profile.skills.trailBraking, avgTrailBrake * 100);
    }

    // Analyze throttle control
    const throttleSmooth = 100 - this.calculateInputVariance(data.map(d => d.throttle)) * 200;
    this.profile.skills.throttleControl = this.smoothUpdate(this.profile.skills.throttleControl, throttleSmooth);

    // Analyze car control (recovery from slides)
    const lateralGVariance = this.calculateInputVariance(data.map(d => d.lateralG));
    const carControl = Math.max(0, 100 - lateralGVariance * 50);
    this.profile.skills.carControl = this.smoothUpdate(this.profile.skills.carControl, carControl);
  }

  private findBrakingEvents(data: TelemetrySnapshot[]): Array<{ maxBrake: number; trailBrakeRatio: number }> {
    const events: Array<{ maxBrake: number; trailBrakeRatio: number }> = [];
    let inBraking = false;
    let brakeStart = 0;
    let maxBrake = 0;

    for (let i = 0; i < data.length; i++) {
      if (data[i].brake > 0.1 && !inBraking) {
        inBraking = true;
        brakeStart = i;
        maxBrake = data[i].brake;
      } else if (data[i].brake > maxBrake) {
        maxBrake = data[i].brake;
      } else if (data[i].brake < 0.05 && inBraking) {
        inBraking = false;
        const brakeEnd = i;
        const duration = brakeEnd - brakeStart;
        
        // Calculate trail brake ratio (how much braking continues into corner)
        let trailBrakeFrames = 0;
        for (let j = brakeStart; j < brakeEnd; j++) {
          if (Math.abs(data[j].steering) > 0.1 && data[j].brake > 0.1) {
            trailBrakeFrames++;
          }
        }
        const trailBrakeRatio = duration > 0 ? trailBrakeFrames / duration : 0;

        events.push({ maxBrake, trailBrakeRatio });
      }
    }

    return events;
  }

  private smoothUpdate(current: number, newValue: number, weight = 0.1): number {
    return current * (1 - weight) + newValue * weight;
  }

  private updateTrackPerformance(trackId: string, trackName: string, lapTimes: number[]): void {
    if (!this.profile) return;

    const existing = this.profile.trackPerformance.get(trackId);
    const bestLap = Math.min(...lapTimes);
    const avgLap = lapTimes.reduce((a, b) => a + b, 0) / lapTimes.length;
    const variance = lapTimes.reduce((sum, t) => sum + Math.pow(t - avgLap, 2), 0) / lapTimes.length;
    const consistency = Math.sqrt(variance);

    if (existing) {
      const improvementRate = existing.bestLapTime > 0 
        ? (existing.bestLapTime - bestLap) / existing.sessionsCount 
        : 0;

      this.profile.trackPerformance.set(trackId, {
        ...existing,
        sessionsCount: existing.sessionsCount + 1,
        totalLaps: existing.totalLaps + lapTimes.length,
        bestLapTime: Math.min(existing.bestLapTime, bestLap),
        averageLapTime: (existing.averageLapTime + avgLap) / 2,
        consistency: (existing.consistency + consistency) / 2,
        improvementRate,
        lastVisit: new Date().toISOString(),
      });
    } else {
      this.profile.trackPerformance.set(trackId, {
        trackId,
        trackName,
        sessionsCount: 1,
        totalLaps: lapTimes.length,
        bestLapTime: bestLap,
        averageLapTime: avgLap,
        consistency,
        improvementRate: 0,
        lastVisit: new Date().toISOString(),
        cornerRatings: new Map(),
        troubleSpots: [],
        strengths: [],
      });
    }
  }

  private generateInsights(trackId: string, lapTimes: number[]): string[] {
    const insights: string[] = [];

    if (!this.profile) return insights;

    // Consistency insight
    const avgLap = lapTimes.reduce((a, b) => a + b, 0) / lapTimes.length;
    const variance = lapTimes.reduce((sum, t) => sum + Math.pow(t - avgLap, 2), 0) / lapTimes.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev < 500) {
      insights.push('Excellent consistency this session - lap times within 0.5s');
    } else if (stdDev > 2000) {
      insights.push('High lap time variance - focus on consistency');
    }

    // Improvement insight
    const trackPerf = this.profile.trackPerformance.get(trackId);
    if (trackPerf && trackPerf.sessionsCount > 1) {
      const bestLap = Math.min(...lapTimes);
      if (bestLap < trackPerf.bestLapTime) {
        const improvement = trackPerf.bestLapTime - bestLap;
        insights.push(`New personal best! ${(improvement / 1000).toFixed(3)}s faster`);
      }
    }

    // Style insights
    if (this.profile.style.smoothness < 40) {
      insights.push('Inputs are jerky - try smoother throttle and steering');
    }
    if (this.profile.style.aggression > 80) {
      insights.push('Very aggressive driving - watch for tire wear');
    }

    // Skill insights
    if (this.profile.skills.trailBraking < 40) {
      insights.push('Trail braking underutilized - could gain time in corners');
    }
    if (this.profile.skills.throttleControl > 80) {
      insights.push('Excellent throttle control - strong corner exits');
    }

    return insights;
  }

  private identifyAreasWorkedOn(): string[] {
    const areas: string[] = [];
    
    if (this.currentSessionData.length > 0) {
      const avgBrake = this.currentSessionData.reduce((sum, d) => sum + d.brake, 0) / this.currentSessionData.length;
      if (avgBrake > 0.3) areas.push('Braking technique');
      
      const steeringVariance = this.calculateInputVariance(this.currentSessionData.map(d => d.steering));
      if (steeringVariance > 0.1) areas.push('Car control');
    }

    return areas;
  }

  private identifyProgress(trackId: string): string[] {
    const progress: string[] = [];
    
    if (!this.profile) return progress;

    const trackPerf = this.profile.trackPerformance.get(trackId);
    if (trackPerf && trackPerf.improvementRate > 0) {
      progress.push(`Improving ${(trackPerf.improvementRate / 1000).toFixed(2)}s per session at this track`);
    }

    return progress;
  }

  private updateTrends(): void {
    if (!this.profile || this.performanceTrends.length < 5) return;

    // Calculate overall improvement
    const recentTrends = this.performanceTrends.slice(-20);
    if (recentTrends.length >= 2) {
      const firstHalf = recentTrends.slice(0, Math.floor(recentTrends.length / 2));
      const secondHalf = recentTrends.slice(Math.floor(recentTrends.length / 2));
      
      const firstAvg = firstHalf.reduce((sum, t) => sum + t.skillRating, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, t) => sum + t.skillRating, 0) / secondHalf.length;
      
      this.profile.trends.overallImprovement = ((secondAvg - firstAvg) / firstAvg) * 100;
      
      if (secondAvg > firstAvg + 2) {
        this.profile.trends.recentForm = 'improving';
      } else if (secondAvg < firstAvg - 2) {
        this.profile.trends.recentForm = 'declining';
      } else {
        this.profile.trends.recentForm = 'stable';
      }
    }

    // Find strongest and weakest areas
    const skills = this.profile.skills;
    const skillEntries = Object.entries(skills);
    skillEntries.sort((a, b) => b[1] - a[1]);
    
    this.profile.trends.strongestArea = skillEntries[0][0];
    this.profile.trends.weakestArea = skillEntries[skillEntries.length - 1][0];
  }

  private calculateOverallRating(): number {
    if (!this.profile) return 50;

    const skills = Object.values(this.profile.skills);
    return skills.reduce((sum, s) => sum + s, 0) / skills.length;
  }

  // ============================================================================
  // FATIGUE DETECTION
  // ============================================================================

  detectFatigue(lapTimes: number[]): { isFatigued: boolean; fatigueLevel: number; recommendation: string } {
    if (lapTimes.length < 10) {
      return { isFatigued: false, fatigueLevel: 0, recommendation: 'Not enough data' };
    }

    // Compare first half vs second half of stint
    const midpoint = Math.floor(lapTimes.length / 2);
    const firstHalf = lapTimes.slice(0, midpoint);
    const secondHalf = lapTimes.slice(midpoint);

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    // Also check consistency degradation
    const firstVariance = firstHalf.reduce((sum, t) => sum + Math.pow(t - firstAvg, 2), 0) / firstHalf.length;
    const secondVariance = secondHalf.reduce((sum, t) => sum + Math.pow(t - secondAvg, 2), 0) / secondHalf.length;

    const paceDrop = (secondAvg - firstAvg) / firstAvg * 100;
    const consistencyDrop = (Math.sqrt(secondVariance) - Math.sqrt(firstVariance)) / 1000;

    const fatigueLevel = Math.max(0, Math.min(100, paceDrop * 10 + consistencyDrop * 20));
    const isFatigued = fatigueLevel > 30;

    let recommendation = '';
    if (fatigueLevel > 60) {
      recommendation = 'High fatigue detected - consider taking a break';
    } else if (fatigueLevel > 30) {
      recommendation = 'Moderate fatigue - pace dropping, stay focused';
    } else {
      recommendation = 'Performance stable - no fatigue detected';
    }

    // Update profile patterns
    if (this.profile && isFatigued) {
      this.profile.patterns.fatigueOnset = Math.min(
        this.profile.patterns.fatigueOnset,
        midpoint
      );
    }

    return { isFatigued, fatigueLevel, recommendation };
  }

  // ============================================================================
  // GETTERS
  // ============================================================================

  getProfile(): DriverDNA | null {
    return this.profile;
  }

  getSessionHistory(): SessionAnalysis[] {
    return this.sessionHistory;
  }

  getPerformanceTrends(): PerformanceTrend[] {
    return this.performanceTrends;
  }

  getTrackPerformance(trackId: string): TrackPerformance | null {
    return this.profile?.trackPerformance.get(trackId) || null;
  }

  getOverallRating(): number {
    return this.calculateOverallRating();
  }

  getSkillBreakdown(): Array<{ skill: string; rating: number; trend: 'up' | 'down' | 'stable' }> {
    if (!this.profile) return [];

    return Object.entries(this.profile.skills).map(([skill, rating]) => ({
      skill,
      rating,
      trend: 'stable' as const, // Would need historical data to determine
    }));
  }

  subscribe(listener: (profile: DriverDNA) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    if (this.profile) {
      this.listeners.forEach(l => l(this.profile!));
    }
  }

  reset(): void {
    this.currentSessionData = [];
  }
}

export const DriverProfileService = new DriverProfileClass();
export default DriverProfileService;
