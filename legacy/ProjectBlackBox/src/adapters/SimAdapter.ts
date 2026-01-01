import { EventEmitter } from 'events';
import { TelemetryData } from '../models/TelemetryData';

/**
 * Base interface for all sim racing adapters
 * This provides a common interface for capturing telemetry data from different sim racing platforms
 */
export abstract class SimAdapter extends EventEmitter {
  protected connected: boolean = false;
  protected simName: string = '';

  /**
   * Connect to the sim racing platform
   * @returns boolean indicating if the connection was successful
   */
  public abstract connect(): boolean;

  /**
   * Disconnect from the sim racing platform
   */
  public abstract disconnect(): void;

  /**
   * Get the current telemetry data from the sim
   * @returns TelemetryData object or null if data cannot be retrieved
   */
  public abstract getTelemetryData(): TelemetryData | null;

  /**
   * Check if the adapter is connected to the sim
   * @returns boolean indicating if the adapter is connected
   */
  public isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get the name of the sim this adapter connects to
   * @returns string name of the sim
   */
  public getSimName(): string {
    return this.simName;
  }

  /**
   * Get the type of the sim this adapter connects to
   * @returns string type of the sim
   */
  public getSimType(): string {
    return this.simName;
  }
}
