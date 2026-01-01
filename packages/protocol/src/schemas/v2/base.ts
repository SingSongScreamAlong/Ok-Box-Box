/**
 * Protocol v2 Base Schemas
 * 
 * Every packet includes:
 * - v: Protocol version (2)
 * - ts: Driver-origin timestamp (ms)
 * - seq: Sequence number (monotonic per stream)
 * - sessionId: Unique session identifier
 * - streamType: baseline | controls | event | lossless
 * - sampleHz: Actual sample rate
 */

import { z } from 'zod';

// ============================================================================
// STREAM TYPES
// ============================================================================

export const StreamTypeSchema = z.enum([
    'baseline',   // 4 Hz - always on
    'controls',   // 15 Hz - when viewers present
    'event',      // Instant - not tick-gated
    'lossless'    // 60 Hz - local recording only
]);

export type StreamType = z.infer<typeof StreamTypeSchema>;

// ============================================================================
// BASE PACKET (v2)
// ============================================================================

export const BasePacketV2Schema = z.object({
    v: z.literal(2),                    // Protocol version
    type: z.string(),                   // Packet type identifier
    ts: z.number(),                     // Driver-origin timestamp (ms)
    seq: z.number().int().nonnegative(), // Sequence number
    sessionId: z.string(),              // Session identifier
    driverId: z.string().optional(),    // Driver identifier
    streamType: StreamTypeSchema,       // Which stream this belongs to
    sampleHz: z.number().positive(),    // Actual sample rate
});

export type BasePacketV2 = z.infer<typeof BasePacketV2Schema>;

// ============================================================================
// CONTROL MESSAGES (Server → Relay)
// ============================================================================

export const ViewerCountMessageSchema = z.object({
    type: z.literal('relay:viewers'),
    sessionId: z.string(),
    viewerCount: z.number().int().nonnegative(),
    requestControls: z.boolean(),       // Should relay send controls stream?
});

export type ViewerCountMessage = z.infer<typeof ViewerCountMessageSchema>;

export const RelayControlMessageSchema = z.discriminatedUnion('type', [
    ViewerCountMessageSchema,
]);

export type RelayControlMessage = z.infer<typeof RelayControlMessageSchema>;
