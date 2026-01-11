/**
 * Brake Marker System
 * Auto-detects braking points, displays markers, and provides braking guidance
 */

import type { TelemetryData } from '../types';

export interface BrakeMarker {
  id: string;
  cornerNumber: number;
  cornerName: string;
  trackPosition: number; // 0-1
  distanceMarker: number; // meters from corner
  optimalBrakePoint: number; // track position
  currentBrakePoint: number; // your average brake point
  delta: number; // positive = braking too early
  brakeForce: number; // 0-1 optimal initial brake pressure
  trailBrakeEnd: number; // track position where trail braking ends
  speed: {
    entry: number;
    apex: number;
    exit: number;
  };
}

export interface BrakingEvent {
  timestamp: number;
  trackPosition: number;
  speed: number;
  brakeForce: number;
  gear: number;
  cornerNumber: number;
}

export interface BrakingAnalysis {
  cornerNumber: number;
  avgBrakePoint: number;
  bestBrakePoint: number; // Latest braking that still made corner
  avgBrakeForce: number;
  consistency: number; // 0-100
  trailBrakeRatio: number; // How much trail braking used
  lockupFrequency: number; // 0-100
  recommendation: string;
}

export interface BrakeZoneGuidance {
  isApproaching: boolean;
  distanceToBrake: number; // meters
  cornerName: string;
  suggestedBrakePoint: number;
  suggestedGear: number;
  countdown: '3' | '2' | '1' | 'BRAKE' | null;
}

interface CornerBrakeData {
  cornerNumber: number;
  events: BrakingEvent[];
  optimalBrakePoint: number;
  optimalSpeed: number;
}

class BrakeMarkerSystemClass {
  private brakeMarkers: Map<number, BrakeMarker> = new Map();
  private cornerData: Map<number, CornerBrakeData> = new Map();
  private currentBrakingEvent: BrakingEvent | null = null;
  private isBraking = false;
  private lastTrackPosition = 0;
  private trackLength = 5000; // meters, would be set per track

  private listeners: Set<(markers: BrakeMarker[]) => void> = new Set();
  private guidanceListeners: Set<(guidance: BrakeZoneGuidance) => void> = new Set();

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  initialize(trackLength: number, corners: Array<{ number: number; name: string; position: number }>): void {
    this.trackLength = trackLength;
    this.brakeMarkers.clear();
    this.cornerData.clear();

    // Create initial markers for each corner
    for (const corner of corners) {
      const marker: BrakeMarker = {
        id: `brake-${corner.number}`,
        cornerNumber: corner.number,
        cornerName: corner.name,
        trackPosition: corner.position,
        distanceMarker: 100, // Default 100m marker
        optimalBrakePoint: corner.position - 0.02, // 2% before corner
        currentBrakePoint: corner.position - 0.02,
        delta: 0,
        brakeForce: 0.8,
        trailBrakeEnd: corner.position + 0.01,
        speed: { entry: 200, apex: 100, exit: 150 },
      };

      this.brakeMarkers.set(corner.number, marker);
      this.cornerData.set(corner.number, {
        cornerNumber: corner.number,
        events: [],
        optimalBrakePoint: marker.optimalBrakePoint,
        optimalSpeed: 200,
      });
    }
  }

  // ============================================================================
  // TELEMETRY PROCESSING
  // ============================================================================

  update(telemetry: TelemetryData): void {
    const trackPos = telemetry.trackPosition;
    const brakePressed = telemetry.brake > 0.1;

    // Detect brake zone entry
    if (brakePressed && !this.isBraking) {
      this.startBrakingEvent(telemetry);
    }

    // Update current braking event
    if (this.isBraking && this.currentBrakingEvent) {
      this.updateBrakingEvent(telemetry);
    }

    // Detect brake zone exit
    if (!brakePressed && this.isBraking) {
      this.endBrakingEvent(telemetry);
    }

    // Generate guidance for upcoming corners
    this.generateGuidance(telemetry);

    this.lastTrackPosition = trackPos;
  }

  private startBrakingEvent(telemetry: TelemetryData): void {
    this.isBraking = true;
    
    // Find which corner this braking is for
    const cornerNumber = this.findUpcomingCorner(telemetry.trackPosition);

    this.currentBrakingEvent = {
      timestamp: Date.now(),
      trackPosition: telemetry.trackPosition,
      speed: telemetry.speed,
      brakeForce: telemetry.brake,
      gear: telemetry.gear,
      cornerNumber,
    };
  }

  private updateBrakingEvent(telemetry: TelemetryData): void {
    if (!this.currentBrakingEvent) return;

    // Track maximum brake force
    if (telemetry.brake > this.currentBrakingEvent.brakeForce) {
      this.currentBrakingEvent.brakeForce = telemetry.brake;
    }
  }

  private endBrakingEvent(telemetry: TelemetryData): void {
    this.isBraking = false;

    if (!this.currentBrakingEvent) return;

    const event = this.currentBrakingEvent;
    const cornerData = this.cornerData.get(event.cornerNumber);

    if (cornerData) {
      // Add event to history
      cornerData.events.push(event);

      // Keep last 20 events per corner
      if (cornerData.events.length > 20) {
        cornerData.events.shift();
      }

      // Update marker with new data
      this.updateMarkerFromEvents(event.cornerNumber);
    }

    this.currentBrakingEvent = null;
    this.notifyListeners();
  }

  private findUpcomingCorner(trackPosition: number): number {
    let closestCorner = 1;
    let minDistance = 1;

    for (const [cornerNum, marker] of this.brakeMarkers) {
      let distance = marker.trackPosition - trackPosition;
      if (distance < 0) distance += 1; // Wrap around

      if (distance < minDistance && distance > 0) {
        minDistance = distance;
        closestCorner = cornerNum;
      }
    }

    return closestCorner;
  }

  private updateMarkerFromEvents(cornerNumber: number): void {
    const cornerData = this.cornerData.get(cornerNumber);
    const marker = this.brakeMarkers.get(cornerNumber);

    if (!cornerData || !marker || cornerData.events.length < 3) return;

    const events = cornerData.events;

    // Calculate average brake point
    const avgBrakePoint = events.reduce((sum, e) => sum + e.trackPosition, 0) / events.length;

    // Find best (latest) brake point from successful corners
    // (Simplified - would need corner exit speed to determine success)
    const sortedByPosition = [...events].sort((a, b) => b.trackPosition - a.trackPosition);
    const bestBrakePoint = sortedByPosition[0].trackPosition;

    // Calculate average brake force
    const avgBrakeForce = events.reduce((sum, e) => sum + e.brakeForce, 0) / events.length;

    // Calculate average entry speed
    const avgEntrySpeed = events.reduce((sum, e) => sum + e.speed, 0) / events.length;

    // Update marker
    marker.currentBrakePoint = avgBrakePoint;
    marker.delta = (avgBrakePoint - marker.optimalBrakePoint) * this.trackLength;
    marker.brakeForce = avgBrakeForce;
    marker.speed.entry = avgEntrySpeed;

    // Update optimal if we're consistently braking later successfully
    if (bestBrakePoint > marker.optimalBrakePoint) {
      marker.optimalBrakePoint = marker.optimalBrakePoint * 0.9 + bestBrakePoint * 0.1;
    }
  }

  // ============================================================================
  // GUIDANCE
  // ============================================================================

  private generateGuidance(telemetry: TelemetryData): void {
    const trackPos = telemetry.trackPosition;
    const upcomingCorner = this.findUpcomingCorner(trackPos);
    const marker = this.brakeMarkers.get(upcomingCorner);

    if (!marker) return;

    let distanceToCorner = marker.trackPosition - trackPos;
    if (distanceToCorner < 0) distanceToCorner += 1;

    const distanceMeters = distanceToCorner * this.trackLength;
    const distanceToBrake = (marker.optimalBrakePoint - trackPos) * this.trackLength;

    let countdown: BrakeZoneGuidance['countdown'] = null;
    const isApproaching = distanceMeters < 300;

    if (isApproaching) {
      if (distanceToBrake <= 0) {
        countdown = 'BRAKE';
      } else if (distanceToBrake < 50) {
        countdown = '1';
      } else if (distanceToBrake < 100) {
        countdown = '2';
      } else if (distanceToBrake < 150) {
        countdown = '3';
      }
    }

    const guidance: BrakeZoneGuidance = {
      isApproaching,
      distanceToBrake: Math.max(0, distanceToBrake),
      cornerName: marker.cornerName,
      suggestedBrakePoint: marker.optimalBrakePoint,
      suggestedGear: this.estimateGearForCorner(marker),
      countdown,
    };

    this.notifyGuidance(guidance);
  }

  private estimateGearForCorner(marker: BrakeMarker): number {
    // Estimate gear based on apex speed
    const apexSpeed = marker.speed.apex;
    if (apexSpeed < 60) return 2;
    if (apexSpeed < 100) return 3;
    if (apexSpeed < 140) return 4;
    if (apexSpeed < 180) return 5;
    return 6;
  }

  // ============================================================================
  // ANALYSIS
  // ============================================================================

  getAnalysisForCorner(cornerNumber: number): BrakingAnalysis | null {
    const cornerData = this.cornerData.get(cornerNumber);
    const marker = this.brakeMarkers.get(cornerNumber);

    if (!cornerData || !marker || cornerData.events.length < 3) return null;

    const events = cornerData.events;

    // Average brake point
    const avgBrakePoint = events.reduce((sum, e) => sum + e.trackPosition, 0) / events.length;

    // Best brake point
    const sortedByPosition = [...events].sort((a, b) => b.trackPosition - a.trackPosition);
    const bestBrakePoint = sortedByPosition[0].trackPosition;

    // Average brake force
    const avgBrakeForce = events.reduce((sum, e) => sum + e.brakeForce, 0) / events.length;

    // Consistency (std dev of brake points)
    const variance = events.reduce((sum, e) => sum + Math.pow(e.trackPosition - avgBrakePoint, 2), 0) / events.length;
    const stdDev = Math.sqrt(variance);
    const consistency = Math.max(0, 100 - stdDev * 10000);

    // Trail brake ratio (simplified)
    const trailBrakeRatio = 0.5; // Would need more detailed telemetry

    // Lockup frequency (would need wheel speed data)
    const lockupFrequency = 0;

    // Generate recommendation
    let recommendation = '';
    if (avgBrakePoint < bestBrakePoint - 0.005) {
      recommendation = `Brake ${Math.round((bestBrakePoint - avgBrakePoint) * this.trackLength)}m later`;
    } else if (consistency < 70) {
      recommendation = 'Focus on consistent brake point';
    } else if (avgBrakeForce < 0.7) {
      recommendation = 'Increase initial brake pressure';
    } else {
      recommendation = 'Good braking technique';
    }

    return {
      cornerNumber,
      avgBrakePoint,
      bestBrakePoint,
      avgBrakeForce,
      consistency,
      trailBrakeRatio,
      lockupFrequency,
      recommendation,
    };
  }

  getAllAnalysis(): BrakingAnalysis[] {
    const analyses: BrakingAnalysis[] = [];

    for (const cornerNum of this.brakeMarkers.keys()) {
      const analysis = this.getAnalysisForCorner(cornerNum);
      if (analysis) {
        analyses.push(analysis);
      }
    }

    return analyses;
  }

  // ============================================================================
  // MARKER MANAGEMENT
  // ============================================================================

  getMarkers(): BrakeMarker[] {
    return Array.from(this.brakeMarkers.values());
  }

  getMarkerForCorner(cornerNumber: number): BrakeMarker | null {
    return this.brakeMarkers.get(cornerNumber) || null;
  }

  setCustomMarker(cornerNumber: number, brakePoint: number): void {
    const marker = this.brakeMarkers.get(cornerNumber);
    if (marker) {
      marker.optimalBrakePoint = brakePoint;
      this.notifyListeners();
    }
  }

  resetMarker(cornerNumber: number): void {
    const cornerData = this.cornerData.get(cornerNumber);
    if (cornerData) {
      cornerData.events = [];
    }
    this.notifyListeners();
  }

  // ============================================================================
  // STATE
  // ============================================================================

  getState() {
    return {
      markers: this.getMarkers(),
      isBraking: this.isBraking,
      currentCorner: this.currentBrakingEvent?.cornerNumber || null,
    };
  }

  subscribe(listener: (markers: BrakeMarker[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  subscribeToGuidance(listener: (guidance: BrakeZoneGuidance) => void): () => void {
    this.guidanceListeners.add(listener);
    return () => this.guidanceListeners.delete(listener);
  }

  private notifyListeners(): void {
    const markers = this.getMarkers();
    this.listeners.forEach(l => l(markers));
  }

  private notifyGuidance(guidance: BrakeZoneGuidance): void {
    this.guidanceListeners.forEach(l => l(guidance));
  }

  reset(): void {
    this.brakeMarkers.clear();
    this.cornerData.clear();
    this.currentBrakingEvent = null;
    this.isBraking = false;
  }
}

export const BrakeMarkerSystem = new BrakeMarkerSystemClass();
export default BrakeMarkerSystem;
