import { ComparisonResultEvent, TelemetryData } from './WebSocketService';
import WebSocketService from './WebSocketService';
import DriverManager from './DriverManager';

/**
 * Comparison metric type for storing telemetry comparison data
 */
interface ComparisonMetric {
  name: string;
  driverA: {
    value: string | number;
    delta: number;
  };
  driverB: {
    value: string | number;
    delta: number;
  };
}

/**
 * Comparison result type for storing comparison data
 */
interface ComparisonResult {
  comparisonId: string;
  driverAId: string;
  driverBId: string;
  timestamp: number;
  metrics: ComparisonMetric[];
}

/**
 * Telemetry snapshot for storing historical telemetry data
 */
interface TelemetrySnapshot {
  driverId: string;
  timestamp: number;
  data: TelemetryData;
}

/**
 * ComparisonEngine Service
 * 
 * Responsible for comparing driver performance metrics and telemetry data
 * between different drivers.
 */
class ComparisonEngine {
  private static instance: ComparisonEngine;
  private websocketService;
  private driverManager: DriverManager;
  
  // Store active comparisons by ID
  private activeComparisons: Map<string, ComparisonResult> = new Map();
  
  // Store recent telemetry snapshots for each driver
  private telemetryHistory: Map<string, TelemetrySnapshot[]> = new Map();
  
  // Maximum number of telemetry snapshots to keep per driver
  private readonly MAX_HISTORY_PER_DRIVER = 100;

  private constructor() {
    this.websocketService = WebSocketService;
    this.driverManager = DriverManager.getInstance();
    this.setupEventListeners();
  }

  /**
   * Get the singleton instance of ComparisonEngine
   */
  public static getInstance(): ComparisonEngine {
    if (!ComparisonEngine.instance) {
      ComparisonEngine.instance = new ComparisonEngine();
    }
    return ComparisonEngine.instance;
  }

  /**
   * Set up WebSocket event listeners for comparison-related events
   */
  private setupEventListeners(): void {
    // Listen for comparison results from the server
    this.websocketService.on('comparison_result', (event: ComparisonResultEvent) => {
      this.handleComparisonResult(event);
    });

    // Listen for telemetry updates to store history
    this.websocketService.on('telemetry', (data: TelemetryData) => {
      if (data.driverId) {
        this.storeTelemetrySnapshot(data.driverId, data);
      }
    });
  }

  /**
   * Store a telemetry snapshot for a driver
   * @param driverId ID of the driver
   * @param data Telemetry data
   */
  private storeTelemetrySnapshot(driverId: string, data: TelemetryData): void {
    if (!this.telemetryHistory.has(driverId)) {
      this.telemetryHistory.set(driverId, []);
    }

    const driverHistory = this.telemetryHistory.get(driverId)!;
    
    // Add new snapshot
    driverHistory.push({
      driverId,
      timestamp: Date.now(),
      data: { ...data }
    });
    
    // Trim history if needed
    if (driverHistory.length > this.MAX_HISTORY_PER_DRIVER) {
      driverHistory.splice(0, driverHistory.length - this.MAX_HISTORY_PER_DRIVER);
    }
    
    this.telemetryHistory.set(driverId, driverHistory);
  }

  /**
   * Handle comparison result from the server
   * @param event Comparison result event
   */
  private handleComparisonResult(event: ComparisonResultEvent): void {
    const existingComparison = this.activeComparisons.get(event.comparisonId);
    
    if (existingComparison) {
      // Update existing comparison
      existingComparison.metrics = event.metrics;
      existingComparison.timestamp = Date.now();
      this.activeComparisons.set(event.comparisonId, existingComparison);
    }
  }

  /**
   * Request a comparison between two drivers
   * @param driverAId ID of the first driver
   * @param driverBId ID of the second driver
   * @returns The comparison ID
   */
  public requestComparison(driverAId: string, driverBId: string): string | null {
    if (!this.driverManager.hasDriver(driverAId)) {
      console.error(`Cannot compare: Driver ${driverAId} not found`);
      return null;
    }
    
    if (!this.driverManager.hasDriver(driverBId)) {
      console.error(`Cannot compare: Driver ${driverBId} not found`);
      return null;
    }
    
    // Generate a comparison ID (keep consistent with MultiDriverService format)
    const comparisonId = `${driverAId}-${driverBId}`;

    // Send the request via WebSocket (returns boolean for send status)
    this.websocketService.requestDriverComparison(driverAId, driverBId);
    
    // Create a placeholder for the comparison
    this.activeComparisons.set(comparisonId, {
      comparisonId,
      driverAId,
      driverBId,
      timestamp: Date.now(),
      metrics: []
    });
    
    return comparisonId;
  }

  /**
   * Get a comparison result by ID
   * @param comparisonId ID of the comparison
   * @returns The comparison result or null if not found
   */
  public getComparison(comparisonId: string): ComparisonResult | null {
    return this.activeComparisons.get(comparisonId) || null;
  }

  /**
   * Get all active comparisons
   * @returns Array of all comparison results
   */
  public getAllComparisons(): ComparisonResult[] {
    return Array.from(this.activeComparisons.values());
  }

  /**
   * Get all comparisons for a specific driver
   * @param driverId ID of the driver
   * @returns Array of comparison results involving the driver
   */
  public getDriverComparisons(driverId: string): ComparisonResult[] {
    return Array.from(this.activeComparisons.values())
      .filter(comparison => 
        comparison.driverAId === driverId || comparison.driverBId === driverId
      );
  }

  /**
   * Compare telemetry between two drivers using local data
   * @param driverAId ID of the first driver
   * @param driverBId ID of the second driver
   * @returns Array of comparison metrics
   */
  public compareLocalTelemetry(driverAId: string, driverBId: string): ComparisonMetric[] {
    const driverAHistory = this.telemetryHistory.get(driverAId);
    const driverBHistory = this.telemetryHistory.get(driverBId);
    
    if (!driverAHistory || driverAHistory.length === 0) {
      console.warn(`No telemetry history for driver ${driverAId}`);
      return [];
    }
    
    if (!driverBHistory || driverBHistory.length === 0) {
      console.warn(`No telemetry history for driver ${driverBId}`);
      return [];
    }
    
    // Get the most recent telemetry for each driver
    const latestA = driverAHistory[driverAHistory.length - 1].data;
    const latestB = driverBHistory[driverBHistory.length - 1].data;
    
    const metrics: ComparisonMetric[] = [];
    
    // Compare speed
    metrics.push({
      name: 'Speed',
      driverA: {
        value: latestA.speed,
        delta: latestA.speed - latestB.speed
      },
      driverB: {
        value: latestB.speed,
        delta: latestB.speed - latestA.speed
      }
    });
    
    // Compare last lap time if available (mapped to lapTime)
    if (latestA.lapTime && latestB.lapTime) {
      metrics.push({
        name: 'Last Lap Time',
        driverA: {
          value: this.formatTime(latestA.lapTime),
          delta: latestB.lapTime - latestA.lapTime
        },
        driverB: {
          value: this.formatTime(latestB.lapTime),
          delta: latestA.lapTime - latestB.lapTime
        }
      });
    }
    
    // Compare fuel level if present in incoming telemetry (not part of TelemetryData type)
    const aFuel = (latestA as any).fuel as number | undefined;
    const bFuel = (latestB as any).fuel as number | undefined;
    if (typeof aFuel === 'number' && typeof bFuel === 'number') {
      metrics.push({
        name: 'Fuel Level',
        driverA: {
          value: aFuel.toFixed(1),
          delta: aFuel - bFuel
        },
        driverB: {
          value: bFuel.toFixed(1),
          delta: bFuel - aFuel
        }
      });
    }
    
    // Compare tire wear if available (mapped from TelemetryData.tires)
    const aFL = latestA.tires?.frontLeft?.wear;
    const aFR = latestA.tires?.frontRight?.wear;
    const aRL = latestA.tires?.rearLeft?.wear;
    const aRR = latestA.tires?.rearRight?.wear;
    const bFL = latestB.tires?.frontLeft?.wear;
    const bFR = latestB.tires?.frontRight?.wear;
    const bRL = latestB.tires?.rearLeft?.wear;
    const bRR = latestB.tires?.rearRight?.wear;

    if (
      aFL != null && aFR != null && aRL != null && aRR != null &&
      bFL != null && bFR != null && bRL != null && bRR != null
    ) {
      // Front left
      metrics.push({
        name: 'Front Left Tire',
        driverA: {
          value: `${(aFL * 100).toFixed(1)}%`,
          delta: aFL - bFL
        },
        driverB: {
          value: `${(bFL * 100).toFixed(1)}%`,
          delta: bFL - aFL
        }
      });

      // Front right
      metrics.push({
        name: 'Front Right Tire',
        driverA: {
          value: `${(aFR * 100).toFixed(1)}%`,
          delta: aFR - bFR
        },
        driverB: {
          value: `${(bFR * 100).toFixed(1)}%`,
          delta: bFR - aFR
        }
      });

      // Rear left
      metrics.push({
        name: 'Rear Left Tire',
        driverA: {
          value: `${(aRL * 100).toFixed(1)}%`,
          delta: aRL - bRL
        },
        driverB: {
          value: `${(bRL * 100).toFixed(1)}%`,
          delta: bRL - aRL
        }
      });

      // Rear right
      metrics.push({
        name: 'Rear Right Tire',
        driverA: {
          value: `${(aRR * 100).toFixed(1)}%`,
          delta: aRR - bRR
        },
        driverB: {
          value: `${(bRR * 100).toFixed(1)}%`,
          delta: bRR - aRR
        }
      });
    }
    
    return metrics;
  }

  /**
   * Format a time value in seconds to MM:SS.mmm format
   * @param timeInSeconds Time in seconds
   * @returns Formatted time string
   */
  private formatTime(timeInSeconds: number): string {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    const milliseconds = Math.floor((timeInSeconds % 1) * 1000);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  }

  /**
   * Clear comparison data
   * @param comparisonId Optional ID of the comparison to clear, if not provided all comparisons will be cleared
   */
  public clearComparison(comparisonId?: string): void {
    if (comparisonId) {
      this.activeComparisons.delete(comparisonId);
    } else {
      this.activeComparisons.clear();
    }
  }

  /**
   * Clear telemetry history
   * @param driverId Optional ID of the driver to clear history for, if not provided all history will be cleared
   */
  public clearTelemetryHistory(driverId?: string): void {
    if (driverId) {
      this.telemetryHistory.delete(driverId);
    } else {
      this.telemetryHistory.clear();
    }
  }
}

export default ComparisonEngine;
