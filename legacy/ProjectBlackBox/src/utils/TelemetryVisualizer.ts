import { TelemetryData } from '../models/TelemetryData';

/**
 * Utility class for visualizing telemetry data
 * This class provides methods to convert telemetry data into visual representations
 * that can be used by the UI components
 */
export class TelemetryVisualizer {
  /**
   * Generate a simple text summary of telemetry data
   * @param data Telemetry data to summarize
   * @returns Text summary of the telemetry data
   */
  public static generateTextSummary(data: TelemetryData): string {
    if (!data) return 'No telemetry data available';
    
    return `
Simulator: ${data.simName}
Speed: ${Math.round(data.speed)} km/h
RPM: ${Math.round(data.rpm)}
Gear: ${data.gear === 0 ? 'N' : data.gear === -1 ? 'R' : data.gear}
Throttle: ${Math.round(data.throttle * 100)}%
Brake: ${Math.round(data.brake * 100)}%
Steering: ${Math.round(data.steering * 100)}%
Lap: ${data.lap}
Sector: ${data.sector}
Lap Time: ${data.lapTime.toFixed(3)}s
Position: ${data.racePosition}
Fuel: ${data.fuel.level.toFixed(1)}L (${data.fuel.estimatedLapsRemaining.toFixed(1)} laps remaining)
    `;
  }
  
  /**
   * Generate data for a tire temperature visualization
   * @param data Telemetry data to visualize
   * @returns Object with tire temperature visualization data
   */
  public static generateTireVisualization(data: TelemetryData): any {
    if (!data || !data.tires) {
      return {
        temperatures: {
          frontLeft: 0,
          frontRight: 0,
          rearLeft: 0,
          rearRight: 0
        },
        wear: {
          frontLeft: 0,
          frontRight: 0,
          rearLeft: 0,
          rearRight: 0
        },
        pressure: {
          frontLeft: 0,
          frontRight: 0,
          rearLeft: 0,
          rearRight: 0
        }
      };
    }
    
    return {
      temperatures: {
        frontLeft: data.tires.frontLeft.temp,
        frontRight: data.tires.frontRight.temp,
        rearLeft: data.tires.rearLeft.temp,
        rearRight: data.tires.rearRight.temp
      },
      wear: {
        frontLeft: data.tires.frontLeft.wear * 100,
        frontRight: data.tires.frontRight.wear * 100,
        rearLeft: data.tires.rearLeft.wear * 100,
        rearRight: data.tires.rearRight.wear * 100
      },
      pressure: {
        frontLeft: data.tires.frontLeft.pressure,
        frontRight: data.tires.frontRight.pressure,
        rearLeft: data.tires.rearLeft.pressure,
        rearRight: data.tires.rearRight.pressure
      }
    };
  }
  
  /**
   * Generate data for a track position visualization
   * @param data Telemetry data to visualize
   * @returns Object with track position visualization data
   */
  public static generateTrackPositionVisualization(data: TelemetryData): any {
    if (!data) {
      return {
        position: 0,
        sector: 0,
        lapProgress: 0
      };
    }
    
    return {
      position: data.trackPosition,
      sector: data.sector,
      lapProgress: data.trackPosition,
      coordinates: {
        x: data.position.x,
        y: data.position.y,
        z: data.position.z,
        heading: data.position.heading
      }
    };
  }
  
  /**
   * Generate data for a lap time visualization
   * @param data Telemetry data to visualize
   * @returns Object with lap time visualization data
   */
  public static generateLapTimeVisualization(data: TelemetryData): any {
    if (!data) {
      return {
        currentLap: 0,
        currentTime: 0,
        bestLap: 0,
        sectors: []
      };
    }
    
    return {
      currentLap: data.lap,
      currentTime: data.lapTime,
      bestLap: data.bestLapTime,
      sectors: [
        {
          number: 1,
          time: data.sector === 1 ? data.sectorTime : data.bestSectorTimes[0],
          isBest: data.sector !== 1 && data.sectorTime <= data.bestSectorTimes[0]
        },
        {
          number: 2,
          time: data.sector === 2 ? data.sectorTime : data.bestSectorTimes[1],
          isBest: data.sector !== 2 && data.sectorTime <= data.bestSectorTimes[1]
        },
        {
          number: 3,
          time: data.sector === 3 ? data.sectorTime : data.bestSectorTimes[2],
          isBest: data.sector !== 3 && data.sectorTime <= data.bestSectorTimes[2]
        }
      ]
    };
  }
  
  /**
   * Generate data for a driver input visualization
   * @param data Telemetry data to visualize
   * @returns Object with driver input visualization data
   */
  public static generateDriverInputVisualization(data: TelemetryData): any {
    if (!data) {
      return {
        throttle: 0,
        brake: 0,
        steering: 0,
        clutch: 0
      };
    }
    
    return {
      throttle: data.throttle,
      brake: data.brake,
      steering: data.steering,
      clutch: data.clutch || 0,
      metrics: data.driverInputs ? {
        smoothness: data.driverInputs.smoothness,
        aggression: data.driverInputs.aggression,
        precision: data.driverInputs.precision
      } : {
        smoothness: 0,
        aggression: 0,
        precision: 0
      }
    };
  }
  
  /**
   * Generate data for a G-force visualization
   * @param data Telemetry data to visualize
   * @returns Object with G-force visualization data
   */
  public static generateGForceVisualization(data: TelemetryData): any {
    if (!data || !data.gForce) {
      return {
        lateral: 0,
        longitudinal: 0,
        vertical: 0,
        combined: 0
      };
    }
    
    const lateral = data.gForce.lateral;
    const longitudinal = data.gForce.longitudinal;
    const vertical = data.gForce.vertical;
    const combined = Math.sqrt(lateral * lateral + longitudinal * longitudinal);
    
    return {
      lateral,
      longitudinal,
      vertical,
      combined,
      x: lateral,  // For plotting on a 2D graph
      y: longitudinal  // For plotting on a 2D graph
    };
  }
  
  /**
   * Generate data for a suspension visualization
   * @param data Telemetry data to visualize
   * @returns Object with suspension visualization data
   */
  public static generateSuspensionVisualization(data: TelemetryData): any {
    if (!data || !data.suspension) {
      return {
        height: {
          frontLeft: 0,
          frontRight: 0,
          rearLeft: 0,
          rearRight: 0
        },
        load: {
          frontLeft: 0,
          frontRight: 0,
          rearLeft: 0,
          rearRight: 0
        }
      };
    }
    
    return {
      height: {
        frontLeft: data.suspension.frontLeft.height,
        frontRight: data.suspension.frontRight.height,
        rearLeft: data.suspension.rearLeft.height,
        rearRight: data.suspension.rearRight.height
      },
      load: {
        frontLeft: data.suspension.frontLeft.load,
        frontRight: data.suspension.frontRight.load,
        rearLeft: data.suspension.rearLeft.load,
        rearRight: data.suspension.rearRight.load
      },
      damper: {
        frontLeft: data.suspension.frontLeft.damper,
        frontRight: data.suspension.frontRight.damper,
        rearLeft: data.suspension.rearLeft.damper,
        rearRight: data.suspension.rearRight.damper
      }
    };
  }
  
  /**
   * Generate data for an engine visualization
   * @param data Telemetry data to visualize
   * @returns Object with engine visualization data
   */
  public static generateEngineVisualization(data: TelemetryData): any {
    if (!data || !data.engine) {
      return {
        temperature: 0,
        oilPressure: 0,
        oilTemperature: 0,
        waterTemperature: 0,
        wear: 0
      };
    }
    
    return {
      temperature: data.engine.temperature,
      oilPressure: data.engine.oilPressure,
      oilTemperature: data.engine.oilTemperature,
      waterTemperature: data.engine.waterTemperature,
      wear: data.engine.wear * 100  // Convert to percentage
    };
  }
  
  /**
   * Generate a comprehensive telemetry dashboard data object
   * @param data Telemetry data to visualize
   * @returns Object with all visualization data for a dashboard
   */
  public static generateDashboardData(data: TelemetryData): any {
    return {
      summary: this.generateTextSummary(data),
      tires: this.generateTireVisualization(data),
      track: this.generateTrackPositionVisualization(data),
      lapTimes: this.generateLapTimeVisualization(data),
      driverInputs: this.generateDriverInputVisualization(data),
      gForce: this.generateGForceVisualization(data),
      suspension: this.generateSuspensionVisualization(data),
      engine: this.generateEngineVisualization(data),
      raw: data  // Include the raw data for advanced usage
    };
  }
}
