/**
 * Telemetry Streams Service
 * Redis Streams-based telemetry buffering and distribution
 * 
 * Flow:
 * 1. TelemetryHandler receives 60Hz data from relay
 * 2. Pushes to Redis Stream `telemetry:{runId}`
 * 3. BehavioralWorker consumes stream, computes live metrics
 * 4. Publishes LiveMetrics to `live:{runId}` pub/sub
 * 5. WebSocket gateway forwards to UI
 */

import { getRedisClient, getPubSubClient } from '../redis-client.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface TelemetryPacket {
    runId: string;
    userId: string;
    ts: number;
    sessionTime: number;
    lap: number;
    lapDistPct: number;
    speed: number;
    throttle: number;
    brake: number;
    steer: number;
    gear: number;
    rpm: number;
    trackSurface: number;  // 0=off, 1=on track
    absActive: number;
    incidentCount: number;
    lastLapTime: number;
    bestLapTime: number;
    position: number;
    fuelLevel: number;
    // Rotation control channels
    yaw?: number;        // Heading angle (radians)
    velocityX?: number;  // X velocity (m/s)
    velocityY?: number;  // Y velocity (m/s)
    // Quality metrics
    fps?: number;
    latency?: number;
}

export interface SegmentInsightPublic {
    binStartPct: number;
    binEndPct: number;
    timeDelta: number;
    speedDelta: number;
    likelyCause: string;
    suggestion: string;
    confidence: number;
    sectionType: string;
}

export interface LiveMetrics {
    runId: string;
    ts: number;
    
    // Pillar scores (0-100)
    pillars: {
        pace: number;
        consistency: number;
        technique: number;
        safety: number;
        reliability: number;
    };
    
    // Behavioral indices (0-100)
    behavioral: {
        bsi: number;  // Braking Stability Index
        tci: number;  // Throttle Control Index
        cpi2: number; // Cornering Precision Index
        rci: number;  // Rotation Control Index
    };
    
    // Current lap info
    currentLap: number;
    lastLapTime: number | null;
    bestLapTime: number | null;
    position: number;
    
    // Coaching hints (max 3)
    coaching: string[];
    
    // Warnings
    warnings: string[];
    
    // V1.1: Segment insights (top 3 areas losing time vs best lap)
    segmentInsights?: SegmentInsightPublic[];
    
    // V1.1: Segmentation health (debug/monitoring)
    segmentHealth?: {
        coveragePct: number;          // % of bins with enough samples
        insightCount: number;         // Number of insights passing filter
        referenceAgeLaps: number;     // How old the best-lap reference is
        hasBestLapReference: boolean; // Whether we have a reference lap
    };
    
    // Confidence
    confidence: number;
    ticksProcessed: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STREAM OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const STREAM_PREFIX = 'telemetry:';
const LIVE_PREFIX = 'live:';
const CONSUMER_GROUP = 'driverdna';
const MAX_STREAM_LEN = 30000; // ~8 minutes at 60Hz
const CLAIM_MIN_IDLE_MS = 60000; // Claim stuck messages after 60s

/**
 * Push telemetry packet to Redis Stream
 */
export async function pushTelemetryToStream(packet: TelemetryPacket): Promise<boolean> {
    const redis = await getRedisClient();
    if (!redis) return false;

    try {
        const streamKey = `${STREAM_PREFIX}${packet.runId}`;
        
        // XADD with MAXLEN to prevent unbounded growth
        await redis.xAdd(
            streamKey,
            '*',
            { data: JSON.stringify(packet) },
            { TRIM: { strategy: 'MAXLEN', strategyModifier: '~', threshold: MAX_STREAM_LEN } }
        );
        
        return true;
    } catch (err) {
        console.error('[TelemetryStreams] Push error:', err instanceof Error ? err.message : err);
        return false;
    }
}

/**
 * Ensure consumer group exists for a stream
 */
export async function ensureConsumerGroup(runId: string): Promise<boolean> {
    const redis = await getRedisClient();
    if (!redis) return false;

    try {
        const streamKey = `${STREAM_PREFIX}${runId}`;
        
        // Try to create group, ignore if exists
        try {
            await redis.xGroupCreate(streamKey, CONSUMER_GROUP, '0', { MKSTREAM: true });
        } catch (err: any) {
            // BUSYGROUP means group already exists — that's fine
            if (!err.message?.includes('BUSYGROUP')) {
                throw err;
            }
        }
        
        return true;
    } catch (err) {
        console.error('[TelemetryStreams] Group create error:', err instanceof Error ? err.message : err);
        return false;
    }
}

/**
 * Read telemetry packets from stream (consumer group)
 */
export async function readTelemetryFromStream(
    runId: string,
    consumerId: string,
    count: number = 200,
    blockMs: number = 200
): Promise<TelemetryPacket[]> {
    const redis = await getRedisClient();
    if (!redis) return [];

    try {
        const streamKey = `${STREAM_PREFIX}${runId}`;
        
        const result = await redis.xReadGroup(
            CONSUMER_GROUP,
            consumerId,
            { key: streamKey, id: '>' },
            { COUNT: count, BLOCK: blockMs }
        );
        
        if (!result || result.length === 0) return [];
        
        const packets: TelemetryPacket[] = [];
        const messageIds: string[] = [];
        
        for (const stream of result) {
            for (const message of stream.messages) {
                try {
                    const packet = JSON.parse(message.message.data);
                    packets.push(packet);
                    messageIds.push(message.id);
                } catch {
                    // Skip malformed messages
                }
            }
        }
        
        // ACK processed messages
        if (messageIds.length > 0) {
            await redis.xAck(streamKey, CONSUMER_GROUP, messageIds);
        }
        
        return packets;
    } catch (err) {
        console.error('[TelemetryStreams] Read error:', err instanceof Error ? err.message : err);
        return [];
    }
}

/**
 * Publish live metrics to pub/sub channel
 */
export async function publishLiveMetrics(metrics: LiveMetrics): Promise<boolean> {
    const redis = await getRedisClient();
    if (!redis) return false;

    try {
        const channel = `${LIVE_PREFIX}${metrics.runId}`;
        await redis.publish(channel, JSON.stringify(metrics));
        return true;
    } catch (err) {
        console.error('[TelemetryStreams] Publish error:', err instanceof Error ? err.message : err);
        return false;
    }
}

/**
 * Subscribe to live metrics for a run
 */
export async function subscribeLiveMetrics(
    runId: string,
    callback: (metrics: LiveMetrics) => void
): Promise<() => Promise<void>> {
    const pubsub = await getPubSubClient();
    if (!pubsub) {
        return async () => {};
    }

    const channel = `${LIVE_PREFIX}${runId}`;
    
    await pubsub.subscribe(channel, (message) => {
        try {
            const metrics = JSON.parse(message) as LiveMetrics;
            callback(metrics);
        } catch {
            // Skip malformed messages
        }
    });

    // Return unsubscribe function
    return async () => {
        await pubsub.unsubscribe(channel);
    };
}

/**
 * Get active runs (streams with recent activity)
 */
export async function getActiveRuns(): Promise<string[]> {
    const redis = await getRedisClient();
    if (!redis) return [];

    try {
        const keys = await redis.keys(`${STREAM_PREFIX}*`);
        return keys.map(k => k.replace(STREAM_PREFIX, ''));
    } catch (err) {
        console.error('[TelemetryStreams] Get active runs error:', err instanceof Error ? err.message : err);
        return [];
    }
}

/**
 * Clean up old stream (after run ends)
 */
export async function cleanupStream(runId: string): Promise<void> {
    const redis = await getRedisClient();
    if (!redis) return;

    try {
        const streamKey = `${STREAM_PREFIX}${runId}`;
        // Delete stream after processing
        await redis.del(streamKey);
    } catch (err) {
        console.error('[TelemetryStreams] Cleanup error:', err instanceof Error ? err.message : err);
    }
}

/**
 * Claim stuck pending messages (for crash recovery)
 * Call this on worker startup to recover messages from dead consumers
 */
export async function claimStuckMessages(
    runId: string,
    consumerId: string,
    count: number = 100
): Promise<TelemetryPacket[]> {
    const redis = await getRedisClient();
    if (!redis) return [];

    try {
        const streamKey = `${STREAM_PREFIX}${runId}`;
        
        // XAUTOCLAIM: claim messages idle for > CLAIM_MIN_IDLE_MS
        const result = await redis.xAutoClaim(
            streamKey,
            CONSUMER_GROUP,
            consumerId,
            CLAIM_MIN_IDLE_MS,
            '0-0',
            { COUNT: count }
        );
        
        if (!result || !result.messages || result.messages.length === 0) {
            return [];
        }

        const packets: TelemetryPacket[] = [];
        const messageIds: string[] = [];

        for (const message of result.messages) {
            if (!message) continue;
            try {
                const packet = JSON.parse(message.message.data);
                packets.push(packet);
                messageIds.push(message.id);
            } catch {
                // Skip malformed, but still ACK to clear
                messageIds.push(message.id);
            }
        }

        // ACK claimed messages after processing
        if (messageIds.length > 0) {
            await redis.xAck(streamKey, CONSUMER_GROUP, messageIds);
        }

        if (packets.length > 0) {
            console.log(`[TelemetryStreams] Claimed ${packets.length} stuck messages for ${runId}`);
        }

        return packets;
    } catch (err) {
        console.error('[TelemetryStreams] Claim error:', err instanceof Error ? err.message : err);
        return [];
    }
}

/**
 * Get stream diagnostics (for monitoring)
 */
export async function getStreamDiagnostics(runId: string): Promise<{
    streamLength: number;
    pendingCount: number;
    consumers: number;
    lastDeliveredId: string | null;
} | null> {
    const redis = await getRedisClient();
    if (!redis) return null;

    try {
        const streamKey = `${STREAM_PREFIX}${runId}`;
        
        // Get stream length
        const streamLength = await redis.xLen(streamKey);
        
        // Get group info
        let pendingCount = 0;
        let consumers = 0;
        let lastDeliveredId: string | null = null;
        
        try {
            const groups = await redis.xInfoGroups(streamKey);
            const group = groups.find((g: any) => g.name === CONSUMER_GROUP);
            if (group) {
                pendingCount = group.pending || 0;
                consumers = group.consumers || 0;
                lastDeliveredId = group.lastDeliveredId || null;
            }
        } catch {
            // Group may not exist yet
        }

        return { streamLength, pendingCount, consumers, lastDeliveredId };
    } catch (err) {
        console.error('[TelemetryStreams] Diagnostics error:', err instanceof Error ? err.message : err);
        return null;
    }
}
