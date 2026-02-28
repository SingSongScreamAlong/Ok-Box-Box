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
    // Quality metrics
    fps?: number;
    latency?: number;
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
        rci: number;  // Rhythm & Consistency Index
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
