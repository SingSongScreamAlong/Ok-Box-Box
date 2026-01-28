// Mock telemetry service that simulates live data from the relay
// This runs independently and provides realistic telemetry updates

import type { LiveTelemetry, SessionState } from './types';
import { mockDrivers } from './data';

type TelemetryListener = (telemetry: Map<string, LiveTelemetry>) => void;
type SessionListener = (session: SessionState) => void;

class MockTelemetryService {
  private telemetryData: Map<string, LiveTelemetry> = new Map();
  private sessionState: SessionState = {
    status: 'offline',
    sessionType: null,
    trackId: null,
    trackName: null,
    timeRemaining: null,
    lapsRemaining: null,
    flagState: null,
    airTemp: null,
    trackTemp: null,
  };
  
  private telemetryListeners: Set<TelemetryListener> = new Set();
  private sessionListeners: Set<SessionListener> = new Set();
  private updateInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  // Subscribe to telemetry updates
  subscribeTelemetry(listener: TelemetryListener): () => void {
    this.telemetryListeners.add(listener);
    // Immediately send current state
    listener(this.telemetryData);
    return () => this.telemetryListeners.delete(listener);
  }

  // Subscribe to session updates
  subscribeSession(listener: SessionListener): () => void {
    this.sessionListeners.add(listener);
    listener(this.sessionState);
    return () => this.sessionListeners.delete(listener);
  }

  private notifyTelemetryListeners() {
    this.telemetryListeners.forEach(listener => listener(this.telemetryData));
  }

  private notifySessionListeners() {
    this.sessionListeners.forEach(listener => listener(this.sessionState));
  }

  // Start the mock simulation
  startSession(trackId: string, trackName: string, sessionType: 'practice' | 'qualifying' | 'race') {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.sessionState = {
      status: 'connecting',
      sessionType: null,
      trackId: null,
      trackName: null,
      timeRemaining: null,
      lapsRemaining: null,
      flagState: null,
      airTemp: null,
      trackTemp: null,
    };
    this.notifySessionListeners();

    // Simulate connection delay
    setTimeout(() => {
      this.sessionState = {
        status: 'connected',
        sessionType: null,
        trackId,
        trackName,
        timeRemaining: null,
        lapsRemaining: null,
        flagState: null,
        airTemp: 22,
        trackTemp: 35,
      };
      this.notifySessionListeners();

      // Enter session after another delay
      setTimeout(() => {
        this.sessionState = {
          status: 'in_session',
          sessionType,
          trackId,
          trackName,
          timeRemaining: sessionType === 'race' ? 86400 : 3600, // 24h or 1h
          lapsRemaining: sessionType === 'race' ? 120 : null,
          flagState: 'green',
          airTemp: 22,
          trackTemp: 35,
        };
        this.notifySessionListeners();

        // Initialize driver telemetry
        this.initializeDriverTelemetry();
        
        // Start update loop
        this.updateInterval = setInterval(() => this.updateTelemetry(), 1000);
      }, 1500);
    }, 1000);
  }

  private initializeDriverTelemetry() {
    // Initialize telemetry for active drivers (first 3 for demo)
    const activeDrivers = mockDrivers.filter(d => d.available).slice(0, 3);
    
    activeDrivers.forEach((driver, index) => {
      const telemetry: LiveTelemetry = {
        driverId: driver.id,
        carId: 'car1',
        timestamp: new Date(),
        position: index + 5, // Start in P5, P6, P7
        classPosition: index + 2,
        lap: 1,
        lastLap: null,
        bestLap: null,
        gap: index === 0 ? '+12.345' : `+${(15 + index * 3).toFixed(3)}`,
        interval: index === 0 ? '+2.123' : `+${(2 + index).toFixed(3)}`,
        speed: 180 + Math.random() * 20,
        fuel: 95 - (index * 5),
        fuelPerLap: driver.fuelPerLap,
        lapsRemaining: Math.floor((95 - index * 5) / driver.fuelPerLap),
        tireWear: { fl: 100, fr: 100, rl: 100, rr: 100 },
        trackPosition: index * 0.15, // Spread around track
        sector: 1,
        inPit: false,
        incidents: 0,
        stintLaps: 0,
        delta: (Math.random() - 0.5) * 2,
      };
      this.telemetryData.set(driver.id, telemetry);
    });

    this.notifyTelemetryListeners();
  }

  private updateTelemetry() {
    this.telemetryData.forEach((telemetry, driverId) => {
      const driver = mockDrivers.find(d => d.id === driverId);
      if (!driver) return;

      // Update track position (move around track)
      telemetry.trackPosition += 0.008 + Math.random() * 0.004; // ~100-120 second laps
      
      // Crossed start/finish
      if (telemetry.trackPosition >= 1) {
        telemetry.trackPosition = 0;
        telemetry.lap++;
        telemetry.stintLaps++;
        
        // Generate lap time
        const baseLapTime = driver.avgLapTime / 1000; // Convert to seconds
        const variation = (Math.random() - 0.5) * 4; // +/- 2 seconds
        const newLapTime = baseLapTime + variation;
        
        telemetry.lastLap = newLapTime;
        if (!telemetry.bestLap || newLapTime < telemetry.bestLap) {
          telemetry.bestLap = newLapTime;
        }
        
        // Use fuel
        telemetry.fuel = Math.max(0, (telemetry.fuel || 95) - driver.fuelPerLap);
        telemetry.lapsRemaining = Math.floor((telemetry.fuel || 0) / driver.fuelPerLap);
        
        // Tire wear
        if (telemetry.tireWear) {
          telemetry.tireWear.fl = Math.max(0, telemetry.tireWear.fl - (1 + Math.random()));
          telemetry.tireWear.fr = Math.max(0, telemetry.tireWear.fr - (1.2 + Math.random()));
          telemetry.tireWear.rl = Math.max(0, telemetry.tireWear.rl - (0.8 + Math.random()));
          telemetry.tireWear.rr = Math.max(0, telemetry.tireWear.rr - (1 + Math.random()));
        }
      }

      // Update sector
      telemetry.sector = telemetry.trackPosition < 0.33 ? 1 : telemetry.trackPosition < 0.66 ? 2 : 3;

      // Update speed based on track position (simulate corners)
      const cornerFactor = Math.sin(telemetry.trackPosition * Math.PI * 6) * 0.2;
      telemetry.speed = 180 + cornerFactor * 100 + (Math.random() - 0.5) * 10;

      // Delta drifts
      telemetry.delta = (telemetry.delta || 0) + (Math.random() - 0.5) * 0.2;
      telemetry.delta = Math.max(-3, Math.min(3, telemetry.delta));

      // Position can change occasionally
      if (Math.random() < 0.02) {
        telemetry.position = Math.max(1, Math.min(30, (telemetry.position || 10) + (Math.random() > 0.5 ? 1 : -1)));
      }

      // Rare incident
      if (Math.random() < 0.001) {
        telemetry.incidents++;
      }

      telemetry.timestamp = new Date();
    });

    // Update session time
    if (this.sessionState.timeRemaining && this.sessionState.timeRemaining > 0) {
      this.sessionState.timeRemaining--;
      this.notifySessionListeners();
    }

    this.notifyTelemetryListeners();
  }

  stopSession() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.isRunning = false;
    this.telemetryData.clear();
    this.sessionState = {
      status: 'offline',
      sessionType: null,
      trackId: null,
      trackName: null,
      timeRemaining: null,
      lapsRemaining: null,
      flagState: null,
      airTemp: null,
      trackTemp: null,
    };
    this.notifySessionListeners();
    this.notifyTelemetryListeners();
  }

  getSessionState(): SessionState {
    return this.sessionState;
  }

  getTelemetry(): Map<string, LiveTelemetry> {
    return this.telemetryData;
  }

  getDriverTelemetry(driverId: string): LiveTelemetry | undefined {
    return this.telemetryData.get(driverId);
  }

  isSessionActive(): boolean {
    return this.isRunning && this.sessionState.status === 'in_session';
  }
}

// Singleton instance
export const mockTelemetryService = new MockTelemetryService();
