import { EventEmitter } from 'events';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, readdirSync } from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { app, systemPreferences } from 'electron';
import { AppConfig } from '../config/AppConfig';
import { DriverRole } from '../models/TeamModel';
import { TelemetryData } from '../models/TelemetryData';

/**
 * Interface for driver profile information
 */
export interface DriverProfile {
  id: string;
  name: string;
  email?: string;
  team?: string;
  teamRole?: DriverRole;
  createdAt: number;
  updatedAt: number;
  lastActive?: number;
  identifiers: {
    username?: string;
    iRacingId?: string;
    steamId?: string;
    hardwareIds?: string[];
    peripheralIds?: string[];
  };
  preferences?: {
    [key: string]: any;
  };
  metrics?: {
    [key: string]: any;
  };
  drivingStyle?: {
    aggression: number; // 0-100
    consistency: number; // 0-100
    smoothness: number; // 0-100
    adaptability: number; // 0-100
    fuelEfficiency: number; // 0-100
    tireManagement: number; // 0-100
  };
  stintHistory?: {
    sessionId: string;
    startTime: number;
    endTime?: number;
    laps: number;
    avgLapTime?: number;
    bestLapTime?: number;
  }[];
}

/**
 * Service responsible for identifying and managing driver profiles
 */
export class DriverIdentificationService extends EventEmitter {
  private currentDriver: DriverProfile | null = null;
  private previousDriver: DriverProfile | null = null;
  private drivers: DriverProfile[] = [];
  private profilesPath: string = '';
  private autoDetectEnabled: boolean = true;
  private initialized: boolean = false;
  private detectionInterval: NodeJS.Timeout | null = null;
  private currentStintStartTime: number = 0;
  private driverChangeThreshold: number = 5000; // ms to confirm driver change
  private detectionMethods: {
    [key: string]: {
      enabled: boolean;
      weight: number; // 0-100
      method: () => Promise<string | null>;
    };
  } = {};

  /**
   * Initialize the driver identification service
   */
  public initialize(): void {
    console.log('Initializing DriverIdentificationService');
    
    // Load configuration
    this.autoDetectEnabled = AppConfig.getAutoDetectDriverEnabled() || true;
    this.profilesPath = AppConfig.getDriverProfilesPath() || path.join(app.getPath('userData'), 'driver_profiles');
    this.driverChangeThreshold = AppConfig.getDriverChangeThreshold() || 5000;
    
    // Create profiles directory if it doesn't exist
    if (!existsSync(this.profilesPath)) {
      mkdirSync(this.profilesPath, { recursive: true });
    }
    
    // Load driver profiles
    this.loadDriverProfiles();
    
    // Set default driver if configured
    const defaultDriverId = AppConfig.getDefaultDriverId();
    if (defaultDriverId) {
      const defaultDriver = this.drivers.find(d => d.id === defaultDriverId);
      if (defaultDriver) {
        this.setCurrentDriver(defaultDriver);
      }
    }
    
    // Initialize detection methods
    this.setupDetectionMethods();
    
    // Start auto-detection if enabled
    if (this.autoDetectEnabled) {
      this.startAutoDetection();
    }
    
    this.initialized = true;
    this.emit('initialized');
  }

  /**
   * Load driver profiles from disk
   */
  private loadDriverProfiles(): void {
    try {
      const files = readdirSync(this.profilesPath);
      
      this.drivers = files
        .filter(file => file.endsWith('.json'))
        .map((file: string) => {
          try {
            const filePath = path.join(this.profilesPath, file);
            const fileContent = readFileSync(filePath, 'utf8');
            return JSON.parse(fileContent.toString()) as DriverProfile;
          } catch (err) {
            console.error(`Error loading driver profile ${file}:`, err);
            return null;
          }
        })
        .filter((profile): profile is DriverProfile => profile !== null);
      
      console.log(`Loaded ${this.drivers.length} driver profiles`);
    } catch (err) {
      console.error('Error loading driver profiles:', err);
      this.emit('error', err);
    }
  }

  /**
   * Save a driver profile to disk
   */
  private saveDriverProfile(profile: Partial<DriverProfile>): void {
    try {
      const filePath = path.join(this.profilesPath, `${profile.id}.json`);
      writeFileSync(filePath, JSON.stringify(profile, null, 2));
    } catch (err) {
      console.error(`Error saving driver profile ${profile.id}:`, err);
      this.emit('error', err);
    }
  }

  /**
   * Create a new driver profile
   */
  public createDriver(name: string, email?: string, team?: string, teamRole?: DriverRole): DriverProfile {
    const now = Date.now();
    
    const profile: DriverProfile = {
      id: uuidv4(),
      name,
      email,
      team,
      teamRole,
      createdAt: now,
      updatedAt: now,
      lastActive: now,
      identifiers: {},
      preferences: {},
      metrics: {},
      drivingStyle: {
        aggression: 50,
        consistency: 50,
        smoothness: 50,
        adaptability: 50,
        fuelEfficiency: 50,
        tireManagement: 50
      },
      stintHistory: []
    };
    
    this.drivers.push(profile);
    this.saveDriverProfile(profile);
    
    this.emit('driver_created', profile);
    return profile;
  }

  /**
   * Update an existing driver profile
   */
  public updateDriver(id: string, updates: Partial<DriverProfile>): DriverProfile | null {
    const index = this.drivers.findIndex(d => d.id === id);
    
    if (index === -1) {
      return null;
    }
    
    const profile = this.drivers[index];
    
    // Update the profile
    const updatedProfile: DriverProfile = {
      ...profile,
      ...updates,
      id: profile.id, // Ensure ID doesn't change
      updatedAt: Date.now()
    };
    
    this.drivers[index] = updatedProfile;
    this.saveDriverProfile(updatedProfile);
    
    // Update current driver if needed
    if (this.currentDriver?.id === id) {
      this.currentDriver = updatedProfile;
    }
    
    this.emit('driver_updated', updatedProfile);
    return updatedProfile;
  }

  /**
   * Delete a driver profile
   */
  public deleteDriver(id: string): boolean {
    const index = this.drivers.findIndex(d => d.id === id);
    
    if (index === -1) {
      return false;
    }
    
    const profile = this.drivers[index];
    
    // Remove from memory
    this.drivers.splice(index, 1);
    
    // Remove from disk
    try {
      const filePath = path.join(this.profilesPath, `${id}.json`);
      unlinkSync(filePath);
    } catch (err) {
      console.error(`Error deleting driver profile ${id}:`, err);
      this.emit('error', err);
    }
    
    // Clear current driver if needed
    if (this.currentDriver?.id === id) {
      this.currentDriver = null;
    }
    
    this.emit('driver_deleted', profile);
    return true;
  }

  /**
   * Set the current active driver
   */
  public setCurrentDriver(driver: DriverProfile): void {
    // Store previous driver for stint tracking
    if (this.currentDriver && this.currentDriver.id !== driver.id) {
      this.previousDriver = this.currentDriver;
      this.endCurrentStint();
    }
    
    this.currentDriver = driver;
    this.currentStintStartTime = Date.now();
    
    // Update last active timestamp
    this.updateDriver(driver.id, {
      lastActive: Date.now()
    });
    
    // Save as default driver
    AppConfig.setDefaultDriverId(driver.id);
    
    this.emit('driver_changed', driver, this.previousDriver);
  }

  /**
   * Get the current active driver
   */
  public getCurrentDriver(): DriverProfile | null {
    return this.currentDriver;
  }

  /**
   * Get all available driver profiles
   */
  public getAllDrivers(): DriverProfile[] {
    return [...this.drivers];
  }

  /**
   * Get a driver profile by ID
   */
  public getDriverById(id: string): DriverProfile | null {
    return this.drivers.find(d => d.id === id) || null;
  }

  /**
   * Auto-detect the current driver based on system information
   */
  public async autoDetectDriver(): Promise<DriverProfile | null> {
    if (!this.autoDetectEnabled) {
      return null;
    }
    
    console.log('Auto-detecting driver...');
    
    try {
      // Run all enabled detection methods
      const detectionResults: { [key: string]: { id: string | null, confidence: number } } = {};
      const detectionPromises: Promise<void>[] = [];
      
      // Run all detection methods in parallel
      for (const [methodName, method] of Object.entries(this.detectionMethods)) {
        if (method.enabled) {
          detectionPromises.push(
            method.method().then(id => {
              detectionResults[methodName] = {
                id,
                confidence: id ? method.weight : 0
              };
            }).catch(err => {
              console.error(`Error in detection method ${methodName}:`, err);
              detectionResults[methodName] = { id: null, confidence: 0 };
            })
          );
        }
      }
      
      // Wait for all detection methods to complete
      await Promise.all(detectionPromises);
      
      // Analyze results and determine most likely driver
      const driverScores: { [driverId: string]: number } = {};
      
      // Calculate scores for each driver
      for (const result of Object.values(detectionResults)) {
        if (result.id) {
          driverScores[result.id] = (driverScores[result.id] || 0) + result.confidence;
        }
      }
      
      // Find driver with highest score
      let highestScore = 0;
      let mostLikelyDriverId: string | null = null;
      
      for (const [driverId, score] of Object.entries(driverScores)) {
        if (score > highestScore) {
          highestScore = score;
          mostLikelyDriverId = driverId;
        }
      }
      
      // If we found a likely driver, return it
      if (mostLikelyDriverId) {
        const driver = this.getDriverById(mostLikelyDriverId);
        if (driver) {
          return driver;
        }
      }
      
      // If no driver detected but we have drivers, return the most recently active one
      if (this.drivers.length > 0) {
        return this.drivers.sort((a, b) => 
          (b.lastActive || b.updatedAt) - (a.lastActive || a.updatedAt)
        )[0];
      }
      
      // Create a default driver if none exist
      return this.createDriver('Default Driver');
    } catch (error) {
      console.error('Error in autoDetectDriver:', error);
      return null;
    }
  }

  /**
   * Setup driver detection methods
   */
  private setupDetectionMethods(): void {
    // System username detection
    this.detectionMethods.username = {
      enabled: true,
      weight: 40,
      method: async () => {
        try {
          const username = process.env.USERNAME || process.env.USER || '';
          if (!username) return null;
          
          // Find driver with matching username
          const driver = this.drivers.find(d => 
            d.identifiers.username?.toLowerCase() === username.toLowerCase()
          );
          
          return driver?.id || null;
        } catch (error) {
          console.error('Error in username detection:', error);
          return null;
        }
      }
    };
    
    // iRacing credentials detection
    this.detectionMethods.iRacing = {
      enabled: true,
      weight: 80,
      method: async () => {
        try {
          // Check for iRacing installation and credentials
          const iRacingPath = path.join(app.getPath('documents'), 'iRacing');
          if (!existsSync(iRacingPath)) return null;

          // Try to read iRacing member ID from login.json or credentials file
          let iRacingId: string | null = null;

          // Check for credentials file
          const credentialsPath = path.join(iRacingPath, 'credentials.json');
          if (existsSync(credentialsPath)) {
            try {
              const credentials = JSON.parse(readFileSync(credentialsPath, 'utf8').toString());
              iRacingId = credentials.customerId || credentials.memberId || null;
            } catch (e) {
              console.debug('Could not parse credentials file');
            }
          }

          // Check for account info file
          if (!iRacingId) {
            const accountPath = path.join(iRacingPath, 'account.json');
            if (existsSync(accountPath)) {
              try {
                const account = JSON.parse(readFileSync(accountPath, 'utf8').toString());
                iRacingId = account.custId || account.id || null;
              } catch (e) {
                console.debug('Could not parse account file');
              }
            }
          }

          if (!iRacingId) {
            console.debug('No iRacing ID found in credentials or account files');
            return null;
          }

          // Find driver with matching iRacing ID
          const iRacingIdStr = `ir_${iRacingId}`;
          const driver = this.drivers.find(d =>
            d.identifiers.iRacingId === iRacingIdStr
          );

          return driver?.id || null;
        } catch (error) {
          console.error('Error in iRacing detection:', error);
          return null;
        }
      }
    };
    
    // Hardware peripherals detection
    this.detectionMethods.peripherals = {
      enabled: true,
      weight: 60,
      method: async () => {
        try {
          // Detect connected racing peripherals
          const connectedPeripherals: string[] = [];

          // On Windows, we can check for common racing wheel vendor/product IDs
          // Common racing wheel manufacturers:
          // - Logitech: VID_046D
          // - Thrustmaster: VID_044F
          // - Fanatec: VID_0EB7

          // For cross-platform compatibility, we'll check for HID devices
          // This would require a native addon or USB library in production
          // For now, we'll check if the driver has any saved peripheral profiles

          // Check for saved wheel profiles in app data
          const appDataPath = app.getPath('userData');
          const peripheralsFile = path.join(appDataPath, 'peripherals.json');

          if (existsSync(peripheralsFile)) {
            try {
              const savedPeripherals = JSON.parse(readFileSync(peripheralsFile, 'utf8').toString());
              if (savedPeripherals.lastConnected) {
                connectedPeripherals.push(...savedPeripherals.lastConnected);
              }
            } catch (e) {
              console.debug('Could not read peripherals file');
            }
          }

          // If no peripherals detected, return null
          if (connectedPeripherals.length === 0) {
            return null;
          }

          // Find driver with matching peripheral IDs
          const driver = this.drivers.find(d => {
            if (!d.identifiers.peripheralIds) return false;
            return d.identifiers.peripheralIds.some(pid =>
              connectedPeripherals.includes(pid)
            );
          });

          return driver?.id || null;
        } catch (error) {
          console.error('Error in peripherals detection:', error);
          return null;
        }
      }
    };
  }
  
  /**
   * Start automatic driver detection
   */
  public startAutoDetection(): void {
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
    }
    
    // Run detection immediately
    this.runDetection();
    
    // Then set up interval for continuous detection
    this.detectionInterval = setInterval(() => {
      this.runDetection();
    }, 60000); // Check every minute
    
    console.log('Auto-detection started');
  }
  
  /**
   * Stop automatic driver detection
   */
  public stopAutoDetection(): void {
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }
    
    console.log('Auto-detection stopped');
  }
  
  /**
   * Run a single detection cycle
   */
  private async runDetection(): Promise<void> {
    try {
      const detectedDriver = await this.autoDetectDriver();
      
      if (detectedDriver && (!this.currentDriver || detectedDriver.id !== this.currentDriver.id)) {
        // Detected a different driver than current one
        console.log(`Detected driver change: ${detectedDriver.name}`);
        
        // Wait for confirmation threshold before changing driver
        setTimeout(() => {
          this.confirmDriverChange(detectedDriver);
        }, this.driverChangeThreshold);
      }
    } catch (error) {
      console.error('Error in runDetection:', error);
    }
  }
  
  /**
   * Confirm a driver change after the threshold period
   */
  private async confirmDriverChange(newDriver: DriverProfile): Promise<void> {
    // Run detection again to confirm
    const confirmedDriver = await this.autoDetectDriver();
    
    if (confirmedDriver && confirmedDriver.id === newDriver.id) {
      // Driver change confirmed, switch to new driver
      this.setCurrentDriver(newDriver);
    }
  }
  
  /**
   * End the current driver stint and record it
   */
  private endCurrentStint(): void {
    if (!this.currentDriver || !this.currentStintStartTime) return;
    
    const endTime = Date.now();
    const duration = endTime - this.currentStintStartTime;
    
    // Only record stints longer than 1 minute
    if (duration < 60000) return;
    
    // Create stint record
    const stint = {
      sessionId: `session_${Date.now()}`, // In a real implementation, get actual session ID
      startTime: this.currentStintStartTime,
      endTime,
      laps: 0 // In a real implementation, get actual lap count
    };
    
    // Add to driver's stint history
    if (!this.currentDriver.stintHistory) {
      this.currentDriver.stintHistory = [];
    }
    
    this.currentDriver.stintHistory.push(stint);
    
    // Save updated driver profile
    this.saveDriverProfile(this.currentDriver);
    
    // Emit stint ended event
    this.emit('stint_ended', {
      driver: this.currentDriver,
      stint
    });
  }
  
  /**
   * Update driver identifiers
   */
  public updateDriverIdentifiers(driverId: string, identifiers: Partial<DriverProfile['identifiers']>): DriverProfile | null {
    const driver = this.getDriverById(driverId);
    if (!driver) return null;
    
    // Update identifiers
    driver.identifiers = {
      ...driver.identifiers,
      ...identifiers
    };
    
    // Save updated driver profile
    this.saveDriverProfile(driver);
    
    return driver;
  }
  
  /**
   * Process telemetry data to update driver metrics and driving style
   */
  public processTelemetryForDriverProfile(data: TelemetryData): void {
    if (!this.currentDriver) return;
    
    // In a real implementation, this would analyze telemetry data to update driver metrics
    // For now, we'll just update the timestamp
    this.updateDriver(this.currentDriver.id, {
      lastActive: Date.now()
    });
  }
  
  /**
   * Check if the service is initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }
}
