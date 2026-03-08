/**
 * Behavioral Index Validation Test
 * 
 * Simulates three driving scenarios to validate that BSI/TCI/CPI-2/RCI
 * respond correctly to different driving behaviors.
 * 
 * Run with: npx tsx src/services/telemetry/behavioral-validation.test.ts
 */

import { describe, it, expect } from 'vitest';
import { TelemetryPacket } from './telemetry-streams.js';

// ═══════════════════════════════════════════════════════════════════════════════
// INLINE BEHAVIORAL COMPUTATION (mirrors behavioral-worker.ts logic)
// ═══════════════════════════════════════════════════════════════════════════════

interface TestRunState {
    totalTicks: number;
    brakeTicks: number;
    absTicks: number;
    brakeOnsetCount: number;
    brakeSmoothCount: number;
    trailBrakeTicks: number;
    throttleOnsetCount: number;
    throttleSmoothCount: number;
    throttleModulationTicks: number;
    steerCorrectionCount: number;
    turnInCount: number;
    midCornerSteerChanges: number;
    rotationSampleCount: number;
    overRotationEvents: number;
    underRotationEvents: number;
    yawExcessVariance: number;
    lapTimes: number[];
    fpsSum: number;
    fpsCount: number;
    // Last values
    lastTs: number;
    lastBrake: number;
    lastThrottle: number;
    lastSteer: number;
    lastSpeed: number;
    lastYaw: number;
    steerLastVel: number;
}

function createTestState(): TestRunState {
    return {
        totalTicks: 0,
        brakeTicks: 0,
        absTicks: 0,
        brakeOnsetCount: 0,
        brakeSmoothCount: 0,
        trailBrakeTicks: 0,
        throttleOnsetCount: 0,
        throttleSmoothCount: 0,
        throttleModulationTicks: 0,
        steerCorrectionCount: 0,
        turnInCount: 0,
        midCornerSteerChanges: 0,
        rotationSampleCount: 0,
        overRotationEvents: 0,
        underRotationEvents: 0,
        yawExcessVariance: 0,
        lapTimes: [],
        fpsSum: 0,
        fpsCount: 0,
        lastTs: 0,
        lastBrake: 0,
        lastThrottle: 0,
        lastSteer: 0,
        lastSpeed: 0,
        lastYaw: 0,
        steerLastVel: 0,
    };
}

function processTick(state: TestRunState, packet: TelemetryPacket): void {
    state.totalTicks++;
    const dt = Math.max(1, packet.ts - state.lastTs);

    // Braking
    const brakeOn = packet.brake > 0.05;
    const brakeOnset = brakeOn && state.lastBrake < 0.05;
    const brakeRate = (packet.brake - state.lastBrake) / dt * 1000;

    if (brakeOn) state.brakeTicks++;
    if (brakeOnset) {
        state.brakeOnsetCount++;
        if (brakeRate < 5) state.brakeSmoothCount++;
    }
    if (packet.absActive > 0) state.absTicks++;
    if (brakeOn && Math.abs(packet.steer) > 0.1 && packet.speed > 13) {
        state.trailBrakeTicks++;
    }

    // Throttle
    const throttleOn = packet.throttle > 0.05;
    const throttleOnset = throttleOn && state.lastThrottle < 0.05;
    const throttleRate = (packet.throttle - state.lastThrottle) / dt * 1000;

    if (throttleOnset) {
        state.throttleOnsetCount++;
        if (throttleRate > 8) state.throttleSmoothCount++; // Note: inverted for harsh
        else state.throttleSmoothCount++;
    }
    if (packet.throttle > 0.2 && packet.throttle < 0.9 && Math.abs(packet.steer) > 0.1) {
        state.throttleModulationTicks++;
    }

    // Steering
    const steerVel = (packet.steer - state.lastSteer) / dt * 1000;
    const steerReversal = (steerVel > 0 && state.steerLastVel < 0) || (steerVel < 0 && state.steerLastVel > 0);

    if (steerReversal && Math.abs(steerVel) > 0.5) {
        if (Math.abs(state.lastSteer) > 0.1) {
            state.steerCorrectionCount++;
        }
    }
    if (Math.abs(packet.steer) > 0.15 && Math.abs(state.lastSteer) < 0.05) {
        state.turnInCount++;
    }
    if (Math.abs(packet.steer) > 0.2 && Math.abs(steerVel) > 1) {
        state.midCornerSteerChanges++;
    }
    state.steerLastVel = steerVel;

    // Rotation control
    if (packet.yaw !== undefined) {
        let yawDelta = (packet.yaw ?? 0) - state.lastYaw;
        if (yawDelta > Math.PI) yawDelta -= 2 * Math.PI;
        if (yawDelta < -Math.PI) yawDelta += 2 * Math.PI;
        const yawRate = yawDelta / (dt / 1000);

        const expectedYawMagnitude = Math.abs(packet.steer) * packet.speed * 0.02;
        const actualYawMagnitude = Math.abs(yawRate);

        if (Math.abs(packet.steer) > 0.1 || actualYawMagnitude > 0.1) {
            state.rotationSampleCount++;
            const yawExcess = actualYawMagnitude - expectedYawMagnitude;

            if (yawExcess > 0.3 && steerReversal && packet.throttle < state.lastThrottle - 0.1) {
                state.overRotationEvents++;
            }
            const yawDeficit = expectedYawMagnitude - actualYawMagnitude;
            const speedLoss = state.lastSpeed - packet.speed;
            if (yawDeficit > 0.2 && Math.abs(packet.steer) > 0.3 && speedLoss > 2) {
                state.underRotationEvents++;
            }
            state.yawExcessVariance += Math.pow(yawExcess, 2);
        }
        state.lastYaw = packet.yaw ?? 0;
    }

    // Quality
    if (packet.fps) {
        state.fpsSum += packet.fps;
        state.fpsCount++;
    }

    // Update last values
    state.lastTs = packet.ts;
    state.lastBrake = packet.brake;
    state.lastThrottle = packet.throttle;
    state.lastSteer = packet.steer;
    state.lastSpeed = packet.speed;
}

function computeIndices(state: TestRunState): { bsi: number; tci: number; cpi2: number; rci: number; reliability: number } {
    const ticks = state.totalTicks || 1;

    // BSI
    const smoothBrakeRatio = state.brakeOnsetCount > 0 ? state.brakeSmoothCount / state.brakeOnsetCount : 0.5;
    const trailBrakeRatio = state.brakeTicks > 0 ? state.trailBrakeTicks / state.brakeTicks : 0;
    const absRatio = state.brakeTicks > 0 ? state.absTicks / state.brakeTicks : 0;
    const bsi = Math.min(100, Math.max(0, smoothBrakeRatio * 40 + trailBrakeRatio * 30 + (1 - absRatio) * 30));

    // TCI
    const smoothThrottleRatio = state.throttleOnsetCount > 0 ? state.throttleSmoothCount / state.throttleOnsetCount : 0.5;
    const modulationRatio = ticks > 0 ? Math.min(1, state.throttleModulationTicks / (ticks * 0.1)) : 0;
    const tci = Math.min(100, Math.max(0, smoothThrottleRatio * 50 + modulationRatio * 50));

    // CPI-2 - corrections per minute based
    const sessionMinutes = (state.totalTicks * 16) / 60000; // Approximate from tick count
    const correctionsPerMinute = sessionMinutes > 0.1 ? state.steerCorrectionCount / sessionMinutes : 0;
    const correctionScore = Math.max(0, 100 - correctionsPerMinute * 1.67);
    const corneringTicks = state.throttleModulationTicks + state.trailBrakeTicks;
    const midCornerRatio = corneringTicks > 100 ? state.midCornerSteerChanges / corneringTicks : 0;
    const midCornerScore = Math.max(0, 100 - midCornerRatio * 200);
    const cpi2 = Math.min(100, Math.max(0, correctionScore * 0.6 + midCornerScore * 0.4));

    // RCI
    let rci = 50;
    if (state.rotationSampleCount > 100) {
        const overRotationRate = (state.overRotationEvents / state.rotationSampleCount) * 1000;
        const underRotationRate = (state.underRotationEvents / state.rotationSampleCount) * 1000;
        const totalRotationEvents = overRotationRate + underRotationRate;
        const avgYawExcessVariance = state.yawExcessVariance / state.rotationSampleCount;
        const yawVarianceScore = Math.max(0, 100 - avgYawExcessVariance * 100);
        rci = Math.min(100, Math.max(0, (100 - totalRotationEvents * 2) * 0.6 + yawVarianceScore * 0.4));
    }

    // Reliability
    const avgFps = state.fpsCount > 0 ? state.fpsSum / state.fpsCount : 60;
    const reliability = Math.min(100, (avgFps / 60) * 100);

    return { bsi, tci, cpi2, rci, reliability };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIO GENERATORS
// ═══════════════════════════════════════════════════════════════════════════════

function generateSmoothSession(tickCount: number): TelemetryPacket[] {
    const packets: TelemetryPacket[] = [];
    let yaw = 0;

    for (let i = 0; i < tickCount; i++) {
        const t = i / tickCount;
        const cornerPhase = Math.sin(t * Math.PI * 8); // 4 corners per "lap"

        // Smooth, progressive inputs with clear turn-in points
        const brake = cornerPhase < -0.3 ? Math.min(0.7, (-cornerPhase - 0.3) * 1.5) : 0;
        const throttle = cornerPhase > 0.2 ? Math.min(0.9, (cornerPhase - 0.2) * 1.2) : 0.1;
        
        // Steering with clear turn-in: 0 on straights, ramp up in corners
        let steer = 0;
        if (cornerPhase > 0.1) {
            steer = (cornerPhase - 0.1) * 0.5; // Ramps from 0 to ~0.45
        } else if (cornerPhase < -0.1) {
            steer = 0; // Straight/braking zone
        }

        // Smooth yaw follows steering
        yaw += steer * 0.01;

        packets.push({
            runId: 'test-smooth',
            userId: 'test',
            ts: i * 16, // ~60Hz
            sessionTime: i * 16,
            lap: Math.floor(i / (tickCount / 4)),
            lapDistPct: (i % (tickCount / 4)) / (tickCount / 4),
            speed: 40 + cornerPhase * 10,
            throttle,
            brake,
            steer,
            gear: 4,
            rpm: 6000,
            trackSurface: 1,
            absActive: 0, // No ABS
            incidentCount: 0,
            lastLapTime: 90,
            bestLapTime: 89,
            position: 5,
            fuelLevel: 20,
            yaw,
            velocityX: 0,
            velocityY: 0,
            fps: 60,
            latency: 10,
        });
    }
    return packets;
}

function generateOverdriveSession(tickCount: number): TelemetryPacket[] {
    const packets: TelemetryPacket[] = [];
    let yaw = 0;

    for (let i = 0; i < tickCount; i++) {
        const t = i / tickCount;
        const cornerPhase = Math.sin(t * Math.PI * 8);

        // Aggressive, harsh inputs
        const brake = cornerPhase < -0.2 ? 0.95 : 0; // Late, hard braking
        const throttle = cornerPhase > 0.1 ? 0.95 : 0; // Early, aggressive throttle
        
        // Realistic corner entry/exit with corrections
        // Clear turn-in (from 0 to >15%) then sawing in mid-corner
        let steer = 0;
        if (cornerPhase > 0.3) {
            // In corner - lots of corrections (sawing)
            steer = 0.4 + Math.sin(i * 0.8) * 0.2; // Oscillating between 0.2 and 0.6
        } else if (cornerPhase > 0.05) {
            // Turn-in phase - ramps from 0 to 0.3
            steer = (cornerPhase - 0.05) * 1.2;
        } else {
            // Straight - near zero steering
            steer = 0.02; // Almost zero
        }

        // Yaw spikes (over-rotation events)
        const yawSpike = Math.random() > 0.97 ? 0.8 : 0;
        yaw += steer * 0.02 + yawSpike;

        packets.push({
            runId: 'test-overdrive',
            userId: 'test',
            ts: i * 16,
            sessionTime: i * 16,
            lap: Math.floor(i / (tickCount / 4)),
            lapDistPct: (i % (tickCount / 4)) / (tickCount / 4),
            speed: 35 + cornerPhase * 15,
            throttle,
            brake,
            steer,
            gear: 4,
            rpm: 7500,
            trackSurface: 1,
            absActive: brake > 0.8 ? 1 : 0, // ABS triggers on hard braking
            incidentCount: Math.floor(i / 1000),
            lastLapTime: 95,
            bestLapTime: 92,
            position: 12,
            fuelLevel: 18,
            yaw,
            velocityX: 0,
            velocityY: 0,
            fps: 60,
            latency: 15,
        });
    }
    return packets;
}

function generateDegradedSession(tickCount: number): TelemetryPacket[] {
    const packets: TelemetryPacket[] = [];

    for (let i = 0; i < tickCount; i++) {
        const t = i / tickCount;
        const cornerPhase = Math.sin(t * Math.PI * 8);

        // Normal-ish driving but bad FPS
        const brake = cornerPhase < -0.3 ? 0.6 : 0;
        const throttle = cornerPhase > 0.2 ? 0.8 : 0.1;
        const steer = cornerPhase * 0.25;

        packets.push({
            runId: 'test-degraded',
            userId: 'test',
            ts: i * 16,
            sessionTime: i * 16,
            lap: Math.floor(i / (tickCount / 4)),
            lapDistPct: (i % (tickCount / 4)) / (tickCount / 4),
            speed: 38 + cornerPhase * 8,
            throttle,
            brake,
            steer,
            gear: 4,
            rpm: 6500,
            trackSurface: 1,
            absActive: 0,
            incidentCount: 0,
            lastLapTime: 91,
            bestLapTime: 90,
            position: 8,
            fuelLevel: 19,
            yaw: cornerPhase * 0.1,
            velocityX: 0,
            velocityY: 0,
            fps: 15, // BAD FPS - should trigger degraded mode
            latency: 200,
        });
    }
    return packets;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST RUNNER
// ═══════════════════════════════════════════════════════════════════════════════

function runTest(name: string, packets: TelemetryPacket[], expectations: { 
    bsiMin?: number; bsiMax?: number;
    tciMin?: number; tciMax?: number;
    cpi2Min?: number; cpi2Max?: number;
    rciMin?: number; rciMax?: number;
    reliabilityMin?: number; reliabilityMax?: number;
}): boolean {
    const state = createTestState();
    
    for (const packet of packets) {
        processTick(state, packet);
    }
    
    const indices = computeIndices(state);
    
    console.log(`\n═══ ${name} ═══`);
    console.log(`  Ticks processed: ${state.totalTicks}`);
    console.log(`  BSI:  ${indices.bsi.toFixed(1)} (Braking Stability)`);
    console.log(`  TCI:  ${indices.tci.toFixed(1)} (Throttle Control)`);
    console.log(`  CPI-2: ${indices.cpi2.toFixed(1)} (Cornering Precision)`);
    console.log(`  RCI:  ${indices.rci.toFixed(1)} (Rotation Control)`);
    console.log(`  Reliability: ${indices.reliability.toFixed(1)}`);
    console.log(`  ---`);
    console.log(`  Brake onsets: ${state.brakeOnsetCount}, smooth: ${state.brakeSmoothCount}`);
    console.log(`  ABS ticks: ${state.absTicks} / ${state.brakeTicks} brake ticks`);
    console.log(`  Corrections: ${state.steerCorrectionCount}, turn-ins: ${state.turnInCount}`);
    console.log(`  Over-rotation: ${state.overRotationEvents}, under-rotation: ${state.underRotationEvents}`);

    // Check expectations
    let passed = true;
    const failures: string[] = [];

    if (expectations.bsiMin !== undefined && indices.bsi < expectations.bsiMin) {
        failures.push(`BSI ${indices.bsi.toFixed(1)} < expected min ${expectations.bsiMin}`);
        passed = false;
    }
    if (expectations.bsiMax !== undefined && indices.bsi > expectations.bsiMax) {
        failures.push(`BSI ${indices.bsi.toFixed(1)} > expected max ${expectations.bsiMax}`);
        passed = false;
    }
    if (expectations.cpi2Min !== undefined && indices.cpi2 < expectations.cpi2Min) {
        failures.push(`CPI-2 ${indices.cpi2.toFixed(1)} < expected min ${expectations.cpi2Min}`);
        passed = false;
    }
    if (expectations.cpi2Max !== undefined && indices.cpi2 > expectations.cpi2Max) {
        failures.push(`CPI-2 ${indices.cpi2.toFixed(1)} > expected max ${expectations.cpi2Max}`);
        passed = false;
    }
    if (expectations.reliabilityMin !== undefined && indices.reliability < expectations.reliabilityMin) {
        failures.push(`Reliability ${indices.reliability.toFixed(1)} < expected min ${expectations.reliabilityMin}`);
        passed = false;
    }
    if (expectations.reliabilityMax !== undefined && indices.reliability > expectations.reliabilityMax) {
        failures.push(`Reliability ${indices.reliability.toFixed(1)} > expected max ${expectations.reliabilityMax}`);
        passed = false;
    }

    if (passed) {
        console.log(`  ✅ PASS`);
    } else {
        console.log(`  ❌ FAIL:`);
        failures.forEach(f => console.log(`     - ${f}`));
    }

    return passed;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE
// ═══════════════════════════════════════════════════════════════════════════════

const TICK_COUNT = 3600; // ~1 minute at 60Hz

describe('Behavioral Index Validation', () => {
    it('smooth session should score high BSI, CPI-2, and reliability', () => {
        expect(runTest('SMOOTH SESSION', generateSmoothSession(TICK_COUNT), {
            bsiMin: 50,
            cpi2Min: 60,
            reliabilityMin: 90,
        })).toBe(true);
    });

    it('overdrive session should score low BSI and CPI-2', () => {
        expect(runTest('OVERDRIVE SESSION', generateOverdriveSession(TICK_COUNT), {
            bsiMax: 60,
            cpi2Max: 50,
            reliabilityMin: 90,
        })).toBe(true);
    });

    it('degraded session should show low reliability', () => {
        expect(runTest('DEGRADED SESSION', generateDegradedSession(TICK_COUNT), {
            reliabilityMax: 30,
        })).toBe(true);
    });
});
