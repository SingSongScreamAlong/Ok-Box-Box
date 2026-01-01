/**
 * Protocol v2 Telemetry Schemas
 * 
 * Multi-stream telemetry model:
 * - baseline (4Hz): Core metrics for situational awareness
 * - controls (15Hz): Input data when viewers present
 * - event: Instant, not tick-gated
 */

import { z } from 'zod';
import { BasePacketV2Schema } from './base.js';

// ============================================================================
// BASELINE STREAM (4 Hz)
// ============================================================================

export const BaselineTelemetryPayloadSchema = z.object({
    // Position
    speed: z.number(),              // m/s
    gear: z.number().int(),         // -1 = R, 0 = N, 1-8 = gears
    rpm: z.number(),

    // Race State
    lap: z.number().int(),
    lapDistPct: z.number().min(0).max(1),
    position: z.number().int(),
    classPosition: z.number().int().optional(),

    // Fuel
    fuelLevel: z.number(),          // liters
    fuelPct: z.number().min(0).max(1),

    // Flags
    sessionFlags: z.number(),       // Bitfield
    trackTemp: z.number().optional(),

    // Gaps
    gapAhead: z.number().optional(),    // seconds
    gapBehind: z.number().optional(),   // seconds
});

export type BaselineTelemetryPayload = z.infer<typeof BaselineTelemetryPayloadSchema>;

export const BaselineTelemetryPacketSchema = BasePacketV2Schema.extend({
    type: z.literal('telemetry:baseline'),
    streamType: z.literal('baseline'),
    payload: BaselineTelemetryPayloadSchema,
});

export type BaselineTelemetryPacket = z.infer<typeof BaselineTelemetryPacketSchema>;

// ============================================================================
// CONTROLS STREAM (15 Hz when viewers present)
// ============================================================================

export const ControlsTelemetryPayloadSchema = z.object({
    throttle: z.number().min(0).max(1),
    brake: z.number().min(0).max(1),
    clutch: z.number().min(0).max(1),
    steering: z.number().min(-1).max(1),    // -1 = full left, +1 = full right
    rpm: z.number(),
    speed: z.number(),                       // m/s (duplicated for convenience)
    gear: z.number().int(),
});

export type ControlsTelemetryPayload = z.infer<typeof ControlsTelemetryPayloadSchema>;

export const ControlsTelemetryPacketSchema = BasePacketV2Schema.extend({
    type: z.literal('telemetry:controls'),
    streamType: z.literal('controls'),
    payload: ControlsTelemetryPayloadSchema,
});

export type ControlsTelemetryPacket = z.infer<typeof ControlsTelemetryPacketSchema>;

// ============================================================================
// LOSSLESS STREAM (60 Hz local recording)
// ============================================================================

export const LosslessTelemetryPayloadSchema = z.object({
    // Everything from baseline
    speed: z.number(),
    gear: z.number().int(),
    rpm: z.number(),
    lap: z.number().int(),
    lapDistPct: z.number(),
    position: z.number().int(),
    fuelLevel: z.number(),

    // Everything from controls
    throttle: z.number(),
    brake: z.number(),
    clutch: z.number(),
    steering: z.number(),

    // Extended data
    tireTemps: z.object({
        fl: z.object({ l: z.number(), m: z.number(), r: z.number() }),
        fr: z.object({ l: z.number(), m: z.number(), r: z.number() }),
        rl: z.object({ l: z.number(), m: z.number(), r: z.number() }),
        rr: z.object({ l: z.number(), m: z.number(), r: z.number() }),
    }).optional(),

    tireWear: z.object({
        fl: z.number(),
        fr: z.number(),
        rl: z.number(),
        rr: z.number(),
    }).optional(),

    brakePressure: z.object({
        fl: z.number(),
        fr: z.number(),
        rl: z.number(),
        rr: z.number(),
    }).optional(),

    engineHealth: z.object({
        oilTemp: z.number(),
        oilPressure: z.number(),
        waterTemp: z.number(),
        voltage: z.number(),
    }).optional(),

    sessionFlags: z.number(),
    trackSurface: z.number(),
});

export type LosslessTelemetryPayload = z.infer<typeof LosslessTelemetryPayloadSchema>;

export const LosslessTelemetryPacketSchema = BasePacketV2Schema.extend({
    type: z.literal('telemetry:lossless'),
    streamType: z.literal('lossless'),
    payload: LosslessTelemetryPayloadSchema,
});

export type LosslessTelemetryPacket = z.infer<typeof LosslessTelemetryPacketSchema>;
