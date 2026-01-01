/**
 * PitBoxCore - Main integration module for the Driver App
 * 
 * This module coordinates the various services and provides a unified API
 * for the main process to interact with the core functionality.
 */

import { EventEmitter } from 'events';
import { TelemetryService } from '../services/TelemetryService';
import { DataTransmissionService } from '../services/DataTransmissionService';
import { DriverIdentificationService, DriverProfile } from '../services/DriverIdentificationService';
import { AppConfig } from '../config/AppConfig';
import { SessionManager, Session, SessionType, SessionStatus } from '../models/SessionModel';
import { TelemetryData } from '../models/TelemetryData';

/**
 * PitBoxCore class - Main integration module for the Driver App
 */
export class PitBoxCore extends EventEmitter {
  private static instance: PitBoxCore;
  private telemetryService: TelemetryService;
  private dataTransmissionService: DataTransmissionService;
  private driverService: DriverIdentificationService;
  private sessionManager: SessionManager;
  private initialized: boolean = false;
  private status: {
    isConnected: boolean;
    isTransmitting: boolean;
    currentDriver: any | null;
    currentSession: Session | null;
    currentStint: any | null;
    telemetryStats: {
      dataPointCount: number;
      dataRate: number;
    };
  };

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    super();
    this.telemetryService = new TelemetryService();
    this.dataTransmissionService = new DataTransmissionService();
    this.driverService = new DriverIdentificationService();
    this.sessionManager = SessionManager.getInstance();
    
    this.status = {
      isConnected: false,
      isTransmitting: false,
      currentDriver: null,
      currentSession: null,
      currentStint: null,
      telemetryStats: {
        dataPointCount: 0,
        dataRate: 0
      }
    };
    
    this.setupEventListeners();
  }

  /**
   * Get the PitBoxCore instance (singleton)
   */
  public static getInstance(): PitBoxCore {
    if (!PitBoxCore.instance) {
      PitBoxCore.instance = new PitBoxCore();
    }
    return PitBoxCore.instance;
  }

  /**
   * Initialize all services
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    console.log('Initializing PitBoxCore...');
    
    // Initialize services
    await this.driverService.initialize();
    this.telemetryService.initialize();
    await this.dataTransmissionService.initialize(AppConfig.getServerUrl() || 'http://localhost:3000');
    
    // Auto-detect driver
    try {
      const driver = await this.driverService.autoDetectDriver();
      if (driver) {
        this.driverService.setCurrentDriver(driver);
        this.status.currentDriver = driver;
      }
    } catch (error) {
      console.error('Error auto-detecting driver:', error);
    }
    
    this.initialized = true;
    this.emit('initialized');
    console.log('PitBoxCore initialized');
  }

  /**
   * Setup event listeners for all services
   */
  private setupEventListeners(): void {
    // Telemetry service events
    this.telemetryService.on('telemetry', (data: TelemetryData) => {
      // Forward telemetry data to data transmission service
      this.dataTransmissionService.sendTelemetry(data);
      
      // Update status
      this.status.telemetryStats = this.telemetryService.getStats();
      
      // Emit telemetry event
      this.emit('telemetry', data);
    });
    
    this.telemetryService.on('sim_connected', () => {
      this.status.isConnected = true;
      this.emit('sim_connected');
    });
    
    this.telemetryService.on('sim_disconnected', () => {
      this.status.isConnected = false;
      this.emit('sim_disconnected');
    });
    
    this.telemetryService.on('session_started', (session) => {
      this.status.currentSession = session;
      this.emit('session_started', session);
    });
    
    this.telemetryService.on('session_reset', (sessionId) => {
      this.emit('session_reset', sessionId);
    });
    
    this.telemetryService.on('lap_completed', (lapInfo) => {
      this.emit('lap_completed', lapInfo);
    });
    
    // Data transmission service events
    this.dataTransmissionService.on('connected', () => {
      this.status.isTransmitting = true;
      this.emit('server_connected');
    });
    
    this.dataTransmissionService.on('disconnected', () => {
      this.status.isTransmitting = false;
      this.emit('server_disconnected');
    });
    
    this.dataTransmissionService.on('error', (error) => {
      this.emit('transmission_error', error);
    });
    
    // Driver service events
    this.driverService.on('driver_changed', (driver, previousDriver) => {
      this.status.currentDriver = driver;
      this.emit('driver_changed', { driver, previousDriver });
    });
    
    this.driverService.on('stint_ended', (stintInfo) => {
      this.emit('stint_ended', stintInfo);
    });
    
    // Session manager events
    this.sessionManager.on('stint_started', (stint) => {
      this.status.currentStint = stint;
      this.emit('stint_started', stint);
    });
    
    this.sessionManager.on('stint_ended', (stint) => {
      this.emit('stint_ended', stint);
    });
  }

  /**
   * Start all services
   */
  public start(): boolean {
    if (!this.initialized) {
      console.error('PitBoxCore not initialized');
      return false;
    }
    
    console.log('Starting PitBoxCore services...');
    
    // Start telemetry service
    const telemetryStarted = this.telemetryService.start();
    if (!telemetryStarted) {
      console.error('Failed to start telemetry service');
      return false;
    }
    
    // Connect to server - using internal method to access private connect method
    this.dataTransmissionService.reconnect();
    
    console.log('PitBoxCore services started');
    this.emit('started');
    
    return true;
  }

  /**
   * Stop all services
   */
  public stop(): void {
    console.log('Stopping PitBoxCore services...');
    
    // Stop telemetry service
    this.telemetryService.stop();
    
    // Disconnect from server
    this.dataTransmissionService.disconnect();
    
    console.log('PitBoxCore services stopped');
    this.emit('stopped');
  }

  /**
   * Get current status
   */
  public getStatus(): any {
    // Update status with latest data
    this.status.telemetryStats = this.telemetryService.getStats();
    this.status.currentDriver = this.driverService.getCurrentDriver();
    this.status.currentSession = this.sessionManager.getCurrentSession();
    this.status.currentStint = this.sessionManager.getCurrentStint();
    this.status.isConnected = this.telemetryService.isActive();
    this.status.isTransmitting = this.dataTransmissionService.isConnected();
    
    return { ...this.status };
  }

  /**
   * Set current driver
   */
  public setDriver(driverId: string): boolean {
    const driver = this.driverService.getDriverById(driverId);
    if (!driver) {
      return false;
    }
    
    this.driverService.setCurrentDriver(driver);
    return true;
  }

  /**
   * Create a new driver
   */
  public createDriver(name: string, email?: string, team?: string): any {
    return this.driverService.createDriver(name, email, team);
  }

  /**
   * Get all available drivers
   */
  public getAllDrivers(): any[] {
    return this.driverService.getAllDrivers();
  }

  /**
   * Reset current session
   */
  public resetSession(): void {
    this.telemetryService.resetSession();
  }
  
  /**
   * Start telemetry capture
   */
  public startTelemetry(): boolean {
    return this.telemetryService.start();
  }
  
  /**
   * Stop telemetry capture
   */
  public stopTelemetry(): void {
    this.telemetryService.stop();
  }
  
  /**
   * Update driver profile
   */
  public updateDriver(driverId: string, driverData: any): DriverProfile | null {
    return this.driverService.updateDriver(driverId, driverData);
  }
  
  /**
   * Delete driver profile
   */
  public deleteDriver(driverId: string): boolean {
    return this.driverService.deleteDriver(driverId);
  }

  /**
   * Update app settings
   */
  public updateSettings(settings: any): void {
    // Update app config
    if (settings.serverUrl) {
      AppConfig.setServerUrl(settings.serverUrl);
    }
    
    if (settings.telemetryCaptureRate) {
      AppConfig.setTelemetryCaptureRate(settings.telemetryCaptureRate);
    }
    
    if (settings.compressionEnabled !== undefined) {
      AppConfig.setCompressionEnabled(settings.compressionEnabled);
    }
    
    if (settings.compressionLevel !== undefined) {
      AppConfig.setCompressionLevel(settings.compressionLevel);
    }
    
    if (settings.batchingEnabled !== undefined) {
      AppConfig.setBatchingEnabled(settings.batchingEnabled);
    }
    
    if (settings.selectedSim) {
      AppConfig.setSelectedSim(settings.selectedSim);
    }
    
    // Update services with new settings
    this.telemetryService.updateSettings(settings);
    this.dataTransmissionService.updateSettings(settings);
  }

  /**
   * Test connection to the server
   */
  public async testConnection(serverUrl?: string): Promise<boolean> {
    return this.dataTransmissionService.testConnection(serverUrl || '');
  }

  /**
   * Check if PitBoxCore is initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }
}
