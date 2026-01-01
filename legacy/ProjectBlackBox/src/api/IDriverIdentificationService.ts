/**
 * Interface for the Driver Identification Service
 * Defines the API boundary for driver identification functionality
 */

import { EventEmitter } from 'events';

export interface DriverProfile {
  id: string;
  name: string;
  team?: string;
  avatar?: string;
  preferences?: Record<string, any>;
  lastActive?: number;
}

export interface IDriverIdentificationService {
  /**
   * Initialize the driver identification service
   * @returns Promise that resolves when the service is initialized
   */
  initialize(): Promise<boolean>;
  
  /**
   * Get the current driver profile
   * @returns The current driver profile or null if not identified
   */
  getCurrentDriver(): DriverProfile | null;
  
  /**
   * Set the current driver by ID
   * @param driverId The ID of the driver to set as current
   * @returns Promise that resolves with the driver profile when set
   */
  setCurrentDriver(driverId: string): Promise<DriverProfile | null>;
  
  /**
   * Get all available driver profiles
   * @returns Array of all available driver profiles
   */
  getAllDrivers(): DriverProfile[];
  
  /**
   * Add a new driver profile
   * @param profile The driver profile to add
   * @returns Promise that resolves with the added driver profile
   */
  addDriver(profile: Omit<DriverProfile, 'id'>): Promise<DriverProfile>;
  
  /**
   * Update an existing driver profile
   * @param profile The driver profile to update
   * @returns Promise that resolves with the updated driver profile
   */
  updateDriver(profile: DriverProfile): Promise<DriverProfile | null>;
  
  /**
   * Remove a driver profile
   * @param driverId The ID of the driver profile to remove
   * @returns Promise that resolves with true if removed, false otherwise
   */
  removeDriver(driverId: string): Promise<boolean>;
  
  /**
   * Get the event emitter for driver identification events
   * Events:
   * - 'driver_changed': Emitted when the current driver changes
   * - 'driver_added': Emitted when a driver is added
   * - 'driver_updated': Emitted when a driver is updated
   * - 'driver_removed': Emitted when a driver is removed
   * - 'error': Emitted when an error occurs
   */
  getEventEmitter(): EventEmitter;
  
  /**
   * Save the current state of driver profiles
   * @returns Promise that resolves when the state is saved
   */
  saveState(): Promise<boolean>;
  
  /**
   * Load the state of driver profiles
   * @returns Promise that resolves when the state is loaded
   */
  loadState(): Promise<boolean>;
}
