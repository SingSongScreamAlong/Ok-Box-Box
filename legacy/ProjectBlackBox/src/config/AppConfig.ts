import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

/**
 * Configuration interface for the Driver App
 */
export interface AppConfiguration {
  // Server connection
  serverUrl: string;
  authToken?: string;

  // Telemetry settings
  selectedSim: string;
  telemetryCaptureRate: number;
  localCacheEnabled: boolean;
  localCachePath: string;

  // Data transmission settings
  compressionEnabled: boolean;
  compressionLevel: number;
  compressionThreshold: number;
  batchingEnabled: boolean;
  batchSize: number;
  batchInterval: number;
  maxOfflineBufferSize: number;

  // Driver settings
  autoDetectDriverEnabled: boolean;
  defaultDriverId: string;
  driverProfilesPath: string;
  driverChangeThreshold: number;

  // Video capture settings
  videoEnabled: boolean;
  videoSettings: {
    resolution: string;
    frameRate: number;
    quality: number;
    captureInterval: number;
  };

  // App settings
  autoStart: boolean;
  startMinimized: boolean;
  minimizeToTray: boolean;

  // Advanced settings
  logLevel: string;
  debugMode: boolean;
}

/**
 * Default configuration values
 * Environment variables are checked first, with fallback to localhost for development
 */
const DEFAULT_CONFIG: AppConfiguration = {
  serverUrl: process.env.BACKEND_URL || process.env.REACT_APP_BACKEND_URL || process.env.SERVER_URL || 'http://localhost:3000',
  selectedSim: 'iracing',
  telemetryCaptureRate: 10,
  localCacheEnabled: true,
  localCachePath: path.join(app.getPath('userData'), 'telemetry_cache'),
  compressionEnabled: true,
  compressionLevel: 5, // Medium compression level
  compressionThreshold: 1024,
  batchingEnabled: false,
  batchSize: 10,
  batchInterval: 1000,
  maxOfflineBufferSize: 1000,
  autoDetectDriverEnabled: true,
  defaultDriverId: '',
  driverProfilesPath: path.join(app.getPath('userData'), 'driver_profiles'),
  driverChangeThreshold: 5000, // 5 seconds to confirm driver change
  videoEnabled: false,
  videoSettings: {
    resolution: '640x480',
    frameRate: 15,
    quality: 80,
    captureInterval: 1000
  },
  autoStart: false,
  startMinimized: false,
  minimizeToTray: true,
  logLevel: 'info',
  debugMode: false
};

/**
 * Singleton class for managing application configuration
 */
export class AppConfig {
  private static config: AppConfiguration = { ...DEFAULT_CONFIG };
  private static configPath: string = '';
  private static loaded: boolean = false;

  /**
   * Load configuration from disk
   */
  public static load(): void {
    if (!app) {
      console.error('Electron app not initialized');
      return;
    }

    this.configPath = path.join(app.getPath('userData'), 'config.json');

    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf8');
        const loadedConfig = JSON.parse(data.toString());

        // Merge with defaults to ensure all properties exist
        this.config = {
          ...DEFAULT_CONFIG,
          ...loadedConfig
        };

        console.log('Configuration loaded from disk');
      } else {
        // Save default config
        this.save();
        console.log('Default configuration created');
      }

      this.loaded = true;
    } catch (err) {
      console.error('Error loading configuration:', err);
    }
  }

  /**
   * Save configuration to disk
   */
  private static save(): void {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
      console.log('Configuration saved to disk');
    } catch (err) {
      console.error('Error saving configuration:', err);
    }
  }

  /**
   * Update configuration with new values
   */
  public static update(updates: Partial<AppConfiguration>): void {
    this.config = {
      ...this.config,
      ...updates
    };

    this.save();
  }

  /**
   * Get the entire configuration object
   */
  public static getAll(): AppConfiguration {
    return { ...this.config };
  }

  /**
   * Reset configuration to defaults
   */
  public static reset(): void {
    this.config = { ...DEFAULT_CONFIG };
    this.save();
  }

  // Server connection getters/setters
  public static getServerUrl(): string {
    return this.config.serverUrl;
  }

  public static setServerUrl(url: string): void {
    this.config.serverUrl = url;
    this.save();
  }

  public static getAuthToken(): string | undefined {
    return this.config.authToken;
  }

  public static setAuthToken(token: string): void {
    this.config.authToken = token;
    this.save();
  }

  // Telemetry settings getters/setters
  public static getSelectedSim(): string {
    return this.config.selectedSim;
  }

  public static setSelectedSim(sim: string): void {
    this.config.selectedSim = sim;
    this.save();
  }

  public static getTelemetryCaptureRate(): number {
    return this.config.telemetryCaptureRate;
  }

  public static setTelemetryCaptureRate(rate: number): void {
    this.config.telemetryCaptureRate = rate;
    this.save();
  }

  public static getLocalCacheEnabled(): boolean {
    return this.config.localCacheEnabled;
  }

  public static setLocalCacheEnabled(enabled: boolean): void {
    this.config.localCacheEnabled = enabled;
    this.save();
  }

  public static getLocalCachePath(): string {
    return this.config.localCachePath;
  }

  public static setLocalCachePath(path: string): void {
    this.config.localCachePath = path;
    this.save();
  }

  // Data transmission settings getters/setters
  public static getCompressionEnabled(): boolean {
    return this.config.compressionEnabled;
  }

  public static setCompressionEnabled(enabled: boolean): void {
    this.config.compressionEnabled = enabled;
    this.save();
  }

  public static getCompressionLevel(): number {
    return this.config.compressionLevel;
  }

  public static setCompressionLevel(level: number): void {
    this.config.compressionLevel = level;
    this.save();
  }

  public static getCompressionThreshold(): number {
    return this.config.compressionThreshold;
  }

  public static setCompressionThreshold(threshold: number): void {
    this.config.compressionThreshold = threshold;
    this.save();
  }

  public static getBatchingEnabled(): boolean {
    return this.config.batchingEnabled;
  }

  public static setBatchingEnabled(enabled: boolean): void {
    this.config.batchingEnabled = enabled;
    this.save();
  }

  public static getBatchSize(): number {
    return this.config.batchSize;
  }

  public static setBatchSize(size: number): void {
    this.config.batchSize = size;
    this.save();
  }

  public static getBatchInterval(): number {
    return this.config.batchInterval;
  }

  public static setBatchInterval(interval: number): void {
    this.config.batchInterval = interval;
    this.save();
  }

  public static getMaxOfflineBufferSize(): number {
    return this.config.maxOfflineBufferSize;
  }

  public static setMaxOfflineBufferSize(size: number): void {
    this.config.maxOfflineBufferSize = size;
    this.save();
  }

  // Driver settings getters/setters
  public static getAutoDetectDriverEnabled(): boolean {
    return this.config.autoDetectDriverEnabled;
  }

  public static setAutoDetectDriverEnabled(enabled: boolean): void {
    this.config.autoDetectDriverEnabled = enabled;
    this.save();
  }

  public static getDefaultDriverId(): string | undefined {
    return this.config.defaultDriverId;
  }

  public static setDefaultDriverId(id: string): void {
    this.config.defaultDriverId = id;
    this.save();
  }

  public static getDriverProfilesPath(): string {
    return this.config.driverProfilesPath;
  }

  public static setDriverProfilesPath(path: string): void {
    this.config.driverProfilesPath = path;
    this.save();
  }

  public static getDriverChangeThreshold(): number {
    return this.config.driverChangeThreshold;
  }

  public static setDriverChangeThreshold(threshold: number): void {
    this.config.driverChangeThreshold = threshold;
    this.save();
  }

  // Video capture settings getters/setters
  public static getVideoEnabled(): boolean {
    return this.config.videoEnabled;
  }

  public static setVideoEnabled(enabled: boolean): void {
    this.config.videoEnabled = enabled;
    this.save();
  }

  public static getVideoSettings(): any {
    return { ...this.config.videoSettings };
  }

  public static setVideoSettings(settings: any): void {
    this.config.videoSettings = {
      ...this.config.videoSettings,
      ...settings
    };
    this.save();
  }

  // App settings getters/setters
  public static getAutoStart(): boolean {
    return this.config.autoStart;
  }

  public static setAutoStart(enabled: boolean): void {
    this.config.autoStart = enabled;
    this.save();
  }

  public static getStartMinimized(): boolean {
    return this.config.startMinimized;
  }

  public static setStartMinimized(enabled: boolean): void {
    this.config.startMinimized = enabled;
    this.save();
  }

  public static getMinimizeToTray(): boolean {
    return this.config.minimizeToTray;
  }

  public static setMinimizeToTray(enabled: boolean): void {
    this.config.minimizeToTray = enabled;
    this.save();
  }

  // Advanced settings getters/setters
  public static getLogLevel(): string {
    return this.config.logLevel;
  }

  public static setLogLevel(level: string): void {
    this.config.logLevel = level;
    this.save();
  }

  public static getDebugMode(): boolean {
    return this.config.debugMode;
  }

  public static setDebugMode(enabled: boolean): void {
    this.config.debugMode = enabled;
    this.save();
  }
}
