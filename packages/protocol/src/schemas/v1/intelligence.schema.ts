import { z } from 'zod';
import { RelayMessageSchema } from './base.js';

// ==========================================
// Base Intelligence Schema
// ==========================================
export const IntelligenceMessageSchema = RelayMessageSchema.extend({
    // Add any common fields specific to intelligence events if needed
});

// ==========================================
// 1. Overlap State Changed
// ==========================================
export const OverlapStateChangedSchema = IntelligenceMessageSchema.extend({
    type: z.literal('overlap_state_changed'),
    carA: z.string(), // Car ID
    carB: z.string(), // Car ID
    side: z.enum(['LEFT', 'RIGHT', 'BOTH']),
    overlapPercentage: z.number().min(0).max(1),
    longitudinalGapMeters: z.number(),
    closingRate: z.number(), // m/s
    confidence: z.number().min(0).max(1),
});

export type OverlapStateChangedMessage = z.infer<typeof OverlapStateChangedSchema>;

// ==========================================
// 2. Three Wide Detected
// ==========================================
export const ThreeWideDetectedSchema = IntelligenceMessageSchema.extend({
    type: z.literal('three_wide_detected'),
    cars: z.array(z.string()).min(3), // Ordered by lane [Left, Middle, Right]
    lapDistPct: z.number().min(0).max(1),
    confidence: z.number().min(0).max(1),
});

export type ThreeWideDetectedMessage = z.infer<typeof ThreeWideDetectedSchema>;

// ==========================================
// 3. Offtrack
// ==========================================
export const OfftrackSchema = IntelligenceMessageSchema.extend({
    type: z.literal('offtrack'),
    car: z.string(),
    lapDistPct: z.number().min(0).max(1),
    durationMs: z.number().nonnegative(),
    forced: z.boolean(),
    nearbyCars: z.array(z.string()),
    confidence: z.number().min(0).max(1),
});

export type OfftrackMessage = z.infer<typeof OfftrackSchema>;

// ==========================================
// 4. Unsafe Rejoin Risk
// ==========================================
export const UnsafeRejoinRiskSchema = IntelligenceMessageSchema.extend({
    type: z.literal('unsafe_rejoin_risk'),
    car: z.string(),
    threatenedCars: z.array(z.string()),
    timeToCollision: z.number(),
    confidence: z.number().min(0).max(1),
});

export type UnsafeRejoinRiskMessage = z.infer<typeof UnsafeRejoinRiskSchema>;

// ==========================================
// 5. Local Caution
// ==========================================
export const LocalCautionSchema = IntelligenceMessageSchema.extend({
    type: z.literal('local_caution'),
    sector: z.number().optional(), // Or lapDistRange
    lapDistStart: z.number().min(0).max(1).optional(),
    lapDistEnd: z.number().min(0).max(1).optional(),
    reason: z.enum(['stopped_car', 'multi_car_incident', 'blockage']),
    involvedCars: z.array(z.string()),
    confidence: z.number().min(0).max(1),
});

export type LocalCautionMessage = z.infer<typeof LocalCautionSchema>;
