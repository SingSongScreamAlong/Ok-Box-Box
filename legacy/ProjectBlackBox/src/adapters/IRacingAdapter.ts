import { SimAdapter } from './SimAdapter';
import { TelemetryData } from '../models/TelemetryData';

// Import iRacing SDK with proper type handling
declare const require: any;
let irsdk: any;

try {
  // Attempt to load the iRacing SDK
  irsdk = require('node-irsdk');
} catch (err) {
  console.error('Failed to load node-irsdk:', err);
}

/**
 * Adapter for connecting to iRacing and extracting telemetry data
 * This implementation uses the real iRacing SDK for accurate racing data
 * with a fallback to mock data when the SDK is not available
 */
export class IRacingAdapter extends SimAdapter {
  // Core properties
  private updateInterval: NodeJS.Timeout | null = null;
  private connectionCheckInterval: NodeJS.Timeout | null = null;
  private sessionInfoInterval: NodeJS.Timeout | null = null;
  private mockDataInterval: NodeJS.Timeout | null = null;
  protected connected: boolean = false;
  private lastTelemetryUpdate: number = 0;
  private useRealSdk: boolean = false;

  // iRacing SDK instance
  private irsdkInstance: any = null;
  private sessionInfo: any = null;
  private lastRawTelemetry: any = null; // Store telemetry data from event callback

  // Driver metrics tracking
  private _lastThrottle: number = 0;
  private _lastBrake: number = 0;
  private _trackPositions: Array<{ x: number, y: number }> = [];

  // Mock telemetry data structure (used when real SDK is not available)
  private mockTelemetry: TelemetryData = {
    sessionId: 'mock-session-123',
    timestamp: Date.now(),
    simName: 'iRacing',
    trackName: 'Watkins Glen',
    sessionType: 'Race',
    driverName: 'Demo Driver',
    speed: 180,
    rpm: 6500,
    gear: 4,
    throttle: 0.75,
    brake: 0.0,
    clutch: 0.0,
    steering: 0.1,
    position: {
      x: 100,
      y: 0,
      z: 50,
      heading: 0.2
    },
    lap: 3,
    sector: 1,
    lapTime: 62.5,
    lastLapTime: 63.2,
    sectorTime: 22.1,
    bestLapTime: 62.5,
    bestSectorTimes: [21.8, 20.2, 20.1],
    tires: {
      frontLeft: {
        temp: 85,
        wear: 0.05,
        pressure: 172
      },
      frontRight: {
        temp: 87,
        wear: 0.06,
        pressure: 173
      },
      rearLeft: {
        temp: 83,
        wear: 0.04,
        pressure: 170
      },
      rearRight: {
        temp: 84,
        wear: 0.05,
        pressure: 171
      }
    },
    gForce: {
      lateral: 1.2,
      longitudinal: 0.8,
      vertical: 1.0
    },
    trackPosition: 0.45,
    racePosition: 5,
    gapAhead: 2.3,
    gapBehind: 1.5,
    fuel: {
      level: 35,
      capacity: 60,
      usagePerLap: 2.2,
      estimatedLapsRemaining: 15
    },
    weather: {
      temperature: 22,
      trackTemperature: 28,
      windSpeed: 5,
      windDirection: 180,
      humidity: 65,
      trackGrip: 0.95
    }
  };

  constructor() {
    super();
    this.simName = 'iRacing';

    // Determine if we can use the real SDK
    this.useRealSdk = typeof irsdk !== 'undefined';

    if (this.useRealSdk) {
      console.log('IRacingAdapter initialized with real SDK');
    } else {
      console.log('IRacingAdapter initialized with mock data (SDK not available)');
    }
  }

  /**
   * Connect to iRacing
   * @returns boolean indicating if connection was successful
   */
  connect(): boolean {
    if (this.connected) {
      console.log('Already connected to iRacing');
      return true;
    }

    // Start connection process asynchronously
    this.connectAsync().then(success => {
      // Connection result is handled in the promise
    }).catch(err => {
      console.error('Connection error:', err);
    });

    // Return true to indicate connection process has started
    return true;
  }

  /**
   * Handle the async connection process
   */
  private connectAsync(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (this.connected) {
        console.log('Already connected to iRacing');
        resolve(true);
        return;
      }

      if (this.useRealSdk) {
        try {
          console.log('Attempting to connect to iRacing via node-irsdk...');

          // Create a new instance of the iRacing SDK
          this.irsdkInstance = irsdk.getInstance();

          // Configure the SDK
          const opts = {
            telemetryUpdateInterval: 10  // 10ms (100Hz) telemetry update interval
          };

          // Set a timeout - if SDK doesn't connect in 5 seconds, fall back to mock
          const connectionTimeout = setTimeout(() => {
            if (!this.connected) {
              console.log('iRacing SDK connection timeout - SDK may not be working properly');
              console.log('Falling back to mock data mode for testing...');
              this.useRealSdk = false;
              this.connectWithMockData().then(resolve).catch(reject);
            }
          }, 5000);

          // Set up event handlers
          this.irsdkInstance.on('Connected', () => {
            clearTimeout(connectionTimeout);
            console.log('Connected to iRacing via SDK!');
            this.connected = true;
            this.lastTelemetryUpdate = Date.now();

            // Start the connection check interval
            this.connectionCheckInterval = setInterval(() => {
              this.checkConnection();
            }, 5000);

            // Start the session info update interval
            this.sessionInfoInterval = setInterval(() => {
              this.sessionInfo = this.irsdkInstance.getSessionInfo();
            }, 1000);

            // Set up telemetry update handler
            this.irsdkInstance.on('Telemetry', (data: any) => {
              this.lastTelemetryUpdate = Date.now();
              this.lastRawTelemetry = data; // Store the raw telemetry from event
              this.emit('telemetry', this.getTelemetryData());
            });

            this.emit('connected');
            resolve(true);
          });

          // Handle disconnection
          this.irsdkInstance.on('Disconnected', () => {
            console.log('Disconnected from iRacing');
            this.connected = false;
            this.emit('disconnected');
          });

          // Start the SDK
          console.log('Starting iRacing SDK...');
          this.irsdkInstance.start();
          console.log('iRacing SDK started, waiting for Connected event...');
        } catch (err) {
          console.error('Failed to connect to iRacing:', err);

          // Fall back to mock data
          this.useRealSdk = false;
          this.connectWithMockData().then(resolve).catch(reject);
        }
      } else {
        // Use mock data
        this.connectWithMockData().then(resolve).catch(reject);
      }
    });
  }

  /**
   * Connect using mock data (fallback when SDK is not available)
   */
  private connectWithMockData(): Promise<boolean> {
    return new Promise((resolve) => {
      console.log('Connecting to iRacing (mock)...');

      // Simulate connection after a short delay
      setTimeout(() => {
        this.connected = true;
        this.emit('connected');
        console.log('Connected to iRacing (mock)');

        // Start sending mock telemetry updates
        this.startMockTelemetryUpdates();

        resolve(true);
      }, 500);
    });
  }

  /**
   * Disconnect from iRacing
   */
  disconnect(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        console.log('Not connected to iRacing');
        resolve(true);
        return;
      }

      console.log('Disconnecting from iRacing...');

      // Clear all intervals
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
      }

      if (this.mockDataInterval) {
        clearInterval(this.mockDataInterval);
        this.mockDataInterval = null;
      }

      if (this.sessionInfoInterval) {
        clearInterval(this.sessionInfoInterval);
        this.sessionInfoInterval = null;
      }

      if (this.connectionCheckInterval) {
        clearInterval(this.connectionCheckInterval);
        this.connectionCheckInterval = null;
      }

      // Shutdown the iRacing SDK if we're using it
      if (this.useRealSdk && this.irsdkInstance) {
        try {
          this.irsdkInstance.shutdown();
        } catch (err) {
          console.error('Error shutting down iRacing SDK:', err);
        }
      }

      // Set connected state to false
      this.connected = false;
      this.emit('disconnected');

      console.log('Disconnected from iRacing');
      resolve(true);
    });
  }

  /**
   * Start sending mock telemetry updates
   */
  private startMockTelemetryUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    // Update mock data every 500ms to simulate changing values
    this.mockDataInterval = setInterval(() => {
      this.updateMockData();
    }, 500);

    // Send telemetry updates every 100ms
    this.updateInterval = setInterval(() => {
      if (!this.connected) return;

      // Clone the mock telemetry to avoid reference issues
      const telemetry = { ...this.mockTelemetry };

      // Update timestamp
      telemetry.timestamp = Date.now();

      // Emit telemetry update
      this.emit('telemetry', telemetry);
    }, 100);
  }

  /**
   * Update mock data with realistic changes
   */
  private updateMockData(): void {
    // Update speed (random fluctuation)
    this.mockTelemetry.speed += (Math.random() * 4) - 2;
    this.mockTelemetry.speed = Math.max(0, Math.min(300, this.mockTelemetry.speed));

    // Update RPM (random fluctuation)
    this.mockTelemetry.rpm += (Math.random() * 200) - 100;
    this.mockTelemetry.rpm = Math.max(1000, Math.min(8000, this.mockTelemetry.rpm));

    // Update throttle/brake (occasional changes)
    if (Math.random() > 0.9) {
      if (this.mockTelemetry.throttle > 0.5) {
        this.mockTelemetry.throttle = Math.max(0, this.mockTelemetry.throttle - 0.1);
        this.mockTelemetry.brake = Math.min(1, this.mockTelemetry.brake + 0.1);
      } else {
        this.mockTelemetry.throttle = Math.min(1, this.mockTelemetry.throttle + 0.1);
        this.mockTelemetry.brake = Math.max(0, this.mockTelemetry.brake - 0.1);
      }
    }

    // Update steering (random fluctuation)
    this.mockTelemetry.steering += (Math.random() * 0.1) - 0.05;
    this.mockTelemetry.steering = Math.max(-1, Math.min(1, this.mockTelemetry.steering));

    // Update lap time (increment)
    this.mockTelemetry.lapTime += 0.1;
    if (this.mockTelemetry.lapTime > 90) {
      // Complete a lap
      this.mockTelemetry.lap += 1;
      this.mockTelemetry.lastLapTime = this.mockTelemetry.lapTime;
      this.mockTelemetry.lapTime = 0;

      // Random chance of a better lap
      if (Math.random() > 0.7) {
        const newBestLap = this.mockTelemetry.lastLapTime - (Math.random() * 0.5);
        if (newBestLap < this.mockTelemetry.bestLapTime) {
          this.mockTelemetry.bestLapTime = newBestLap;
        }
      }
    }

    // Update fuel (decrease slowly)
    this.mockTelemetry.fuel.level -= 0.02;
    if (this.mockTelemetry.fuel.level < 0) {
      this.mockTelemetry.fuel.level = this.mockTelemetry.fuel.capacity;
    }

    // Update estimated laps remaining
    this.mockTelemetry.fuel.estimatedLapsRemaining =
      this.mockTelemetry.fuel.level / this.mockTelemetry.fuel.usagePerLap;
  }

  /**
   * Get the current telemetry data from iRacing
   */
  public getTelemetryData(): TelemetryData | null {
    // For mock mode, return mock telemetry
    if (!this.useRealSdk && this.connected) {
      return { ...this.mockTelemetry, timestamp: Date.now() };
    }

    if (!this.connected || !this.irsdkInstance) {
      return null;
    }

    try {
      // Use stored telemetry data from event callback
      const irData = this.lastRawTelemetry;

      if (!irData) {
        return null;
      }

      // Map the iRacing telemetry data to our TelemetryData model
      const telemetryData: TelemetryData = {
        sessionId: `ir-${Date.now()}`,
        simName: this.simName,
        timestamp: Date.now(),
        speed: irData.Speed * 3.6, // Convert m/s to km/h
        rpm: irData.RPM,
        gear: irData.Gear,
        throttle: irData.Throttle,
        brake: irData.Brake,
        steering: irData.SteeringWheelAngle / 25, // Normalize to -1 to 1 range
        lapTime: irData.LapCurrentLapTime,
        position: {
          x: irData.VelocityX,
          y: irData.VelocityY,
          z: irData.VelocityZ,
          heading: irData.Yaw
        },
        lap: irData.Lap,
        sector: this.getSectorFromPosition(irData),
        sectorTime: this.getCurrentSectorTime(irData),
        bestLapTime: irData.LapBestLapTime,
        bestSectorTimes: this.getBestSectorTimes(),
        tires: {
          frontLeft: {
            temp: this.getAverageTireTemp(irData, 'LF'),
            wear: 1 - (irData.LFwearM || 0), // Convert wear to percentage (1 - wear)
            pressure: irData.LFpressure * 0.145038 // Convert kPa to PSI
          },
          frontRight: {
            temp: this.getAverageTireTemp(irData, 'RF'),
            wear: 1 - (irData.RFwearM || 0),
            pressure: irData.RFpressure * 0.145038
          },
          rearLeft: {
            temp: this.getAverageTireTemp(irData, 'LR'),
            wear: 1 - (irData.LRwearM || 0),
            pressure: irData.LRpressure * 0.145038
          },
          rearRight: {
            temp: this.getAverageTireTemp(irData, 'RR'),
            wear: 1 - (irData.RRwearM || 0),
            pressure: irData.RRpressure * 0.145038
          }
        },
        gForce: {
          lateral: irData.LatAccel,
          longitudinal: irData.LongAccel,
          vertical: irData.VertAccel
        },
        trackPosition: irData.LapDistPct,
        racePosition: irData.PlayerCarPosition,
        gapAhead: this.calculateGapAhead(irData),
        gapBehind: this.calculateGapBehind(irData),
        fuel: {
          level: irData.FuelLevel,
          capacity: irData.FuelCapacity,
          usagePerLap: this.calculateFuelUsagePerLap(irData),
          estimatedLapsRemaining: this.calculateEstimatedLapsRemaining(irData)
        },
        suspension: {
          frontLeft: {
            height: irData.LFrideHeight,
            load: irData.LFshockDefl,
            damper: irData.LFshockVel
          },
          frontRight: {
            height: irData.RFrideHeight,
            load: irData.RFshockDefl,
            damper: irData.RFshockVel
          },
          rearLeft: {
            height: irData.LRrideHeight,
            load: irData.LRshockDefl,
            damper: irData.LRshockVel
          },
          rearRight: {
            height: irData.RRrideHeight,
            load: irData.RRshockDefl,
            damper: irData.RRshockVel
          }
        },
        engine: {
          temperature: irData.WaterTemp,
          oilPressure: irData.OilPress,
          oilTemperature: irData.OilTemp,
          waterTemperature: irData.WaterTemp,
          wear: 1 - (irData.EngineWarnings ? 0.1 : 0) // Simple engine wear estimation
        },
        driverInputs: {
          smoothness: this.calculateDriverSmoothness(irData),
          aggression: this.calculateDriverAggression(irData),
          precision: this.calculateDriverPrecision(irData)
        },
        weather: {
          temperature: irData.AirTemp,
          trackTemperature: irData.TrackTemp,
          windSpeed: irData.WindVel,
          windDirection: irData.WindDir,
          humidity: irData.RelativeHumidity,
          trackGrip: this.calculateTrackGrip(irData)
        }
      };

      return telemetryData;
    } catch (err) {
      console.error('Error getting telemetry data:', err);
      this.emit('error', err);
      return null;
    }
  }

  /**
   * Check if the connection to iRacing is still active
   */
  private checkConnection(): void {
    // Check if we're still connected to iRacing by checking the time since the last telemetry update
    // If it's been more than 5 seconds, consider the connection lost

    const now = Date.now();
    const timeSinceLastUpdate = now - this.lastTelemetryUpdate;

    // If we haven't received telemetry data in 10 seconds, consider the connection lost
    if (this.connected && timeSinceLastUpdate > 10000) {
      this.connected = false;
      this.emit('disconnected');
      console.log('Lost connection to iRacing');
    }
  }

  /**
   * Helper methods for processing iRacing telemetry data
   */
  private getAverageTireTemp(irData: any, tire: string): number {
    // iRacing provides inner, middle, and outer tire temperatures
    // Calculate the average of these three values
    const inner = irData[`${tire}innerTemp`] || 0;
    const middle = irData[`${tire}middleTemp`] || 0;
    const outer = irData[`${tire}outerTemp`] || 0;

    return (inner + middle + outer) / 3;
  }

  private getSectorFromPosition(irData: any): number {
    // Determine the current sector based on track position
    const lapDistPct = irData.LapDistPct;

    if (lapDistPct < 0.33) return 1;
    if (lapDistPct < 0.66) return 2;
    return 3;
  }

  private getCurrentSectorTime(irData: any): number {
    // Extract the current sector time from iRacing data
    // This is a simplified implementation
    const sector = this.getSectorFromPosition(irData);

    if (sector === 1) return irData.LapCurrentLapTime;
    if (sector === 2) {
      const sector1Time = irData.LapLastSector1 || 0;
      return irData.LapCurrentLapTime - sector1Time;
    }
    if (sector === 3) {
      const sector1Time = irData.LapLastSector1 || 0;
      const sector2Time = irData.LapLastSector2 || 0;
      return irData.LapCurrentLapTime - (sector1Time + sector2Time);
    }

    return 0;
  }

  private getBestSectorTimes(): number[] {
    // Return the best sector times from the session info
    if (!this.sessionInfo || !this.sessionInfo.DriverInfo) {
      return [0, 0, 0];
    }

    const driverIdx = this.sessionInfo.DriverInfo.DriverCarIdx;
    const driver = this.sessionInfo.DriverInfo.Drivers.find((d: any) => d.CarIdx === driverIdx);

    if (!driver) return [0, 0, 0];

    return [
      driver.BestSector1 || 0,
      driver.BestSector2 || 0,
      driver.BestSector3 || 0
    ];
  }

  private calculateGapAhead(irData: any): number {
    // Calculate the gap to the car ahead
    // This is a simplified implementation
    return irData.CarIdxDistance ? Math.abs(irData.CarIdxDistance[irData.CarIdxPosition - 1] || 0) : 0;
  }

  private calculateGapBehind(irData: any): number {
    // Calculate the gap to the car behind
    // This is a simplified implementation
    return irData.CarIdxDistance ? Math.abs(irData.CarIdxDistance[irData.CarIdxPosition + 1] || 0) : 0;
  }

  private calculateFuelUsagePerLap(irData: any): number {
    // Calculate fuel usage per lap based on recent consumption
    // This is a simplified implementation
    const fuelUsedLastLap = irData.FuelUsePerHour / 60 * (irData.LapLastLapTime / 60);
    return fuelUsedLastLap > 0 ? fuelUsedLastLap : 2.0; // Default to 2.0 if no data
  }

  private calculateEstimatedLapsRemaining(irData: any): number {
    // Calculate estimated laps remaining based on fuel level and usage
    const fuelUsagePerLap = this.calculateFuelUsagePerLap(irData);
    return fuelUsagePerLap > 0 ? Math.floor(irData.FuelLevel / fuelUsagePerLap) : 0;
  }

  private calculateDriverSmoothness(irData: any): number {
    // Calculate driver smoothness based on input variations
    // This is a simplified implementation using throttle/brake transitions
    const throttleChange = Math.abs(irData.ThrottleRaw - (this._lastThrottle || 0));
    const brakeChange = Math.abs(irData.BrakeRaw - (this._lastBrake || 0));

    this._lastThrottle = irData.ThrottleRaw;
    this._lastBrake = irData.BrakeRaw;

    // Lower changes = higher smoothness (0-1 scale)
    return Math.max(0, Math.min(1, 1 - (throttleChange + brakeChange) / 2));
  }

  private calculateDriverAggression(irData: any): number {
    // Calculate driver aggression based on inputs and g-forces
    // This is a simplified implementation
    const throttleApplication = irData.ThrottleRaw;
    const brakeApplication = irData.BrakeRaw;
    const lateralG = Math.abs(irData.LatAccel);
    const longitudinalG = Math.abs(irData.LongAccel);

    // Higher values = higher aggression (0-1 scale)
    return Math.max(0, Math.min(1, (throttleApplication + brakeApplication + lateralG / 5 + longitudinalG / 5) / 2.4));
  }

  private calculateDriverPrecision(irData: any): number {
    // Calculate driver precision based on line consistency
    // This is a simplified implementation using track position variance
    if (!this._trackPositions) this._trackPositions = [];

    // Store track positions at regular intervals
    const currentPos = { x: irData.VelocityX, y: irData.VelocityY };
    this._trackPositions.push(currentPos);

    // Keep only the last 100 positions
    if (this._trackPositions.length > 100) {
      this._trackPositions.shift();
    }

    // Not enough data points yet
    if (this._trackPositions.length < 10) return 0.5;

    // Calculate variance in track position
    // Lower variance = higher precision (0-1 scale)
    let totalVariance = 0;
    for (let i = 1; i < this._trackPositions.length; i++) {
      const prevPos = this._trackPositions[i - 1];
      const pos = this._trackPositions[i];
      totalVariance += Math.sqrt(Math.pow(pos.x - prevPos.x, 2) + Math.pow(pos.y - prevPos.y, 2));
    }

    const avgVariance = totalVariance / this._trackPositions.length;
    return Math.max(0, Math.min(1, 1 - avgVariance / 10));
  }

  private calculateTrackGrip(irData: any): number {
    // Calculate track grip based on weather conditions
    // This is a simplified implementation
    const baseGrip = 0.9; // Base grip level
    const tempFactor = Math.max(0, Math.min(1, (irData.TrackTemp - 10) / 40)); // Optimal temp around 30°C
    const rainFactor = irData.SessionFlags & 0x10000 ? 0.7 : 1.0; // Reduce grip if raining

    return baseGrip * tempFactor * rainFactor;
  }

  /**
   * Generate mock telemetry data for testing when iRacing is not available
   */
  private generateMockTelemetryData(): TelemetryData {
    // Create a mock telemetry data object for testing
    const now = Date.now();
    const lapProgress = (now % 90000) / 90000; // 90-second lap time
    const speed = 200 + Math.sin(lapProgress * Math.PI * 2) * 50; // Speed varies between 150-250 km/h

    return {
      simName: this.simName,
      sessionId: 'mock-session',
      timestamp: now,
      driverId: 'mock-driver-1',
      driverName: 'Test Driver',
      speed: speed,
      rpm: 6000 + (speed * 10),
      gear: Math.min(6, Math.max(1, Math.floor(speed / 50))),
      throttle: lapProgress > 0.7 ? 1.0 : 0.8 + Math.sin(lapProgress * Math.PI * 10) * 0.2,
      brake: lapProgress > 0.7 ? 0.0 : Math.max(0, Math.sin(lapProgress * Math.PI * 10) * 0.8),
      steering: Math.sin(lapProgress * Math.PI * 8) * 0.5,
      position: {
        x: Math.cos(lapProgress * Math.PI * 2) * 1000,
        y: Math.sin(lapProgress * Math.PI * 2) * 1000,
        z: 0,
        heading: lapProgress * Math.PI * 2
      },
      lap: Math.floor(now / 90000) % 10 + 1,
      sector: Math.floor(lapProgress * 3) + 1,
      lapTime: (now % 90000) / 1000,
      sectorTime: (now % 30000) / 1000,
      bestLapTime: 88.5,
      bestSectorTimes: [29.2, 30.1, 29.2],
      tires: {
        frontLeft: {
          temp: 80 + Math.sin(lapProgress * Math.PI * 2) * 10,
          wear: Math.min(1, (now % 3600000) / 3600000), // Wear increases over an hour
          pressure: 190 + Math.sin(lapProgress * Math.PI * 2) * 5
        },
        frontRight: {
          temp: 82 + Math.sin(lapProgress * Math.PI * 2) * 10,
          wear: Math.min(1, (now % 3600000) / 3600000 * 1.1),
          pressure: 192 + Math.sin(lapProgress * Math.PI * 2) * 5
        },
        rearLeft: {
          temp: 78 + Math.sin(lapProgress * Math.PI * 2) * 10,
          wear: Math.min(1, (now % 3600000) / 3600000 * 0.9),
          pressure: 188 + Math.sin(lapProgress * Math.PI * 2) * 5
        },
        rearRight: {
          temp: 79 + Math.sin(lapProgress * Math.PI * 2) * 10,
          wear: Math.min(1, (now % 3600000) / 3600000 * 1.0),
          pressure: 189 + Math.sin(lapProgress * Math.PI * 2) * 5
        }
      },
      gForce: {
        lateral: Math.sin(lapProgress * Math.PI * 8) * 2,
        longitudinal: Math.cos(lapProgress * Math.PI * 4) * 1.5,
        vertical: Math.sin(lapProgress * Math.PI * 16) * 0.5
      },
      trackPosition: lapProgress,
      racePosition: 3,
      gapAhead: 1.2 + Math.sin(lapProgress * Math.PI * 2) * 0.5,
      gapBehind: 2.5 + Math.cos(lapProgress * Math.PI * 2) * 0.8,
      fuel: {
        level: 60 - (now % 3600000) / 3600000 * 60, // Fuel decreases over an hour
        capacity: 100,
        usagePerLap: 2.2,
        estimatedLapsRemaining: Math.floor((60 - (now % 3600000) / 3600000 * 60) / 2.2)
      },
      suspension: {
        frontLeft: {
          height: 100 + Math.sin(lapProgress * Math.PI * 16) * 10,
          load: 2000 + Math.sin(lapProgress * Math.PI * 8) * 500,
          damper: Math.sin(lapProgress * Math.PI * 32) * 50
        },
        frontRight: {
          height: 100 + Math.sin(lapProgress * Math.PI * 16 + Math.PI) * 10,
          load: 2000 + Math.sin(lapProgress * Math.PI * 8 + Math.PI) * 500,
          damper: Math.sin(lapProgress * Math.PI * 32 + Math.PI) * 50
        },
        rearLeft: {
          height: 110 + Math.sin(lapProgress * Math.PI * 16) * 10,
          load: 1800 + Math.sin(lapProgress * Math.PI * 8) * 400,
          damper: Math.sin(lapProgress * Math.PI * 32) * 40
        },
        rearRight: {
          height: 110 + Math.sin(lapProgress * Math.PI * 16 + Math.PI) * 10,
          load: 1800 + Math.sin(lapProgress * Math.PI * 8 + Math.PI) * 400,
          damper: Math.sin(lapProgress * Math.PI * 32 + Math.PI) * 40
        }
      },
      engine: {
        temperature: 90 + Math.sin(lapProgress * Math.PI * 2) * 5,
        oilPressure: 500 + Math.sin(lapProgress * Math.PI * 4) * 20,
        oilTemperature: 85 + Math.sin(lapProgress * Math.PI * 2) * 3,
        waterTemperature: 88 + Math.sin(lapProgress * Math.PI * 2) * 4,
        wear: Math.min(1, (now % 7200000) / 7200000) // Engine wear over 2 hours
      },
      driverInputs: {
        smoothness: 0.8 + Math.sin(lapProgress * Math.PI * 2) * 0.1,
        aggression: 0.6 + Math.cos(lapProgress * Math.PI * 4) * 0.2,
        precision: 0.75 + Math.sin(lapProgress * Math.PI * 8) * 0.15
      },
      weather: {
        temperature: 22,
        trackTemperature: 28,
        windSpeed: 5,
        windDirection: 180,
        humidity: 60,
        trackGrip: 0.95
      }
    };
  }
}
