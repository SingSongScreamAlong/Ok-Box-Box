// =====================================================================
// Parity Tracking
// Track frame counts and acks per session for parity verification
// =====================================================================

interface StreamStats {
    framesIn: number;
    acked: number;
    lastFrameTs: number;
}

interface SessionParity {
    sessionId: string;
    streams: {
        baseline: StreamStats;
        controls: StreamStats;
        lossless: StreamStats;
        telemetry: StreamStats;  // Legacy telemetry event
    };
    duplicates: number;
    outOfOrder: number;
    lastError: string | null;
    seenFrameIds: Set<string>;
    lastTimestamps: Map<string, number>;
}

// Per-session parity tracking
const sessionParity: Map<string, SessionParity> = new Map();

// Max frame IDs to track for duplicate detection
const MAX_FRAME_IDS = 1000;

/**
 * Get or create parity tracking for a session
 */
export function getSessionParity(sessionId: string): SessionParity {
    let parity = sessionParity.get(sessionId);
    if (!parity) {
        parity = {
            sessionId,
            streams: {
                baseline: { framesIn: 0, acked: 0, lastFrameTs: 0 },
                controls: { framesIn: 0, acked: 0, lastFrameTs: 0 },
                lossless: { framesIn: 0, acked: 0, lastFrameTs: 0 },
                telemetry: { framesIn: 0, acked: 0, lastFrameTs: 0 }
            },
            duplicates: 0,
            outOfOrder: 0,
            lastError: null,
            seenFrameIds: new Set(),
            lastTimestamps: new Map()
        };
        sessionParity.set(sessionId, parity);
    }
    return parity;
}

/**
 * Record an incoming frame
 */
export function recordFrameIn(
    sessionId: string,
    streamType: 'baseline' | 'controls' | 'lossless' | 'telemetry',
    timestamp: number,
    frameId?: string
): { isDuplicate: boolean; isOutOfOrder: boolean; shouldAck: boolean } {
    const parity = getSessionParity(sessionId);
    const stream = parity.streams[streamType];

    stream.framesIn++;

    let isDuplicate = false;
    let isOutOfOrder = false;
    let shouldAck = false;

    // Check for duplicate by frameId
    if (frameId) {
        if (parity.seenFrameIds.has(frameId)) {
            isDuplicate = true;
            parity.duplicates++;
        } else {
            parity.seenFrameIds.add(frameId);
            // Prune old frame IDs
            if (parity.seenFrameIds.size > MAX_FRAME_IDS) {
                const first = parity.seenFrameIds.values().next().value;
                if (first) parity.seenFrameIds.delete(first);
            }
            shouldAck = true;  // Frame had an ID, should ack
        }
    }

    // Check for out-of-order by timestamp
    const lastTs = parity.lastTimestamps.get(streamType) || 0;
    if (timestamp && lastTs && timestamp < lastTs - 1000) {  // 1s tolerance
        isOutOfOrder = true;
        parity.outOfOrder++;
    }

    if (timestamp) {
        stream.lastFrameTs = timestamp;
        parity.lastTimestamps.set(streamType, timestamp);
    }

    return { isDuplicate, isOutOfOrder, shouldAck };
}

/**
 * Record an ack sent
 */
export function recordAckSent(sessionId: string, streamType: 'baseline' | 'controls' | 'lossless' | 'telemetry'): void {
    const parity = getSessionParity(sessionId);
    parity.streams[streamType].acked++;
}

/**
 * Record an error
 */
export function recordParityError(sessionId: string, error: string): void {
    const parity = getSessionParity(sessionId);
    parity.lastError = error.slice(0, 200);
}

/**
 * Get parity snapshot for a session (for diagnostics endpoint)
 */
export function getParitySnapshot(sessionId: string): {
    sessionId: string;
    streams: Record<string, { framesIn: number; acked: number; lastFrameTs: number }>;
    duplicates: number;
    outOfOrder: number;
    lastError: string | null;
} | null {
    const parity = sessionParity.get(sessionId);
    if (!parity) return null;

    return {
        sessionId: parity.sessionId,
        streams: {
            baseline: { ...parity.streams.baseline },
            controls: { ...parity.streams.controls },
            lossless: { ...parity.streams.lossless },
            telemetry: { ...parity.streams.telemetry }
        },
        duplicates: parity.duplicates,
        outOfOrder: parity.outOfOrder,
        lastError: parity.lastError
    };
}

/**
 * Get all session IDs with parity tracking
 */
export function getParitySessionIds(): string[] {
    return Array.from(sessionParity.keys());
}

/**
 * Clean up stale parity data (call from session cleanup)
 */
export function cleanupParityData(sessionId: string): void {
    sessionParity.delete(sessionId);
}
