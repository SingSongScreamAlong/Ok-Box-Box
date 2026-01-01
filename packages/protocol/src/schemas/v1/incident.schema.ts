import { z } from 'zod';
import { RelayMessageSchema } from './base.js';

export const IncidentSchema = RelayMessageSchema.extend({
    type: z.literal('incident'),
    cars: z.array(z.number()),
    carNames: z.array(z.string()).optional(),
    driverNames: z.array(z.string()).optional(),
    lap: z.number(),
    corner: z.number(),
    cornerName: z.string().optional(),
    trackPosition: z.number(),
    severity: z.enum(['low', 'med', 'high']),
    disciplineContext: z.string(), // Keeping loose as string for protocol decoupling
    rawData: z.record(z.unknown()).optional(),
});

export type Incident = z.infer<typeof IncidentSchema>;
