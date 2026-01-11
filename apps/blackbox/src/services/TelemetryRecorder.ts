/**
 * Telemetry Recording & Playback System
 * Records lap telemetry for analysis, comparison, and ghost car overlay
 */

import type { TelemetryData } from '../types';

export interface TelemetryFrame {
  timestamp: number;
  trackPosition: number; // 0-1
  data: TelemetryData;
}

export interface RecordedLap {
  id: string;
  sessionId: string;
  trackId: string;
  trackName: string;
  carName: string;
  lapNumber: number;
  lapTime: number; // ms
  sector1: number;
  sector2: number;
  sector3: number;
  isValid: boolean;
  isPB: boolean; // Personal Best
  frames: TelemetryFrame[];
  metadata: {
    date: string;
    fuelLoad: number;
    tireCompound: string;
    airTemp: number;
    trackTemp: number;
    conditions: 'dry' | 'damp' | 'wet';
  };
}

export interface RecordingSession {
  id: string;
  trackId: string;
  trackName: string;
  carName: string;
  startTime: string;
  laps: RecordedLap[];
  bestLap: RecordedLap | null;
  theoreticalBest: number; // Best S1 + Best S2 + Best S3
}

export interface PlaybackState {
  isPlaying: boolean;
  currentFrame: number;
  playbackSpeed: number; // 0.25, 0.5, 1, 2, 4
  lap: RecordedLap | null;
  ghostLap: RecordedLap | null;
}

export interface ComparisonData {
  trackPosition: number;
  playerSpeed: number;
  ghostSpeed: number;
  speedDelta: number;
  timeDelta: number; // + means behind ghost, - means ahead
  playerThrottle: number;
  ghostThrottle: number;
  playerBrake: number;
  ghostBrake: number;
  playerGear: number;
  ghostGear: number;
  playerLine: { x: number; y: number };
  ghostLine: { x: number; y: number };
}

class TelemetryRecorderClass {
  private isRecording = false;
  private currentSession: RecordingSession | null = null;
  private currentLapFrames: TelemetryFrame[] = [];
  private currentLapNumber = 0;
  private lapStartTime = 0;
  private sector1Time = 0;
  private sector2Time = 0;
  private lastTrackPosition = 0;
  
  private savedSessions: Map<string, RecordingSession> = new Map();
  private personalBests: Map<string, RecordedLap> = new Map(); // trackId -> best lap
  
  private playbackState: PlaybackState = {
    isPlaying: false,
    currentFrame: 0,
    playbackSpeed: 1,
    lap: null,
    ghostLap: null,
  };

  private listeners: Set<(state: any) => void> = new Set();
  private frameRate = 60; // Hz

  // ============================================================================
  // RECORDING
  // ============================================================================

  startRecording(trackId: string, trackName: string, carName: string): void {
    this.currentSession = {
      id: `session-${Date.now()}`,
      trackId,
      trackName,
      carName,
      startTime: new Date().toISOString(),
      laps: [],
      bestLap: null,
      theoreticalBest: 0,
    };
    this.isRecording = true;
    this.currentLapFrames = [];
    this.currentLapNumber = 0;
    this.notifyListeners();
  }

  stopRecording(): RecordingSession | null {
    this.isRecording = false;
    const session = this.currentSession;
    
    if (session && session.laps.length > 0) {
      this.savedSessions.set(session.id, session);
      this.saveToStorage();
    }
    
    this.currentSession = null;
    this.currentLapFrames = [];
    this.notifyListeners();
    
    return session;
  }

  recordFrame(telemetry: TelemetryData): void {
    if (!this.isRecording || !this.currentSession) return;

    const frame: TelemetryFrame = {
      timestamp: Date.now(),
      trackPosition: telemetry.trackPosition,
      data: { ...telemetry },
    };

    // Detect lap completion (crossed start/finish)
    if (this.lastTrackPosition > 0.95 && telemetry.trackPosition < 0.05) {
      this.completeLap(telemetry);
    }

    // Detect sector crossings
    if (this.lastTrackPosition < 0.33 && telemetry.trackPosition >= 0.33) {
      this.sector1Time = Date.now() - this.lapStartTime;
    }
    if (this.lastTrackPosition < 0.66 && telemetry.trackPosition >= 0.66) {
      this.sector2Time = Date.now() - this.lapStartTime - this.sector1Time;
    }

    this.currentLapFrames.push(frame);
    this.lastTrackPosition = telemetry.trackPosition;
  }

  private completeLap(telemetry: TelemetryData): void {
    if (!this.currentSession || this.currentLapFrames.length < 10) {
      // Reset for new lap
      this.currentLapFrames = [];
      this.lapStartTime = Date.now();
      this.currentLapNumber++;
      return;
    }

    const lapTime = Date.now() - this.lapStartTime;
    const sector3Time = lapTime - this.sector1Time - this.sector2Time;

    // Check if lap is valid (no off-tracks, penalties, etc.)
    const isValid = this.validateLap(this.currentLapFrames);

    // Check if personal best
    const trackKey = this.currentSession.trackId;
    const currentPB = this.personalBests.get(trackKey);
    const isPB = isValid && (!currentPB || lapTime < currentPB.lapTime);

    const recordedLap: RecordedLap = {
      id: `lap-${Date.now()}`,
      sessionId: this.currentSession.id,
      trackId: this.currentSession.trackId,
      trackName: this.currentSession.trackName,
      carName: this.currentSession.carName,
      lapNumber: this.currentLapNumber,
      lapTime,
      sector1: this.sector1Time,
      sector2: this.sector2Time,
      sector3: sector3Time,
      isValid,
      isPB,
      frames: [...this.currentLapFrames],
      metadata: {
        date: new Date().toISOString(),
        fuelLoad: telemetry.fuel,
        tireCompound: 'medium', // Would come from session data
        airTemp: 25, // Would come from weather
        trackTemp: 35,
        conditions: 'dry',
      },
    };

    this.currentSession.laps.push(recordedLap);

    // Update session best
    if (isValid) {
      if (!this.currentSession.bestLap || lapTime < this.currentSession.bestLap.lapTime) {
        this.currentSession.bestLap = recordedLap;
      }

      // Update personal best
      if (isPB) {
        this.personalBests.set(trackKey, recordedLap);
      }

      // Calculate theoretical best
      this.updateTheoreticalBest();
    }

    // Reset for next lap
    this.currentLapFrames = [];
    this.lapStartTime = Date.now();
    this.sector1Time = 0;
    this.sector2Time = 0;
    this.currentLapNumber++;

    this.notifyListeners();
  }

  private validateLap(frames: TelemetryFrame[]): boolean {
    // Check for obvious invalid conditions
    if (frames.length < 100) return false; // Too short
    
    // Check for large gaps (disconnection)
    for (let i = 1; i < frames.length; i++) {
      const gap = frames[i].timestamp - frames[i - 1].timestamp;
      if (gap > 1000) return false; // 1 second gap = invalid
    }

    // Could add: off-track detection, penalty detection, etc.
    return true;
  }

  private updateTheoreticalBest(): void {
    if (!this.currentSession) return;

    const validLaps = this.currentSession.laps.filter(l => l.isValid);
    if (validLaps.length === 0) return;

    const bestS1 = Math.min(...validLaps.map(l => l.sector1));
    const bestS2 = Math.min(...validLaps.map(l => l.sector2));
    const bestS3 = Math.min(...validLaps.map(l => l.sector3));

    this.currentSession.theoreticalBest = bestS1 + bestS2 + bestS3;
  }

  // ============================================================================
  // PLAYBACK
  // ============================================================================

  loadLapForPlayback(lap: RecordedLap): void {
    this.playbackState.lap = lap;
    this.playbackState.currentFrame = 0;
    this.playbackState.isPlaying = false;
    this.notifyListeners();
  }

  loadGhostLap(lap: RecordedLap): void {
    this.playbackState.ghostLap = lap;
    this.notifyListeners();
  }

  play(): void {
    this.playbackState.isPlaying = true;
    this.runPlayback();
  }

  pause(): void {
    this.playbackState.isPlaying = false;
    this.notifyListeners();
  }

  stop(): void {
    this.playbackState.isPlaying = false;
    this.playbackState.currentFrame = 0;
    this.notifyListeners();
  }

  setPlaybackSpeed(speed: number): void {
    this.playbackState.playbackSpeed = speed;
    this.notifyListeners();
  }

  seekToPosition(trackPosition: number): void {
    if (!this.playbackState.lap) return;

    const frames = this.playbackState.lap.frames;
    let closestFrame = 0;
    let minDiff = 1;

    for (let i = 0; i < frames.length; i++) {
      const diff = Math.abs(frames[i].trackPosition - trackPosition);
      if (diff < minDiff) {
        minDiff = diff;
        closestFrame = i;
      }
    }

    this.playbackState.currentFrame = closestFrame;
    this.notifyListeners();
  }

  private runPlayback(): void {
    if (!this.playbackState.isPlaying || !this.playbackState.lap) return;

    const frames = this.playbackState.lap.frames;
    if (this.playbackState.currentFrame >= frames.length - 1) {
      this.playbackState.isPlaying = false;
      this.playbackState.currentFrame = 0;
      this.notifyListeners();
      return;
    }

    this.playbackState.currentFrame++;
    this.notifyListeners();

    const interval = (1000 / this.frameRate) / this.playbackState.playbackSpeed;
    setTimeout(() => this.runPlayback(), interval);
  }

  getCurrentPlaybackFrame(): TelemetryFrame | null {
    if (!this.playbackState.lap) return null;
    return this.playbackState.lap.frames[this.playbackState.currentFrame] || null;
  }

  getGhostFrameAtPosition(trackPosition: number): TelemetryFrame | null {
    if (!this.playbackState.ghostLap) return null;

    const frames = this.playbackState.ghostLap.frames;
    let closest = frames[0];
    let minDiff = 1;

    for (const frame of frames) {
      const diff = Math.abs(frame.trackPosition - trackPosition);
      if (diff < minDiff) {
        minDiff = diff;
        closest = frame;
      }
    }

    return closest;
  }

  // ============================================================================
  // COMPARISON
  // ============================================================================

  getComparisonAtPosition(trackPosition: number): ComparisonData | null {
    const playerFrame = this.getCurrentPlaybackFrame();
    const ghostFrame = this.getGhostFrameAtPosition(trackPosition);

    if (!playerFrame || !ghostFrame) return null;

    // Calculate time delta
    const playerTimeAtPos = this.getTimeAtPosition(this.playbackState.lap!, trackPosition);
    const ghostTimeAtPos = this.getTimeAtPosition(this.playbackState.ghostLap!, trackPosition);
    const timeDelta = playerTimeAtPos - ghostTimeAtPos;

    return {
      trackPosition,
      playerSpeed: playerFrame.data.speed,
      ghostSpeed: ghostFrame.data.speed,
      speedDelta: playerFrame.data.speed - ghostFrame.data.speed,
      timeDelta,
      playerThrottle: playerFrame.data.throttle,
      ghostThrottle: ghostFrame.data.throttle,
      playerBrake: playerFrame.data.brake,
      ghostBrake: ghostFrame.data.brake,
      playerGear: playerFrame.data.gear,
      ghostGear: ghostFrame.data.gear,
      playerLine: { x: 0, y: 0 }, // Would need track coordinates
      ghostLine: { x: 0, y: 0 },
    };
  }

  private getTimeAtPosition(lap: RecordedLap, trackPosition: number): number {
    const frames = lap.frames;
    if (frames.length === 0) return 0;

    for (let i = 0; i < frames.length; i++) {
      if (frames[i].trackPosition >= trackPosition) {
        return frames[i].timestamp - frames[0].timestamp;
      }
    }

    return lap.lapTime;
  }

  getLiveComparison(currentTelemetry: TelemetryData): ComparisonData | null {
    const ghostLap = this.playbackState.ghostLap || this.personalBests.get(this.currentSession?.trackId || '');
    if (!ghostLap) return null;

    const ghostFrame = this.getGhostFrameAtPosition(currentTelemetry.trackPosition);
    if (!ghostFrame) return null;

    // Estimate current lap time
    const currentLapTime = this.currentLapFrames.length > 0 
      ? Date.now() - this.lapStartTime 
      : 0;
    
    const ghostTimeAtPos = this.getTimeAtPosition(ghostLap, currentTelemetry.trackPosition);
    const timeDelta = currentLapTime - ghostTimeAtPos;

    return {
      trackPosition: currentTelemetry.trackPosition,
      playerSpeed: currentTelemetry.speed,
      ghostSpeed: ghostFrame.data.speed,
      speedDelta: currentTelemetry.speed - ghostFrame.data.speed,
      timeDelta,
      playerThrottle: currentTelemetry.throttle,
      ghostThrottle: ghostFrame.data.throttle,
      playerBrake: currentTelemetry.brake,
      ghostBrake: ghostFrame.data.brake,
      playerGear: currentTelemetry.gear,
      ghostGear: ghostFrame.data.gear,
      playerLine: { x: 0, y: 0 },
      ghostLine: { x: 0, y: 0 },
    };
  }

  // ============================================================================
  // STORAGE
  // ============================================================================

  private saveToStorage(): void {
    try {
      const sessions = Array.from(this.savedSessions.entries());
      const pbs = Array.from(this.personalBests.entries());
      
      localStorage.setItem('blackbox_sessions', JSON.stringify(sessions));
      localStorage.setItem('blackbox_pbs', JSON.stringify(pbs));
    } catch (e) {
      console.warn('Failed to save telemetry to storage:', e);
    }
  }

  loadFromStorage(): void {
    try {
      const sessionsJson = localStorage.getItem('blackbox_sessions');
      const pbsJson = localStorage.getItem('blackbox_pbs');

      if (sessionsJson) {
        const sessions = JSON.parse(sessionsJson);
        this.savedSessions = new Map(sessions);
      }

      if (pbsJson) {
        const pbs = JSON.parse(pbsJson);
        this.personalBests = new Map(pbs);
      }
    } catch (e) {
      console.warn('Failed to load telemetry from storage:', e);
    }
  }

  getSavedSessions(): RecordingSession[] {
    return Array.from(this.savedSessions.values());
  }

  getPersonalBest(trackId: string): RecordedLap | null {
    return this.personalBests.get(trackId) || null;
  }

  deleteSession(sessionId: string): void {
    this.savedSessions.delete(sessionId);
    this.saveToStorage();
    this.notifyListeners();
  }

  exportSession(sessionId: string): string | null {
    const session = this.savedSessions.get(sessionId);
    if (!session) return null;
    return JSON.stringify(session);
  }

  importSession(json: string): boolean {
    try {
      const session = JSON.parse(json) as RecordingSession;
      this.savedSessions.set(session.id, session);
      this.saveToStorage();
      this.notifyListeners();
      return true;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // STATE
  // ============================================================================

  getState() {
    return {
      isRecording: this.isRecording,
      currentSession: this.currentSession,
      currentLapNumber: this.currentLapNumber,
      currentLapFrameCount: this.currentLapFrames.length,
      playbackState: { ...this.playbackState },
      savedSessionCount: this.savedSessions.size,
      personalBestCount: this.personalBests.size,
    };
  }

  subscribe(listener: (state: any) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach(l => l(state));
  }
}

export const TelemetryRecorder = new TelemetryRecorderClass();
export default TelemetryRecorder;
