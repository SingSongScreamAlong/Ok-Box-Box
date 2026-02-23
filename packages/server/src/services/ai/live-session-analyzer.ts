/**
 * LiveSessionAnalyzer — Continuous Race Intelligence
 *
 * Accumulates telemetry lap-by-lap during a live session and builds a rolling
 * intelligence picture that every crew member (engineer, spotter, analyst) can
 * query at any time.
 *
 * This is NOT a snapshot — it's the full story of the race so far:
 *   - Lap time trends (improving / degrading / erratic)
 *   - Tire degradation curves (wear rate per stint)
 *   - Fuel burn accuracy (predicted vs actual)
 *   - Incident timeline (when, where, pattern)
 *   - Gap trends (closing / opening on cars ahead/behind)
 *   - Braking consistency (late braking incidents, lockup frequency)
 *   - Racecraft assessment (positions gained/lost, overtake success rate)
 *   - Pace comparison vs field (percentile per stint)
 *   - Mental state inference (incident clustering, pace after incidents)
 *   - Strategy recommendations (optimal pit window, undercut/overcut)
 *
 * One instance per active session. Destroyed on session end.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface LapRecord {
    lapNumber: number;
    lapTime: number;           // seconds
    position: number;
    classPosition: number;
    fuelUsed: number;          // liters this lap
    fuelRemaining: number;
    tireWear: { fl: number; fr: number; rl: number; rr: number };
    gapToLeader: number;
    gapToCarAhead: number;
    gapFromCarBehind: number;
    incidentCount: number;     // cumulative
    onPitRoad: boolean;
    timestamp: number;
}

export interface StintRecord {
    stintNumber: number;
    startLap: number;
    endLap: number | null;     // null = still active
    lapTimes: number[];
    avgPace: number;
    bestLap: number;
    worstLap: number;
    fuelUsedTotal: number;
    fuelPerLap: number;
    tireWearStart: { fl: number; fr: number; rl: number; rr: number };
    tireWearEnd: { fl: number; fr: number; rl: number; rr: number };
    tireDegradationPerLap: number;  // avg wear loss per lap
    positionsGained: number;
    incidentsInStint: number;
}

export interface IncidentEvent {
    lap: number;
    cumulativeCount: number;
    newIncidents: number;
    timestamp: number;
    recentPaceDelta: number;   // pace change after incident
}

export interface PostSessionSummary {
    avgPace: number;
    bestLap: number;
    consistency: number;
    incidentRate: number;
    incidentClustering: boolean;
    mentalFatigue: string;
    positionsGained: number;
    overtakeSuccessRate: number;
    avgFuelPerLap: number;
    avgTireDegPerLap: number;
    stintCount: number;
    totalLaps: number;
    sessionMinutes: number;
    paceTrend: string;
}

export interface GapTrend {
    lap: number;
    gapAhead: number;
    gapBehind: number;
    gapToLeader: number;
}

export interface SessionIntelligence {
    // Pace
    overallAvgPace: number;
    recentAvgPace: number;         // last 5 laps
    bestLap: number;
    paceTrend: 'improving' | 'stable' | 'degrading' | 'erratic';
    paceStdDev: number;
    consistencyRating: number;     // 0-100

    // Fuel
    actualFuelPerLap: number;
    projectedFuelLaps: number;
    fuelToFinish: boolean;         // can they make it?
    optimalPitLap: number | null;

    // Tires
    currentTireLife: { fl: number; fr: number; rl: number; rr: number };
    tireDegRate: number;           // avg per lap this stint
    estimatedTireLapsLeft: number;
    tireCliff: boolean;            // approaching performance cliff?

    // Gaps & Position
    currentPosition: number;
    positionsGainedTotal: number;
    gapAheadTrend: 'closing' | 'stable' | 'opening';
    gapBehindTrend: 'closing' | 'stable' | 'opening';
    gapAhead: number;
    gapBehind: number;
    overtakeOpportunity: boolean;
    underThreat: boolean;

    // Racecraft
    overtakeAttempts: number;
    overtakeSuccesses: number;
    positionsLostToIncidents: number;

    // Incidents & Mental
    totalIncidents: number;
    incidentRate: number;          // per lap
    incidentClustering: boolean;   // multiple incidents close together
    paceAfterIncident: 'recovered' | 'degraded' | 'unknown';
    mentalFatigue: 'fresh' | 'normal' | 'fatigued' | 'tilted';

    // Stints
    currentStintNumber: number;
    currentStintLaps: number;
    stints: StintRecord[];

    // Strategy
    pitStops: number;
    recommendedAction: string;     // one-liner for the engineer

    // Raw data for deep queries
    lapCount: number;
    sessionDurationMinutes: number;
}

// ============================================================================
// ANALYZER
// ============================================================================

export class LiveSessionAnalyzer {
    private laps: LapRecord[] = [];
    private stints: StintRecord[] = [];
    private incidents: IncidentEvent[] = [];
    private gapHistory: GapTrend[] = [];

    private startTime: number = Date.now();
    private startPosition: number = 0;
    private lastLapNumber: number = -1;
    private lastIncidentCount: number = 0;
    private lastFuelLevel: number = 0;
    private lastPosition: number = 0;
    private wasOnPitRoad: boolean = false;
    private currentStintStart: number = 1;
    private currentStintIncidents: number = 0;
    private currentStintStartPosition: number = 0;

    // Overtake tracking
    private overtakeAttempts: number = 0;
    private overtakeSuccesses: number = 0;
    private positionsLostToIncidents: number = 0;

    // ========================================================================
    // PUBLIC API — Called by TelemetryHandler on every strategy_raw (1Hz)
    // ========================================================================

    /**
     * Feed a telemetry snapshot. Call this every ~1 second.
     * The analyzer detects lap completions and accumulates data.
     */
    ingestTelemetry(data: {
        lap: number;
        lastLapTime: number;
        bestLapTime: number;
        position: number;
        classPosition: number;
        fuelLevel: number;
        fuelPerLap: number | null;
        tireWear: { fl: number; fr: number; rl: number; rr: number };
        gapToLeader: number;
        gapToCarAhead: number;
        gapFromCarBehind: number;
        incidentCount: number;
        onPitRoad: boolean;
        damageAero: number;
        damageEngine: number;
    }): void {
        // Initialize on first call
        if (this.startPosition === 0 && data.position > 0) {
            this.startPosition = data.position;
            this.currentStintStartPosition = data.position;
            this.lastFuelLevel = data.fuelLevel;
            this.lastPosition = data.position;
        }

        // Detect new lap completion
        if (data.lap > this.lastLapNumber && this.lastLapNumber >= 0 && data.lastLapTime > 0) {
            this.recordLap(data);
        }

        // Detect incidents
        if (data.incidentCount > this.lastIncidentCount) {
            const newInc = data.incidentCount - this.lastIncidentCount;
            this.recordIncident(data.lap, data.incidentCount, newInc);

            // Check if position was lost around the incident
            if (data.position > this.lastPosition) {
                this.positionsLostToIncidents += (data.position - this.lastPosition);
            }
        }

        // Detect pit entry/exit
        if (data.onPitRoad && !this.wasOnPitRoad) {
            // Pit entry — close current stint
            this.closeStint(data.lap, data.tireWear, data.position);
        }
        if (!data.onPitRoad && this.wasOnPitRoad) {
            // Pit exit — start new stint
            this.startNewStint(data.lap, data.tireWear, data.position);
        }

        // Detect overtakes / position changes
        if (data.position < this.lastPosition && !data.onPitRoad) {
            this.overtakeAttempts++;
            this.overtakeSuccesses++;
        } else if (data.position > this.lastPosition && !data.onPitRoad) {
            // Lost position — could be failed defense or incident
            this.overtakeAttempts++;
        }

        // Track gap history (every lap)
        if (data.lap > this.lastLapNumber) {
            this.gapHistory.push({
                lap: data.lap,
                gapAhead: data.gapToCarAhead,
                gapBehind: data.gapFromCarBehind,
                gapToLeader: data.gapToLeader,
            });
        }

        this.lastLapNumber = data.lap;
        this.lastIncidentCount = data.incidentCount;
        this.lastFuelLevel = data.fuelLevel;
        this.lastPosition = data.position;
        this.wasOnPitRoad = data.onPitRoad;
    }

    /**
     * Get the full intelligence picture for crew-chat context.
     * This is what makes the engineer/spotter/analyst smart.
     */
    getIntelligence(currentTelemetry: {
        fuelLevel: number;
        fuelPerLap: number | null;
        tireWear: { fl: number; fr: number; rl: number; rr: number };
        position: number;
        gapToCarAhead: number;
        gapFromCarBehind: number;
        gapToLeader: number;
        totalLaps?: number;
    }): SessionIntelligence {
        const lapTimes = this.laps.filter(l => !l.onPitRoad && l.lapTime > 0).map(l => l.lapTime);
        const recentLaps = lapTimes.slice(-5);
        const allLaps = lapTimes.length;

        // Pace metrics
        const overallAvg = allLaps > 0 ? lapTimes.reduce((a, b) => a + b, 0) / allLaps : 0;
        const recentAvg = recentLaps.length > 0 ? recentLaps.reduce((a, b) => a + b, 0) / recentLaps.length : 0;
        const bestLap = allLaps > 0 ? Math.min(...lapTimes) : 0;
        const stdDev = this.computeStdDev(lapTimes);
        const consistencyRating = allLaps > 2 ? Math.max(0, Math.min(100, 100 - (stdDev / overallAvg) * 500)) : 50;

        // Pace trend
        const paceTrend = this.computePaceTrend(lapTimes);

        // Fuel projections
        const actualFuelPerLap = this.computeActualFuelPerLap();
        const projectedFuelLaps = actualFuelPerLap > 0 ? currentTelemetry.fuelLevel / actualFuelPerLap : 99;
        const fuelToFinish = currentTelemetry.totalLaps
            ? projectedFuelLaps >= (currentTelemetry.totalLaps - (this.lastLapNumber || 0))
            : true;

        // Tire analysis
        const tireDegRate = this.computeTireDegRate();
        const minWear = Math.min(
            currentTelemetry.tireWear.fl,
            currentTelemetry.tireWear.fr,
            currentTelemetry.tireWear.rl,
            currentTelemetry.tireWear.rr
        );
        const estimatedTireLapsLeft = tireDegRate > 0 ? Math.floor((minWear - 0.15) / tireDegRate) : 99;
        const tireCliff = minWear < 0.25 || (tireDegRate > 0.03 && minWear < 0.4);

        // Optimal pit window
        const optimalPitLap = this.computeOptimalPitLap(
            currentTelemetry.fuelLevel,
            actualFuelPerLap,
            estimatedTireLapsLeft,
            currentTelemetry.totalLaps
        );

        // Gap trends
        const gapAheadTrend = this.computeGapTrend('ahead');
        const gapBehindTrend = this.computeGapTrend('behind');
        const overtakeOpportunity = currentTelemetry.gapToCarAhead < 1.5 && gapAheadTrend === 'closing';
        const underThreat = currentTelemetry.gapFromCarBehind < 1.5 && gapBehindTrend === 'closing';

        // Incident analysis
        const totalIncidents = this.lastIncidentCount;
        const incidentRate = allLaps > 0 ? totalIncidents / allLaps : 0;
        const incidentClustering = this.detectIncidentClustering();
        const paceAfterIncident = this.analyzePaceAfterIncidents();

        // Mental state inference
        const mentalFatigue = this.inferMentalState(
            incidentRate,
            incidentClustering,
            paceTrend,
            (Date.now() - this.startTime) / 60000
        );

        // Current stint info
        const currentStintLaps = this.lastLapNumber - this.currentStintStart + 1;

        // Strategy recommendation
        const recommendedAction = this.generateRecommendation({
            fuelLaps: projectedFuelLaps,
            tireLapsLeft: estimatedTireLapsLeft,
            tireCliff,
            gapAhead: currentTelemetry.gapToCarAhead,
            gapBehind: currentTelemetry.gapFromCarBehind,
            gapAheadTrend,
            gapBehindTrend,
            mentalFatigue,
            incidentClustering,
            position: currentTelemetry.position,
        });

        return {
            overallAvgPace: Math.round(overallAvg * 1000) / 1000,
            recentAvgPace: Math.round(recentAvg * 1000) / 1000,
            bestLap: Math.round(bestLap * 1000) / 1000,
            paceTrend,
            paceStdDev: Math.round(stdDev * 1000) / 1000,
            consistencyRating: Math.round(consistencyRating),

            actualFuelPerLap: Math.round(actualFuelPerLap * 1000) / 1000,
            projectedFuelLaps: Math.round(projectedFuelLaps * 10) / 10,
            fuelToFinish,
            optimalPitLap,

            currentTireLife: currentTelemetry.tireWear,
            tireDegRate: Math.round(tireDegRate * 10000) / 10000,
            estimatedTireLapsLeft,
            tireCliff,

            currentPosition: currentTelemetry.position,
            positionsGainedTotal: this.startPosition - currentTelemetry.position,
            gapAheadTrend,
            gapBehindTrend,
            gapAhead: currentTelemetry.gapToCarAhead,
            gapBehind: currentTelemetry.gapFromCarBehind,
            overtakeOpportunity,
            underThreat,

            overtakeAttempts: this.overtakeAttempts,
            overtakeSuccesses: this.overtakeSuccesses,
            positionsLostToIncidents: this.positionsLostToIncidents,

            totalIncidents,
            incidentRate: Math.round(incidentRate * 100) / 100,
            incidentClustering,
            paceAfterIncident,
            mentalFatigue,

            currentStintNumber: this.stints.length + 1,
            currentStintLaps,
            stints: this.stints,

            pitStops: this.stints.length,
            recommendedAction,

            lapCount: allLaps,
            sessionDurationMinutes: Math.round((Date.now() - this.startTime) / 60000),
        };
    }

    /**
     * Build a formatted text block for injection into crew-chat AI context.
     */
    buildContextForAI(currentTelemetry: {
        fuelLevel: number;
        fuelPerLap: number | null;
        tireWear: { fl: number; fr: number; rl: number; rr: number };
        position: number;
        gapToCarAhead: number;
        gapFromCarBehind: number;
        gapToLeader: number;
        totalLaps?: number;
    }): string {
        if (this.laps.length < 2) return '';

        const intel = this.getIntelligence(currentTelemetry);
        const lines: string[] = [
            '\n=== LIVE RACE ANALYSIS (accumulated during this session) ===',
        ];

        // Pace
        lines.push(`\nPACE ANALYSIS (${intel.lapCount} laps completed):`);
        lines.push(`  Overall avg: ${this.fmtTime(intel.overallAvgPace)} | Recent 5-lap avg: ${this.fmtTime(intel.recentAvgPace)} | Best: ${this.fmtTime(intel.bestLap)}`);
        lines.push(`  Trend: ${intel.paceTrend.toUpperCase()} | Consistency: ${intel.consistencyRating}/100 (std dev: ${intel.paceStdDev.toFixed(3)}s)`);

        // Fuel
        lines.push(`\nFUEL ANALYSIS:`);
        lines.push(`  Actual burn rate: ${intel.actualFuelPerLap.toFixed(3)} L/lap | Projected laps remaining: ${intel.projectedFuelLaps.toFixed(1)}`);
        lines.push(`  Can finish without stop: ${intel.fuelToFinish ? 'YES' : 'NO — PIT REQUIRED'}`);
        if (intel.optimalPitLap) {
            lines.push(`  Optimal pit window: Lap ${intel.optimalPitLap}`);
        }

        // Tires
        lines.push(`\nTIRE ANALYSIS:`);
        lines.push(`  Current life: FL ${(intel.currentTireLife.fl * 100).toFixed(0)}% | FR ${(intel.currentTireLife.fr * 100).toFixed(0)}% | RL ${(intel.currentTireLife.rl * 100).toFixed(0)}% | RR ${(intel.currentTireLife.rr * 100).toFixed(0)}%`);
        lines.push(`  Degradation rate: ${(intel.tireDegRate * 100).toFixed(2)}% per lap | Est. laps left: ${intel.estimatedTireLapsLeft}`);
        if (intel.tireCliff) {
            lines.push(`  ⚠️ APPROACHING TIRE CLIFF — performance will drop sharply soon`);
        }

        // Position & Gaps
        lines.push(`\nPOSITION & GAPS:`);
        lines.push(`  P${intel.currentPosition} | Gained ${intel.positionsGainedTotal >= 0 ? '+' : ''}${intel.positionsGainedTotal} positions since start`);
        lines.push(`  Gap ahead: ${intel.gapAhead.toFixed(1)}s (${intel.gapAheadTrend}) | Gap behind: ${intel.gapBehind.toFixed(1)}s (${intel.gapBehindTrend})`);
        if (intel.overtakeOpportunity) {
            lines.push(`  🟢 OVERTAKE OPPORTUNITY — gap closing, within striking distance`);
        }
        if (intel.underThreat) {
            lines.push(`  🔴 UNDER THREAT — car behind is closing`);
        }

        // Racecraft
        lines.push(`\nRACECRAFT:`);
        lines.push(`  Overtake attempts: ${intel.overtakeAttempts} | Successes: ${intel.overtakeSuccesses} | Positions lost to incidents: ${intel.positionsLostToIncidents}`);

        // Incidents & Mental
        lines.push(`\nINCIDENTS & MENTAL STATE:`);
        lines.push(`  Total incidents: ${intel.totalIncidents} (${intel.incidentRate.toFixed(2)} per lap)`);
        if (intel.incidentClustering) {
            lines.push(`  ⚠️ INCIDENT CLUSTERING detected — multiple incidents in short span`);
        }
        lines.push(`  Pace after incidents: ${intel.paceAfterIncident}`);
        lines.push(`  Mental state: ${intel.mentalFatigue.toUpperCase()}`);

        // Stints
        if (intel.stints.length > 0) {
            lines.push(`\nSTINT HISTORY:`);
            for (const stint of intel.stints) {
                lines.push(`  Stint ${stint.stintNumber}: Laps ${stint.startLap}-${stint.endLap || '?'} | Avg: ${this.fmtTime(stint.avgPace)} | Best: ${this.fmtTime(stint.bestLap)} | Fuel/lap: ${stint.fuelPerLap.toFixed(3)}L | Deg: ${(stint.tireDegradationPerLap * 100).toFixed(2)}%/lap | +${stint.positionsGained} pos | ${stint.incidentsInStint}x inc`);
            }
        }

        // Strategy recommendation
        lines.push(`\nSTRATEGY RECOMMENDATION: ${intel.recommendedAction}`);

        return lines.join('\n');
    }

    /**
     * Get a summary for post-session learning.
     */
    getPostSessionSummary(): PostSessionSummary {
        const lapTimes = this.laps.filter(l => !l.onPitRoad && l.lapTime > 0).map(l => l.lapTime);
        const allLaps = lapTimes.length;
        const overallAvg = allLaps > 0 ? lapTimes.reduce((a, b) => a + b, 0) / allLaps : 0;
        const bestLap = allLaps > 0 ? Math.min(...lapTimes) : 0;
        const stdDev = this.computeStdDev(lapTimes);
        const consistency = allLaps > 2 ? Math.max(0, Math.min(100, 100 - (stdDev / overallAvg) * 500)) : 50;

        return {
            avgPace: overallAvg,
            bestLap,
            consistency: Math.round(consistency),
            incidentRate: allLaps > 0 ? this.lastIncidentCount / allLaps : 0,
            incidentClustering: this.detectIncidentClustering(),
            mentalFatigue: this.inferMentalState(
                allLaps > 0 ? this.lastIncidentCount / allLaps : 0,
                this.detectIncidentClustering(),
                this.computePaceTrend(lapTimes),
                (Date.now() - this.startTime) / 60000
            ),
            positionsGained: this.startPosition - this.lastPosition,
            overtakeSuccessRate: this.overtakeAttempts > 0
                ? this.overtakeSuccesses / this.overtakeAttempts
                : 0,
            avgFuelPerLap: this.computeActualFuelPerLap(),
            avgTireDegPerLap: this.computeTireDegRate(),
            stintCount: this.stints.length + 1,
            totalLaps: allLaps,
            sessionMinutes: Math.round((Date.now() - this.startTime) / 60000),
            paceTrend: this.computePaceTrend(lapTimes),
        };
    }

    // ========================================================================
    // PRIVATE — Lap Recording
    // ========================================================================

    private recordLap(data: {
        lap: number;
        lastLapTime: number;
        position: number;
        classPosition: number;
        fuelLevel: number;
        tireWear: { fl: number; fr: number; rl: number; rr: number };
        gapToLeader: number;
        gapToCarAhead: number;
        gapFromCarBehind: number;
        incidentCount: number;
        onPitRoad: boolean;
    }): void {
        const fuelUsed = Math.max(0, this.lastFuelLevel - data.fuelLevel);

        this.laps.push({
            lapNumber: data.lap - 1, // the completed lap
            lapTime: data.lastLapTime,
            position: data.position,
            classPosition: data.classPosition,
            fuelUsed,
            fuelRemaining: data.fuelLevel,
            tireWear: { ...data.tireWear },
            gapToLeader: data.gapToLeader,
            gapToCarAhead: data.gapToCarAhead,
            gapFromCarBehind: data.gapFromCarBehind,
            incidentCount: data.incidentCount,
            onPitRoad: data.onPitRoad,
            timestamp: Date.now(),
        });

        this.lastFuelLevel = data.fuelLevel;
    }

    private recordIncident(lap: number, cumulative: number, newInc: number): void {
        // Compute pace delta: compare recent 3 laps before vs after
        const recentBefore = this.laps.slice(-3).filter(l => !l.onPitRoad && l.lapTime > 0);
        const avgBefore = recentBefore.length > 0
            ? recentBefore.reduce((a, b) => a + b.lapTime, 0) / recentBefore.length
            : 0;

        this.incidents.push({
            lap,
            cumulativeCount: cumulative,
            newIncidents: newInc,
            timestamp: Date.now(),
            recentPaceDelta: avgBefore, // will be compared post-incident later
        });

        this.currentStintIncidents += newInc;
        this.lastIncidentCount = cumulative;
    }

    // ========================================================================
    // PRIVATE — Stint Management
    // ========================================================================

    private closeStint(currentLap: number, tireWear: { fl: number; fr: number; rl: number; rr: number }, position: number): void {
        const stintLaps = this.laps.filter(
            l => l.lapNumber >= this.currentStintStart && !l.onPitRoad && l.lapTime > 0
        );
        if (stintLaps.length === 0) return;

        const lapTimes = stintLaps.map(l => l.lapTime);
        const fuelUsed = stintLaps.reduce((sum, l) => sum + l.fuelUsed, 0);
        const firstLap = stintLaps[0];
        const tireWearStart = firstLap.tireWear;

        // Compute tire degradation
        const startMinWear = Math.min(tireWearStart.fl, tireWearStart.fr, tireWearStart.rl, tireWearStart.rr);
        const endMinWear = Math.min(tireWear.fl, tireWear.fr, tireWear.rl, tireWear.rr);
        const totalDeg = startMinWear - endMinWear;
        const degPerLap = stintLaps.length > 0 ? totalDeg / stintLaps.length : 0;

        this.stints.push({
            stintNumber: this.stints.length + 1,
            startLap: this.currentStintStart,
            endLap: currentLap,
            lapTimes,
            avgPace: lapTimes.reduce((a, b) => a + b, 0) / lapTimes.length,
            bestLap: Math.min(...lapTimes),
            worstLap: Math.max(...lapTimes),
            fuelUsedTotal: fuelUsed,
            fuelPerLap: stintLaps.length > 0 ? fuelUsed / stintLaps.length : 0,
            tireWearStart,
            tireWearEnd: { ...tireWear },
            tireDegradationPerLap: degPerLap,
            positionsGained: this.currentStintStartPosition - position,
            incidentsInStint: this.currentStintIncidents,
        });
    }

    private startNewStint(currentLap: number, _tireWear: { fl: number; fr: number; rl: number; rr: number }, position: number): void {
        this.currentStintStart = currentLap;
        this.currentStintIncidents = 0;
        this.currentStintStartPosition = position;
    }

    // ========================================================================
    // PRIVATE — Computation Helpers
    // ========================================================================

    private computeStdDev(values: number[]): number {
        if (values.length < 2) return 0;
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
        return Math.sqrt(variance);
    }

    private computePaceTrend(lapTimes: number[]): 'improving' | 'stable' | 'degrading' | 'erratic' {
        if (lapTimes.length < 5) return 'stable';

        const recent5 = lapTimes.slice(-5);
        const prev5 = lapTimes.slice(-10, -5);
        if (prev5.length < 3) return 'stable';

        const recentAvg = recent5.reduce((a, b) => a + b, 0) / recent5.length;
        const prevAvg = prev5.reduce((a, b) => a + b, 0) / prev5.length;
        const delta = recentAvg - prevAvg;

        const stdDev = this.computeStdDev(recent5);
        if (stdDev > 1.5) return 'erratic';
        if (delta < -0.3) return 'improving';
        if (delta > 0.3) return 'degrading';
        return 'stable';
    }

    private computeActualFuelPerLap(): number {
        const validLaps = this.laps.filter(l => !l.onPitRoad && l.fuelUsed > 0);
        if (validLaps.length < 2) return 0;
        const totalFuel = validLaps.reduce((sum, l) => sum + l.fuelUsed, 0);
        return totalFuel / validLaps.length;
    }

    private computeTireDegRate(): number {
        // Use current stint data
        const stintLaps = this.laps.filter(
            l => l.lapNumber >= this.currentStintStart && !l.onPitRoad
        );
        if (stintLaps.length < 3) return 0;

        const first = stintLaps[0];
        const last = stintLaps[stintLaps.length - 1];
        const firstMin = Math.min(first.tireWear.fl, first.tireWear.fr, first.tireWear.rl, first.tireWear.rr);
        const lastMin = Math.min(last.tireWear.fl, last.tireWear.fr, last.tireWear.rl, last.tireWear.rr);
        const totalDeg = firstMin - lastMin;
        return totalDeg / stintLaps.length;
    }

    private computeOptimalPitLap(
        fuelLevel: number,
        fuelPerLap: number,
        tireLapsLeft: number,
        totalLaps?: number,
    ): number | null {
        if (!totalLaps || totalLaps <= 0) return null;
        const currentLap = this.lastLapNumber;
        const remainingLaps = totalLaps - currentLap;
        if (remainingLaps <= 0) return null;

        const fuelLapsLeft = fuelPerLap > 0 ? Math.floor(fuelLevel / fuelPerLap) : 999;
        const limitingFactor = Math.min(fuelLapsLeft, tireLapsLeft);

        // If we can finish, no pit needed
        if (limitingFactor >= remainingLaps) return null;

        // Pit at the limiting factor minus a small buffer
        return currentLap + Math.max(1, limitingFactor - 2);
    }

    private computeGapTrend(direction: 'ahead' | 'behind'): 'closing' | 'stable' | 'opening' {
        const recent = this.gapHistory.slice(-5);
        if (recent.length < 3) return 'stable';

        const gaps = direction === 'ahead'
            ? recent.map(g => g.gapAhead)
            : recent.map(g => g.gapBehind);

        // Filter out zeros (no data)
        const valid = gaps.filter(g => g > 0);
        if (valid.length < 3) return 'stable';

        const first = valid[0];
        const last = valid[valid.length - 1];
        const delta = last - first;

        if (delta < -0.3) return 'closing';
        if (delta > 0.3) return 'opening';
        return 'stable';
    }

    private detectIncidentClustering(): boolean {
        if (this.incidents.length < 2) return false;
        const recent = this.incidents.slice(-3);
        if (recent.length < 2) return false;

        // Check if 2+ incidents within 5 laps of each other
        for (let i = 1; i < recent.length; i++) {
            if (recent[i].lap - recent[i - 1].lap <= 5) return true;
        }
        return false;
    }

    private analyzePaceAfterIncidents(): 'recovered' | 'degraded' | 'unknown' {
        if (this.incidents.length === 0 || this.laps.length < 5) return 'unknown';

        const lastIncident = this.incidents[this.incidents.length - 1];
        const lapsAfter = this.laps.filter(
            l => l.lapNumber > lastIncident.lap && !l.onPitRoad && l.lapTime > 0
        );
        const lapsBefore = this.laps.filter(
            l => l.lapNumber <= lastIncident.lap && l.lapNumber > lastIncident.lap - 5 && !l.onPitRoad && l.lapTime > 0
        );

        if (lapsAfter.length < 2 || lapsBefore.length < 2) return 'unknown';

        const avgBefore = lapsBefore.reduce((a, b) => a + b.lapTime, 0) / lapsBefore.length;
        const avgAfter = lapsAfter.slice(0, 3).reduce((a, b) => a + b.lapTime, 0) / Math.min(3, lapsAfter.length);

        if (avgAfter <= avgBefore + 0.3) return 'recovered';
        return 'degraded';
    }

    private inferMentalState(
        incidentRate: number,
        clustering: boolean,
        paceTrend: string,
        sessionMinutes: number,
    ): 'fresh' | 'normal' | 'fatigued' | 'tilted' {
        // Tilted: high incident rate + clustering + degrading pace
        if (clustering && incidentRate > 0.5 && paceTrend === 'degrading') return 'tilted';
        if (clustering && incidentRate > 0.3) return 'tilted';

        // Fatigued: long session + degrading pace
        if (sessionMinutes > 60 && paceTrend === 'degrading') return 'fatigued';
        if (sessionMinutes > 90) return 'fatigued';

        // Fresh: early in session, good pace
        if (sessionMinutes < 15 && incidentRate < 0.2) return 'fresh';

        return 'normal';
    }

    private generateRecommendation(ctx: {
        fuelLaps: number;
        tireLapsLeft: number;
        tireCliff: boolean;
        gapAhead: number;
        gapBehind: number;
        gapAheadTrend: string;
        gapBehindTrend: string;
        mentalFatigue: string;
        incidentClustering: boolean;
        position: number;
    }): string {
        // Critical: fuel or tires about to run out
        if (ctx.fuelLaps < 3) return 'BOX THIS LAP — fuel critical.';
        if (ctx.tireCliff) return 'Consider pitting soon — tires approaching performance cliff.';

        // Tilted: suggest composure
        if (ctx.mentalFatigue === 'tilted') return 'Take a breath. Focus on clean laps. The pace will come back.';
        if (ctx.incidentClustering) return 'Multiple incidents recently — back off 2 tenths and find rhythm.';

        // Opportunity
        if (ctx.gapAheadTrend === 'closing' && ctx.gapAhead < 2.0) {
            return `Gap to P${ctx.position - 1} closing — ${ctx.gapAhead.toFixed(1)}s. Push for the next 3 laps.`;
        }

        // Threat
        if (ctx.gapBehindTrend === 'closing' && ctx.gapBehind < 2.0) {
            return `Car behind closing — ${ctx.gapBehind.toFixed(1)}s. Defend the inside on braking zones.`;
        }

        // Fuel management
        if (ctx.fuelLaps < 8) return `Fuel for ${ctx.fuelLaps.toFixed(0)} laps. Start thinking about pit window.`;

        // Default
        return 'Maintain pace. Clean laps. No action needed.';
    }

    private fmtTime(seconds: number): string {
        if (!seconds || seconds <= 0) return '—';
        const mins = Math.floor(seconds / 60);
        const secs = (seconds % 60).toFixed(3);
        return mins > 0 ? `${mins}:${secs.padStart(6, '0')}` : `${secs}s`;
    }
}

// ============================================================================
// SESSION REGISTRY — one analyzer per active session
// ============================================================================

const analyzers: Map<string, LiveSessionAnalyzer> = new Map();

export function getOrCreateAnalyzer(sessionId: string): LiveSessionAnalyzer {
    let analyzer = analyzers.get(sessionId);
    if (!analyzer) {
        analyzer = new LiveSessionAnalyzer();
        analyzers.set(sessionId, analyzer);
        console.log(`[LiveSessionAnalyzer] Created analyzer for session: ${sessionId}`);
    }
    return analyzer;
}

export function getAnalyzer(sessionId: string): LiveSessionAnalyzer | undefined {
    return analyzers.get(sessionId);
}

export function destroyAnalyzer(sessionId: string): void {
    analyzers.delete(sessionId);
    console.log(`[LiveSessionAnalyzer] Destroyed analyzer for session: ${sessionId}`);
}
