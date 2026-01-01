import { z } from 'zod';
import { RelayMessageSchema } from './base.js';

export const RaceEventSchema = RelayMessageSchema.extend({
    type: z.literal('race_event'),
    flagState: z.enum(['green', 'yellow', 'localYellow', 'caution', 'red', 'restart', 'checkered', 'white']),
    lap: z.number(),
    timeRemaining: z.number(),
    sessionPhase: z.enum(['pre_race', 'formation', 'racing', 'caution', 'restart', 'finished']),
});

export type RaceEvent = z.infer<typeof RaceEventSchema>;
