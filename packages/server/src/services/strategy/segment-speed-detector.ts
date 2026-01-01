/**
 * Segment Speed Detector
 * 
 * Derives opponent speed from segment timing using "virtual speed traps".
 * 
 * AUTHORITATIVE CONSTRAINTS:
 * - iRacing SDK does NOT expose CarIdxSpeed
 * - All speeds are DERIVED from lapDistPct changes over time
 * - Unknown > 0 (never default to zero)
 * - Every output includes confidence and quality tags
 */

import { EventEmitter } from 'events';
import type {
    TrackSegment,
    TrackSegmentMap,
    SegmentSpeedResult,
    SegmentQuality,
    ConfidenceValue,
    SegmentPaceUpdateEvent,
    OpponentPaceTrendEvent
} from './segment-types.js';
import { SEGMENT_CONFIG } from './segment-types.js';

// ============================================================================
// WRAP-SAFE MATH
// ============================================================================

/**
 * Compute wrap-safe lap distance delta.
 * Handles the 1.0 → 0.0 wraparound at start/finish.
 * 
 * @param p1 Previous lap distance percentage [0, 1)
 * @param p2 Current lap distance percentage [0, 1)
 * @returns Delta in percentage (can be negative if going backwards)
 */
export function wrapSafeDelta(p1: number, p2: number): number {
    let dp = p2 - p1;

    // Handle wrap-around at start/finish line
    if (dp < -0.5) {
        dp += 1.0;  // Crossed finish line forward
    }
    if (dp > 0.5) {
        dp -= 1.0;  // Crossed finish line backward (reset, etc.)
    }

    return dp;
}

/**
 * Convert lap distance delta to meters.
 * 
 * @param deltaPct Percentage change
 * @param trackLengthMeters Total track length
 * @returns Distance in meters
 */
export function deltaToMeters(deltaPct: number, trackLengthMeters: number): number {
    return deltaPct * trackLengthMeters;
}

/**
 * Check if a position falls within a segment (wrap-safe).
 * 
 * @param pct Current position [0, 1)
 * @param segment The segment to check
 * @returns True if position is within segment
 */
export function isInSegment(pct: number, segment: TrackSegment): boolean {
    if (segment.startPct <= segment.endPct) {
        // Normal segment (doesn't cross start/finish)
        return pct >= segment.startPct && pct < segment.endPct;
    } else {
        // Segment crosses start/finish line
        return pct >= segment.startPct || pct < segment.endPct;
    }
}

// ============================================================================
// CAR STATE TRACKING
// ============================================================================

interface CarSegmentState {
    carId: number;
    driverId: string;

    // Current position
    lastLapDistPct: number;
    lastLap: number;
    lastTimestamp: number;

    // Segment tracking
    currentSegmentId: string | null;
    segmentEntryTime: number;
    segmentEntryPct: number;
    segmentEntryLap: number;

    // Quality tracking
    inPitLane: boolean;
    trackSurface: number;
    hasTrafficOverlap: boolean;

    // History for trend analysis
    segmentHistory: SegmentSpeedResult[];
}

// ============================================================================
// SEGMENT SPEED DETECTOR SERVICE
// ============================================================================

export class SegmentSpeedDetector extends EventEmitter {
    private trackMap: TrackSegmentMap | null = null;
    private carStates: Map<number, CarSegmentState> = new Map();
    private sessionId: string = '';

    // ========================================================================
    // CONFIGURATION
    // ========================================================================

    /**
     * Set the track segment map for current session.
     */
    setTrackMap(map: TrackSegmentMap): void {
        this.trackMap = map;
        this.carStates.clear(); // Reset on track change
        this.emit('track:configured', { trackId: map.trackId, segments: map.segments.length });
    }

    /**
     * Set current session ID.
     */
    setSession(sessionId: string): void {
        this.sessionId = sessionId;
    }

    /**
     * Generate default segment map for a track.
     * Creates 10 equally-spaced segments as fallback.
     */
    generateDefaultSegmentMap(
        trackId: string,
        trackName: string,
        trackLengthMeters: number
    ): TrackSegmentMap {
        const segmentCount = 10;
        const segmentPct = 1.0 / segmentCount;
        const segmentLength = trackLengthMeters / segmentCount;

        const segments: TrackSegment[] = [];
        for (let i = 0; i < segmentCount; i++) {
            segments.push({
                segmentId: `seg_${i}`,
                label: `Segment ${i + 1}`,
                startPct: i * segmentPct,
                endPct: (i + 1) * segmentPct,
                lengthMeters: segmentLength,
                segmentType: i % 3 === 0 ? 'straight' : 'corner',
                isSpeedTrap: i === 0 // First segment is speed trap
            });
        }

        return {
            trackId,
            trackName,
            layoutName: 'default',
            trackLengthMeters,
            segments,
            createdAt: Date.now(),
            version: '1.0.0'
        };
    }

    // ========================================================================
    // TELEMETRY PROCESSING
    // ========================================================================

    /**
     * Process telemetry update for a car.
     * Called at telemetry rate (60Hz).
     */
    processTelemetry(
        carId: number,
        driverId: string,
        lapDistPct: number,
        lap: number,
        inPitLane: boolean,
        trackSurface: number,
        hasTrafficOverlap: boolean,
        timestamp: number
    ): SegmentSpeedResult | null {
        if (!this.trackMap) return null;

        // Get or create car state
        let state = this.carStates.get(carId);
        if (!state) {
            state = this.initializeCarState(carId, driverId, lapDistPct, lap, timestamp);
            this.carStates.set(carId, state);
            return null; // Need at least 2 samples
        }

        // Update quality flags
        state.inPitLane = inPitLane;
        state.trackSurface = trackSurface;
        state.hasTrafficOverlap = hasTrafficOverlap;

        // Find current segment
        const currentSegment = this.findSegment(lapDistPct);
        if (!currentSegment) {
            this.updateCarPosition(state, lapDistPct, lap, timestamp);
            return null;
        }

        let result: SegmentSpeedResult | null = null;

        // Check for segment transition
        if (state.currentSegmentId !== currentSegment.segmentId) {
            // Complete previous segment if we were in one
            if (state.currentSegmentId !== null) {
                const prevSegment = this.trackMap.segments.find(s => s.segmentId === state!.currentSegmentId);
                if (prevSegment) {
                    result = this.completeSegment(state, prevSegment, timestamp);
                }
            }

            // Enter new segment
            state.currentSegmentId = currentSegment.segmentId;
            state.segmentEntryTime = timestamp;
            state.segmentEntryPct = lapDistPct;
            state.segmentEntryLap = lap;
        }

        // Update position
        this.updateCarPosition(state, lapDistPct, lap, timestamp);

        return result;
    }

    // ========================================================================
    // SEGMENT COMPLETION
    // ========================================================================

    private completeSegment(
        state: CarSegmentState,
        segment: TrackSegment,
        exitTime: number
    ): SegmentSpeedResult {
        const segmentTimeMs = exitTime - state.segmentEntryTime;

        // Classify data quality
        const { quality, reasons } = this.classifyQuality(
            state,
            segmentTimeMs,
            segment
        );

        // Calculate speed
        const speed = this.calculateSegmentSpeed(
            segment.lengthMeters,
            segmentTimeMs,
            quality
        );

        const result: SegmentSpeedResult = {
            carId: state.carId,
            driverId: state.driverId,
            segmentId: segment.segmentId,
            segmentType: segment.segmentType,
            segmentTimeMs,
            entryTimestamp: state.segmentEntryTime,
            exitTimestamp: exitTime,
            avgSpeedMs: speed,
            avgSpeedKph: {
                value: speed.value !== undefined ? speed.value * 3.6 : undefined,
                confidence: speed.confidence,
                source: speed.source,
                quality: speed.quality,
                timestamp: exitTime
            },
            quality,
            qualityReasons: reasons,
            deltaFromBestMs: undefined, // TODO: Calculate from baseline
            lapNumber: state.lastLap,
            stintLap: 0 // TODO: Get from stint tracker
        };

        // Store in history
        state.segmentHistory.push(result);
        if (state.segmentHistory.length > 100) {
            state.segmentHistory.shift(); // Keep last 100
        }

        // Emit event
        if (quality === 'CLEAN' || quality === 'TRAFFIC_AFFECTED') {
            this.emitSegmentPaceUpdate(result);
        }

        return result;
    }

    // ========================================================================
    // QUALITY CLASSIFICATION
    // ========================================================================

    private classifyQuality(
        state: CarSegmentState,
        segmentTimeMs: number,
        _segment: TrackSegment
    ): { quality: SegmentQuality; reasons: string[] } {
        const reasons: string[] = [];

        // Check pit lane
        if (state.inPitLane) {
            reasons.push('Car in pit lane');
            return { quality: 'PIT', reasons };
        }

        // Check track surface (0 = off track in iRacing)
        if (state.trackSurface === 0) {
            reasons.push('Off racing surface');
            return { quality: 'OFFTRACK', reasons };
        }

        // Check timing validity
        if (segmentTimeMs < SEGMENT_CONFIG.MIN_SEGMENT_TIME_MS) {
            reasons.push(`Segment time ${segmentTimeMs}ms below minimum ${SEGMENT_CONFIG.MIN_SEGMENT_TIME_MS}ms (teleport?)`);
            return { quality: 'INVALID', reasons };
        }

        if (segmentTimeMs > SEGMENT_CONFIG.MAX_SEGMENT_TIME_MS) {
            reasons.push(`Segment time ${segmentTimeMs}ms above maximum ${SEGMENT_CONFIG.MAX_SEGMENT_TIME_MS}ms (stopped?)`);
            return { quality: 'INVALID', reasons };
        }

        // Check traffic
        if (state.hasTrafficOverlap) {
            reasons.push('Traffic overlap detected');
            return { quality: 'TRAFFIC_AFFECTED', reasons };
        }

        // All checks passed
        reasons.push('No quality issues detected');
        return { quality: 'CLEAN', reasons };
    }

    // ========================================================================
    // SPEED CALCULATION
    // ========================================================================

    private calculateSegmentSpeed(
        lengthMeters: number,
        timeMs: number,
        quality: SegmentQuality
    ): ConfidenceValue<number> {
        // Cannot calculate if invalid
        if (quality === 'INVALID' || quality === 'PIT') {
            return {
                value: undefined,
                confidence: 0,
                source: 'UNKNOWN',
                quality,
                timestamp: Date.now()
            };
        }

        // Calculate average speed
        const timeSeconds = timeMs / 1000;
        const speedMs = lengthMeters / timeSeconds;

        // Sanity check (0-100 m/s = 0-360 km/h)
        if (speedMs < 0 || speedMs > 100) {
            return {
                value: undefined,
                confidence: 0,
                source: 'INVALID' as any,
                quality: 'INVALID',
                timestamp: Date.now()
            };
        }

        // Calculate confidence based on quality
        let confidence: number;
        switch (quality) {
            case 'CLEAN':
                confidence = 0.9;
                break;
            case 'TRAFFIC_AFFECTED':
                confidence = 0.6;
                break;
            case 'OFFTRACK':
                confidence = 0.3;
                break;
            default:
                confidence = 0.5;
        }

        return {
            value: speedMs,
            confidence,
            source: 'DERIVED',
            quality,
            timestamp: Date.now()
        };
    }

    // ========================================================================
    // PACE TREND ANALYSIS
    // ========================================================================

    /**
     * Analyze pace trend for a car.
     * Uses segment history to detect degradation.
     */
    analyzePaceTrend(carId: number): OpponentPaceTrendEvent | null {
        const state = this.carStates.get(carId);
        if (!state) return null;

        // Filter for clean samples
        const cleanSamples = state.segmentHistory.filter(s => s.quality === 'CLEAN');
        if (cleanSamples.length < SEGMENT_CONFIG.MIN_SAMPLES_FOR_TREND) {
            return null;
        }

        // Group by segment type
        const straights = cleanSamples.filter(s => s.segmentType === 'straight');
        const corners = cleanSamples.filter(s => s.segmentType === 'corner');

        // Calculate average speeds
        const straightPace = this.averageSpeed(straights);
        const cornerPace = this.averageSpeed(corners);
        const overallPace = this.averageSpeed(cleanSamples);

        // Calculate pace slope (linear regression over time)
        const paceSlope = this.calculatePaceSlope(cleanSamples);

        // Determine degradation type
        const degradationType = this.inferDegradationType(paceSlope, straightPace, cornerPace);

        const event: OpponentPaceTrendEvent = {
            type: 'opponent:pace_trend',
            sessionId: this.sessionId,
            timestamp: Date.now(),
            carId: state.carId,
            driverId: state.driverId,
            straightPace,
            cornerPace,
            overallPace,
            paceSlope,
            degradationType,
            cleanSampleCount: cleanSamples.length,
            totalSampleCount: state.segmentHistory.length,
            dataQualitySummary: cleanSamples.length > state.segmentHistory.length * 0.7 ? 'CLEAN' : 'TRAFFIC_AFFECTED'
        };

        this.emit('opponent:pace_trend', event);
        return event;
    }

    private averageSpeed(samples: SegmentSpeedResult[]): ConfidenceValue<number> {
        if (samples.length === 0) {
            return {
                value: undefined,
                confidence: 0,
                source: 'UNKNOWN',
                quality: 'UNKNOWN',
                timestamp: Date.now()
            };
        }

        const validSpeeds = samples
            .map(s => s.avgSpeedMs.value)
            .filter((v): v is number => v !== undefined);

        if (validSpeeds.length === 0) {
            return {
                value: undefined,
                confidence: 0,
                source: 'UNKNOWN',
                quality: 'UNKNOWN',
                timestamp: Date.now()
            };
        }

        const avgSpeed = validSpeeds.reduce((a, b) => a + b, 0) / validSpeeds.length;
        const confidence = Math.min(1, validSpeeds.length / 10); // More samples = higher confidence

        return {
            value: avgSpeed,
            confidence,
            source: 'DERIVED',
            quality: 'CLEAN',
            timestamp: Date.now()
        };
    }

    private calculatePaceSlope(samples: SegmentSpeedResult[]): ConfidenceValue<number> {
        if (samples.length < 3) {
            return {
                value: undefined,
                confidence: 0,
                source: 'UNKNOWN',
                quality: 'UNKNOWN',
                timestamp: Date.now()
            };
        }

        // Simple linear regression on segment times over lap number
        const points = samples
            .filter(s => s.avgSpeedMs.value !== undefined)
            .map(s => ({
                x: s.lapNumber,
                y: s.segmentTimeMs
            }));

        if (points.length < 3) {
            return {
                value: undefined,
                confidence: 0,
                source: 'UNKNOWN',
                quality: 'UNKNOWN',
                timestamp: Date.now()
            };
        }

        // Calculate linear regression
        const n = points.length;
        const sumX = points.reduce((a, p) => a + p.x, 0);
        const sumY = points.reduce((a, p) => a + p.y, 0);
        const sumXY = points.reduce((a, p) => a + p.x * p.y, 0);
        const sumX2 = points.reduce((a, p) => a + p.x * p.x, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

        // Calculate R² for confidence
        const meanY = sumY / n;
        const ssTotal = points.reduce((a, p) => a + Math.pow(p.y - meanY, 2), 0);
        const ssResidual = points.reduce((a, p) => {
            const predicted = meanY + slope * (p.x - sumX / n);
            return a + Math.pow(p.y - predicted, 2);
        }, 0);
        const r2 = 1 - ssResidual / ssTotal;

        return {
            value: slope, // ms per lap
            confidence: Math.max(0, r2),
            source: 'INFERRED',
            quality: 'CLEAN',
            timestamp: Date.now()
        };
    }

    private inferDegradationType(
        paceSlope: ConfidenceValue<number>,
        straightPace: ConfidenceValue<number>,
        cornerPace: ConfidenceValue<number>
    ): 'tire' | 'fuel_burn' | 'damage' | 'unknown' {
        if (paceSlope.value === undefined) return 'unknown';

        // Positive slope = slowing down
        if (paceSlope.value > 0) {
            // If corner pace dropping faster than straight pace → tire degradation
            if (cornerPace.value !== undefined && straightPace.value !== undefined) {
                // This is a simplification - real implementation would track deltas
                return 'tire';
            }
            // Could also check for sudden drops (damage)
            return 'tire';
        }

        // Negative slope = getting faster → fuel burn
        if (paceSlope.value < -10) { // Getting faster by >10ms/lap
            return 'fuel_burn';
        }

        return 'unknown';
    }

    // ========================================================================
    // HELPERS
    // ========================================================================

    private initializeCarState(
        carId: number,
        driverId: string,
        lapDistPct: number,
        lap: number,
        timestamp: number
    ): CarSegmentState {
        return {
            carId,
            driverId,
            lastLapDistPct: lapDistPct,
            lastLap: lap,
            lastTimestamp: timestamp,
            currentSegmentId: null,
            segmentEntryTime: 0,
            segmentEntryPct: 0,
            segmentEntryLap: 0,
            inPitLane: false,
            trackSurface: 1,
            hasTrafficOverlap: false,
            segmentHistory: []
        };
    }

    private updateCarPosition(
        state: CarSegmentState,
        lapDistPct: number,
        lap: number,
        timestamp: number
    ): void {
        state.lastLapDistPct = lapDistPct;
        state.lastLap = lap;
        state.lastTimestamp = timestamp;
    }

    private findSegment(lapDistPct: number): TrackSegment | null {
        if (!this.trackMap) return null;

        for (const segment of this.trackMap.segments) {
            if (isInSegment(lapDistPct, segment)) {
                return segment;
            }
        }

        return null;
    }

    private emitSegmentPaceUpdate(result: SegmentSpeedResult): void {
        const event: SegmentPaceUpdateEvent = {
            type: 'segment:pace_update',
            sessionId: this.sessionId,
            timestamp: Date.now(),
            carId: result.carId,
            driverId: result.driverId,
            segmentId: result.segmentId,
            avgSpeed: result.avgSpeedMs,
            segmentTimeMs: result.segmentTimeMs,
            qualityFlag: result.quality,
            confidenceScore: result.avgSpeedMs.confidence,
            source: 'DERIVED'
        };

        this.emit('segment:pace_update', event);
    }

    // ========================================================================
    // GETTERS
    // ========================================================================

    getCarState(carId: number): CarSegmentState | undefined {
        return this.carStates.get(carId);
    }

    getAllCarStates(): CarSegmentState[] {
        return Array.from(this.carStates.values());
    }
}

// Singleton
let detectorInstance: SegmentSpeedDetector | null = null;

export function getSegmentSpeedDetector(): SegmentSpeedDetector {
    if (!detectorInstance) {
        detectorInstance = new SegmentSpeedDetector();
    }
    return detectorInstance;
}
