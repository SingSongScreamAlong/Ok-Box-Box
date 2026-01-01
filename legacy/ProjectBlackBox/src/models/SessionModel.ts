/**
 * Session and stint tracking models for the Driver App
 */

import { EventEmitter } from 'events';
import { DriverProfile } from '../services/DriverIdentificationService';

/**
 * Session type enumeration
 */
export enum SessionType {
  PRACTICE = 'practice',
  QUALIFYING = 'qualifying',
  RACE = 'race',
  TESTING = 'testing',
  TRAINING = 'training'
}

/**
 * Session status enumeration
 */
export enum SessionStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ABORTED = 'aborted'
}

/**
 * Session model for tracking racing sessions
 */
export interface Session {
  id: string;
  simName: string; // iRacing, Assetto Corsa, etc.
  trackId: string;
  trackName: string;
  sessionType: SessionType;
  status: SessionStatus;
  startTime: number;
  endTime?: number;
  duration?: number; // seconds
  weather: {
    temperature: number; // Celsius
    trackTemperature: number; // Celsius
    humidity: number; // percentage
    windSpeed: number; // km/h
    windDirection: number; // degrees
    precipitation: number; // 0-1
  };
  participants: string[]; // Driver IDs
  currentDriverId?: string;
  stints: string[]; // Stint IDs
  laps: number;
  bestLap?: {
    time: number;
    driverId: string;
    lapNumber: number;
  };
  notes?: string;
  tags?: string[];
}

/**
 * Stint model for tracking driver stints within a session
 */
export interface Stint {
  id: string;
  sessionId: string;
  driverId: string;
  startTime: number;
  endTime?: number;
  duration?: number; // seconds
  laps: number;
  startLap: number;
  endLap?: number;
  averageLapTime?: number; // seconds
  bestLapTime?: number; // seconds
  consistency?: number; // 0-100
  fuelUsed?: number; // liters
  fuelRemaining?: number; // liters
  tireWear?: {
    frontLeft: number; // percentage
    frontRight: number;
    rearLeft: number;
    rearRight: number;
  };
  incidents?: number;
  fatigue?: {
    startLevel: number; // 0-100
    endLevel: number; // 0-100
    impactOnPerformance: number; // seconds per lap
  };
  performance?: {
    pace: number; // 0-100
    consistency: number; // 0-100
    fuelEfficiency: number; // 0-100
    tireManagement: number; // 0-100
    overall: number; // 0-100
  };
  notes?: string;
  tags?: string[];
}

/**
 * Driver handoff model for tracking driver changes
 */
export interface DriverHandoff {
  id: string;
  sessionId: string;
  stintId: string;
  outgoingDriverId: string;
  incomingDriverId: string;
  scheduledTime?: number;
  actualTime?: number;
  lap?: number;
  pitStopId?: string;
  preparationStatus: {
    incomingDriverReady: boolean;
    outgoingDriverNotified: boolean;
    teamNotified: boolean;
    setupPrepared: boolean;
    strategyUpdated: boolean;
  };
  notes?: string;
  completed: boolean;
  duration?: number; // seconds
}

/**
 * Session manager for handling session and stint tracking
 */
export class SessionManager extends EventEmitter {
  private static instance: SessionManager;
  private currentSession: Session | null = null;
  private currentStint: Stint | null = null;
  private sessions: Map<string, Session> = new Map();
  private stints: Map<string, Stint> = new Map();
  private handoffs: Map<string, DriverHandoff> = new Map();

  private constructor() {
    // Private constructor for singleton pattern
    super();
  }

  /**
   * Get the SessionManager instance
   */
  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Start a new session
   */
  public startSession(
    simName: string,
    trackId: string,
    trackName: string,
    sessionType: SessionType,
    driver: DriverProfile
  ): Session {
    // Generate a unique session ID
    const sessionId = `${simName}_${trackId}_${Date.now()}`;
    
    // Create new session
    const session: Session = {
      id: sessionId,
      simName,
      trackId,
      trackName,
      sessionType,
      status: SessionStatus.ACTIVE,
      startTime: Date.now(),
      weather: {
        temperature: 20,
        trackTemperature: 25,
        humidity: 50,
        windSpeed: 5,
        windDirection: 0,
        precipitation: 0
      },
      participants: [driver.id],
      currentDriverId: driver.id,
      stints: [],
      laps: 0
    };
    
    // Store session
    this.sessions.set(sessionId, session);
    this.currentSession = session;
    
    // Emit session started event
    this.emit('session_started', session);
    
    // Start first stint
    this.startStint(driver);
    
    return session;
  }

  /**
   * End the current session
   */
  public endSession(): Session | null {
    if (!this.currentSession) return null;
    
    // End current stint if active
    if (this.currentStint) {
      this.endStint();
    }
    
    // Update session
    this.currentSession.status = SessionStatus.COMPLETED;
    this.currentSession.endTime = Date.now();
    this.currentSession.duration = 
      (this.currentSession.endTime - this.currentSession.startTime) / 1000;
    
    const completedSession = { ...this.currentSession };
    
    // Clear current session
    this.currentSession = null;
    
    // Emit session ended event
    this.emit('session_ended', completedSession);
    
    return completedSession;
  }

  /**
   * Start a new stint with the given driver
   */
  public startStint(driver: DriverProfile): Stint | null {
    if (!this.currentSession) return null;
    
    // End current stint if active
    if (this.currentStint) {
      this.endStint();
    }
    
    // Generate a unique stint ID
    const stintId = `stint_${Date.now()}`;
    
    // Create new stint
    const stint: Stint = {
      id: stintId,
      sessionId: this.currentSession.id,
      driverId: driver.id,
      startTime: Date.now(),
      laps: 0,
      startLap: this.currentSession.laps + 1
    };
    
    // Store stint
    this.stints.set(stintId, stint);
    this.currentStint = stint;
    
    // Update session
    this.currentSession.stints.push(stintId);
    this.currentSession.currentDriverId = driver.id;
    
    // Add driver to participants if not already present
    if (!this.currentSession.participants.includes(driver.id)) {
      this.currentSession.participants.push(driver.id);
    }
    
    // Emit stint started event
    this.emit('stint_started', stint);
    
    return stint;
  }

  /**
   * End the current stint
   */
  public endStint(): Stint | null {
    if (!this.currentStint) return null;
    
    // Update stint
    this.currentStint.endTime = Date.now();
    this.currentStint.duration = 
      (this.currentStint.endTime - this.currentStint.startTime) / 1000;
    this.currentStint.endLap = this.currentSession?.laps || 0;
    
    const completedStint = { ...this.currentStint };
    
    // Clear current stint
    this.currentStint = null;
    
    // Emit stint ended event
    this.emit('stint_ended', completedStint);
    
    return completedStint;
  }

  /**
   * Initiate a driver handoff
   */
  public initiateHandoff(
    outgoingDriverId: string,
    incomingDriverId: string,
    scheduledTime?: number
  ): DriverHandoff | null {
    if (!this.currentSession || !this.currentStint) return null;
    
    // Generate a unique handoff ID
    const handoffId = `handoff_${Date.now()}`;
    
    // Create new handoff
    const handoff: DriverHandoff = {
      id: handoffId,
      sessionId: this.currentSession.id,
      stintId: this.currentStint.id,
      outgoingDriverId,
      incomingDriverId,
      scheduledTime,
      preparationStatus: {
        incomingDriverReady: false,
        outgoingDriverNotified: true,
        teamNotified: true,
        setupPrepared: false,
        strategyUpdated: false
      },
      completed: false
    };
    
    // Store handoff
    this.handoffs.set(handoffId, handoff);
    
    return handoff;
  }

  /**
   * Complete a driver handoff
   */
  public completeHandoff(
    handoffId: string,
    incomingDriver: DriverProfile
  ): DriverHandoff | null {
    const handoff = this.handoffs.get(handoffId);
    if (!handoff) return null;
    
    // Update handoff
    handoff.completed = true;
    handoff.actualTime = Date.now();
    handoff.duration = handoff.scheduledTime ? 
      (handoff.actualTime - handoff.scheduledTime) / 1000 : 0;
    
    // End current stint and start new one
    this.endStint();
    this.startStint(incomingDriver);
    
    return handoff;
  }

  /**
   * Get the current session
   */
  public getCurrentSession(): Session | null {
    return this.currentSession;
  }

  /**
   * Get the current stint
   */
  public getCurrentStint(): Stint | null {
    return this.currentStint;
  }

  /**
   * Update lap count for current session and stint
   */
  public incrementLapCount(): void {
    if (this.currentSession) {
      this.currentSession.laps += 1;
    }
    
    if (this.currentStint) {
      this.currentStint.laps += 1;
    }
  }

  /**
   * Update session with telemetry data
   */
  public updateWithTelemetry(telemetryData: any): void {
    // In a real implementation, this would update session and stint data
    // based on incoming telemetry
    
    // For now, just increment lap count if lap changed
    if (telemetryData.lap && this.currentSession) {
      if (telemetryData.lap > this.currentSession.laps) {
        this.incrementLapCount();
      }
    }
  }
}
