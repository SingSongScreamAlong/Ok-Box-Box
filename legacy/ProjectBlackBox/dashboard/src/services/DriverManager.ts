import { DriverProfile, DriverListEvent, DriverUpdateEvent, SwitchDriverEvent, SessionInfo } from './WebSocketService';
import WebSocketService from './WebSocketService';
import { v4 as uuidv4 } from 'uuid';

/**
 * DriverManager Service
 * 
 * Responsible for managing driver profiles, tracking the active driver,
 * and handling driver switching functionality.
 */
class DriverManager {
  private static instance: DriverManager;
  private drivers: Map<string, DriverProfile> = new Map();
  private activeDriverId: string | null = null;
  private websocketService = WebSocketService;

  private constructor() {
    this.setupEventListeners();
  }

  /**
   * Get the singleton instance of DriverManager
   */
  public static getInstance(): DriverManager {
    if (!DriverManager.instance) {
      DriverManager.instance = new DriverManager();
    }
    return DriverManager.instance;
  }

  /**
   * Set up WebSocket event listeners for driver-related events
   */
  private setupEventListeners(): void {
    // Listen for driver list updates
    this.websocketService.on('driver_list', (event: DriverListEvent) => {
      this.updateDrivers(event.drivers);
      this.setActiveDriver(event.activeDriverId);
    });

    // Listen for individual driver updates
    this.websocketService.on('driver_update', (event: DriverUpdateEvent) => {
      this.updateDriver(event.driver);
    });

    // Listen for driver switch events
    this.websocketService.on('switch_driver', (event: SwitchDriverEvent) => {
      this.setActiveDriver(event.driverId);
    });

    // Listen for session info updates that might contain driver information
    this.websocketService.on('session_info', (sessionInfo: SessionInfo) => {
      // SessionInfo doesn't have drivers or activeDriverId properties
      // This is likely a custom extension of SessionInfo in this application
      // For now, we'll just check if these properties exist at runtime
      const info = sessionInfo as any;
      if (info.drivers && info.activeDriverId) {
        this.updateDrivers(info.drivers);
        this.setActiveDriver(info.activeDriverId);
      }
    });
  }

  /**
   * Update the list of drivers
   * @param drivers Array of driver profiles
   */
  private updateDrivers(drivers: any[]): void {
    // Clear existing drivers and add new ones
    this.drivers.clear();
    drivers.forEach(driver => {
      // Ensure the driver object conforms to DriverProfile
      const driverProfile: DriverProfile = {
        id: driver.id,
        name: driver.name,
        team: driver.team || '',
        role: driver.role as 'primary' | 'secondary' | 'reserve',
        status: driver.status as 'active' | 'standby' | 'offline',
        avatar: driver.avatar,
        preferences: driver.preferences,
        stats: driver.stats
      };
      this.drivers.set(driverProfile.id, driverProfile);
    });
  }

  /**
   * Update a single driver's information
   * @param driver Driver profile data
   */
  private updateDriver(driver: Partial<DriverProfile> & { id: string }): void {
    const existingDriver = this.drivers.get(driver.id);
    
    if (existingDriver) {
      // Update existing driver with new data
      this.drivers.set(driver.id, { ...existingDriver, ...driver });
    } else {
      // Add new driver if it doesn't exist
      this.drivers.set(driver.id, driver as DriverProfile);
    }
  }

  /**
   * Set the active driver
   * @param driverId ID of the driver to set as active
   */
  public setActiveDriver(driverId: string): void {
    if (this.drivers.has(driverId)) {
      this.activeDriverId = driverId;
    } else {
      console.warn(`Attempted to set active driver to unknown driver ID: ${driverId}`);
    }
  }

  /**
   * Switch to a different driver
   * @param driverId ID of the driver to switch to
   */
  public switchDriver(driverId: string): void {
    if (this.drivers.has(driverId)) {
      this.websocketService.switchDriver(driverId);
      // Note: The active driver will be updated when the server confirms the switch
    } else {
      console.error(`Cannot switch to unknown driver ID: ${driverId}`);
    }
  }

  /**
   * Get the active driver profile
   * @returns The active driver profile or null if no active driver
   */
  public getActiveDriver(): DriverProfile | null {
    if (this.activeDriverId && this.drivers.has(this.activeDriverId)) {
      return this.drivers.get(this.activeDriverId) || null;
    }
    return null;
  }

  /**
   * Get the active driver ID
   * @returns The active driver ID or null if no active driver
   */
  public getActiveDriverId(): string | null {
    return this.activeDriverId;
  }

  /**
   * Get all available drivers
   * @returns Array of all driver profiles
   */
  public getAllDrivers(): DriverProfile[] {
    return Array.from(this.drivers.values());
  }

  /**
   * Get a specific driver by ID
   * @param driverId ID of the driver to get
   * @returns The driver profile or null if not found
   */
  public getDriver(driverId: string): DriverProfile | null {
    return this.drivers.get(driverId) || null;
  }

  /**
   * Check if a driver exists
   * @param driverId ID of the driver to check
   * @returns True if the driver exists, false otherwise
   */
  public hasDriver(driverId: string): boolean {
    return this.drivers.has(driverId);
  }

  /**
   * Initiate a driver handoff
   * @param toDriverId ID of the driver to hand off to
   * @param notes Optional notes for the handoff
   * @returns The handoff ID or null if unsuccessful
   */
  public initiateHandoff(toDriverId: string, notes: string = ''): string | null {
    const activeDriver = this.getActiveDriver();
    
    if (!activeDriver) {
      console.error('Cannot initiate handoff: No active driver');
      return null;
    }
    
    if (!this.hasDriver(toDriverId)) {
      console.error(`Cannot initiate handoff: Target driver ${toDriverId} not found`);
      return null;
    }
    
    // Generate a handoff ID
    const handoffId = uuidv4();
    
    // Use the requestHandoff method from WebSocketService
    const success = this.websocketService.requestHandoff(activeDriver.id, toDriverId, notes);
    
    return success ? handoffId : null;
  }

  /**
   * Respond to a handoff request
   * @param handoffId ID of the handoff request
   * @param status Response status
   */
  public respondToHandoff(handoffId: string, status: 'confirmed' | 'cancelled' | 'completed'): void {
    this.websocketService.respondToHandoff(handoffId, status);
  }

  /**
   * Request a driver handoff (alias for initiateHandoff)
   * @param handoffRequest The handoff request object
   * @returns The handoff ID
   */
  public requestHandoff(handoffRequest: { fromDriverId: string, toDriverId: string, notes?: string }): string | null {
    return this.initiateHandoff(handoffRequest.toDriverId, handoffRequest.notes || '');
  }

  /**
   * Accept a handoff request
   * @param handoffId ID of the handoff request to accept
   * @returns True if the handoff was accepted successfully, false otherwise
   */
  public acceptHandoff(handoffId: string): boolean {
    return this.websocketService.respondToHandoff(handoffId, 'confirmed');
  }

  /**
   * Reject a handoff request
   * @param handoffId ID of the handoff request to reject
   * @returns True if the handoff was rejected successfully, false otherwise
   */
  public rejectHandoff(handoffId: string): boolean {
    return this.websocketService.respondToHandoff(handoffId, 'cancelled');
  }
}

export default DriverManager;
