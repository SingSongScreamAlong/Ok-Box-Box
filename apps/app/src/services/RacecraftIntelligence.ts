/**
 * RacecraftIntelligence - Traffic & Incident Analysis
 * 
 * This is where most tools fail. We do it right.
 * 
 * Features:
 * - Traffic decision analysis
 * - Incident risk forecasting
 * - Passing vs waiting heuristics
 * - Defensive positioning guidance
 * - Draft and tow awareness
 */

import type { TelemetryData } from '../hooks/useRelay';
import type { DriverMemory } from '../types/driver-memory';

// ========================
// TYPES
// ========================

export interface TrafficContext {
  carAhead: CarProximity | null;
  carBehind: CarProximity | null;
  carsInProximity: number;
  inTraffic: boolean;
  trafficDensity: 'clear' | 'light' | 'moderate' | 'heavy';
}

export interface CarProximity {
  gap: number; // seconds
  closing: boolean;
  closingRate: number; // seconds per lap
  lapsUntilContact: number | null;
  relativeSpeed: number; // mph difference
  isLapped: boolean;
  isBattle: boolean; // fighting for position
}

export interface RacecraftDecision {
  type: 'pass' | 'wait' | 'defend' | 'let_go' | 'draft' | 'none';
  confidence: number;
  reasoning: string;
  timing: string | null; // "Next corner" or "Lap 5"
  risk: 'low' | 'medium' | 'high';
}

export interface IncidentRisk {
  level: 'low' | 'elevated' | 'high' | 'critical';
  factors: string[];
  recommendation: string;
}

export interface RacecraftCallout {
  message: string;
  urgency: 'critical' | 'important' | 'normal';
  type: 'traffic' | 'passing' | 'defending' | 'incident_risk' | 'draft';
}

// ========================
// RACECRAFT INTELLIGENCE CLASS
// ========================

export class RacecraftIntelligence {
  private memory: DriverMemory | null;
  private lastCallout: RacecraftCallout | null = null;
  private calloutCooldown: number = 0;

  constructor(memory: DriverMemory | null) {
    this.memory = memory;
  }

  /**
   * Analyze current traffic situation
   */
  analyzeTraffic(
    gapAhead: number | null,
    gapBehind: number | null,
    closingAhead: number | null,
    closingBehind: number | null
  ): TrafficContext {
    const carAhead = gapAhead !== null ? this.analyzeCarProximity(gapAhead, closingAhead) : null;
    const carBehind = gapBehind !== null ? this.analyzeCarProximity(gapBehind, closingBehind) : null;

    const inTraffic = (carAhead !== null && carAhead.gap < 2) || 
                      (carBehind !== null && carBehind.gap < 2);

    let carsInProximity = 0;
    if (carAhead && carAhead.gap < 3) carsInProximity++;
    if (carBehind && carBehind.gap < 3) carsInProximity++;

    let trafficDensity: TrafficContext['trafficDensity'] = 'clear';
    if (carsInProximity >= 2) trafficDensity = 'heavy';
    else if (carsInProximity === 1 && inTraffic) trafficDensity = 'moderate';
    else if (carsInProximity === 1) trafficDensity = 'light';

    return {
      carAhead,
      carBehind,
      carsInProximity,
      inTraffic,
      trafficDensity,
    };
  }

  private analyzeCarProximity(gap: number, closingRate: number | null): CarProximity {
    const closing = closingRate !== null && closingRate < 0;
    const rate = closingRate ?? 0;
    const lapsUntilContact = closing && rate !== 0 ? Math.abs(gap / rate) : null;

    return {
      gap,
      closing,
      closingRate: rate,
      lapsUntilContact,
      relativeSpeed: rate * 60, // rough conversion
      isLapped: false, // would need more data
      isBattle: gap < 1.5 && Math.abs(rate) < 0.3,
    };
  }

  /**
   * Make a racecraft decision
   */
  makeDecision(traffic: TrafficContext, currentLap: number, totalLaps: number | null): RacecraftDecision {
    // No traffic = no decision needed
    if (!traffic.inTraffic) {
      return {
        type: 'none',
        confidence: 1,
        reasoning: 'Clear track',
        timing: null,
        risk: 'low',
      };
    }

    const carAhead = traffic.carAhead;
    const carBehind = traffic.carBehind;

    // Analyze passing opportunity
    if (carAhead && carAhead.gap < 1.5 && carAhead.closing) {
      const driverStyle = this.memory?.overtakingStyle ?? 'patient';
      
      // Aggressive drivers get "pass" recommendation sooner
      if (driverStyle === 'aggressive' || carAhead.gap < 0.5) {
        return {
          type: 'pass',
          confidence: 0.7,
          reasoning: `Gap is ${carAhead.gap.toFixed(1)}s and closing. You have the pace.`,
          timing: 'Next opportunity',
          risk: carAhead.isBattle ? 'high' : 'medium',
        };
      }

      // Patient drivers wait for cleaner opportunity
      if (driverStyle === 'patient' && carAhead.gap > 0.8) {
        return {
          type: 'wait',
          confidence: 0.8,
          reasoning: 'You have the pace. Wait for a clean opportunity.',
          timing: 'Within 2 laps',
          risk: 'low',
        };
      }
    }

    // Analyze defensive situation
    if (carBehind && carBehind.gap < 1 && carBehind.closing) {
      const defensiveAwareness = this.memory?.defensiveAwareness ?? 0.5;

      if (defensiveAwareness > 0.6) {
        return {
          type: 'defend',
          confidence: 0.75,
          reasoning: `Car behind at ${carBehind.gap.toFixed(1)}s and closing.`,
          timing: 'Now',
          risk: 'medium',
        };
      } else {
        // Driver with low defensive awareness - suggest letting go if not critical
        if (totalLaps && currentLap < totalLaps * 0.8) {
          return {
            type: 'let_go',
            confidence: 0.6,
            reasoning: 'Faster car behind. Let them go, maintain your pace.',
            timing: 'Next straight',
            risk: 'low',
          };
        }
      }
    }

    // Draft opportunity
    if (carAhead && carAhead.gap > 0.5 && carAhead.gap < 1.5 && !carAhead.closing) {
      return {
        type: 'draft',
        confidence: 0.7,
        reasoning: 'Good draft position. Use the tow.',
        timing: null,
        risk: 'low',
      };
    }

    return {
      type: 'wait',
      confidence: 0.5,
      reasoning: 'Situation developing. Stay patient.',
      timing: null,
      risk: 'low',
    };
  }

  /**
   * Assess incident risk
   */
  assessIncidentRisk(
    traffic: TrafficContext,
    _telemetry: TelemetryData,
    mentalTiltLevel: number
  ): IncidentRisk {
    const factors: string[] = [];
    let riskScore = 0;

    // Traffic density
    if (traffic.trafficDensity === 'heavy') {
      factors.push('Heavy traffic');
      riskScore += 0.3;
    } else if (traffic.trafficDensity === 'moderate') {
      factors.push('Moderate traffic');
      riskScore += 0.15;
    }

    // Battle situation
    if (traffic.carAhead?.isBattle || traffic.carBehind?.isBattle) {
      factors.push('Active battle');
      riskScore += 0.25;
    }

    // Driver tilt
    if (mentalTiltLevel > 0.6) {
      factors.push('Elevated stress');
      riskScore += 0.2;
    }

    // Driver's incident proneness
    if (this.memory?.incidentProneness && this.memory.incidentProneness < 0.5) {
      factors.push('Historical incident risk');
      riskScore += 0.15;
    }

    // Closing rapidly
    if (traffic.carAhead?.closing && traffic.carAhead.closingRate < -0.5) {
      factors.push('Closing fast on car ahead');
      riskScore += 0.2;
    }

    // Determine level
    let level: IncidentRisk['level'] = 'low';
    if (riskScore > 0.7) level = 'critical';
    else if (riskScore > 0.5) level = 'high';
    else if (riskScore > 0.25) level = 'elevated';

    // Generate recommendation
    let recommendation = 'Clear running. Focus on your pace.';
    if (level === 'critical') {
      recommendation = 'High risk situation. Prioritize survival.';
    } else if (level === 'high') {
      recommendation = 'Be cautious. Leave margin.';
    } else if (level === 'elevated') {
      recommendation = 'Stay alert. Watch your mirrors.';
    }

    return { level, factors, recommendation };
  }

  /**
   * Generate a racecraft callout if appropriate
   */
  generateCallout(
    traffic: TrafficContext,
    decision: RacecraftDecision,
    incidentRisk: IncidentRisk
  ): RacecraftCallout | null {
    const now = Date.now();
    
    // Respect cooldown (don't spam callouts)
    if (now < this.calloutCooldown) return null;

    // Critical incident risk
    if (incidentRisk.level === 'critical') {
      this.calloutCooldown = now + 10000;
      return {
        message: incidentRisk.recommendation,
        urgency: 'critical',
        type: 'incident_risk',
      };
    }

    // Active pass/defend decision
    if (decision.type === 'pass' && decision.confidence > 0.6) {
      this.calloutCooldown = now + 15000;
      return {
        message: `Passing opportunity. ${decision.reasoning}`,
        urgency: 'important',
        type: 'passing',
      };
    }

    if (decision.type === 'defend' && decision.confidence > 0.6) {
      this.calloutCooldown = now + 10000;
      return {
        message: `Defend. ${decision.reasoning}`,
        urgency: 'important',
        type: 'defending',
      };
    }

    // Traffic awareness
    if (traffic.trafficDensity === 'heavy' && !this.lastCallout) {
      this.calloutCooldown = now + 20000;
      return {
        message: 'Heavy traffic. Stay patient.',
        urgency: 'normal',
        type: 'traffic',
      };
    }

    return null;
  }

  /**
   * Get passing heuristics for the driver
   */
  getPassingHeuristics(): string[] {
    const heuristics: string[] = [];
    const style = this.memory?.overtakingStyle ?? 'patient';

    if (style === 'aggressive') {
      heuristics.push('You tend to commit early. Make sure the move is on.');
      heuristics.push('Your strength is late braking. Use it.');
    } else if (style === 'patient') {
      heuristics.push('Wait for the mistake. It will come.');
      heuristics.push('Pressure without contact. Let them crack.');
    } else if (style === 'opportunistic') {
      heuristics.push('Watch for their weak corners.');
      heuristics.push('One clean move. Make it count.');
    }

    return heuristics;
  }
}

// ========================
// FACTORY FUNCTION
// ========================

export function createRacecraftIntelligence(memory: DriverMemory | null): RacecraftIntelligence {
  return new RacecraftIntelligence(memory);
}
