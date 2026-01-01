/**
 * Segment-Based Speed Inference - Types
 * 
 * AUTHORITATIVE CONSTRAINTS:
 * - iRacing SDK does NOT expose opponent speed directly
 * - All speed/pace values are DERIVED from segment timing
 * - Unknown values remain Unknown (never default to 0)
 * - Every output tagged with source, confidence, and quality
 */

// ============================================================================
// SEGMENT MAP SCHEMA
// ============================================================================

/**
 * A track segment represents a virtual speed trap zone.
 * Segments are defined by lap-distance percentage ranges.
 */
export interface TrackSegment {
    segmentId: string;           // Unique ID (e.g., "main_straight", "t3_t5_complex")
    label: string;               // Human-readable name
    startPct: number;            // Start position [0, 1)
    endPct: number;              // End position [0, 1)
    lengthMeters: number;        // Physical length of segment
    segmentType: SegmentType;    // Classification for analysis
    isSpeedTrap: boolean;        // True if this is a key timing zone
}

export type SegmentType =
    | 'straight'                 // High-speed zone
    | 'corner'                   // Single turn
    | 'complex'                  // Multi-turn section
    | 'pit_entry'                // Pit lane approach
    | 'pit_exit'                 // Pit lane rejoin
    | 'start_finish';            // S/F line zone

/**
 * Complete segment map for a track layout.
 */
export interface TrackSegmentMap {
    trackId: string;             // iRacing track ID
    trackName: string;           // Human-readable name
    layoutName: string;          // Configuration name
    trackLengthMeters: number;   // Total track length
    segments: TrackSegment[];    // Ordered by position
    createdAt: number;           // Timestamp
    version: string;             // Schema version
}

// ============================================================================
// DATA QUALITY & CONFIDENCE
// ============================================================================

/**
 * Quality classification for segment data.
 * Only CLEAN data may feed degradation/pace models.
 */
export type SegmentQuality =
    | 'CLEAN'                    // Unobstructed, valid timing
    | 'TRAFFIC_AFFECTED'         // Slower due to traffic
    | 'PIT'                      // Car in pit lane
    | 'OFFTRACK'                 // Off racing surface
    | 'INVALID'                  // Bad data (teleport, etc.)
    | 'UNKNOWN';                 // Insufficient data

/**
 * Source attribution for all derived data.
 * NEVER expose SDK data that doesn't exist.
 */
export type DataSource =
    | 'SDK_DIRECT'               // Directly from iRacing SDK
    | 'DERIVED'                  // Calculated from SDK data
    | 'INFERRED'                 // Estimated with uncertainty
    | 'UNKNOWN';                 // No data available

/**
 * Confidence-tagged value wrapper.
 * All inferred metrics MUST use this structure.
 */
export interface ConfidenceValue<T> {
    value: T | undefined;        // The value (undefined if unknown)
    confidence: number;          // 0.0 - 1.0
    source: DataSource;
    quality: SegmentQuality;
    timestamp: number;           // When this was computed
}

// ============================================================================
// SEGMENT TIMING DATA
// ============================================================================

/**
 * Raw segment timing observation.
 */
export interface SegmentTiming {
    carId: number;
    driverId: string;
    segmentId: string;
    entryTime: number;           // Timestamp entering segment
    exitTime: number;            // Timestamp exiting segment
    entryLapDistPct: number;     // Position at entry
    exitLapDistPct: number;      // Position at exit
    entryLap: number;            // Lap number at entry
    exitLap: number;             // Lap number at exit
    inPitLane: boolean;          // Was car in pit during segment
    trackSurface: number;        // iRacing track surface enum
}

/**
 * Processed segment speed result.
 */
export interface SegmentSpeedResult {
    carId: number;
    driverId: string;
    segmentId: string;
    segmentType: SegmentType;

    // Timing
    segmentTimeMs: number;       // Time to traverse segment
    entryTimestamp: number;
    exitTimestamp: number;

    // Derived speed
    avgSpeedMs: ConfidenceValue<number>;  // m/s
    avgSpeedKph: ConfidenceValue<number>; // km/h

    // Quality
    quality: SegmentQuality;
    qualityReasons: string[];    // Why this quality was assigned

    // Delta from baseline
    deltaFromBestMs: number | undefined;

    // Lap context
    lapNumber: number;
    stintLap: number;            // Lap within current stint
}

// ============================================================================
// SERVICE EVENTS (emitted to StrategyService)
// ============================================================================

/**
 * Emitted when a car completes a segment.
 */
export interface SegmentPaceUpdateEvent {
    type: 'segment:pace_update';
    sessionId: string;
    timestamp: number;
    carId: number;
    driverId: string;
    segmentId: string;
    avgSpeed: ConfidenceValue<number>;  // m/s
    segmentTimeMs: number;
    qualityFlag: SegmentQuality;
    confidenceScore: number;
    source: 'DERIVED';           // Always derived for segment timing
}

/**
 * Pace trend analysis for a car.
 */
export interface OpponentPaceTrendEvent {
    type: 'opponent:pace_trend';
    sessionId: string;
    timestamp: number;
    carId: number;
    driverId: string;

    // Pace analysis by segment group
    straightPace: ConfidenceValue<number>;   // Avg speed on straights
    cornerPace: ConfidenceValue<number>;     // Avg speed in corners
    overallPace: ConfidenceValue<number>;    // Combined pace metric

    // Trend
    paceSlope: ConfidenceValue<number>;      // Pace change per lap (+ = slowing)
    degradationType: 'tire' | 'fuel_burn' | 'damage' | 'unknown';

    // Data quality summary
    cleanSampleCount: number;
    totalSampleCount: number;
    dataQualitySummary: SegmentQuality;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Configuration constants for segment detection.
 */
export const SEGMENT_CONFIG = {
    // Minimum segment time to be valid (reject teleports)
    MIN_SEGMENT_TIME_MS: 500,

    // Maximum segment time before considered invalid
    MAX_SEGMENT_TIME_MS: 60000,

    // Min samples needed for trend analysis
    MIN_SAMPLES_FOR_TREND: 3,

    // Confidence thresholds
    CONFIDENCE_THRESHOLD_HIGH: 0.8,
    CONFIDENCE_THRESHOLD_MEDIUM: 0.5,
    CONFIDENCE_THRESHOLD_SUPPRESS: 0.3,

    // Traffic detection overlap percentage
    TRAFFIC_OVERLAP_THRESHOLD: 0.15,

    // EMA smoothing factor
    SMOOTHING_ALPHA: 0.3
} as const;
