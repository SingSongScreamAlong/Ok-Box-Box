import { z } from 'zod';
import { RelayMessageSchema } from './base.js';

export const WeatherDataSchema = z.object({
    ambientTemp: z.number(),
    trackTemp: z.number(),
    precipitation: z.number(),
    trackState: z.enum(['dry', 'damp', 'wet']),
});

export const SessionMetadataSchema = RelayMessageSchema.extend({
    type: z.literal('session_metadata'),
    trackName: z.string(),
    trackConfig: z.string().optional(),
    category: z.string(), // We'll validate discipline strictly in server adapter if needed, keep protocol loose for now or import shared enum? keeping loose for decoupled protocol
    multiClass: z.boolean(),
    cautionsEnabled: z.boolean(),
    driverSwap: z.boolean(),
    maxDrivers: z.number(),
    weather: WeatherDataSchema,
    leagueId: z.string().optional(),
    rulebookOverrideId: z.string().optional(),
});

export type SessionMetadata = z.infer<typeof SessionMetadataSchema>;
