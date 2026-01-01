import { z } from 'zod';

export const RelayMessageSchema = z.object({
    type: z.string(),
    sessionId: z.string(),
    timestamp: z.number(),
    schemaVersion: z.string().optional().default('v1'),
});

export type RelayMessage = z.infer<typeof RelayMessageSchema>;
