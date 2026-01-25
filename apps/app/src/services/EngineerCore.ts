/**
 * EngineerCore - The Opinionated Race Engineer
 * 
 * This is NOT a neutral assistant. This is an engineer with:
 * - Opinions based on evidence
 * - Confidence in recommendations
 * - Willingness to disagree
 * - Contextual tone adjustment
 * - Silence when appropriate
 * 
 * The engineer JUDGES. That's what makes it valuable.
 */

import type { 
  DriverMemory, 
  DriverIdentity, 
  EngineerOpinion,
  EngineerPersonality,
  OpinionDomain,
  OpinionSentiment
} from '../types/driver-memory';
import type { TelemetryData, SessionInfo } from '../hooks/useRelay';

// ========================
// ENGINEER MESSAGE TYPES
// ========================

export type MessageUrgency = 'critical' | 'important' | 'normal' | 'low';
export type MessageTone = 'commanding' | 'advisory' | 'supportive' | 'analytical' | 'celebratory';

export interface EngineerMessage {
  id: string;
  content: string;
  urgency: MessageUrgency;
  tone: MessageTone;
  domain: OpinionDomain | 'general';
  speakable: boolean; // Can be spoken via TTS
  timestamp: number;
  expiresAt?: number; // Message becomes stale after this
}

export interface EngineerVerdict {
  summary: string;
  sentiment: 'positive' | 'neutral' | 'concern';
  confidence: number;
  topInsights: string[];
  actionableChange: string | null;
  emotionalFraming: string;
}

export interface SessionBriefing {
  primaryFocus: string;
  secondaryWatch: string | null;
  confidenceStatement: string;
  sessionGoal: 'pace' | 'consistency' | 'survival' | 'data_collection';
  trackReminder: string | null;
}

// ========================
// MENTAL STATE TYPES
// ========================

export interface MentalState {
  tiltLevel: number; // 0-1 (0 = calm, 1 = full tilt)
  fatigueLevel: number; // 0-1 (0 = fresh, 1 = exhausted)
  confidenceLevel: number; // 0-1 (0 = shattered, 1 = peak)
  focusLevel: number; // 0-1 (0 = scattered, 1 = locked in)
  overdriving: boolean;
  needsReset: boolean;
  lastIncidentLap: number | null;
  incidentsThisSession: number;
  lapsSinceIncident: number;
}

export interface MentalStateAlert {
  type: 'tilt' | 'fatigue' | 'confidence' | 'overdriving' | 'reset_needed';
  severity: 'warning' | 'critical';
  message: string;
  intervention: string;
}

// ========================
// ENGINEER CORE CLASS
// ========================

export class EngineerCore {
  private memory: DriverMemory | null;
  private identity: DriverIdentity | null;
  private opinions: EngineerOpinion[];
  private personality: EngineerPersonality;
  private lastMessage: EngineerMessage | null = null;
  private silenceUntil: number = 0;
  private messageHistory: EngineerMessage[] = [];
  
  // Mental state tracking
  private mentalState: MentalState = {
    tiltLevel: 0,
    fatigueLevel: 0,
    confidenceLevel: 0.5,
    focusLevel: 0.7,
    overdriving: false,
    needsReset: false,
    lastIncidentLap: null,
    incidentsThisSession: 0,
    lapsSinceIncident: 0,
  };
  private sessionStartTime: number = 0;
  private lastLapTime: number | null = null;
  private recentLapTimes: number[] = [];

  constructor(
    memory: DriverMemory | null,
    identity: DriverIdentity | null,
    opinions: EngineerOpinion[],
    personality: EngineerPersonality
  ) {
    this.memory = memory;
    this.identity = identity;
    this.opinions = opinions;
    this.personality = personality;
  }

  // ========================
  // CORE JUDGMENT METHODS
  // ========================

  /**
   * Form an opinion about the current situation
   * This is where the engineer JUDGES
   */
  formOpinion(
    domain: OpinionDomain,
    context: string,
    evidence: Record<string, unknown>
  ): EngineerOpinion | null {
    // Don't form opinions without sufficient data
    if (!this.memory || this.memory.memoryConfidence < 0.2) {
      return null;
    }

    // Example: Pace opinion based on delta
    if (domain === 'pace' && evidence.delta !== undefined) {
      const delta = evidence.delta as number;
      const consistency = this.memory.brakingConsistency || 0.5;

      if (delta > 0.5 && consistency < 0.6) {
        return {
          id: crypto.randomUUID(),
          driverProfileId: this.memory.driverProfileId,
          opinionDomain: 'pace',
          opinionContext: context,
          opinionSummary: "You're overdriving. Smooth inputs will find more time than pushing harder.",
          opinionDetail: `Your delta is +${delta.toFixed(3)}s and your consistency is below average. Focus on hitting your marks.`,
          opinionConfidence: 0.75,
          opinionSentiment: 'concern',
          isActionable: true,
          suggestedAction: 'Focus on brake consistency into the next corner',
          priority: 7,
          validFrom: new Date().toISOString(),
          validUntil: null,
          evidenceSessions: [],
          evidenceSummary: `Delta: +${delta.toFixed(3)}s, Consistency: ${(consistency * 100).toFixed(0)}%`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
    }

    return null;
  }

  /**
   * Decide whether to speak or stay silent
   * Silence is a feature, not a bug
   */
  shouldSpeak(urgency: MessageUrgency): boolean {
    const now = Date.now();

    // Always speak for critical messages
    if (urgency === 'critical') return true;

    // Respect silence period
    if (now < this.silenceUntil) return false;

    // Check driver's callout preference
    if (this.memory?.preferredCalloutFrequency === 'minimal') {
      return urgency === 'important' || urgency === 'critical';
    }

    if (this.memory?.preferredCalloutFrequency === 'frequent') {
      return true;
    }

    // Default: speak for important and above
    return urgency === 'important' || urgency === 'critical';
  }

  /**
   * Request silence for a period
   */
  requestSilence(durationMs: number): void {
    this.silenceUntil = Date.now() + durationMs;
  }

  // ========================
  // MESSAGE GENERATION
  // ========================

  /**
   * Generate a message with appropriate tone and framing
   */
  generateMessage(
    content: string,
    urgency: MessageUrgency,
    domain: OpinionDomain | 'general'
  ): EngineerMessage {
    const tone = this.determineTone(urgency, domain);
    const framedContent = this.frameMessage(content, tone);

    const message: EngineerMessage = {
      id: crypto.randomUUID(),
      content: framedContent,
      urgency,
      tone,
      domain,
      speakable: urgency === 'critical' || urgency === 'important',
      timestamp: Date.now(),
      expiresAt: urgency === 'critical' ? Date.now() + 10000 : Date.now() + 30000,
    };

    this.lastMessage = message;
    this.messageHistory.push(message);

    return message;
  }

  /**
   * Determine the appropriate tone based on context
   */
  private determineTone(urgency: MessageUrgency, domain: OpinionDomain | 'general'): MessageTone {
    if (urgency === 'critical') return 'commanding';
    
    if (this.personality.toneStyle === 'direct') {
      return urgency === 'important' ? 'commanding' : 'advisory';
    }

    if (this.personality.toneStyle === 'supportive' || this.personality.toneStyle === 'motivational') {
      return 'supportive';
    }

    if (this.personality.toneStyle === 'analytical') {
      return 'analytical';
    }

    return 'advisory';
  }

  /**
   * Frame the message content based on tone
   */
  private frameMessage(content: string, tone: MessageTone): string {
    // Terse mode: strip to essentials
    if (this.personality.verbosity === 'terse') {
      return this.makeTerse(content);
    }

    // Add framing based on tone
    switch (tone) {
      case 'commanding':
        return content; // Direct, no fluff
      case 'supportive':
        return this.addSupportiveFraming(content);
      case 'analytical':
        return this.addAnalyticalFraming(content);
      case 'celebratory':
        return this.addCelebratoryFraming(content);
      default:
        return content;
    }
  }

  private makeTerse(content: string): string {
    // Remove filler words and shorten
    return content
      .replace(/I think |I believe |It seems like /gi, '')
      .replace(/You might want to consider /gi, '')
      .replace(/\. /g, '. ')
      .trim();
  }

  private addSupportiveFraming(content: string): string {
    if (this.memory?.needsConfidenceBuilding) {
      return `You've got this. ${content}`;
    }
    return content;
  }

  private addAnalyticalFraming(content: string): string {
    return content; // Data speaks for itself
  }

  private addCelebratoryFraming(content: string): string {
    return `Nice work. ${content}`;
  }

  // ========================
  // STATE-SPECIFIC OUTPUTS
  // ========================

  /**
   * Generate pre-session briefing
   */
  generateBriefing(trackName: string, sessionType: string): SessionBriefing {
    const focus = this.determinePrimaryFocus(trackName);
    const goal = this.determineSessionGoal(sessionType);

    let confidenceStatement = "Let's see what we can do.";
    if (this.memory && this.memory.currentConfidence > 0.7) {
      confidenceStatement = "You're in good form. Trust your instincts.";
    } else if (this.memory && this.memory.currentConfidence < 0.4) {
      confidenceStatement = "Focus on the process. The pace will come.";
    }

    const trackReminder = this.getTrackReminder(trackName);

    return {
      primaryFocus: focus,
      secondaryWatch: this.getSecondaryWatch(),
      confidenceStatement,
      sessionGoal: goal,
      trackReminder,
    };
  }

  private determinePrimaryFocus(trackName: string): string {
    // Check for known weaknesses at this track
    if (this.memory?.highRiskCorners) {
      const trackCorner = this.memory.highRiskCorners.find(c => 
        c.track.toLowerCase().includes(trackName.toLowerCase())
      );
      if (trackCorner) {
        return `Watch ${trackCorner.corner}. You've had incidents there before.`;
      }
    }

    // Check current development focus
    if (this.identity?.currentDevelopmentFocus) {
      return `Work on ${this.identity.currentDevelopmentFocus}.`;
    }

    // Default based on memory
    if (this.memory?.brakingStyle === 'late') {
      return 'Focus on brake consistency. You tend to brake late.';
    }

    return 'Find your rhythm. Smooth inputs, build pace gradually.';
  }

  private getSecondaryWatch(): string | null {
    if (this.memory?.postIncidentTiltRisk && this.memory.postIncidentTiltRisk > 0.6) {
      return 'If something goes wrong, take a breath before pushing again.';
    }

    if (this.memory?.lateRaceDegradation && this.memory.lateRaceDegradation > 0.6) {
      return 'Manage your energy. You tend to fade late in sessions.';
    }

    return null;
  }

  private determineSessionGoal(sessionType: string): SessionBriefing['sessionGoal'] {
    if (sessionType === 'qualifying') return 'pace';
    if (sessionType === 'race') {
      if (this.memory?.incidentProneness && this.memory.incidentProneness < 0.5) {
        return 'survival';
      }
      return 'consistency';
    }
    return 'data_collection';
  }

  private getTrackReminder(trackName: string): string | null {
    // This would pull from track-specific memory
    // For now, return null
    return null;
  }

  /**
   * Generate post-run verdict
   */
  generateVerdict(
    sessionMetrics: {
      bestLap: number | null;
      avgLap: number | null;
      incidents: number;
      position: number | null;
      laps: number;
    }
  ): EngineerVerdict {
    const insights: string[] = [];
    let sentiment: EngineerVerdict['sentiment'] = 'neutral';
    let summary = '';
    let actionableChange: string | null = null;

    // Analyze the session
    if (sessionMetrics.incidents === 0 && sessionMetrics.laps > 5) {
      insights.push('Clean session. No incidents.');
      sentiment = 'positive';
    } else if (sessionMetrics.incidents > 2) {
      insights.push(`${sessionMetrics.incidents} incidents. That's too many.`);
      sentiment = 'concern';
      actionableChange = 'Next session: prioritize clean laps over pace.';
    }

    if (sessionMetrics.bestLap && sessionMetrics.avgLap) {
      const consistency = 1 - ((sessionMetrics.avgLap - sessionMetrics.bestLap) / sessionMetrics.bestLap);
      if (consistency > 0.98) {
        insights.push('Excellent consistency. Your laps are tight.');
      } else if (consistency < 0.95) {
        insights.push('Lap times are scattered. Work on repeatability.');
        if (!actionableChange) {
          actionableChange = 'Focus on hitting the same marks every lap.';
        }
      }
    }

    // Generate summary
    if (sentiment === 'positive') {
      summary = 'Good session. You executed well.';
    } else if (sentiment === 'concern') {
      summary = 'We have work to do. But that\'s why we practice.';
    } else {
      summary = 'Solid data collection. Let\'s review and improve.';
    }

    // Emotional framing based on driver needs
    let emotionalFraming = '';
    if (this.memory?.needsConfidenceBuilding && sentiment !== 'positive') {
      emotionalFraming = 'Every session is progress. Keep at it.';
    } else if (sentiment === 'positive') {
      emotionalFraming = 'That\'s the kind of session that builds championships.';
    } else {
      emotionalFraming = 'We\'ll get there. One session at a time.';
    }

    return {
      summary,
      sentiment,
      confidence: 0.8,
      topInsights: insights.slice(0, 2),
      actionableChange,
      emotionalFraming,
    };
  }

  // ========================
  // LIVE SESSION INTELLIGENCE
  // ========================

  /**
   * Process telemetry and generate appropriate callouts
   */
  processLiveTelemetry(
    telemetry: TelemetryData,
    session: SessionInfo
  ): EngineerMessage | null {
    // Fuel critical
    if (telemetry.fuel !== null && telemetry.fuelPerLap !== null) {
      const lapsLeft = telemetry.fuel / telemetry.fuelPerLap;
      if (lapsLeft < 2) {
        return this.generateMessage(
          'Box this lap. Fuel critical.',
          'critical',
          'general'
        );
      }
      if (lapsLeft < 4 && lapsLeft > 3.5) {
        return this.generateMessage(
          `Pit window open. ${Math.floor(lapsLeft)} laps of fuel.`,
          'important',
          'general'
        );
      }
    }

    // Pace feedback (only if driver wants it)
    if (telemetry.delta !== null && this.shouldSpeak('normal')) {
      if (telemetry.delta < -0.5) {
        return this.generateMessage(
          'Good pace. Keep it clean.',
          'low',
          'pace'
        );
      }
    }

    return null;
  }

  // ========================
  // UTILITY METHODS
  // ========================

  /**
   * Get the engineer's current assessment of the driver
   */
  getDriverAssessment(): string {
    if (!this.memory) {
      return "I'm still learning your style. Give me a few more sessions.";
    }

    const assessments: string[] = [];

    if (this.memory.brakingStyle !== 'unknown') {
      assessments.push(`You brake ${this.memory.brakingStyle}.`);
    }

    if (this.memory.overtakingStyle) {
      assessments.push(`Your racecraft is ${this.memory.overtakingStyle}.`);
    }

    if (this.identity?.driverArchetype) {
      assessments.push(`You're developing as a ${this.identity.driverArchetype.replace('_', ' ')}.`);
    }

    if (assessments.length === 0) {
      return "Building your profile. A few more sessions and I'll have a read on you.";
    }

    return assessments.join(' ');
  }

  /**
   * Admit uncertainty when appropriate
   */
  admitUncertainty(topic: string): string {
    if (this.personality.confidenceLevel === 'building') {
      return `I don't have enough data on ${topic} yet. Let's see how the session goes.`;
    }
    return `I'm not certain about ${topic}. We'll learn more as we go.`;
  }

  // ========================
  // MENTAL STATE MONITORING
  // ========================

  /**
   * Start a new session - reset mental state tracking
   */
  startSession(): void {
    this.sessionStartTime = Date.now();
    this.mentalState = {
      tiltLevel: 0,
      fatigueLevel: 0,
      confidenceLevel: this.memory?.currentConfidence ?? 0.5,
      focusLevel: 0.7,
      overdriving: false,
      needsReset: false,
      lastIncidentLap: null,
      incidentsThisSession: 0,
      lapsSinceIncident: 0,
    };
    this.recentLapTimes = [];
    this.lastLapTime = null;
  }

  /**
   * Record an incident and update mental state
   */
  recordIncident(currentLap: number): void {
    this.mentalState.incidentsThisSession++;
    this.mentalState.lastIncidentLap = currentLap;
    this.mentalState.lapsSinceIncident = 0;

    // Increase tilt based on driver's known tilt risk
    const tiltIncrease = this.memory?.postIncidentTiltRisk ?? 0.3;
    this.mentalState.tiltLevel = Math.min(1, this.mentalState.tiltLevel + tiltIncrease);

    // Decrease confidence
    this.mentalState.confidenceLevel = Math.max(0, this.mentalState.confidenceLevel - 0.15);

    // Check for incident clustering (multiple incidents close together)
    if (this.mentalState.incidentsThisSession >= 2 && this.mentalState.tiltLevel > 0.5) {
      this.mentalState.needsReset = true;
    }
  }

  /**
   * Record a completed lap and update mental state
   */
  recordLap(lapTime: number, currentLap: number): void {
    this.recentLapTimes.push(lapTime);
    if (this.recentLapTimes.length > 10) {
      this.recentLapTimes.shift();
    }

    // Update laps since incident
    if (this.mentalState.lastIncidentLap !== null) {
      this.mentalState.lapsSinceIncident = currentLap - this.mentalState.lastIncidentLap;
    }

    // Gradually reduce tilt over clean laps
    if (this.mentalState.lapsSinceIncident > 3) {
      this.mentalState.tiltLevel = Math.max(0, this.mentalState.tiltLevel - 0.1);
      this.mentalState.needsReset = false;
    }

    // Detect overdriving (lap times getting worse, high variance)
    if (this.recentLapTimes.length >= 3) {
      const recent = this.recentLapTimes.slice(-3);
      const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const variance = recent.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / recent.length;
      
      // High variance + getting slower = overdriving
      if (variance > 1 && this.lastLapTime && lapTime > this.lastLapTime) {
        this.mentalState.overdriving = true;
      } else {
        this.mentalState.overdriving = false;
      }
    }

    // Update fatigue based on session duration
    const sessionMinutes = (Date.now() - this.sessionStartTime) / (1000 * 60);
    const fatigueOnset = this.memory?.fatigueOnsetLap ?? 30;
    if (currentLap > fatigueOnset) {
      this.mentalState.fatigueLevel = Math.min(1, (currentLap - fatigueOnset) / 20);
    }

    // Boost confidence on clean, consistent laps
    if (this.mentalState.lapsSinceIncident > 5 && !this.mentalState.overdriving) {
      this.mentalState.confidenceLevel = Math.min(1, this.mentalState.confidenceLevel + 0.02);
    }

    this.lastLapTime = lapTime;
  }

  /**
   * Get current mental state
   */
  getMentalState(): MentalState {
    return { ...this.mentalState };
  }

  /**
   * Check for mental state alerts that need intervention
   */
  checkMentalStateAlerts(): MentalStateAlert | null {
    // Critical: Full tilt
    if (this.mentalState.tiltLevel > 0.8) {
      return {
        type: 'tilt',
        severity: 'critical',
        message: 'You\'re pushing too hard after that incident.',
        intervention: 'Take a breath. Reset. The pace will come back.',
      };
    }

    // Critical: Needs reset
    if (this.mentalState.needsReset) {
      return {
        type: 'reset_needed',
        severity: 'critical',
        message: 'Multiple incidents. Time to reset.',
        intervention: 'Pit in. Take 30 seconds. Clear your head.',
      };
    }

    // Warning: Overdriving
    if (this.mentalState.overdriving) {
      return {
        type: 'overdriving',
        severity: 'warning',
        message: 'You\'re overdriving. Lap times are scattered.',
        intervention: 'Smooth inputs. Hit your marks. The time will come.',
      };
    }

    // Warning: High fatigue
    if (this.mentalState.fatigueLevel > 0.7) {
      return {
        type: 'fatigue',
        severity: 'warning',
        message: 'You\'re getting tired. Focus is dropping.',
        intervention: 'Simplify. Protect position. Finish the race.',
      };
    }

    // Warning: Low confidence
    if (this.mentalState.confidenceLevel < 0.3) {
      return {
        type: 'confidence',
        severity: 'warning',
        message: 'Confidence is low. That\'s okay.',
        intervention: 'One corner at a time. Build momentum.',
      };
    }

    return null;
  }

  /**
   * Get a mental state summary for display
   */
  getMentalStateSummary(): string {
    const state = this.mentalState;
    
    if (state.tiltLevel > 0.6) {
      return 'Elevated stress. Focus on clean laps.';
    }
    if (state.overdriving) {
      return 'Overdriving detected. Smooth it out.';
    }
    if (state.fatigueLevel > 0.5) {
      return 'Fatigue building. Manage your energy.';
    }
    if (state.confidenceLevel > 0.7 && state.tiltLevel < 0.2) {
      return 'In the zone. Trust your instincts.';
    }
    if (state.lapsSinceIncident > 10) {
      return 'Clean run. Keep it up.';
    }
    
    return 'Monitoring...';
  }
}

// ========================
// FACTORY FUNCTION
// ========================

export function createEngineerCore(
  memory: DriverMemory | null,
  identity: DriverIdentity | null,
  opinions: EngineerOpinion[],
  personality: EngineerPersonality
): EngineerCore {
  return new EngineerCore(memory, identity, opinions, personality);
}
