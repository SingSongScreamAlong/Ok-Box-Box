// =====================================================================
// Broadcast Delay Types
// =====================================================================

/**
 * Event types that can be buffered for broadcast delay
 */
export type BroadcastEventType =
    | 'telemetry:timing'
    | 'telemetry:frame'
    | 'incident:new'
    | 'state:update';

/**
 * A single buffered event entry
 */
export interface BufferedEvent {
    eventName: BroadcastEventType;
    payload: unknown;
    tsMs: number;
    id: string;
}

/**
 * Per-session buffer state
 */
export interface SessionBufferState {
    sessionId: string;
    delayMs: number;
    bufferDepthByEvent: Record<BroadcastEventType, number>;
    droppedCount: number;
    lastFlushMs: number;
}

/**
 * Director delay control message
 */
export interface DelayControlMessage {
    sessionId: string;
    delayMs: number;
}

/**
 * Fields that must NEVER be sent to broadcast/public feeds
 */
export const REDACTED_FIELDS = [
    // Fuel data (competitive advantage)
    'fuelLevel',
    'fuelPct',
    'fuelPerLap',
    'fuelRemaining',

    // Tire data (competitive advantage)
    'tireWear',
    'tireTemps',
    'tirePressure',

    // Strategy data
    'lapDelta',
    'setupHints',
    'pitStrategy',
    'racecraft',

    // AI/Steward data
    'stewardNotes',
    'faultProbability',
    'aiRecommendation',
    'aiConfidence',
    'aiReasoning',

    // Internal data
    '_internal',
    'privateNotes',
    'teamNotes',
] as const;

/**
 * Allowed delay values in milliseconds
 */
export const ALLOWED_DELAYS = [0, 10000, 30000, 60000, 120000] as const;
export type AllowedDelay = typeof ALLOWED_DELAYS[number];

/**
 * Maximum buffer entries per event type
 */
export const MAX_BUFFER_SIZE = 1000;
