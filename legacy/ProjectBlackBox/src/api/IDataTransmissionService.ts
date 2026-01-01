/**
 * Interface for the Data Transmission Service
 * Defines the API boundary for data transmission functionality
 */

import { EventEmitter } from 'events';
import { TelemetryData } from '../models/TelemetryData';

export interface IDataTransmissionService {
  /**
   * Connect to the server
   * @param serverUrl Optional server URL to connect to
   * @returns Promise that resolves when connected to the server
   */
  connect(serverUrl?: string): Promise<boolean>;
  
  /**
   * Disconnect from the server
   */
  disconnect(): void;
  
  /**
   * Send telemetry data to the server
   * @param data The telemetry data to send
   * @returns Promise that resolves when data has been sent
   */
  sendTelemetryData(data: TelemetryData): Promise<boolean>;
  
  /**
   * Get the event emitter for data transmission events
   * Events:
   * - 'connected': Emitted when connected to the server
   * - 'disconnected': Emitted when disconnected from the server
   * - 'error': Emitted when an error occurs
   * - 'data_sent': Emitted when data has been sent
   * - 'data_received': Emitted when data has been received
   */
  getEventEmitter(): EventEmitter;
  
  /**
   * Test the connection to the server
   * @param serverUrl Optional server URL to test
   * @returns Promise that resolves with the test result
   */
  testConnection(serverUrl?: string): Promise<any>;
  
  /**
   * Get the current server URL
   * @returns The current server URL or null if not connected
   */
  getServerUrl(): string | null;
  
  /**
   * Check if connected to the server
   * @returns True if connected to the server, false otherwise
   */
  isConnected(): boolean;
  
  /**
   * Set the batch size for data transmission
   * @param size The batch size in number of telemetry data points
   */
  setBatchSize(size: number): void;
  
  /**
   * Set the batch interval for data transmission
   * @param interval The batch interval in milliseconds
   */
  setBatchInterval(interval: number): void;
}
