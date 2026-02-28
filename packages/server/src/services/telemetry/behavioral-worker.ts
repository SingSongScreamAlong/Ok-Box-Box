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
    claimStuckMessages,
    cleanupStream,
} from './telemetry-streams.js';
import { createSessionBehavioralMetrics } from '../../db/repositories/behavioral-metrics.repo.js';

// ═══════════════════════════════════════════════════════════════════════════════
// V1.1: SEGMENT ANALYSIS TYPES
// ═══════════════════════════════════════════════════════════════════════════════

const NUM_BINS = 60; // 60 bins = ~1.67% of lap each

interface SegmentBin {
    binIndex: number;
    minSpeed: number;
    maxSpeed: number;
    speedSum: number;         // For computing avg
    brakeStartPct: number;    // Where braking started in this bin (0-1)
    throttleReapplyPct: number; // Where throttle reapplied (0-1)
    correctionCount: number;
    tickCount: number;
    timeInBinMs: number;      // Summed dt for all ticks in this bin (robust)
    lastTickTs: number;       // For computing dt
}

interface SegmentInsight {
    binIndex: number;
    binStartPct: number;      // 0-100%
    binEndPct: number;
    timeDelta: number;        // ms lost vs best lap (positive = slower)
    speedDelta: number;       // mph/kph lost vs best
    likelyCause: 'late_brake' | 'early_brake' | 'slow_exit' | 'corrections' | 'entry_speed' | 'unknown';
    suggestion: string;
    confidence: number;       // 0-1, based on sample count and magnitude
    sectionType: 'straight' | 'slow_corner' | 'fast_corner' | 'mid_lap' | 'early_lap' | 'late_lap';
}

function createEmptyBins(): SegmentBin[] {
    return Array.from({ length: NUM_BINS }, (_, i) => ({
        binIndex: i,
        minSpeed: Infinity,
        maxSpeed: 0,
        speedSum: 0,
        brakeStartPct: -1,
        throttleReapplyPct: -1,
        correctionCount: 0,
        tickCount: 0,
        timeInBinMs: 0,
        lastTickTs: 0,
    }));
}

// Minimum thresholds for insight confidence
const MIN_TIME_DELTA_MS = 60;      // Don't report < 60ms differences
const MIN_SAMPLES_FOR_INSIGHT = 5; // Need at least 5 ticks in bin
const MIN_CONFIDENCE = 0.5;        // Filter low-confidence insights

/**
 * Determine section type based on bin characteristics
 */
function getSectionType(bin: SegmentBin, binIndex: number): SegmentInsight['sectionType'] {
    const lapPct = binIndex / NUM_BINS;
    const avgSpeed = bin.tickCount > 0 ? bin.speedSum / bin.tickCount : 0;
    
    // Position-based fallback
    if (lapPct < 0.15) return 'early_lap';
    if (lapPct > 0.85) return 'late_lap';
    
    // Speed-based classification
    if (bin.maxSpeed > 60 && bin.minSpeed > 50) return 'straight';
    if (avgSpeed < 25) return 'slow_corner';
    if (avgSpeed < 40) return 'fast_corner';
    
    return 'mid_lap';
}

/**
 * V1.1: Analyze segments to find where time is being lost vs best lap
 * Returns top 3 segments losing the most time with likely causes
 */
function analyzeSegments(currentBins: SegmentBin[], bestBins: SegmentBin[]): SegmentInsight[] {
    const insights: SegmentInsight[] = [];
    
    for (let i = 0; i < NUM_BINS; i++) {
        const curr = currentBins[i];
        const best = bestBins[i];
        
        // Skip bins with insufficient data
        if (curr.tickCount < MIN_SAMPLES_FOR_INSIGHT || best.tickCount < MIN_SAMPLES_FOR_INSIGHT) continue;
        
        // Use summed time in bin (robust to jitter)
        const timeDelta = curr.timeInBinMs - best.timeInBinMs; // Positive = slower
        const currAvgSpeed = curr.speedSum / curr.tickCount;
        const bestAvgSpeed = best.speedSum / best.tickCount;
        const speedDelta = bestAvgSpeed - currAvgSpeed; // Positive = slower
        
        // Only report segments losing significant time
        if (timeDelta < MIN_TIME_DELTA_MS) continue;
        
        // Compute confidence based on sample count and magnitude
        const sampleConfidence = Math.min(1, Math.min(curr.tickCount, best.tickCount) / 15);
        const magnitudeConfidence = Math.min(1, timeDelta / 200); // 200ms = full confidence
        const confidence = (sampleConfidence * 0.4) + (magnitudeConfidence * 0.6);
        
        // Skip low-confidence insights
        if (confidence < MIN_CONFIDENCE) continue;
        
        // Determine section type
        const sectionType = getSectionType(curr, i);
        
        // Determine likely cause with improved logic
        let likelyCause: SegmentInsight['likelyCause'] = 'unknown';
        let suggestion = '';
        
        const brakeLater = curr.brakeStartPct > best.brakeStartPct + 0.08 && curr.brakeStartPct > 0;
        const brakeEarlier = curr.brakeStartPct >= 0 && best.brakeStartPct >= 0 && 
                            curr.brakeStartPct < best.brakeStartPct - 0.08;
        const minSpeedLower = curr.minSpeed < best.minSpeed - 2;
        const moreCorrections = curr.correctionCount > best.correctionCount + 1;
        const throttleLater = curr.throttleReapplyPct > best.throttleReapplyPct + 0.1 && curr.throttleReapplyPct > 0;
        const entrySpeedLower = curr.maxSpeed < best.maxSpeed - 3;
        
        // Late brake: braked later AND (min speed lower OR more corrections OR throttle later)
        if (brakeLater && (minSpeedLower || moreCorrections || throttleLater)) {
            likelyCause = 'late_brake';
            suggestion = 'Braked too late — try braking earlier for better rotation';
        }
        // Early braking
        else if (brakeEarlier) {
            likelyCause = 'early_brake';
            suggestion = 'Braked too early — carry more speed into the corner';
        }
        // Slow exit (throttle reapplied later)
        else if (throttleLater) {
            likelyCause = 'slow_exit';
            suggestion = 'Slow corner exit — get on throttle earlier';
        }
        // Corrections
        else if (moreCorrections) {
            likelyCause = 'corrections';
            suggestion = 'Too many corrections — commit to your line';
        }
        // Entry speed
        else if (entrySpeedLower) {
            likelyCause = 'entry_speed';
            suggestion = 'Entry speed too low — carry more momentum';
        }
        
        insights.push({
            binIndex: i,
            binStartPct: (i / NUM_BINS) * 100,
            binEndPct: ((i + 1) / NUM_BINS) * 100,
            timeDelta,
            speedDelta,
            likelyCause,
            suggestion,
            confidence,
            sectionType,
        });
    }
    
    // Sort by time lost, filter by confidence, return top 3
    insights.sort((a, b) => b.timeDelta - a.timeDelta);
    return insights.slice(0, 3);
}

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

    // Rotation control analysis (true RCI)
    lastYaw: number;
    lastVelocityX: number;
    lastVelocityY: number;
    yawRateSum: number;
    yawRateCount: number;
    overRotationEvents: number;   // Yaw spike + countersteer + throttle lift
    underRotationEvents: number;  // High steer + low yaw response + speed loss
    yawExcessVariance: number;    // Yaw rate variance vs expected from steering
    rotationSampleCount: number;

    // Lap tracking
    currentLap: number;
    lapStartTs: number;
    lapTimes: number[];
    lastLapTime: number | null;
    bestLapTime: number | null;
    bestLapNumber: number | null;
    position: number;

    // V1.1: Segment analysis (60 bins by LapDistPct)
    currentLapBins: SegmentBin[];
    bestLapBins: SegmentBin[];
    segmentInsights: SegmentInsight[];
    lastSegmentCoachingTs: number;      // Cooldown for segment coaching
    lastSegmentCoachingBin: number;     // Last bin we coached on

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

    // Behavioral indices (raw computed values)
    behavioral: {
        bsi: number;
        tci: number;
        cpi2: number;
        rci: number;
    };

    // EWMA smoothed indices (what we publish)
    smoothedBehavioral: {
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
const RUN_IDLE_TIMEOUT_MS = 300000; // 5 minutes of no data = run ended
const DATA_QUALITY_THRESHOLD = 40; // Min reliability score to trust technique data
const DATA_QUALITY_RECOVER_THRESHOLD = 55; // Hysteresis: recover at higher threshold
const EWMA_ALPHA = 0.1; // Smoothing factor for indices (0.1 = slow, 0.3 = fast)

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

        // Rotation control
        lastYaw: 0,
        lastVelocityX: 0,
        lastVelocityY: 0,
        yawRateSum: 0,
        yawRateCount: 0,
        overRotationEvents: 0,
        underRotationEvents: 0,
        yawExcessVariance: 0,
        rotationSampleCount: 0,

        currentLap: 0,
        lapStartTs: now,
        lapTimes: [],
        lastLapTime: null,
        bestLapTime: null,
        bestLapNumber: null,
        position: 0,

        // V1.1: Segment analysis
        currentLapBins: createEmptyBins(),
        bestLapBins: [],
        segmentInsights: [],
        lastSegmentCoachingTs: 0,
        lastSegmentCoachingBin: -1,

        incidentCount: 0,
        lastIncidentCount: 0,

        fpsSum: 0,
        fpsCount: 0,
        latencySum: 0,
        latencyCount: 0,

        pillars: { pace: 50, consistency: 50, technique: 50, safety: 100, reliability: 100 },
        behavioral: { bsi: 50, tci: 50, cpi2: 50, rci: 50 },
        smoothedBehavioral: { bsi: 50, tci: 50, cpi2: 50, rci: 50 },

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

    // ─── Rotation Control Analysis (True RCI) ───
    if (packet.yaw !== undefined && packet.velocityX !== undefined && packet.velocityY !== undefined) {
        const dt = Math.max(1, packet.ts - state.lastTs) / 1000; // seconds
        
        // Compute yaw rate (rad/s) - handle wrap-around at ±π
        let yawDelta = (packet.yaw ?? 0) - state.lastYaw;
        if (yawDelta > Math.PI) yawDelta -= 2 * Math.PI;
        if (yawDelta < -Math.PI) yawDelta += 2 * Math.PI;
        const yawRate = yawDelta / dt;
        
        // Track yaw rate statistics
        state.yawRateSum += Math.abs(yawRate);
        state.yawRateCount++;
        
        // Expected yaw rate from steering (simplified: more steer = more expected yaw)
        // This is car-independent because we're comparing relative magnitudes
        const expectedYawMagnitude = Math.abs(packet.steer) * packet.speed * 0.02; // rough scaling
        const actualYawMagnitude = Math.abs(yawRate);
        
        // Only analyze when cornering (steer > 10% or significant yaw)
        if (Math.abs(packet.steer) > 0.1 || actualYawMagnitude > 0.1) {
            state.rotationSampleCount++;
            
            // Over-rotation event: yaw spike much higher than expected + countersteer + throttle lift
            const yawExcess = actualYawMagnitude - expectedYawMagnitude;
            if (yawExcess > 0.3 && steerReversal && packet.throttle < state.lastThrottle - 0.1) {
                state.overRotationEvents++;
            }
            
            // Under-rotation event: high steer angle + low yaw response + speed loss
            const yawDeficit = expectedYawMagnitude - actualYawMagnitude;
            const speedLoss = state.lastSpeed - packet.speed;
            if (yawDeficit > 0.2 && Math.abs(packet.steer) > 0.3 && speedLoss > 2) {
                state.underRotationEvents++;
            }
            
            // Track excess variance (how much yaw deviates from expected)
            state.yawExcessVariance += Math.pow(yawExcess, 2);
        }
        
        // Update last values
        state.lastYaw = packet.yaw ?? 0;
        state.lastVelocityX = packet.velocityX ?? 0;
        state.lastVelocityY = packet.velocityY ?? 0;
    }

    // ─── Track Surface ───
    if (packet.trackSurface === 0) {
        state.offtrackTicks++;
    }

    // ─── V1.1: Segment Bin Tracking ───
    const binIndex = Math.min(NUM_BINS - 1, Math.floor(packet.lapDistPct * NUM_BINS));
    const bin = state.currentLapBins[binIndex];
    
    // Compute dt and add to time in bin (robust to jitter/multiple visits)
    if (bin.lastTickTs > 0) {
        const dtMs = packet.ts - bin.lastTickTs;
        if (dtMs > 0 && dtMs < 500) { // Sanity check: ignore gaps > 500ms
            bin.timeInBinMs += dtMs;
        }
    }
    bin.lastTickTs = packet.ts;
    bin.tickCount++;
    bin.minSpeed = Math.min(bin.minSpeed, packet.speed);
    bin.maxSpeed = Math.max(bin.maxSpeed, packet.speed);
    bin.speedSum += packet.speed;
    
    // Track brake start point within bin
    if (packet.brake > 0.05 && state.lastBrake < 0.05 && bin.brakeStartPct < 0) {
        bin.brakeStartPct = (packet.lapDistPct * NUM_BINS) - binIndex; // 0-1 within bin
    }
    // Track throttle reapply point within bin
    if (packet.throttle > 0.2 && state.lastThrottle < 0.2 && bin.throttleReapplyPct < 0) {
        bin.throttleReapplyPct = (packet.lapDistPct * NUM_BINS) - binIndex;
    }
    // Track corrections in this bin
    if (steerReversal && Math.abs(steerVel) > 0.5 && Math.abs(state.lastSteer) > 0.1) {
        bin.correctionCount++;
    }

    // ─── Lap Tracking ───
    if (packet.lap > state.currentLap) {
        // Lap completed - analyze segments and compare to best
        const lapTime = packet.ts - state.lapStartTs;
        const isValidLap = lapTime > 10000 && lapTime < 600000; // 10s - 10min
        
        // Check if this was a "clean" lap (no incidents, no offtracks during lap)
        const lapIncidents = packet.incidentCount - state.lastIncidentCount;
        const lapOfftrackRatio = state.offtrackTicks / (state.totalTicks || 1);
        const isCleanLap = lapIncidents === 0 && lapOfftrackRatio < 0.02;
        
        if (isValidLap) {
            state.lapTimes.push(lapTime);
            state.lastLapTime = lapTime;
            
            // Only update best lap reference if this is a CLEAN lap
            if (isCleanLap && (!state.bestLapTime || lapTime < state.bestLapTime)) {
                state.bestLapTime = lapTime;
                state.bestLapNumber = state.currentLap;
                // Store this lap's bins as the reference
                state.bestLapBins = state.currentLapBins.map(b => ({ ...b }));
                // Clear insights since we have a new reference
                state.segmentInsights = [];
            } else if (state.bestLapBins.length > 0) {
                // Compare current lap to best lap and generate insights
                state.segmentInsights = analyzeSegments(state.currentLapBins, state.bestLapBins);
            }
        }
        
        // Reset for next lap
        state.currentLap = packet.lap;
        state.lapStartTs = packet.ts;
        state.currentLapBins = createEmptyBins();
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
    // Low corrections + mid-corner stability
    // Use corrections per minute as primary metric (car/track independent)
    const sessionMinutes = (Date.now() - state.startTs) / 60000;
    const correctionsPerMinute = sessionMinutes > 0.1 
        ? state.steerCorrectionCount / sessionMinutes 
        : 0;
    // Baseline: 0 corrections/min = 100, 60 corrections/min = 0
    const correctionScore = Math.max(0, 100 - correctionsPerMinute * 1.67);
    
    // Mid-corner changes relative to total cornering ticks
    const corneringTicks = state.throttleModulationTicks + state.trailBrakeTicks;
    const midCornerRatio = corneringTicks > 100 
        ? state.midCornerSteerChanges / corneringTicks 
        : 0;
    const midCornerScore = Math.max(0, 100 - midCornerRatio * 200);
    
    state.behavioral.cpi2 = Math.min(100, Math.max(0,
        correctionScore * 0.6 + midCornerScore * 0.4
    ));

    // ─── RCI (Rotation Control Index) ───
    // True rotation control: low over/under rotation events + controlled yaw variance
    if (state.rotationSampleCount > 100) {
        // Event frequency per 1000 samples
        const overRotationRate = (state.overRotationEvents / state.rotationSampleCount) * 1000;
        const underRotationRate = (state.underRotationEvents / state.rotationSampleCount) * 1000;
        const totalRotationEvents = overRotationRate + underRotationRate;
        
        // Yaw variance score (lower is better)
        const avgYawExcessVariance = state.yawExcessVariance / state.rotationSampleCount;
        const yawVarianceScore = Math.max(0, 100 - avgYawExcessVariance * 100);
        
        // RCI = low events + low variance
        state.behavioral.rci = Math.min(100, Math.max(0,
            (100 - totalRotationEvents * 2) * 0.6 +  // 60% weight on event frequency
            yawVarianceScore * 0.4                    // 40% weight on yaw variance
        ));
    } else {
        // Fallback to lap consistency if no yaw data available
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
        // Give rotation-specific coaching if we have yaw data
        if (state.rotationSampleCount > 100) {
            if (state.overRotationEvents > state.underRotationEvents) {
                state.coaching.push('Car rotating too much — reduce entry speed or add more trail braking');
            } else {
                state.coaching.push('Car understeering — try later apex or more aggressive turn-in');
            }
        } else {
            state.coaching.push('Focus on rhythm — try to hit the same marks each lap');
        }
    }

    // V1.1: Add segment-specific coaching from insights with cooldown
    const SEGMENT_COACHING_COOLDOWN_MS = 25000; // 25 seconds between same-bin coaching
    const now = Date.now();
    
    if (state.segmentInsights.length > 0 && state.coaching.length < 3) {
        // Find first insight that passes cooldown
        for (const insight of state.segmentInsights) {
            if (!insight.suggestion || insight.timeDelta < 80) continue;
            if (insight.confidence < 0.6) continue;
            
            // Check cooldown: don't repeat same bin within 25s
            const sameBin = insight.binIndex === state.lastSegmentCoachingBin;
            const cooldownActive = now - state.lastSegmentCoachingTs < SEGMENT_COACHING_COOLDOWN_MS;
            if (sameBin && cooldownActive) continue;
            
            // Format with section type for human-friendly output
            const sectionLabel = insight.sectionType === 'slow_corner' ? 'slow corner' :
                                 insight.sectionType === 'fast_corner' ? 'fast section' :
                                 insight.sectionType === 'straight' ? 'straight' :
                                 insight.sectionType === 'early_lap' ? 'early lap' :
                                 insight.sectionType === 'late_lap' ? 'late lap' : 'mid-lap';
            const pctLabel = `${insight.binStartPct.toFixed(0)}%`;
            
            state.coaching.push(`${sectionLabel} (${pctLabel}): ${insight.suggestion}`);
            state.lastSegmentCoachingTs = now;
            state.lastSegmentCoachingBin = insight.binIndex;
            break; // Only add one segment insight per publish
        }
    }

    // Limit to 3
    state.coaching = state.coaching.slice(0, 3);
    state.warnings = state.warnings.slice(0, 3);
}

/**
 * Apply EWMA smoothing to behavioral indices
 */
function smoothBehavioralIndices(state: RunState): void {
    // Only smooth if we have enough samples
    if (state.totalTicks < 60) {
        // Not enough data, use raw values
        state.smoothedBehavioral = { ...state.behavioral };
        return;
    }

    // EWMA: smoothed = alpha * raw + (1 - alpha) * previous_smoothed
    state.smoothedBehavioral.bsi = EWMA_ALPHA * state.behavioral.bsi + (1 - EWMA_ALPHA) * state.smoothedBehavioral.bsi;
    state.smoothedBehavioral.tci = EWMA_ALPHA * state.behavioral.tci + (1 - EWMA_ALPHA) * state.smoothedBehavioral.tci;
    state.smoothedBehavioral.cpi2 = EWMA_ALPHA * state.behavioral.cpi2 + (1 - EWMA_ALPHA) * state.smoothedBehavioral.cpi2;
    state.smoothedBehavioral.rci = EWMA_ALPHA * state.behavioral.rci + (1 - EWMA_ALPHA) * state.smoothedBehavioral.rci;
}

// Track degraded state per run for hysteresis
const degradedRuns = new Set<string>();

// ═══════════════════════════════════════════════════════════════════════════════
// LIVE METRICS PUBLISHING
// ═══════════════════════════════════════════════════════════════════════════════

function buildLiveMetrics(state: RunState): LiveMetrics {
    computePillars(state);
    computeBehavioralIndices(state);
    smoothBehavioralIndices(state);
    generateCoaching(state);

    // Data quality gating with hysteresis
    const wasDegraded = degradedRuns.has(state.runId);
    const threshold = wasDegraded ? DATA_QUALITY_RECOVER_THRESHOLD : DATA_QUALITY_THRESHOLD;
    const dataQualityOk = state.pillars.reliability >= threshold;
    
    // Update degraded state
    if (dataQualityOk) {
        degradedRuns.delete(state.runId);
    } else {
        degradedRuns.add(state.runId);
    }
    
    // V1.1: Map segment insights to public format
    const segmentInsights = state.segmentInsights.length > 0 
        ? state.segmentInsights.map(s => ({
            binStartPct: s.binStartPct,
            binEndPct: s.binEndPct,
            timeDelta: s.timeDelta,
            speedDelta: s.speedDelta,
            likelyCause: s.likelyCause,
            suggestion: s.suggestion,
            confidence: s.confidence,
            sectionType: s.sectionType,
        }))
        : undefined;

    // V1.1: Compute segment health metrics
    const binsWithEnoughSamples = state.currentLapBins.filter(b => b.tickCount >= MIN_SAMPLES_FOR_INSIGHT).length;
    const coveragePct = (binsWithEnoughSamples / NUM_BINS) * 100;
    const referenceAgeLaps = state.bestLapNumber !== null 
        ? state.currentLap - state.bestLapNumber 
        : 0;

    return {
        runId: state.runId,
        ts: Date.now(),
        pillars: { ...state.pillars },
        behavioral: dataQualityOk 
            ? { ...state.smoothedBehavioral }  // Use EWMA smoothed values
            : { bsi: -1, tci: -1, cpi2: -1, rci: -1 }, // -1 = degraded/unavailable
        currentLap: state.currentLap,
        lastLapTime: state.lastLapTime,
        bestLapTime: state.bestLapTime,
        position: state.position,
        coaching: dataQualityOk ? [...state.coaching] : [],
        warnings: dataQualityOk 
            ? [...state.warnings] 
            : ['Data quality degraded — technique scores unavailable'],
        segmentInsights: dataQualityOk ? segmentInsights : undefined,
        segmentHealth: {
            coveragePct,
            insightCount: state.segmentInsights.length,
            referenceAgeLaps,
            hasBestLapReference: state.bestLapBins.length > 0,
        },
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
const activeRunIds = new Set<string>();

export async function startBehavioralWorker(runIds: string[]): Promise<void> {
    if (workerRunning) {
        // Add new runIds to active set
        for (const runId of runIds) {
            if (!activeRunIds.has(runId)) {
                activeRunIds.add(runId);
                await ensureConsumerGroup(runId);
                // Claim any stuck messages from previous crashes
                const stuckPackets = await claimStuckMessages(runId, CONSUMER_ID);
                if (stuckPackets.length > 0) {
                    for (const packet of stuckPackets) {
                        const state = getOrCreateRunState(packet.runId, packet.userId);
                        processTick(state, packet);
                    }
                }
            }
        }
        return;
    }

    workerRunning = true;
    console.log('[BehavioralWorker] Starting for runs:', runIds);

    // Ensure consumer groups exist and claim stuck messages
    for (const runId of runIds) {
        activeRunIds.add(runId);
        await ensureConsumerGroup(runId);
        // Claim any stuck messages from previous crashes
        const stuckPackets = await claimStuckMessages(runId, CONSUMER_ID);
        if (stuckPackets.length > 0) {
            for (const packet of stuckPackets) {
                const state = getOrCreateRunState(packet.runId, packet.userId);
                processTick(state, packet);
            }
        }
    }

    while (workerRunning) {
        const now = Date.now();
        
        for (const runId of activeRunIds) {
            try {
                // Read batch of telemetry packets
                const packets = await readTelemetryFromStream(runId, CONSUMER_ID, 200, 50);

                if (packets.length > 0) {
                    // Process each packet
                    for (const packet of packets) {
                        const state = getOrCreateRunState(packet.runId, packet.userId);
                        processTick(state, packet);
                    }
                }

                // Check if we should publish
                const state = runStates.get(runId);
                if (state) {
                    // Update last activity timestamp
                    if (packets.length > 0) {
                        state.lastTs = now;
                    }

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

                    // Check for idle run (no data for 5 minutes)
                    if (now - state.lastTs > RUN_IDLE_TIMEOUT_MS) {
                        console.log(`[BehavioralWorker] Run ${runId} idle for 5 min, cleaning up`);
                        await endRun(runId);
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

/**
 * End a run - persist final snapshot, cleanup stream, remove from active set
 */
export async function endRun(runId: string): Promise<void> {
    const state = runStates.get(runId);
    
    if (state) {
        // Persist final snapshot
        await persistSnapshot(state);
        console.log(`[BehavioralWorker] Final snapshot persisted for run ${runId}`);
    }
    
    // Cleanup Redis stream
    await cleanupStream(runId);
    
    // Remove from tracking
    runStates.delete(runId);
    activeRunIds.delete(runId);
    
    console.log(`[BehavioralWorker] Run ${runId} ended and cleaned up`);
}

/**
 * Check if data quality is sufficient for technique scoring
 */
export function isDataQualitySufficient(state: RunState): boolean {
    return state.pillars.reliability >= DATA_QUALITY_THRESHOLD;
}
