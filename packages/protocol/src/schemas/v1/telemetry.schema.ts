import { z } from 'zod';
import { RelayMessageSchema } from './base.js';

export const CarTelemetrySnapshotSchema = z.object({
    carId: z.number(),
    driverId: z.string().optional(),
    speed: z.number(),
    gear: z.number(),
    pos: z.object({ s: z.number() }), // Simplified position for relay
    throttle: z.number(),
    brake: z.number(),
    steering: z.number(),
    rpm: z.number().optional(),
    inPit: z.boolean(),

    // Spatial / World Model Fields
    lat: z.number().optional(),
    lon: z.number().optional(),
    alt: z.number().optional(),
    velocityX: z.number().optional().default(0),
    velocityY: z.number().optional().default(0),
    velocityZ: z.number().optional().default(0),
    yaw: z.number().optional().default(0),
    lap: z.number(),
    classPosition: z.number().optional(),
    position: z.number().optional(),
});

export const TelemetrySnapshotSchema = RelayMessageSchema.extend({
    type: z.literal('telemetry'),
    cars: z.array(CarTelemetrySnapshotSchema),
    // Optional relay-level fields that might be passed
    sessionTimeMs: z.number().optional(),
});

export type TelemetrySnapshot = z.infer<typeof TelemetrySnapshotSchema>;

// Phase 11: Strategy Data
// Low-frequency (1Hz) update for fuel, tires, and damage.
export const CarStrategySnapshotSchema = z.object({
    carId: z.number(),
    fuel: z.object({
        level: z.number(), // Liters
        pct: z.number(),   // 0-1
        perLap: z.number().optional(), // Avg consumption
        usePerHour: z.number().optional() // kg/h from SDK
    }),
    tires: z.object({
        // Wear Percentage (1.0 = New, 0.0 = Dead)
        fl: z.number(),
        fr: z.number(),
        rl: z.number(),
        rr: z.number()
    }).optional(),
    // Phase 16: Tire Temperatures
    tireTemps: z.object({
        fl: z.object({ l: z.number(), m: z.number(), r: z.number() }),
        fr: z.object({ l: z.number(), m: z.number(), r: z.number() }),
        rl: z.object({ l: z.number(), m: z.number(), r: z.number() }),
        rr: z.object({ l: z.number(), m: z.number(), r: z.number() })
    }).optional(),
    // Phase 16: Brake Pressure
    brakePressure: z.object({
        fl: z.number(),
        fr: z.number(),
        rl: z.number(),
        rr: z.number()
    }).optional(),
    damage: z.object({
        aero: z.number(),   // 0-1 (0 = No Damage)
        engine: z.number()  // 0-1
    }).optional(),
    // Phase 16: Engine Health
    engine: z.object({
        oilTemp: z.number(),
        oilPressure: z.number(),
        waterTemp: z.number(),
        voltage: z.number(),
        warnings: z.number() // Bitfield
    }).optional(),
    // Phase 16: Tire Compound
    tireCompound: z.number().optional(), // iRacing compound ID
    pit: z.object({
        inLane: z.boolean(),
        stops: z.number()
    }).optional()
});

export const StrategySnapshotSchema = RelayMessageSchema.extend({
    type: z.literal('strategy_update'),
    sessionId: z.string(),
    timestamp: z.number(),
    cars: z.array(CarStrategySnapshotSchema)
});

export type StrategySnapshot = z.infer<typeof StrategySnapshotSchema>;
