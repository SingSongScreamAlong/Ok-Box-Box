/**
 * Interface for the Telemetry Service
 * Defines the API boundary for telemetry collection functionality
 */

import { EventEmitter } from 'events';
import { TelemetryData } from '../models/TelemetryData';
import { SimAdapter } from '../adapters/SimAdapter';

export interface ITelemetryService {
  /**
   * Start telemetry collection
   * @param simName Optional simulator name to connect to
   * @returns Promise that resolves when telemetry collection has started
   */
  start(simName?: string): Promise<boolean>;
  
  /**
   * Stop telemetry collection
   */
  stop(): void;
  
  /**
   * Get the current telemetry data
   * @returns The current telemetry data or null if not available
   */
  getCurrentTelemetryData(): TelemetryData | null;
  
  /**
   * Get the event emitter for telemetry events
   * Events:
   * - 'data': Emitted when new telemetry data is available
   * - 'connected': Emitted when connected to a simulator
   * - 'disconnected': Emitted when disconnected from a simulator
   * - 'error': Emitted when an error occurs
   */
  getEventEmitter(): EventEmitter;
  
  /**
   * Register a simulator adapter
   * @param adapter The simulator adapter to register
   */
  registerAdapter(adapter: SimAdapter): void;
  
  /**
   * Get the currently active simulator adapter
   * @returns The currently active simulator adapter or null if none
   */
  getActiveAdapter(): SimAdapter | null;
  
  /**
   * Check if telemetry collection is active
   * @returns True if telemetry collection is active, false otherwise
   */
  isActive(): boolean;
}
