/**
 * APEX - AI Performance EXpert
 * The intelligent race strategist that understands context and provides
 * natural language strategy advice. This is the core differentiator.
 */

import type { TelemetryData, CompetitorData, SessionInfo } from '../types';

export interface ApexContext {
  // Race state
  currentLap: number;
  totalLaps: number;
  racePosition: number;
  gapAhead: number;
  gapBehind: number;
  
  // Car state
  tireWear: number;
  tireTemp: number;
  fuelRemaining: number;
  fuelPerLap: number;
  
  // Performance
  currentPace: number;
  bestLapTime: number;
  lastLapTime: number;
  consistency: number;
  
  // Strategy
  pitStopsCompleted: number;
  pitStopsPlanned: number;
  currentTireCompound: string;
  
  // Competitors
  competitors: CompetitorData[];
  
  // Conditions
  trackTemp: number;
  weather: string;
  gripLevel: number;
  
  // Session
  sessionType: 'practice' | 'qualifying' | 'race';
  timeRemaining?: number;
}

export interface ApexMessage {
  id: string;
  role: 'user' | 'apex' | 'system';
  content: string;
  timestamp: number;
  context?: Partial<ApexContext>;
}

export interface ApexInsight {
  type: 'strategy' | 'pace' | 'tires' | 'fuel' | 'weather' | 'competitor' | 'general';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  message: string;
  action?: string;
  data?: Record<string, unknown>;
}

export interface ApexRecommendation {
  action: string;
  reasoning: string;
  confidence: number;
  alternatives: string[];
  risks: string[];
}

// Pre-built response templates for common scenarios
const STRATEGY_TEMPLATES = {
  undercut: {
    trigger: (ctx: ApexContext) => ctx.gapAhead < 2 && ctx.gapAhead > 0.5 && ctx.tireWear > 40,
    response: (ctx: ApexContext) => `Undercut opportunity on ${ctx.competitors[0]?.driver || 'car ahead'}. Gap is ${ctx.gapAhead.toFixed(1)}s and their tires are likely worn. Pit this lap for fresh rubber and push hard on the out-lap.`,
  },
  overcut: {
    trigger: (ctx: ApexContext) => ctx.gapAhead < 3 && ctx.tireWear < 30 && ctx.currentPace < ctx.bestLapTime * 1.02,
    response: (_ctx: ApexContext) => `Consider the overcut. Your tires still have life and you're on pace. Stay out 2-3 more laps while they pit - track position is valuable here.`,
  },
  defend: {
    trigger: (ctx: ApexContext) => ctx.gapBehind < 1 && ctx.gapBehind > 0,
    response: (ctx: ApexContext) => `${ctx.competitors.find(c => c.position === ctx.racePosition + 1)?.driver || 'Car behind'} is ${ctx.gapBehind.toFixed(1)}s back and closing. Cover the inside into braking zones. Don't defend too hard and lose time to the car ahead.`,
  },
  tireManagement: {
    trigger: (ctx: ApexContext) => ctx.tireWear > 60 && ctx.pitStopsCompleted >= ctx.pitStopsPlanned,
    response: (ctx: ApexContext) => `Tires at ${ctx.tireWear.toFixed(0)}% wear and no more stops planned. Manage them - short shift out of slow corners, avoid kerbs, and smooth inputs. ${Math.ceil((ctx.totalLaps - ctx.currentLap) * 0.8)} laps to go.`,
  },
  fuelSave: {
    trigger: (ctx: ApexContext) => {
      const fuelNeeded = (ctx.totalLaps - ctx.currentLap) * ctx.fuelPerLap;
      return ctx.fuelRemaining < fuelNeeded * 1.05;
    },
    response: (ctx: ApexContext) => {
      const deficit = (ctx.totalLaps - ctx.currentLap) * ctx.fuelPerLap - ctx.fuelRemaining;
      return `Fuel is tight. ${deficit.toFixed(1)}L short. Lift and coast into turns 1, 5, and the final corner. Target ${(ctx.fuelPerLap * 0.9).toFixed(2)}L per lap.`;
    },
  },
  push: {
    trigger: (ctx: ApexContext) => ctx.gapAhead < 3 && ctx.gapAhead > 1.5 && ctx.tireWear < 40,
    response: (ctx: ApexContext) => `Gap to ${ctx.competitors[0]?.driver || 'P' + (ctx.racePosition - 1)} is ${ctx.gapAhead.toFixed(1)}s. Tires are good, push now! You can close this in ${Math.ceil(ctx.gapAhead / 0.3)} laps at current delta.`,
  },
  pitWindow: {
    trigger: (ctx: ApexContext) => ctx.tireWear > 50 && ctx.pitStopsCompleted < ctx.pitStopsPlanned,
    response: (ctx: ApexContext) => `Pit window is open. Tires at ${ctx.tireWear.toFixed(0)}% wear. Optimal pit lap is ${ctx.currentLap + Math.ceil((70 - ctx.tireWear) / 2)}. Watch for traffic and competitor pit stops.`,
  },
  weather: {
    trigger: (ctx: ApexContext) => ctx.weather === 'rain_incoming',
    response: () => `Rain expected soon. Stay out as long as possible on slicks, then pit for inters. Being first to react can gain multiple positions.`,
  },
};

class ApexClass {
  private context: ApexContext | null = null;
  private conversationHistory: ApexMessage[] = [];
  private insights: ApexInsight[] = [];
  private lastInsightTime = 0;
  private insightCooldown = 30000; // 30 seconds between proactive insights

  private listeners: Set<(message: ApexMessage) => void> = new Set();
  private insightListeners: Set<(insight: ApexInsight) => void> = new Set();

  // ============================================================================
  // CONTEXT UPDATES
  // ============================================================================

  updateContext(telemetry: TelemetryData, session: SessionInfo, competitors: CompetitorData[]): void {
    const avgTireWear = (
      telemetry.tires.frontLeft.wear +
      telemetry.tires.frontRight.wear +
      telemetry.tires.rearLeft.wear +
      telemetry.tires.rearRight.wear
    ) / 4;

    const avgTireTemp = (
      telemetry.tires.frontLeft.temp +
      telemetry.tires.frontRight.temp +
      telemetry.tires.rearLeft.temp +
      telemetry.tires.rearRight.temp
    ) / 4;

    this.context = {
      currentLap: telemetry.lap,
      totalLaps: session.totalLaps || 50,
      racePosition: telemetry.racePosition,
      gapAhead: telemetry.gapAhead,
      gapBehind: telemetry.gapBehind,
      tireWear: avgTireWear,
      tireTemp: avgTireTemp,
      fuelRemaining: telemetry.fuel,
      fuelPerLap: telemetry.fuelPerLap || 2.5,
      currentPace: telemetry.lapTime,
      bestLapTime: telemetry.bestLapTime,
      lastLapTime: telemetry.lapTime,
      consistency: 80, // Would calculate from lap time variance
      pitStopsCompleted: 0, // Would track
      pitStopsPlanned: 1,
      currentTireCompound: 'medium',
      competitors,
      trackTemp: session.weather.trackTemperature,
      weather: 'dry',
      gripLevel: session.weather.trackGrip,
      sessionType: session.session.toLowerCase().includes('race') ? 'race' : 
                   session.session.toLowerCase().includes('qual') ? 'qualifying' : 'practice',
    };

    // Check for proactive insights
    this.checkForInsights();
  }

  // ============================================================================
  // CONVERSATION
  // ============================================================================

  async ask(question: string): Promise<ApexMessage> {
    // Add user message to history
    const userMessage: ApexMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: question,
      timestamp: Date.now(),
      context: this.context ? { ...this.context } : undefined,
    };
    this.conversationHistory.push(userMessage);

    // Generate response
    const response = this.generateResponse(question);

    const apexMessage: ApexMessage = {
      id: `msg-${Date.now() + 1}`,
      role: 'apex',
      content: response,
      timestamp: Date.now(),
    };
    this.conversationHistory.push(apexMessage);

    this.notifyListeners(apexMessage);
    return apexMessage;
  }

  private generateResponse(question: string): string {
    const q = question.toLowerCase();
    const ctx = this.context;

    if (!ctx) {
      return "I don't have enough data yet. Start a session and I'll be able to help with strategy.";
    }

    // Parse intent from question
    if (q.includes('pit') && (q.includes('when') || q.includes('should'))) {
      return this.generatePitAdvice();
    }

    if (q.includes('tire') || q.includes('tyre')) {
      return this.generateTireAdvice();
    }

    if (q.includes('fuel')) {
      return this.generateFuelAdvice();
    }

    if (q.includes('undercut') || q.includes('overcut')) {
      return this.generateCutAdvice(q.includes('undercut'));
    }

    if (q.includes('defend') || q.includes('behind')) {
      return this.generateDefendAdvice();
    }

    if (q.includes('attack') || q.includes('overtake') || q.includes('pass')) {
      return this.generateAttackAdvice();
    }

    if (q.includes('strategy') || q.includes('plan')) {
      return this.generateStrategyOverview();
    }

    if (q.includes('pace') || q.includes('fast') || q.includes('slow')) {
      return this.generatePaceAdvice();
    }

    if (q.includes('weather') || q.includes('rain')) {
      return this.generateWeatherAdvice();
    }

    if (q.includes('push') || q.includes('more')) {
      return this.generatePushAdvice();
    }

    // Default contextual response
    return this.generateContextualAdvice();
  }

  // ============================================================================
  // ADVICE GENERATORS
  // ============================================================================

  private generatePitAdvice(): string {
    const ctx = this.context!;
    const lapsRemaining = ctx.totalLaps - ctx.currentLap;
    
    if (ctx.pitStopsCompleted >= ctx.pitStopsPlanned) {
      return `No more stops planned. ${lapsRemaining} laps to go. Manage your tires - they're at ${ctx.tireWear.toFixed(0)}% wear. ${ctx.tireWear > 60 ? 'Consider short shifting and avoiding kerbs.' : 'You should be fine to the end.'}`;
    }

    const optimalPitLap = ctx.currentLap + Math.ceil((70 - ctx.tireWear) / 2);
    const windowStart = Math.max(ctx.currentLap + 1, optimalPitLap - 3);
    const windowEnd = Math.min(ctx.totalLaps - 5, optimalPitLap + 3);

    let advice = `Pit window: Laps ${windowStart}-${windowEnd}. Optimal is lap ${optimalPitLap}. `;

    // Check for undercut/overcut opportunities
    if (ctx.gapAhead < 2 && ctx.gapAhead > 0) {
      advice += `Gap to car ahead is ${ctx.gapAhead.toFixed(1)}s - undercut is possible if you pit now and push hard. `;
    }

    // Check traffic
    const carsInWindow = ctx.competitors.filter(c => 
      Math.abs(c.position - ctx.racePosition) <= 2
    ).length;
    if (carsInWindow > 2) {
      advice += `Traffic around you - time your stop to exit in clean air.`;
    }

    return advice;
  }

  private generateTireAdvice(): string {
    const ctx = this.context!;
    
    let advice = `Tires at ${ctx.tireWear.toFixed(0)}% wear, ${ctx.tireTemp.toFixed(0)}°C. `;

    if (ctx.tireWear > 70) {
      advice += 'Significant degradation - expect 0.5-1s per lap slower. ';
      advice += 'Short shift, avoid kerbs, smooth inputs. ';
    } else if (ctx.tireWear > 50) {
      advice += 'Moderate wear - still competitive but manage them. ';
    } else if (ctx.tireWear > 30) {
      advice += 'Good condition - you can push. ';
    } else {
      advice += 'Fresh rubber - attack! ';
    }

    if (ctx.tireTemp < 80) {
      advice += 'Temps are low - weave on straights to build heat.';
    } else if (ctx.tireTemp > 100) {
      advice += 'Running hot - back off to preserve them.';
    }

    return advice;
  }

  private generateFuelAdvice(): string {
    const ctx = this.context!;
    const lapsRemaining = ctx.totalLaps - ctx.currentLap;
    const fuelNeeded = lapsRemaining * ctx.fuelPerLap;
    const surplus = ctx.fuelRemaining - fuelNeeded;

    if (surplus > 5) {
      return `Fuel is comfortable. ${ctx.fuelRemaining.toFixed(1)}L remaining, need ${fuelNeeded.toFixed(1)}L. You can push without saving.`;
    } else if (surplus > 0) {
      return `Fuel is okay but tight. ${ctx.fuelRemaining.toFixed(1)}L for ${lapsRemaining} laps. Light lift-and-coast in final sector as insurance.`;
    } else {
      const savePerLap = Math.abs(surplus) / lapsRemaining;
      return `Fuel critical! ${Math.abs(surplus).toFixed(1)}L short. Save ${savePerLap.toFixed(2)}L per lap. Lift and coast into every braking zone, short shift to 5th.`;
    }
  }

  private generateCutAdvice(isUndercut: boolean): string {
    const ctx = this.context!;
    const carAhead = ctx.competitors.find(c => c.position === ctx.racePosition - 1);

    if (isUndercut) {
      if (ctx.gapAhead > 3) {
        return `Gap is ${ctx.gapAhead.toFixed(1)}s - too big for undercut. You'd need to be within 2s and have fresh tire pace advantage.`;
      }
      if (ctx.tireWear < 30) {
        return `Your tires are still fresh at ${ctx.tireWear.toFixed(0)}% wear. Undercut works best when you can gain from the tire delta. Wait a few more laps.`;
      }
      return `Undercut is viable! Gap to ${carAhead?.driver || 'car ahead'} is ${ctx.gapAhead.toFixed(1)}s. Pit now, push hard on out-lap. Fresh tires should give you 1-1.5s advantage. You need to close ${ctx.gapAhead.toFixed(1)}s plus pit delta (~20s) before they pit.`;
    } else {
      if (ctx.tireWear > 50) {
        return `Tires at ${ctx.tireWear.toFixed(0)}% - overcut risky. You'll lose too much time on worn rubber.`;
      }
      return `Overcut could work. Stay out while ${carAhead?.driver || 'car ahead'} pits, put in 2-3 fast laps on clear track. Your tires have life left. Risk: if they don't pit soon, you lose the window.`;
    }
  }

  private generateDefendAdvice(): string {
    const ctx = this.context!;
    const carBehind = ctx.competitors.find(c => c.position === ctx.racePosition + 1);

    if (ctx.gapBehind > 2) {
      return `${carBehind?.driver || 'Car behind'} is ${ctx.gapBehind.toFixed(1)}s back - comfortable gap. Focus on your pace, don't look in mirrors yet.`;
    }

    if (ctx.gapBehind < 0.5) {
      return `DRS range! ${carBehind?.driver || 'Car behind'} has DRS. Cover the inside into braking zones, but don't over-defend and lose time. One defensive move per straight. If they're clearly faster, consider letting them go and following.`;
    }

    return `${carBehind?.driver || 'Car behind'} is ${ctx.gapBehind.toFixed(1)}s back and closing. Be aware but don't panic. Cover inside on key corners, keep your line through fast sections. Defending costs time - only do it when necessary.`;
  }

  private generateAttackAdvice(): string {
    const ctx = this.context!;
    const carAhead = ctx.competitors.find(c => c.position === ctx.racePosition - 1);

    if (ctx.gapAhead > 3) {
      return `Gap to ${carAhead?.driver || 'car ahead'} is ${ctx.gapAhead.toFixed(1)}s. Focus on consistent laps to close it. At 0.3s per lap gain, you'll catch them in ${Math.ceil(ctx.gapAhead / 0.3)} laps.`;
    }

    if (ctx.gapAhead < 1) {
      return `You're right there! ${ctx.gapAhead.toFixed(1)}s back. Get DRS, set up the move into a heavy braking zone. Don't lunge - be patient and make it stick. If they defend, try the switchback.`;
    }

    return `${carAhead?.driver || 'Car ahead'} is ${ctx.gapAhead.toFixed(1)}s up. Close the gap over the next few laps. Watch their lines - if they're struggling in certain corners, that's where you'll pass. Save your tires for the attack.`;
  }

  private generateStrategyOverview(): string {
    const ctx = this.context!;
    const lapsRemaining = ctx.totalLaps - ctx.currentLap;
    const stopsRemaining = ctx.pitStopsPlanned - ctx.pitStopsCompleted;

    let overview = `Lap ${ctx.currentLap}/${ctx.totalLaps}, P${ctx.racePosition}. `;
    overview += `${stopsRemaining} stop${stopsRemaining !== 1 ? 's' : ''} remaining. `;
    overview += `Tires: ${ctx.tireWear.toFixed(0)}% worn. Fuel: ${ctx.fuelRemaining.toFixed(1)}L. `;

    if (ctx.gapAhead < 2) {
      overview += `Fighting for position - ${ctx.gapAhead.toFixed(1)}s to car ahead. `;
    }
    if (ctx.gapBehind < 2) {
      overview += `Under pressure - ${ctx.gapBehind.toFixed(1)}s gap behind. `;
    }

    // Add recommendation
    if (ctx.tireWear > 60 && stopsRemaining > 0) {
      overview += 'Recommendation: Pit soon for fresh tires.';
    } else if (ctx.gapAhead < 2 && ctx.tireWear > 40) {
      overview += 'Recommendation: Consider undercut on car ahead.';
    } else if (ctx.gapBehind < 1) {
      overview += 'Recommendation: Defend position, manage gap.';
    } else {
      overview += 'Recommendation: Maintain pace, execute strategy.';
    }

    return overview;
  }

  private generatePaceAdvice(): string {
    const ctx = this.context!;
    const delta = ctx.lastLapTime - ctx.bestLapTime;

    if (delta < 500) {
      return `Pace is strong - ${(delta / 1000).toFixed(2)}s off your best. Keep it consistent. ${ctx.tireWear < 40 ? 'Tires are good, you can push harder.' : 'Manage the tires while maintaining this pace.'}`;
    } else if (delta < 1500) {
      return `Pace is okay - ${(delta / 1000).toFixed(2)}s off best. ${ctx.tireWear > 50 ? 'Tire wear is affecting pace.' : 'Look for time in braking zones and corner exits.'}`;
    } else {
      return `Pace has dropped - ${(delta / 1000).toFixed(2)}s off best. ${ctx.tireWear > 60 ? 'Tires are gone - pit soon.' : 'Check your lines and inputs. Are you overdriving?'}`;
    }
  }

  private generateWeatherAdvice(): string {
    const ctx = this.context!;

    if (ctx.weather === 'dry') {
      return `Conditions are dry. Track temp ${ctx.trackTemp}°C, grip at ${(ctx.gripLevel * 100).toFixed(0)}%. No weather changes expected. Focus on tire management.`;
    } else if (ctx.weather === 'rain_incoming') {
      return `Rain incoming! Stay out as long as possible on slicks, but be ready to pit for inters. Being first to react can gain 5+ positions. Watch the sky and track surface.`;
    } else {
      return `Wet conditions. Take it easy through standing water. Inters are optimal for damp, full wets for heavy rain. Track is drying? Consider gambling on slicks.`;
    }
  }

  private generatePushAdvice(): string {
    const ctx = this.context!;

    if (ctx.tireWear > 60) {
      return `Tires at ${ctx.tireWear.toFixed(0)}% - pushing will destroy them. Manage pace unless you're fighting for position.`;
    }

    const fuelOk = ctx.fuelRemaining > (ctx.totalLaps - ctx.currentLap) * ctx.fuelPerLap;
    if (!fuelOk) {
      return `Can't push - fuel is marginal. Save mode until the final laps.`;
    }

    return `Green light to push! Tires have life, fuel is okay. Attack the braking zones, maximize corner exit speed. ${ctx.gapAhead < 3 ? `Close that ${ctx.gapAhead.toFixed(1)}s gap!` : 'Build a cushion to the car behind.'}`;
  }

  private generateContextualAdvice(): string {
    const ctx = this.context!;

    // Check templates for matching scenarios
    for (const [, template] of Object.entries(STRATEGY_TEMPLATES)) {
      if (template.trigger(ctx)) {
        return template.response(ctx);
      }
    }

    // Default overview
    return this.generateStrategyOverview();
  }

  // ============================================================================
  // PROACTIVE INSIGHTS
  // ============================================================================

  private checkForInsights(): void {
    if (!this.context) return;
    if (Date.now() - this.lastInsightTime < this.insightCooldown) return;

    const ctx = this.context;

    // Check each template for triggered insights
    for (const [key, template] of Object.entries(STRATEGY_TEMPLATES)) {
      if (template.trigger(ctx)) {
        const insight: ApexInsight = {
          type: this.getInsightType(key),
          priority: this.getInsightPriority(key, ctx),
          title: this.getInsightTitle(key),
          message: template.response(ctx),
        };

        // Avoid duplicate insights
        const isDuplicate = this.insights.some(i => 
          i.title === insight.title && 
          Date.now() - (this.insights.indexOf(i) * 1000) < 60000
        );

        if (!isDuplicate) {
          this.insights.push(insight);
          this.notifyInsight(insight);
          this.lastInsightTime = Date.now();
          break; // Only one insight at a time
        }
      }
    }
  }

  private getInsightType(key: string): ApexInsight['type'] {
    const typeMap: Record<string, ApexInsight['type']> = {
      undercut: 'strategy',
      overcut: 'strategy',
      defend: 'competitor',
      tireManagement: 'tires',
      fuelSave: 'fuel',
      push: 'pace',
      pitWindow: 'strategy',
      weather: 'weather',
    };
    return typeMap[key] || 'general';
  }

  private getInsightPriority(key: string, ctx: ApexContext): ApexInsight['priority'] {
    if (key === 'fuelSave' && ctx.fuelRemaining < (ctx.totalLaps - ctx.currentLap) * ctx.fuelPerLap * 0.9) {
      return 'critical';
    }
    if (key === 'defend' && ctx.gapBehind < 0.5) {
      return 'high';
    }
    if (key === 'weather') {
      return 'high';
    }
    return 'medium';
  }

  private getInsightTitle(key: string): string {
    const titleMap: Record<string, string> = {
      undercut: 'Undercut Opportunity',
      overcut: 'Overcut Option',
      defend: 'Defensive Alert',
      tireManagement: 'Tire Management',
      fuelSave: 'Fuel Warning',
      push: 'Push Window',
      pitWindow: 'Pit Window Open',
      weather: 'Weather Alert',
    };
    return titleMap[key] || 'Strategy Update';
  }

  // ============================================================================
  // STATE
  // ============================================================================

  getConversationHistory(): ApexMessage[] {
    return [...this.conversationHistory];
  }

  getInsights(): ApexInsight[] {
    return [...this.insights];
  }

  clearHistory(): void {
    this.conversationHistory = [];
    this.insights = [];
  }

  subscribe(listener: (message: ApexMessage) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  subscribeToInsights(listener: (insight: ApexInsight) => void): () => void {
    this.insightListeners.add(listener);
    return () => this.insightListeners.delete(listener);
  }

  private notifyListeners(message: ApexMessage): void {
    this.listeners.forEach(l => l(message));
  }

  private notifyInsight(insight: ApexInsight): void {
    this.insightListeners.forEach(l => l(insight));
  }
}

export const Apex = new ApexClass();
export default Apex;
