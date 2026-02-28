/**
 * Behavioral Worker
 * Consumes telemetry stream, computes live behavioral indices (BSI, TCI, CPI-2, RCI)
 * Publishes LiveMetrics to pub/sub for UI consumption
 * Persists snapshots to Postgres every 2 seconds
 */

import {
    TelemetryPacket,
    LiveMetrics,
    readTelemetryFromStream,
    publishLiveMetrics,
    ensureConsumerGroup,
} from './telemetry-streams.js';
import { createSessionBehavioralMetrics } from '../../db/repositories/behavioral-metrics.repo.js';

// ═══════════════════════════════════════════════════════════════════════════════
// RUN STATE (in-memory per run)
// ═══════════════════════════════════════════════════════════════════════════════

interface RunState {
    runId: string;
    userId: string;
    sessionId?: string;
    driverProfileId?: string;

    // Rolling values (last tick)
    lastTs: number;
    lastSpeed: number;
    lastBrake: number;
    lastSteer: number;
    lastThrottle: number;
    lastLapDistPct: number;

    // Counters
    totalTicks: number;
    brakeTicks: number;
    absTicks: number;
    offtrackTicks: number;

    // Braking analysis
    brakeOnsetCount: number;
    brakeHardCount: number;  // >80% pressure
    brakeSmoothCount: number;  // gradual application
    trailBrakeTicks: number;
    entryOvershootCount: number;

    // Throttle analysis
    throttleOnsetCount: number;
    throttleHarshCount: number;  // rapid application
    throttleSmoothCount: number;
    wheelSpinTicks: number;
    throttleModulationTicks: number;

    // Steering analysis
    steerCorrectionCount: number;
    steerLastVel: number;
    steerReversalCount: number;
    midCornerSteerChanges: number;
    turnInCount: number;

    // Lap tracking
    currentLap: number;
    lapStartTs: number;
    lapTimes: number[];
    lastLapTime: number | null;
    bestLapTime: number | null;
    position: number;

    // Incident tracking
    incidentCount: number;
    lastIncidentCount: number;

    // Quality
    fpsSum: number;
    fpsCount: number;
    latencySum: number;
    latencyCount: number;

    // Computed pillars (updated every publish)
    pillars: {
        pace: number;
        consistency: number;
        technique: number;
        safety: number;
        reliability: number;
    };

    // Behavioral indices
    behavioral: {
        bsi: number;
        tci: number;
        cpi2: number;
        rci: number;
    };

    // Coaching
    coaching: string[];
    warnings: string[];

    // Timing
    lastPublishTs: number;
    lastPersistTs: number;
    startTs: number;
}

// Active run states
const runStates = new Map<string, RunState>();

// ═══════════════════════════════════════════════════════════════════════════════
// WORKER CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const PUBLISH_INTERVAL_MS = 250;  // 4Hz to UI
const PERSIST_INTERVAL_MS = 2000; // Every 2 seconds to DB
const CONSUMER_ID = `worker-${process.pid}`;

// ═══════════════════════════════════════════════════════════════════════════════
// STATE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

function createRunState(runId: string, userId: string): RunState {
    const now = Date.now();
    return {
        runId,
        userId,
        sessionId: undefined,
        driverProfileId: undefined,

        lastTs: now,
        lastSpeed: 0,
        lastBrake: 0,
        lastSteer: 0,
        lastThrottle: 0,
        lastLapDistPct: 0,

        totalTicks: 0,
        brakeTicks: 0,
        absTicks: 0,
        offtrackTicks: 0,

        brakeOnsetCount: 0,
        brakeHardCount: 0,
        brakeSmoothCount: 0,
        trailBrakeTicks: 0,
        entryOvershootCount: 0,

        throttleOnsetCount: 0,
        throttleHarshCount: 0,
        throttleSmoothCount: 0,
        wheelSpinTicks: 0,
        throttleModulationTicks: 0,

        steerCorrectionCount: 0,
        steerLastVel: 0,
        steerReversalCount: 0,
        midCornerSteerChanges: 0,
        turnInCount: 0,

        currentLap: 0,
        lapStartTs: now,
        lapTimes: [],
        lastLapTime: null,
        bestLapTime: null,
        position: 0,

        incidentCount: 0,
        lastIncidentCount: 0,

        fpsSum: 0,
        fpsCount: 0,
        latencySum: 0,
        latencyCount: 0,

        pillars: { pace: 50, consistency: 50, technique: 50, safety: 100, reliability: 100 },
        behavioral: { bsi: 50, tci: 50, cpi2: 50, rci: 50 },

        coaching: [],
        warnings: [],

        lastPublishTs: now,
        lastPersistTs: now,
        startTs: now,
    };
}

function getOrCreateRunState(runId: string, userId: string): RunState {
    let state = runStates.get(runId);
    if (!state) {
        state = createRunState(runId, userId);
        runStates.set(runId, state);
    }
    return state;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TICK PROCESSING (O(1) per tick)
// ═══════════════════════════════════════════════════════════════════════════════

function processTick(state: RunState, packet: TelemetryPacket): void {
    state.totalTicks++;

    // ─── Braking Analysis ───
    const brakeOn = packet.brake > 0.05;
    const brakeHard = packet.brake > 0.8;
    const brakeOnset = brakeOn && state.lastBrake < 0.05;
    const brakeRate = (packet.brake - state.lastBrake) / Math.max(1, packet.ts - state.lastTs) * 1000;

    if (brakeOn) state.brakeTicks++;
    if (brakeHard) state.brakeHardCount++;
    if (brakeOnset) {
        state.brakeOnsetCount++;
        // Smooth onset = gradual pressure build (<50% per 100ms)
        if (brakeRate < 5) state.brakeSmoothCount++;
    }
    if (packet.absActive > 0) state.absTicks++;

    // Trail braking detection (brake + steering + speed > 30mph)
    if (brakeOn && Math.abs(packet.steer) > 0.1 && packet.speed > 13) {
        state.trailBrakeTicks++;
    }

    // ─── Throttle Analysis ───
    const throttleOn = packet.throttle > 0.05;
    const throttleOnset = throttleOn && state.lastThrottle < 0.05;
    const throttleRate = (packet.throttle - state.lastThrottle) / Math.max(1, packet.ts - state.lastTs) * 1000;

    if (throttleOnset) {
        state.throttleOnsetCount++;
        // Harsh application = >80% in <100ms
        if (throttleRate > 8) state.throttleHarshCount++;
        else state.throttleSmoothCount++;
    }

    // Throttle modulation (partial throttle while cornering)
    if (packet.throttle > 0.2 && packet.throttle < 0.9 && Math.abs(packet.steer) > 0.1) {
        state.throttleModulationTicks++;
    }

    // ─── Steering Analysis ───
    const steerVel = (packet.steer - state.lastSteer) / Math.max(1, packet.ts - state.lastTs) * 1000;
    const steerReversal = (steerVel > 0 && state.steerLastVel < 0) || (steerVel < 0 && state.steerLastVel > 0);

    if (steerReversal && Math.abs(steerVel) > 0.5) {
        state.steerReversalCount++;
        // Correction = reversal while already turning
        if (Math.abs(state.lastSteer) > 0.1) {
            state.steerCorrectionCount++;
        }
    }

    // Turn-in detection (steer from <5% to >15%)
    if (Math.abs(packet.steer) > 0.15 && Math.abs(state.lastSteer) < 0.05) {
        state.turnInCount++;
    }

    // Mid-corner steering changes
    if (Math.abs(packet.steer) > 0.2 && Math.abs(steerVel) > 1) {
        state.midCornerSteerChanges++;
    }

    state.steerLastVel = steerVel;

    // ─── Track Surface ───
    if (packet.trackSurface === 0) {
        state.offtrackTicks++;
    }

    // ─── Lap Tracking ───
    if (packet.lap > state.currentLap) {
        // Lap completed
        const lapTime = packet.ts - state.lapStartTs;
        if (lapTime > 10000 && lapTime < 600000) { // Valid lap (10s - 10min)
            state.lapTimes.push(lapTime);
            state.lastLapTime = lapTime;
            if (!state.bestLapTime || lapTime < state.bestLapTime) {
                state.bestLapTime = lapTime;
            }
        }
        state.currentLap = packet.lap;
        state.lapStartTs = packet.ts;
    }

    // ─── Incidents ───
    if (packet.incidentCount > state.lastIncidentCount) {
        state.incidentCount += (packet.incidentCount - state.lastIncidentCount);
    }
    state.lastIncidentCount = packet.incidentCount;

    // ─── Position ───
    state.position = packet.position;

    // ─── Quality ───
    if (packet.fps) {
        state.fpsSum += packet.fps;
        state.fpsCount++;
    }
    if (packet.latency) {
        state.latencySum += packet.latency;
        state.latencyCount++;
    }

    // ─── Update last values ───
    state.lastTs = packet.ts;
    state.lastSpeed = packet.speed;
    state.lastBrake = packet.brake;
    state.lastSteer = packet.steer;
    state.lastThrottle = packet.throttle;
    state.lastLapDistPct = packet.lapDistPct;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PILLAR & BEHAVIORAL INDEX COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

function computePillars(state: RunState): void {
    const ticks = state.totalTicks || 1;
    const laps = state.lapTimes.length;

    // ─── Pace Pillar ───
    // Based on lap times vs best
    if (laps >= 2 && state.bestLapTime) {
        const recentLaps = state.lapTimes.slice(-5);
        const avgRecent = recentLaps.reduce((a, b) => a + b, 0) / recentLaps.length;
        const paceRatio = state.bestLapTime / avgRecent;
        state.pillars.pace = Math.min(100, Math.max(0, paceRatio * 100));
    }

    // ─── Consistency Pillar ───
    // Based on lap time std dev
    if (laps >= 3) {
        const recentLaps = state.lapTimes.slice(-10);
        const mean = recentLaps.reduce((a, b) => a + b, 0) / recentLaps.length;
        const variance = recentLaps.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / recentLaps.length;
        const stdDev = Math.sqrt(variance);
        const cvPct = (stdDev / mean) * 100;
        // CV < 1% = 100, CV > 5% = 0
        state.pillars.consistency = Math.min(100, Math.max(0, 100 - (cvPct - 1) * 25));
    }

    // ─── Technique Pillar ───
    // Composite of braking, throttle, steering quality
    const brakeQuality = state.brakeOnsetCount > 0 
        ? (state.brakeSmoothCount / state.brakeOnsetCount) * 100 
        : 50;
    const throttleQuality = state.throttleOnsetCount > 0 
        ? (state.throttleSmoothCount / state.throttleOnsetCount) * 100 
        : 50;
    const steerQuality = state.turnInCount > 0 
        ? Math.max(0, 100 - (state.steerCorrectionCount / state.turnInCount) * 50) 
        : 50;
    state.pillars.technique = (brakeQuality + throttleQuality + steerQuality) / 3;

    // ─── Safety Pillar ───
    // Based on incidents and offtrack
    const offtrackRatio = state.offtrackTicks / ticks;
    const incidentPenalty = state.incidentCount * 10;
    state.pillars.safety = Math.max(0, 100 - offtrackRatio * 200 - incidentPenalty);

    // ─── Reliability Pillar ───
    // Based on FPS and latency quality
    const avgFps = state.fpsCount > 0 ? state.fpsSum / state.fpsCount : 60;
    const avgLatency = state.latencyCount > 0 ? state.latencySum / state.latencyCount : 0;
    const fpsScore = Math.min(100, (avgFps / 60) * 100);
    const latencyScore = Math.max(0, 100 - avgLatency);
    state.pillars.reliability = (fpsScore + latencyScore) / 2;
}

function computeBehavioralIndices(state: RunState): void {
    const ticks = state.totalTicks || 1;

    // ─── BSI (Braking Stability Index) ───
    // Smooth braking + trail braking + low ABS
    const smoothBrakeRatio = state.brakeOnsetCount > 0 
        ? state.brakeSmoothCount / state.brakeOnsetCount 
        : 0.5;
    const trailBrakeRatio = state.brakeTicks > 0 
        ? state.trailBrakeTicks / state.brakeTicks 
        : 0;
    const absRatio = state.brakeTicks > 0 
        ? state.absTicks / state.brakeTicks 
        : 0;
    state.behavioral.bsi = Math.min(100, Math.max(0,
        smoothBrakeRatio * 40 + 
        trailBrakeRatio * 30 + 
        (1 - absRatio) * 30
    ));

    // ─── TCI (Throttle Control Index) ───
    // Smooth application + modulation + low wheelspin
    const smoothThrottleRatio = state.throttleOnsetCount > 0 
        ? state.throttleSmoothCount / state.throttleOnsetCount 
        : 0.5;
    const modulationRatio = ticks > 0 
        ? Math.min(1, state.throttleModulationTicks / (ticks * 0.1)) 
        : 0;
    state.behavioral.tci = Math.min(100, Math.max(0,
        smoothThrottleRatio * 50 + 
        modulationRatio * 50
    ));

    // ─── CPI-2 (Cornering Precision Index) ───
    // Low corrections + consistent turn-in + mid-corner stability
    const correctionRatio = state.turnInCount > 0 
        ? state.steerCorrectionCount / state.turnInCount 
        : 0;
    const midCornerRatio = state.turnInCount > 0 
        ? state.midCornerSteerChanges / (state.turnInCount * 10) 
        : 0;
    state.behavioral.cpi2 = Math.min(100, Math.max(0,
        (1 - correctionRatio) * 50 + 
        (1 - midCornerRatio) * 50
    ));

    // ─── RCI (Rhythm & Consistency Index) ───
    // Lap time consistency + input repeatability
    let lapConsistency = 50;
    if (state.lapTimes.length >= 3) {
        const recentLaps = state.lapTimes.slice(-5);
        const mean = recentLaps.reduce((a, b) => a + b, 0) / recentLaps.length;
        const variance = recentLaps.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / recentLaps.length;
        const cvPct = (Math.sqrt(variance) / mean) * 100;
        lapConsistency = Math.min(100, Math.max(0, 100 - cvPct * 20));
    }
    state.behavioral.rci = lapConsistency;
}

function generateCoaching(state: RunState): void {
    state.coaching = [];
    state.warnings = [];

    // ─── Warnings (immediate issues) ───
    const absRatio = state.brakeTicks > 0 ? state.absTicks / state.brakeTicks : 0;
    if (absRatio > 0.3) {
        state.warnings.push('ABS engaging frequently — reduce initial brake pressure');
    }

    const correctionRate = state.totalTicks > 0 
        ? (state.steerCorrectionCount / state.totalTicks) * 60000 
        : 0;
    if (correctionRate > 30) {
        state.warnings.push('High steering corrections — focus on smoother inputs');
    }

    const offtrackRatio = state.offtrackTicks / (state.totalTicks || 1);
    if (offtrackRatio > 0.05) {
        state.warnings.push('Track limits exceeded — tighten your line');
    }

    // ─── Coaching (improvement hints) ───
    if (state.behavioral.bsi < 60 && state.coaching.length < 3) {
        state.coaching.push('Work on brake release — try trailing off more gradually');
    }

    if (state.behavioral.tci < 60 && state.coaching.length < 3) {
        state.coaching.push('Throttle application is aggressive — roll on power earlier but gentler');
    }

    if (state.behavioral.cpi2 < 60 && state.coaching.length < 3) {
        state.coaching.push('Commit to your turn-in point — avoid mid-corner adjustments');
    }

    if (state.behavioral.rci < 60 && state.coaching.length < 3) {
        state.coaching.push('Focus on rhythm — try to hit the same marks each lap');
    }

    // Limit to 3
    state.coaching = state.coaching.slice(0, 3);
    state.warnings = state.warnings.slice(0, 3);
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIVE METRICS PUBLISHING
// ═══════════════════════════════════════════════════════════════════════════════

function buildLiveMetrics(state: RunState): LiveMetrics {
    computePillars(state);
    computeBehavioralIndices(state);
    generateCoaching(state);

    return {
        runId: state.runId,
        ts: Date.now(),
        pillars: { ...state.pillars },
        behavioral: { ...state.behavioral },
        currentLap: state.currentLap,
        lastLapTime: state.lastLapTime,
        bestLapTime: state.bestLapTime,
        position: state.position,
        coaching: [...state.coaching],
        warnings: [...state.warnings],
        confidence: Math.min(100, state.totalTicks / 600), // ~10 seconds = 100%
        ticksProcessed: state.totalTicks,
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PERSISTENCE
// ═══════════════════════════════════════════════════════════════════════════════

async function persistSnapshot(state: RunState): Promise<void> {
    if (!state.sessionId || !state.driverProfileId) {
        return; // Can't persist without session/driver IDs
    }

    try {
        await createSessionBehavioralMetrics({
            session_id: state.sessionId,
            driver_profile_id: state.driverProfileId,
            
            brake_timing_score: state.behavioral.bsi,
            brake_pressure_smoothness: state.brakeOnsetCount > 0 
                ? (state.brakeSmoothCount / state.brakeOnsetCount) * 100 
                : undefined,
            trail_braking_stability: state.brakeTicks > 0 
                ? (state.trailBrakeTicks / state.brakeTicks) * 100 
                : undefined,
            entry_overshoot_score: undefined,
            braking_sample_corners: state.brakeOnsetCount,

            throttle_modulation_score: state.behavioral.tci,
            exit_traction_stability: state.throttleOnsetCount > 0 
                ? (state.throttleSmoothCount / state.throttleOnsetCount) * 100 
                : undefined,
            slip_throttle_control: undefined,
            throttle_sample_corners: state.throttleOnsetCount,

            turn_in_consistency: state.behavioral.cpi2,
            mid_corner_stability: state.turnInCount > 0 
                ? Math.max(0, 100 - (state.midCornerSteerChanges / (state.turnInCount * 10)) * 100) 
                : undefined,
            rotation_balance: 50,
            steering_sample_corners: state.turnInCount,

            lap_time_consistency: state.behavioral.rci,
            sector_consistency: undefined,
            input_repeatability: undefined,
            baseline_adherence: undefined,
            rhythm_sample_laps: state.lapTimes.length,

            bsi: state.behavioral.bsi,
            tci: state.behavioral.tci,
            cpi2: state.behavioral.cpi2,
            rci: state.behavioral.rci,
            behavioral_stability: (state.behavioral.bsi + state.behavioral.tci + state.behavioral.cpi2 + state.behavioral.rci) / 4,

            telemetry_confidence: Math.min(100, state.totalTicks / 600),
            data_source: 'live',
        });
    } catch (err) {
        console.error('[BehavioralWorker] Persist error:', err instanceof Error ? err.message : err);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORKER LOOP
// ═══════════════════════════════════════════════════════════════════════════════

let workerRunning = false;

export async function startBehavioralWorker(runIds: string[]): Promise<void> {
    if (workerRunning) {
        console.log('[BehavioralWorker] Already running');
        return;
    }

    workerRunning = true;
    console.log('[BehavioralWorker] Starting for runs:', runIds);

    // Ensure consumer groups exist
    for (const runId of runIds) {
        await ensureConsumerGroup(runId);
    }

    while (workerRunning) {
        for (const runId of runIds) {
            try {
                // Read batch of telemetry packets
                const packets = await readTelemetryFromStream(runId, CONSUMER_ID, 200, 50);

                if (packets.length === 0) continue;

                // Process each packet
                for (const packet of packets) {
                    const state = getOrCreateRunState(packet.runId, packet.userId);
                    processTick(state, packet);
                }

                // Check if we should publish
                const state = runStates.get(runId);
                if (state) {
                    const now = Date.now();

                    // Publish live metrics at 4Hz
                    if (now - state.lastPublishTs >= PUBLISH_INTERVAL_MS) {
                        const metrics = buildLiveMetrics(state);
                        await publishLiveMetrics(metrics);
                        state.lastPublishTs = now;
                    }

                    // Persist snapshot every 2 seconds
                    if (now - state.lastPersistTs >= PERSIST_INTERVAL_MS) {
                        await persistSnapshot(state);
                        state.lastPersistTs = now;
                    }
                }
            } catch (err) {
                console.error('[BehavioralWorker] Loop error:', err instanceof Error ? err.message : err);
            }
        }

        // Small sleep to prevent tight loop
        await new Promise(resolve => setTimeout(resolve, 10));
    }
}

export function stopBehavioralWorker(): void {
    workerRunning = false;
    console.log('[BehavioralWorker] Stopped');
}

export function getRunState(runId: string): RunState | undefined {
    return runStates.get(runId);
}

export function setRunSessionInfo(runId: string, sessionId: string, driverProfileId: string): void {
    const state = runStates.get(runId);
    if (state) {
        state.sessionId = sessionId;
        state.driverProfileId = driverProfileId;
    }
}

export function clearRunState(runId: string): void {
    runStates.delete(runId);
}
