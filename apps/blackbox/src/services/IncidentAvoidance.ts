/**
 * Predictive Incident Avoidance
 * Analyzes competitor behavior patterns and warns before aggressive drivers approach
 */

import type { CompetitorData } from '../types';

export interface DriverBehaviorProfile {
  driverId: string;
  driverName: string;
  aggressionRating: number; // 0-100
  incidentCount: number;
  incidentsThisSession: number;
  contactFrequency: number; // contacts per race
  diveBombRisk: number; // 0-100
  defensiveRating: number; // How aggressive when defending
  overtakeStyle: 'clean' | 'aggressive' | 'reckless';
  trustLevel: 'high' | 'medium' | 'low' | 'avoid';
  notes: string[];
}

export interface ThreatAssessment {
  driver: string;
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
  distance: number; // seconds gap
  approaching: boolean;
  closingRate: number; // seconds per lap
  predictedContact: number; // laps until potential contact
  warnings: string[];
  recommendation: string;
}

export interface IncidentPrediction {
  probability: number; // 0-100
  type: 'contact' | 'divebomb' | 'squeeze' | 'brake_check' | 'track_limits';
  corner?: number;
  description: string;
  avoidanceStrategy: string;
}

export interface BattleAnalysis {
  opponent: string;
  battleDuration: number; // laps
  positionChanges: number;
  contactRisk: number;
  recommendedStrategy: 'defend' | 'attack' | 'let_pass' | 'hold_position';
  reasoning: string;
}

interface DriverHistory {
  driverId: string;
  incidents: Array<{
    lap: number;
    type: string;
    severity: 'minor' | 'major';
    involvedDriver?: string;
  }>;
  lapTimes: number[];
  positionHistory: number[];
  gapHistory: number[];
}

class IncidentAvoidanceClass {
  private driverProfiles: Map<string, DriverBehaviorProfile> = new Map();
  private driverHistory: Map<string, DriverHistory> = new Map();
  private currentThreats: ThreatAssessment[] = [];
  private activeBattles: Map<string, BattleAnalysis> = new Map();
  
  private playerPosition = 0;
  private playerGapAhead = 0;
  private playerGapBehind = 0;

  private listeners: Set<(threats: ThreatAssessment[]) => void> = new Set();
  private alertListeners: Set<(alert: string) => void> = new Set();

  // ============================================================================
  // COMPETITOR ANALYSIS
  // ============================================================================

  updateCompetitors(competitors: CompetitorData[], playerPosition: number, gapAhead: number, gapBehind: number): void {
    this.playerPosition = playerPosition;
    this.playerGapAhead = gapAhead;
    this.playerGapBehind = gapBehind;

    for (const comp of competitors) {
      this.updateDriverHistory(comp);
      this.updateDriverProfile(comp);
    }

    // Analyze threats
    this.currentThreats = this.analyzeThreats(competitors);

    // Check for active battles
    this.updateBattles(competitors);

    // Generate alerts for high threats
    this.generateAlerts();

    this.notifyListeners();
  }

  private updateDriverHistory(comp: CompetitorData): void {
    const history = this.driverHistory.get(comp.driver) || {
      driverId: comp.driver,
      incidents: [],
      lapTimes: [],
      positionHistory: [],
      gapHistory: [],
    };

    // Track position changes
    history.positionHistory.push(comp.position);
    if (history.positionHistory.length > 50) history.positionHistory.shift();

    // Track lap times
    const lapTime = this.parseLapTime(comp.lastLap);
    if (lapTime > 0) {
      history.lapTimes.push(lapTime);
      if (history.lapTimes.length > 20) history.lapTimes.shift();
    }

    // Track gap (to player)
    const gap = this.parseGap(comp.gap);
    history.gapHistory.push(gap);
    if (history.gapHistory.length > 20) history.gapHistory.shift();

    this.driverHistory.set(comp.driver, history);
  }

  private updateDriverProfile(comp: CompetitorData): void {
    const history = this.driverHistory.get(comp.driver);
    if (!history) return;

    const existing = this.driverProfiles.get(comp.driver);
    
    // Calculate aggression based on position changes
    const positionVolatility = this.calculateVolatility(history.positionHistory);
    
    // Calculate closing rate
    const closingRate = this.calculateClosingRate(history.gapHistory);

    // Determine overtake style based on how quickly positions change
    let overtakeStyle: DriverBehaviorProfile['overtakeStyle'] = 'clean';
    if (positionVolatility > 3) overtakeStyle = 'reckless';
    else if (positionVolatility > 1.5) overtakeStyle = 'aggressive';

    // Calculate trust level
    let trustLevel: DriverBehaviorProfile['trustLevel'] = 'high';
    const incidentCount = history.incidents.length;
    if (incidentCount >= 3) trustLevel = 'avoid';
    else if (incidentCount >= 2) trustLevel = 'low';
    else if (incidentCount >= 1) trustLevel = 'medium';

    const profile: DriverBehaviorProfile = {
      driverId: comp.driver,
      driverName: comp.driver,
      aggressionRating: existing?.aggressionRating || Math.min(100, positionVolatility * 20),
      incidentCount: existing?.incidentCount || 0,
      incidentsThisSession: history.incidents.length,
      contactFrequency: existing?.contactFrequency || 0,
      diveBombRisk: positionVolatility > 2 ? 70 : 30,
      defensiveRating: existing?.defensiveRating || 50,
      overtakeStyle,
      trustLevel,
      notes: existing?.notes || [],
    };

    this.driverProfiles.set(comp.driver, profile);
  }

  private calculateVolatility(positions: number[]): number {
    if (positions.length < 2) return 0;
    
    let totalChange = 0;
    for (let i = 1; i < positions.length; i++) {
      totalChange += Math.abs(positions[i] - positions[i - 1]);
    }
    
    return totalChange / (positions.length - 1);
  }

  private calculateClosingRate(gaps: number[]): number {
    if (gaps.length < 2) return 0;
    
    const recent = gaps.slice(-5);
    if (recent.length < 2) return 0;
    
    return (recent[0] - recent[recent.length - 1]) / recent.length;
  }

  // ============================================================================
  // THREAT ANALYSIS
  // ============================================================================

  private analyzeThreats(competitors: CompetitorData[]): ThreatAssessment[] {
    const threats: ThreatAssessment[] = [];

    // Analyze car behind
    const carBehind = competitors.find(c => c.position === this.playerPosition + 1);
    if (carBehind) {
      const threat = this.assessThreat(carBehind, 'behind');
      if (threat.threatLevel !== 'low') {
        threats.push(threat);
      }
    }

    // Analyze car ahead (for when we're attacking)
    const carAhead = competitors.find(c => c.position === this.playerPosition - 1);
    if (carAhead) {
      const threat = this.assessThreat(carAhead, 'ahead');
      threats.push(threat);
    }

    // Check for fast approaching cars further back
    for (const comp of competitors) {
      if (comp.position > this.playerPosition + 1 && comp.position <= this.playerPosition + 3) {
        const history = this.driverHistory.get(comp.driver);
        if (history) {
          const closingRate = this.calculateClosingRate(history.gapHistory);
          if (closingRate > 0.5) { // Closing more than 0.5s per lap
            threats.push(this.assessThreat(comp, 'approaching'));
          }
        }
      }
    }

    // Sort by threat level
    const threatOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    threats.sort((a, b) => threatOrder[a.threatLevel] - threatOrder[b.threatLevel]);

    return threats;
  }

  private assessThreat(comp: CompetitorData, relation: 'ahead' | 'behind' | 'approaching'): ThreatAssessment {
    const profile = this.driverProfiles.get(comp.driver);
    const history = this.driverHistory.get(comp.driver);
    
    const gap = Math.abs(this.parseGap(comp.gap));
    const closingRate = history ? this.calculateClosingRate(history.gapHistory) : 0;
    const approaching = closingRate > 0;

    // Calculate threat level
    let threatLevel: ThreatAssessment['threatLevel'] = 'low';
    const warnings: string[] = [];
    
    if (profile) {
      if (profile.trustLevel === 'avoid') {
        threatLevel = 'high';
        warnings.push(`${comp.driver} has caused ${profile.incidentsThisSession} incidents this session`);
      }
      
      if (profile.aggressionRating > 70) {
        threatLevel = threatLevel === 'low' ? 'medium' : 'high';
        warnings.push('Aggressive driving style');
      }
      
      if (profile.diveBombRisk > 60) {
        warnings.push('High divebomb risk into braking zones');
      }
    }

    if (gap < 0.5 && approaching) {
      threatLevel = 'critical';
      warnings.push('Very close and closing');
    } else if (gap < 1 && approaching) {
      threatLevel = threatLevel === 'low' ? 'medium' : 'high';
    }

    // Calculate predicted contact
    const predictedContact = closingRate > 0 ? gap / closingRate : 99;

    // Generate recommendation
    let recommendation = '';
    if (threatLevel === 'critical') {
      recommendation = 'Caution! Defend inside line or let pass safely';
    } else if (threatLevel === 'high') {
      recommendation = relation === 'behind' 
        ? 'Be aware of aggressive driver behind - cover inside'
        : 'Give extra space when overtaking';
    } else if (threatLevel === 'medium') {
      recommendation = 'Monitor closely';
    } else {
      recommendation = 'No immediate concern';
    }

    return {
      driver: comp.driver,
      threatLevel,
      distance: gap,
      approaching,
      closingRate,
      predictedContact,
      warnings,
      recommendation,
    };
  }

  // ============================================================================
  // BATTLE ANALYSIS
  // ============================================================================

  private updateBattles(competitors: CompetitorData[]): void {
    // Check if in battle with car ahead or behind
    const carAhead = competitors.find(c => c.position === this.playerPosition - 1);
    const carBehind = competitors.find(c => c.position === this.playerPosition + 1);

    if (carBehind && this.playerGapBehind < 2) {
      this.updateBattle(carBehind, 'defending');
    }

    if (carAhead && this.playerGapAhead < 2) {
      this.updateBattle(carAhead, 'attacking');
    }

    // Remove stale battles
    for (const [driver, battle] of this.activeBattles) {
      const comp = competitors.find(c => c.driver === driver);
      if (!comp || Math.abs(this.parseGap(comp.gap)) > 3) {
        this.activeBattles.delete(driver);
      }
    }
  }

  private updateBattle(comp: CompetitorData, mode: 'attacking' | 'defending'): void {
    const existing = this.activeBattles.get(comp.driver);
    const profile = this.driverProfiles.get(comp.driver);

    const battleDuration = existing ? existing.battleDuration + 1 : 1;
    const positionChanges = existing ? existing.positionChanges : 0;

    // Calculate contact risk
    let contactRisk = 20;
    if (profile) {
      contactRisk += profile.aggressionRating * 0.3;
      contactRisk += profile.incidentsThisSession * 15;
    }
    if (battleDuration > 5) contactRisk += 10; // Prolonged battles increase risk

    // Determine strategy
    let strategy: BattleAnalysis['recommendedStrategy'] = 'hold_position';
    let reasoning = '';

    if (mode === 'defending') {
      if (profile?.trustLevel === 'avoid') {
        strategy = 'let_pass';
        reasoning = 'Risky driver - safer to let pass and re-attack';
      } else if (contactRisk > 60) {
        strategy = 'defend';
        reasoning = 'High contact risk - defend firmly but fairly';
      } else {
        strategy = 'hold_position';
        reasoning = 'Maintain position, defend when necessary';
      }
    } else {
      if (profile?.defensiveRating && profile.defensiveRating > 70) {
        strategy = 'hold_position';
        reasoning = 'Aggressive defender - wait for clear opportunity';
      } else {
        strategy = 'attack';
        reasoning = 'Good opportunity to overtake';
      }
    }

    const battle: BattleAnalysis = {
      opponent: comp.driver,
      battleDuration,
      positionChanges,
      contactRisk: Math.min(100, contactRisk),
      recommendedStrategy: strategy,
      reasoning,
    };

    this.activeBattles.set(comp.driver, battle);
  }

  // ============================================================================
  // INCIDENT PREDICTION
  // ============================================================================

  predictIncident(cornerNumber: number): IncidentPrediction | null {
    // Check threats at specific corner
    for (const threat of this.currentThreats) {
      if (threat.threatLevel === 'critical' || threat.threatLevel === 'high') {
        const profile = this.driverProfiles.get(threat.driver);
        
        if (profile?.diveBombRisk && profile.diveBombRisk > 50) {
          return {
            probability: profile.diveBombRisk,
            type: 'divebomb',
            corner: cornerNumber,
            description: `${threat.driver} may attempt late dive into corner ${cornerNumber}`,
            avoidanceStrategy: 'Cover inside line early, brake slightly earlier',
          };
        }

        if (threat.distance < 0.3) {
          return {
            probability: 70,
            type: 'contact',
            corner: cornerNumber,
            description: `Very close to ${threat.driver} - contact risk high`,
            avoidanceStrategy: 'Give racing room, avoid sudden direction changes',
          };
        }
      }
    }

    return null;
  }

  // ============================================================================
  // ALERTS
  // ============================================================================

  private generateAlerts(): void {
    for (const threat of this.currentThreats) {
      if (threat.threatLevel === 'critical') {
        this.notifyAlert(`⚠️ CAUTION: ${threat.driver} - ${threat.warnings[0] || 'Very close'}`);
      } else if (threat.threatLevel === 'high' && threat.warnings.length > 0) {
        this.notifyAlert(`Warning: ${threat.driver} - ${threat.warnings[0]}`);
      }
    }
  }

  // ============================================================================
  // INCIDENT REPORTING
  // ============================================================================

  reportIncident(driverId: string, type: string, severity: 'minor' | 'major'): void {
    const history = this.driverHistory.get(driverId);
    if (history) {
      history.incidents.push({
        lap: 0, // Would need current lap
        type,
        severity,
      });
    }

    const profile = this.driverProfiles.get(driverId);
    if (profile) {
      profile.incidentCount++;
      profile.incidentsThisSession++;
      profile.aggressionRating = Math.min(100, profile.aggressionRating + 10);
      
      if (profile.incidentsThisSession >= 2) {
        profile.trustLevel = 'low';
        profile.notes.push(`Incident: ${type}`);
      }
      if (profile.incidentsThisSession >= 3) {
        profile.trustLevel = 'avoid';
      }
    }

    this.notifyListeners();
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private parseLapTime(lapTime: string): number {
    if (!lapTime || lapTime === '-') return 0;
    const parts = lapTime.split(':');
    if (parts.length === 2) {
      return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
    }
    return parseFloat(lapTime) || 0;
  }

  private parseGap(gap: string): number {
    if (!gap || gap === '-') return 99;
    const cleaned = gap.replace(/[^0-9.-]/g, '');
    return parseFloat(cleaned) || 99;
  }

  // ============================================================================
  // STATE
  // ============================================================================

  getThreats(): ThreatAssessment[] {
    return [...this.currentThreats];
  }

  getBattles(): BattleAnalysis[] {
    return Array.from(this.activeBattles.values());
  }

  getDriverProfile(driverId: string): DriverBehaviorProfile | null {
    return this.driverProfiles.get(driverId) || null;
  }

  getAllProfiles(): DriverBehaviorProfile[] {
    return Array.from(this.driverProfiles.values());
  }

  subscribe(listener: (threats: ThreatAssessment[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  subscribeToAlerts(listener: (alert: string) => void): () => void {
    this.alertListeners.add(listener);
    return () => this.alertListeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(l => l(this.currentThreats));
  }

  private notifyAlert(alert: string): void {
    this.alertListeners.forEach(l => l(alert));
  }

  reset(): void {
    this.driverProfiles.clear();
    this.driverHistory.clear();
    this.currentThreats = [];
    this.activeBattles.clear();
  }
}

export const IncidentAvoidance = new IncidentAvoidanceClass();
export default IncidentAvoidance;
