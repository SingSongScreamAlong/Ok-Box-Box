/**
 * Protocol v2 Event Schemas
 * 
 * Events are INSTANT - not tick-gated.
 * Fire immediately when detected.
 */

import { z } from 'zod';
import { BasePacketV2Schema } from './base.js';

// ============================================================================
// EVENT TYPES
// ============================================================================

export const EventTypeSchema = z.enum([
    'incident',
    'offtrack',
    'overlap:enter',
    'overlap:exit',
    'three_wide',
    'pit:enter',
    'pit:exit',
    'flag:change',
    'position:change',
    'session:change',
    'caution:start',
    'caution:end',
]);

export type EventType = z.infer<typeof EventTypeSchema>;

// ============================================================================
// EVENT PAYLOADS
// ============================================================================

export const IncidentEventPayloadSchema = z.object({
    eventType: z.literal('incident'),
    severity: z.number().min(0).max(4),     // 0x = none, 4x = major
    lapNumber: z.number().int(),
    lapDistPct: z.number(),
    involvedCars: z.array(z.number()).optional(),
});

export const OfftrackEventPayloadSchema = z.object({
    eventType: z.literal('offtrack'),
    lapNumber: z.number().int(),
    lapDistPct: z.number(),
    duration: z.number().optional(),        // ms off track
});

export const OverlapEventPayloadSchema = z.object({
    eventType: z.enum(['overlap:enter', 'overlap:exit']),
    side: z.enum(['left', 'right', 'both']),
    otherCarId: z.number().int(),
    otherDriverName: z.string().optional(),
});

export const ThreeWideEventPayloadSchema = z.object({
    eventType: z.literal('three_wide'),
    carIds: z.array(z.number().int()),
    lapDistPct: z.number(),
});

export const PitEventPayloadSchema = z.object({
    eventType: z.enum(['pit:enter', 'pit:exit']),
    lapNumber: z.number().int(),
    pitStopNumber: z.number().int(),
    fuelAdded: z.number().optional(),
    tiresChanged: z.boolean().optional(),
});

export const FlagChangeEventPayloadSchema = z.object({
    eventType: z.literal('flag:change'),
    previousFlag: z.string(),
    newFlag: z.string(),
    lapNumber: z.number().int(),
});

export const PositionChangeEventPayloadSchema = z.object({
    eventType: z.literal('position:change'),
    previousPosition: z.number().int(),
    newPosition: z.number().int(),
    lapNumber: z.number().int(),
});

export const SessionChangeEventPayloadSchema = z.object({
    eventType: z.literal('session:change'),
    previousSession: z.string(),
    newSession: z.string(),
});

export const CautionEventPayloadSchema = z.object({
    eventType: z.enum(['caution:start', 'caution:end']),
    lapNumber: z.number().int(),
    reason: z.string().optional(),
});

// ============================================================================
// EVENT PACKET
// ============================================================================

export const EventPayloadSchema = z.discriminatedUnion('eventType', [
    IncidentEventPayloadSchema,
    OfftrackEventPayloadSchema,
    OverlapEventPayloadSchema,
    ThreeWideEventPayloadSchema,
    PitEventPayloadSchema,
    FlagChangeEventPayloadSchema,
    PositionChangeEventPayloadSchema,
    SessionChangeEventPayloadSchema,
    CautionEventPayloadSchema,
]);

export type EventPayload = z.infer<typeof EventPayloadSchema>;

export const EventPacketSchema = BasePacketV2Schema.extend({
    type: z.literal('event'),
    streamType: z.literal('event'),
    payload: EventPayloadSchema,
});

export type EventPacket = z.infer<typeof EventPacketSchema>;
