import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import { AppConfig } from '../config/AppConfig';
import { IRacingAdapter } from '../adapters/IRacingAdapter';
import { AssettoCorsaAdapter } from '../adapters/AssettoCorsaAdapter';
import { SimAdapter } from '../adapters/SimAdapter';
import { TelemetryData } from '../models/TelemetryData';
import { SessionManager, Session, SessionType, SessionStatus } from '../models/SessionModel';
import { DriverIdentificationService } from './DriverIdentificationService';

/**
 * Service responsible for capturing telemetry data from the sim racing platform
 */
export class TelemetryService extends EventEmitter {
  private adapter: SimAdapter | null = null;
  private isCapturing: boolean = false;
  private captureInterval: NodeJS.Timeout | null = null;
  private captureRate: number = 10; // Hz
  private sessionId: string = '';
  private localCacheEnabled: boolean = true;
  private localCachePath: string = '';
  private dataPointCount: number = 0;
  private dataRate: number = 0;
  private lastDataRateCalculation: number = 0;
  private dataPointsInLastSecond: number = 0;
  private sessionManager: SessionManager;
  private driverService: DriverIdentificationService;
  private currentTrackId: string = '';
  private currentTrackName: string = '';
  private lastLapNumber: number = 0;

  constructor() {
    super();
    this.sessionId = uuidv4();
    this.sessionManager = SessionManager.getInstance();
    this.driverService = new DriverIdentificationService();
  }

  /**
   * Initialize the telemetry service
   */
  public initialize(): void {
    console.log('Initializing TelemetryService');
    
    // Load configuration
    this.captureRate = AppConfig.getTelemetryCaptureRate() || 10;
    this.localCacheEnabled = AppConfig.getLocalCacheEnabled() || true;
    this.localCachePath = AppConfig.getLocalCachePath() || path.join(app.getPath('userData'), 'telemetry_cache');
    
    // Create cache directory if it doesn't exist
    if (this.localCacheEnabled && !fs.existsSync(this.localCachePath)) {
      fs.mkdirSync(this.localCachePath, { recursive: true });
    }
    
    // Initialize driver service
    this.driverService.initialize();
    
    // Create adapter based on selected sim
    const selectedSim = AppConfig.getSelectedSim() || 'iracing';
    this.createAdapter(selectedSim);
    
    // Listen for driver changes
    this.driverService.on('driver_changed', (driver, previousDriver) => {
      console.log(`Driver changed from ${previousDriver?.name || 'none'} to ${driver.name}`);
      
      // If we have an active session, update the driver
      const currentSession = this.sessionManager.getCurrentSession();
      if (currentSession) {
        this.sessionManager.startStint(driver);
        this.emit('driver_changed', { driver, previousDriver, sessionId: currentSession.id });
      }
    });
  }

  /**
   * Create the appropriate sim adapter
   */
  private createAdapter(simType: string): void {
    switch (simType.toLowerCase()) {
      case 'iracing':
        this.adapter = new IRacingAdapter();
        break;
      case 'assettocorsa':
        this.adapter = new AssettoCorsaAdapter();
        break;
      // Add more adapters as they are implemented
      // case 'rfactor2':
      //   this.adapter = new RFactor2Adapter();
      //   break;
      default:
        console.error(`Unsupported sim type: ${simType}`);
        this.adapter = null;
    }
    
    if (this.adapter) {
      this.adapter.on('connected', () => this.emit('sim_connected'));
      this.adapter.on('disconnected', () => this.emit('sim_disconnected'));
      this.adapter.on('error', (err) => this.emit('error', err));
    }
  }

  /**
   * Start capturing telemetry data
   */
  public start(): boolean {
    if (this.isCapturing) {
      console.log('TelemetryService is already running');
      return true;
    }
    
    if (!this.adapter) {
      console.error('No sim adapter available');
      this.emit('error', new Error('No sim adapter available'));
      return false;
    }
    
    try {
      // Connect to the sim
      const connected = this.adapter.connect();
      if (!connected) {
        console.error('Failed to connect to sim');
        this.emit('error', new Error('Failed to connect to sim'));
        return false;
      }
      
      // Start capture loop
      const captureMs = Math.floor(1000 / this.captureRate);
      this.captureInterval = setInterval(() => this.captureTelemetry(), captureMs);
      
      this.isCapturing = true;
      this.emit('started');
      console.log(`TelemetryService started, capturing at ${this.captureRate}Hz`);
      
      return true;
    } catch (err) {
      console.error('Error starting telemetry capture:', err);
      this.emit('error', err);
      return false;
    }
  }

  /**
   * Stop capturing telemetry data
   */
  public stop(): void {
    if (!this.isCapturing) {
      return;
    }
    
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
      this.captureInterval = null;
    }
    
    if (this.adapter) {
      this.adapter.disconnect();
    }
    
    this.isCapturing = false;
    this.emit('stopped');
    console.log('TelemetryService stopped');
  }

  /**
   * Capture a single telemetry data point
   */
  private captureTelemetry(): void {
    if (!this.adapter) return;
    
    try {
      // Get telemetry data from adapter
      const telemetryData = this.adapter.getTelemetryData();
      
      if (!telemetryData) {
        return;
      }
      
      // Add session ID and timestamp
      const enrichedData: TelemetryData = {
        ...telemetryData,
        sessionId: this.sessionId,
        timestamp: Date.now()
      };
      
      // Check for session changes (track, session type)
      this.checkSessionState(enrichedData);
      
      // Update driver profile with telemetry data
      this.driverService.processTelemetryForDriverProfile(enrichedData);
      
      // Update session manager with telemetry data
      this.sessionManager.updateWithTelemetry(enrichedData);
      
      // Check for lap changes
      if (enrichedData.lap && enrichedData.lap !== this.lastLapNumber) {
        if (enrichedData.lap > this.lastLapNumber) {
          this.sessionManager.incrementLapCount();
          this.emit('lap_completed', { 
            lapNumber: this.lastLapNumber,
            lapTime: enrichedData.lastLapTime,
            sessionId: this.sessionId
          });
        }
        this.lastLapNumber = enrichedData.lap;
      }
      
      // Emit the telemetry data
      this.emit('telemetry', enrichedData);
      
      // Update stats
      this.dataPointCount++;
      this.dataPointsInLastSecond++;
      
      // Cache locally if enabled
      if (this.localCacheEnabled) {
        this.cacheData(enrichedData);
      }
    } catch (err) {
      console.error('Error capturing telemetry:', err);
      this.emit('error', err);
    }
  }

  /**
   * Cache telemetry data locally
   */
  private cacheData(data: TelemetryData): void {
    try {
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const filename = `${timestamp}_${data.sessionId.slice(0, 8)}.json`;
      const filePath = path.join(this.localCachePath, filename);
      
      fs.writeFileSync(filePath, JSON.stringify(data));
    } catch (err) {
      console.error('Error caching telemetry data:', err);
    }
  }

  /**
   * Check if the service is currently capturing data
   */
  public isRunning(): boolean {
    return this.isCapturing;
  }

  /**
   * Get the current session ID
   */
  public getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Reset the session with a new ID
   */
  public resetSession(): void {
    // End current session if exists
    if (this.sessionManager.getCurrentSession()) {
      this.sessionManager.endSession();
    }
    
    this.sessionId = uuidv4();
    this.lastLapNumber = 0;
    this.emit('session_reset', this.sessionId);
  }
  
  /**
   * Check for session state changes
   */
  private checkSessionState(telemetryData: TelemetryData): void {
    // Check if we need to create a new session
    if (!this.sessionManager.getCurrentSession()) {
      this.startNewSession(telemetryData);
      return;
    }
    
    // Check for track changes
    if (telemetryData.trackId && telemetryData.trackId !== this.currentTrackId) {
      console.log(`Track changed from ${this.currentTrackId} to ${telemetryData.trackId}`);
      this.currentTrackId = telemetryData.trackId;
      this.currentTrackName = telemetryData.trackName || 'Unknown Track';
      
      // End current session and start a new one
      this.sessionManager.endSession();
      this.startNewSession(telemetryData);
    }
  }
  
  /**
   * Start a new session based on telemetry data
   */
  private startNewSession(telemetryData: TelemetryData): void {
    // Get current driver
    const currentDriver = this.driverService.getCurrentDriver();
    if (!currentDriver) {
      // Try to auto-detect driver
      this.driverService.autoDetectDriver().then(driver => {
        if (driver) {
          this.driverService.setCurrentDriver(driver);
          this.createSessionFromTelemetry(telemetryData, driver);
        } else {
          console.error('No driver available to start session');
        }
      });
    } else {
      this.createSessionFromTelemetry(telemetryData, currentDriver);
    }
  }
  
  /**
   * Create a new session from telemetry data
   */
  private createSessionFromTelemetry(telemetryData: TelemetryData, driver: any): void {
    // Extract track info
    const trackId = telemetryData.trackId || 'unknown_track';
    const trackName = telemetryData.trackName || 'Unknown Track';
    this.currentTrackId = trackId;
    this.currentTrackName = trackName;
    
    // Determine session type
    let sessionType = SessionType.PRACTICE;
    if (telemetryData.sessionType) {
      switch (telemetryData.sessionType.toLowerCase()) {
        case 'race':
          sessionType = SessionType.RACE;
          break;
        case 'qualify':
        case 'qualifying':
          sessionType = SessionType.QUALIFYING;
          break;
        case 'practice':
          sessionType = SessionType.PRACTICE;
          break;
        case 'test':
        case 'testing':
          sessionType = SessionType.TESTING;
          break;
      }
    }
    
    // Create new session
    const session = this.sessionManager.startSession(
      telemetryData.simName || this.adapter?.getSimType() || 'unknown',
      trackId,
      trackName,
      sessionType,
      driver
    );
    
    // Update session ID
    this.sessionId = session.id;
    
    // Reset lap counter
    this.lastLapNumber = telemetryData.lap || 0;
    
    // Emit session started event
    this.emit('session_started', {
      sessionId: session.id,
      trackId,
      trackName,
      sessionType,
      driver
    });
  }

  /**
   * Update service settings
   */
  public updateSettings(settings: any): void {
    if (!settings) return;
    
    // Update capture rate if provided
    if (settings.telemetryCaptureRate) {
      this.captureRate = settings.telemetryCaptureRate;
      
      // Update capture interval if already running
      if (this.isCapturing && this.captureInterval) {
        clearInterval(this.captureInterval);
        const captureMs = Math.floor(1000 / this.captureRate);
        this.captureInterval = setInterval(() => this.captureTelemetry(), captureMs);
      }
    }
    
    // Update local cache settings if provided
    if (settings.localCacheEnabled !== undefined) {
      this.localCacheEnabled = settings.localCacheEnabled;
    }
    
    if (settings.localCachePath) {
      this.localCachePath = settings.localCachePath;
      
      // Create cache directory if it doesn't exist
      if (this.localCacheEnabled && !fs.existsSync(this.localCachePath)) {
        fs.mkdirSync(this.localCachePath, { recursive: true });
      }
    }
    
    // Update adapter if sim type changed
    if (settings.selectedSim && (!this.adapter || this.adapter.getSimType() !== settings.selectedSim)) {
      const wasRunning = this.isCapturing;
      if (wasRunning) {
        this.stop();
      }
      
      this.createAdapter(settings.selectedSim);
      
      if (wasRunning) {
        this.start();
      }
    }
  }

  /**
   * Get telemetry statistics
   */
  public getStats(): { dataPointCount: number, dataRate: number } {
    // Calculate data rate if needed
    const now = Date.now();
    if (now - this.lastDataRateCalculation >= 1000) {
      this.dataRate = this.dataPointsInLastSecond;
      this.dataPointsInLastSecond = 0;
      this.lastDataRateCalculation = now;
    }
    
    return {
      dataPointCount: this.dataPointCount,
      dataRate: this.dataRate
    };
  }

  /**
   * Check if the service is active (connected to sim)
   */
  public isActive(): boolean {
    return this.adapter ? this.adapter.isConnected() : false;
  }
}
