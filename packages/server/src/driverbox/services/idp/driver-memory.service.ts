/**
 * Driver Memory Service
 * Analyzes session data to build and update driver memory, behaviors, opinions, and identity
 */

import {
    getDriverMemory,
    updateDriverMemory,
    recalculateMemoryStats,
    createSessionBehavior,
    getRecentBehaviorsForAggregation,
    createEngineerOpinion,
    deleteAllOpinionsForDriver,
    getDriverIdentity,
    updateDriverIdentity,
    DriverMemory,
    DriverSessionBehavior,
    EngineerOpinion,
    DriverIdentity,
} from '../../../db/repositories/driver-memory.repo.js';
import { getMetricsForDriver } from '../../../db/repositories/session-metrics.repo.js';
import { getGlobalAggregate } from '../../../db/repositories/driver-aggregates.repo.js';
import { pool } from '../../../db/client.js';

// ========================
// Types
// ========================

interface SessionAnalysisInput {
    sessionId: string;
    driverProfileId: string;
    sessionType: 'practice' | 'qualifying' | 'race';
    trackName: string;
    carName: string;
    laps: number;
    incidents: number;
    startPosition?: number;
    finishPosition?: number;
    bestLapTime?: number;
    avgLapTime?: number;
    lapTimeVariance?: number;
    positionsGained?: number;
    overtakesAttempted?: number;
    overtakesCompleted?: number;
}

// ========================
// Session Behavior Analysis
// ========================

export async function analyzeSessionBehavior(input: SessionAnalysisInput): Promise<DriverSessionBehavior> {
    const {
        sessionId,
        driverProfileId,
        sessionType,
        trackName,
        carName,
        laps,
        incidents,
        finishPosition,
        lapTimeVariance,
        positionsGained,
        overtakesAttempted,
        overtakesCompleted,
    } = input;

    // Calculate incidents per lap (normalized safety score)
    const incidentsPerLap = laps > 0 ? incidents / laps : 0;
    
    // Safety/consistency score: 1.0 = perfect, lower = more incidents
    // 0 incidents = 1.0, 1 incident per 10 laps = 0.9, etc.
    const safetyScore = Math.max(0, Math.min(1, 1 - (incidentsPerLap * 10)));
    
    // Use safety score as proxy for brake/throttle consistency (clean driving = good control)
    const brakeConsistencyScore = safetyScore;
    const throttleApplicationScore = safetyScore;

    // Determine race performance trend based on positions gained/lost
    let lapTimeVarianceTrend: 'improving' | 'degrading' | 'stable' | 'erratic' | null = null;
    if (positionsGained !== undefined) {
        if (positionsGained > 3) lapTimeVarianceTrend = 'improving';
        else if (positionsGained > 0) lapTimeVarianceTrend = 'stable';
        else if (positionsGained > -3) lapTimeVarianceTrend = 'stable';
        else lapTimeVarianceTrend = 'degrading';
    } else if (lapTimeVariance !== undefined) {
        if (lapTimeVariance < 0.5) lapTimeVarianceTrend = 'stable';
        else if (lapTimeVariance < 1.5) lapTimeVarianceTrend = 'improving';
        else if (lapTimeVariance < 3) lapTimeVarianceTrend = 'degrading';
        else lapTimeVarianceTrend = 'erratic';
    }

    // Incident clustering: multiple incidents in a single race suggests tilt/frustration
    const incidentClustering = incidents >= 4;

    // Positions lost to mistakes
    const positionsLostToMistakes = incidents > 0 && positionsGained !== undefined && positionsGained < 0
        ? Math.min(Math.abs(positionsGained), incidents * 2) // Cap at 2 positions per incident
        : 0;

    // Confidence estimation based on race performance
    let estimatedConfidence = 0.5;
    
    // Clean racing boosts confidence
    if (incidents === 0) estimatedConfidence += 0.25;
    else if (incidents <= 2) estimatedConfidence += 0.1;
    else if (incidents >= 4) estimatedConfidence -= 0.15;
    
    // Gaining positions boosts confidence
    if (positionsGained !== undefined) {
        if (positionsGained >= 5) estimatedConfidence += 0.2;
        else if (positionsGained > 0) estimatedConfidence += 0.1;
        else if (positionsGained < -5) estimatedConfidence -= 0.15;
    }
    
    // Good finish position boosts confidence
    if (finishPosition !== undefined) {
        if (finishPosition === 1) estimatedConfidence += 0.2;
        else if (finishPosition <= 3) estimatedConfidence += 0.15;
        else if (finishPosition <= 5) estimatedConfidence += 0.1;
        else if (finishPosition <= 10) estimatedConfidence += 0.05;
    }
    
    estimatedConfidence = Math.max(0.1, Math.min(1, estimatedConfidence));

    // Confidence trajectory based on overall session quality
    let confidenceTrajectory: 'rising' | 'falling' | 'stable' = 'stable';
    const sessionQuality = (incidents === 0 ? 1 : 0) + (positionsGained && positionsGained > 0 ? 1 : 0) + (finishPosition && finishPosition <= 5 ? 1 : 0);
    if (sessionQuality >= 2) confidenceTrajectory = 'rising';
    else if (incidents >= 4 || (positionsGained && positionsGained < -5)) confidenceTrajectory = 'falling';

    const behavior = await createSessionBehavior({
        session_id: sessionId,
        driver_profile_id: driverProfileId,
        session_type: sessionType,
        track_name: trackName,
        car_name: carName,
        avg_brake_point_delta_m: null, // Would need telemetry data
        brake_consistency_score: brakeConsistencyScore,
        throttle_application_score: throttleApplicationScore,
        corner_entry_aggression: null, // Would need telemetry data
        corner_exit_quality: null, // Would need telemetry data
        lap_time_variance_trend: lapTimeVarianceTrend,
        incident_clustering: incidentClustering,
        post_incident_pace_delta: null, // Would need lap-by-lap data
        late_session_pace_delta: null, // Would need lap-by-lap data
        overtakes_attempted: overtakesAttempted ?? null,
        overtakes_completed: overtakesCompleted ?? null,
        positions_lost_to_mistakes: positionsLostToMistakes,
        defensive_incidents: null,
        estimated_confidence: estimatedConfidence,
        confidence_trajectory: confidenceTrajectory,
    });

    // Stats are now recalculated at the end of backfill, not incremented per-session

    return behavior;
}

// ========================
// Memory Aggregation
// ========================

export async function aggregateMemoryFromBehaviors(driverProfileId: string, userId?: string): Promise<DriverMemory | null> {
    const memory = await getDriverMemory(driverProfileId);
    if (!memory) {
        console.log(`[DriverMemory] No memory record found for driver ${driverProfileId}`);
        return null;
    }

    // Get the user ID to query race results directly (use passed userId or look it up)
    let resolvedUserId = userId;
    if (!resolvedUserId) {
        const profileResult = await pool.query(
            `SELECT admin_user_id FROM driver_profiles WHERE id = $1`,
            [driverProfileId]
        );
        resolvedUserId = profileResult.rows[0]?.admin_user_id;
    }
    if (!resolvedUserId) {
        console.log(`[DriverMemory] No user ID found for profile ${driverProfileId}`);
        return memory;
    }
    console.log(`[DriverMemory] Aggregating for profile ${driverProfileId}, userId ${resolvedUserId}`);

    // Query actual race data for comprehensive analysis
    // Include fallback for races where session_type might not be set but event_type is 'race'
    const racesResult = await pool.query(
        `SELECT * FROM iracing_race_results 
         WHERE admin_user_id = $1 
           AND (
               session_type = 'official_race' 
               OR session_type = 'unofficial_race'
               OR (session_type IS NULL AND LOWER(event_type) = 'race')
           )
         ORDER BY session_start_time DESC
         LIMIT 100`,
        [resolvedUserId]
    );
    const races = racesResult.rows;
    console.log(`[DriverMemory] Aggregating from ${races.length} races for driver ${driverProfileId}`);

    if (races.length === 0) {
        console.log(`[DriverMemory] No races found, keeping existing memory`);
        return memory;
    }

    // ========== INCIDENT ANALYSIS ==========
    const totalIncidents = races.reduce((sum, r) => sum + (r.incidents || 0), 0);
    const totalLaps = races.reduce((sum, r) => sum + (r.laps_complete || 0), 0);
    const avgIncidentsPerRace = totalIncidents / races.length;
    const incidentsPerLap = totalLaps > 0 ? totalIncidents / totalLaps : 0;
    
    // Clean racing score: 0 = always incidents, 1 = always clean
    const cleanRaces = races.filter(r => (r.incidents || 0) === 0).length;
    const cleanRaceRatio = cleanRaces / races.length;
    
    // Incident proneness: lower = more prone to incidents (inverted for UI)
    // Scale: 0.25 = very incident prone, 0.75 = very clean
    const incidentProneness = Math.max(0.1, Math.min(0.9, 0.5 + (cleanRaceRatio - 0.3) * 1.5));

    // ========== POSITION ANALYSIS ==========
    const positionChanges = races
        .filter(r => r.start_position != null && r.finish_position != null)
        .map(r => r.start_position - r.finish_position); // positive = gained positions
    
    const avgPositionsGained = positionChanges.length > 0
        ? positionChanges.reduce((a, b) => a + b, 0) / positionChanges.length
        : 0;

    // ========== DRIVING STYLE DERIVATION ==========
    // Since we don't have telemetry, derive style from race patterns
    
    // Braking style: derived from incident patterns and position changes
    // High incidents + losing positions = late/aggressive braking
    // Clean + gaining positions = controlled braking
    let brakingStyle: 'early' | 'late' | 'trail' | 'threshold' | 'unknown' = 'trail';
    if (cleanRaceRatio > 0.6 && avgPositionsGained > 1) {
        brakingStyle = 'threshold'; // Clean and fast = good brake control
    } else if (cleanRaceRatio > 0.4) {
        brakingStyle = 'trail'; // Moderate = trail braking
    } else if (avgIncidentsPerRace > 3) {
        brakingStyle = 'late'; // High incidents = braking too late
    } else {
        brakingStyle = 'early'; // Cautious approach
    }

    // Braking consistency: based on clean race ratio
    const brakingConsistency = Math.max(0.3, Math.min(0.95, cleanRaceRatio + 0.2));

    // Throttle style: derived from position gains and incidents
    let throttleStyle: 'aggressive' | 'smooth' | 'hesitant' | 'unknown' = 'smooth';
    if (avgPositionsGained > 2 && cleanRaceRatio > 0.4) {
        throttleStyle = 'aggressive'; // Gaining positions cleanly = aggressive but controlled
    } else if (cleanRaceRatio > 0.5) {
        throttleStyle = 'smooth'; // Clean racing = smooth inputs
    } else if (avgPositionsGained < -1) {
        throttleStyle = 'hesitant'; // Losing positions = hesitant
    }

    // Traction management: proxy from incidents per lap
    const tractionManagement = Math.max(0.3, Math.min(0.95, 1 - (incidentsPerLap * 5)));

    // Corner entry style
    let cornerEntryStyle: 'aggressive' | 'conservative' | 'variable' = 'variable';
    if (avgPositionsGained > 1.5 && avgIncidentsPerRace < 2) {
        cornerEntryStyle = 'aggressive'; // Gaining positions with few incidents
    } else if (cleanRaceRatio > 0.6) {
        cornerEntryStyle = 'conservative'; // Very clean = conservative
    }

    // Overtaking style
    let overtakingStyle: 'aggressive' | 'patient' | 'opportunistic' = 'opportunistic';
    if (avgPositionsGained > 3) {
        overtakingStyle = 'aggressive'; // Big position gains
    } else if (cleanRaceRatio > 0.7 && avgPositionsGained >= 0) {
        overtakingStyle = 'patient'; // Clean and holding/gaining
    }

    // ========== CONFIDENCE ANALYSIS ==========
    // Recent performance trend
    const recent10 = races.slice(0, 10);
    const older10 = races.slice(10, 20);
    
    const recentCleanRatio = recent10.length > 0 
        ? recent10.filter(r => (r.incidents || 0) === 0).length / recent10.length 
        : 0.5;
    const olderCleanRatio = older10.length > 0 
        ? older10.filter(r => (r.incidents || 0) === 0).length / older10.length 
        : 0.5;
    
    // Confidence based on recent clean racing and position gains
    const currentConfidence = Math.max(0.2, Math.min(0.95, 
        0.5 + (recentCleanRatio - 0.3) * 0.5 + (avgPositionsGained > 0 ? 0.1 : -0.05)
    ));

    // Confidence trend
    let confidenceTrend: 'rising' | 'falling' | 'stable' | 'volatile' = 'stable';
    if (recent10.length >= 5 && older10.length >= 5) {
        const diff = recentCleanRatio - olderCleanRatio;
        if (diff > 0.15) confidenceTrend = 'rising';
        else if (diff < -0.15) confidenceTrend = 'falling';
    }

    // ========== TILT RISK ANALYSIS ==========
    // Look for patterns of multiple high-incident races in a row
    let consecutiveHighIncident = 0;
    let maxConsecutive = 0;
    for (const race of races.slice(0, 20)) {
        if ((race.incidents || 0) >= 4) {
            consecutiveHighIncident++;
            maxConsecutive = Math.max(maxConsecutive, consecutiveHighIncident);
        } else {
            consecutiveHighIncident = 0;
        }
    }
    // Tilt risk: 0 = low risk, 1 = high risk
    const postIncidentTiltRisk = Math.min(0.9, maxConsecutive * 0.2);

    // ========== ENDURANCE ANALYSIS ==========
    // Analyze longer races vs shorter races
    const longRaces = races.filter(r => (r.laps_complete || 0) >= 30);
    const shortRaces = races.filter(r => (r.laps_complete || 0) < 30 && (r.laps_complete || 0) > 0);
    
    // Late race degradation: compare incident rate in long vs short races
    let lateRaceDegradation: number | null = null;
    if (longRaces.length >= 5 && shortRaces.length >= 5) {
        const longIncidentRate = longRaces.reduce((s, r) => s + (r.incidents || 0), 0) / longRaces.length;
        const shortIncidentRate = shortRaces.reduce((s, r) => s + (r.incidents || 0), 0) / shortRaces.length;
        // If long races have more incidents per race, there's degradation
        lateRaceDegradation = Math.max(0, Math.min(1, (longIncidentRate - shortIncidentRate) / 3));
    }

    // Session length sweet spot: find the lap count range with best performance
    const lapBuckets: Record<string, { clean: number; total: number }> = {
        'short': { clean: 0, total: 0 },   // < 15 laps
        'medium': { clean: 0, total: 0 },  // 15-30 laps
        'long': { clean: 0, total: 0 },    // > 30 laps
    };
    for (const race of races) {
        const laps = race.laps_complete || 0;
        const bucket = laps < 15 ? 'short' : laps < 30 ? 'medium' : 'long';
        lapBuckets[bucket].total++;
        if ((race.incidents || 0) === 0) lapBuckets[bucket].clean++;
    }
    
    let sessionLengthSweetSpot: number | null = null;
    let bestCleanRatio = 0;
    for (const [bucket, data] of Object.entries(lapBuckets)) {
        if (data.total >= 5) {
            const ratio = data.clean / data.total;
            if (ratio > bestCleanRatio) {
                bestCleanRatio = ratio;
                sessionLengthSweetSpot = bucket === 'short' ? 10 : bucket === 'medium' ? 22 : 40;
            }
        }
    }

    // Fatigue onset: estimate based on when incidents tend to happen in longer races
    // This is a rough estimate - would need lap-by-lap data for accuracy
    const fatigueOnsetLap = longRaces.length >= 3 ? Math.round(25 + cleanRaceRatio * 15) : null;

    // Recovery speed: how quickly do they bounce back after a bad race?
    let recoverySpeed: 'fast' | 'moderate' | 'slow' | null = null;
    let postBadRaceClean = 0;
    let postBadRaceTotal = 0;
    for (let i = 1; i < races.length; i++) {
        if ((races[i].incidents || 0) >= 4) { // Previous race was bad
            postBadRaceTotal++;
            if ((races[i - 1].incidents || 0) <= 2) { // Next race was clean
                postBadRaceClean++;
            }
        }
    }
    if (postBadRaceTotal >= 3) {
        const recoveryRatio = postBadRaceClean / postBadRaceTotal;
        recoverySpeed = recoveryRatio > 0.6 ? 'fast' : recoveryRatio > 0.3 ? 'moderate' : 'slow';
    }

    // Memory confidence based on data volume
    const memoryConfidence = Math.min(1, races.length / 50);

    const updates: Partial<DriverMemory> = {
        braking_style: brakingStyle,
        braking_consistency: brakingConsistency,
        throttle_style: throttleStyle,
        traction_management: tractionManagement,
        corner_entry_style: cornerEntryStyle,
        overtaking_style: overtakingStyle,
        incident_proneness: incidentProneness,
        current_confidence: currentConfidence,
        confidence_trend: confidenceTrend,
        post_incident_tilt_risk: postIncidentTiltRisk,
        fatigue_onset_lap: fatigueOnsetLap,
        late_race_degradation: lateRaceDegradation,
        session_length_sweet_spot: sessionLengthSweetSpot,
        recovery_speed: recoverySpeed,
        memory_confidence: memoryConfidence,
    };

    console.log(`[DriverMemory] Updating memory with:`, {
        races: races.length,
        cleanRaceRatio: cleanRaceRatio.toFixed(2),
        avgPositionsGained: avgPositionsGained.toFixed(1),
        braking_style: brakingStyle,
        throttle_style: throttleStyle,
        corner_entry_style: cornerEntryStyle,
        overtaking_style: overtakingStyle,
        incident_proneness: incidentProneness.toFixed(2),
        current_confidence: currentConfidence.toFixed(2),
        confidence_trend: confidenceTrend,
        tilt_risk: postIncidentTiltRisk.toFixed(2),
        recovery_speed: recoverySpeed,
    });
    
    const result = await updateDriverMemory(driverProfileId, updates);
    console.log(`[DriverMemory] Memory updated successfully`);
    return result;
}

// ========================
// Engineer Opinion Generation
// ========================

export async function generateEngineerOpinions(driverProfileId: string, userId?: string): Promise<EngineerOpinion[]> {
    const memory = await getDriverMemory(driverProfileId);

    if (!memory) {
        return [];
    }

    // Delete ALL existing opinions first to prevent duplicates
    const deletedCount = await deleteAllOpinionsForDriver(driverProfileId);
    console.log(`[DriverMemory] Deleted ${deletedCount} existing opinions for driver ${driverProfileId}`);
    
    // Fetch actual race data for evidence
    let races: any[] = [];
    if (userId) {
        const raceResult = await pool.query(
            `SELECT * FROM iracing_race_results 
             WHERE admin_user_id = $1 
             ORDER BY session_start_time DESC
             LIMIT 100`,
            [userId]
        );
        races = raceResult.rows;
    }
    
    const newOpinions: EngineerOpinion[] = [];
    
    // Calculate actual stats from race data
    const totalRaces = races.length;
    const totalIncidents = races.reduce((sum, r) => sum + (r.incidents || 0), 0);
    const avgIncidents = totalRaces > 0 ? totalIncidents / totalRaces : 0;
    const highIncidentRaces = races.filter(r => (r.incidents || 0) >= 4);
    const cleanRaces = races.filter(r => (r.incidents || 0) === 0);
    
    // Find worst tracks
    const trackStats: Record<string, { incidents: number; races: number; trackName: string }> = {};
    for (const race of races) {
        const track = race.track_name || 'Unknown';
        if (!trackStats[track]) {
            trackStats[track] = { incidents: 0, races: 0, trackName: track };
        }
        trackStats[track].incidents += race.incidents || 0;
        trackStats[track].races += 1;
    }
    
    const worstTracks = Object.values(trackStats)
        .filter(t => t.races >= 2)
        .map(t => ({ ...t, avgInc: t.incidents / t.races }))
        .sort((a, b) => b.avgInc - a.avgInc)
        .slice(0, 3);
    
    // Recent races for specific examples
    const recentHighIncident = races.slice(0, 20).filter(r => (r.incidents || 0) >= 4);
    const recentRaceExamples = recentHighIncident.slice(0, 3).map(r => ({
        track: r.track_name,
        incidents: r.incidents,
        date: r.session_start_time ? new Date(r.session_start_time).toLocaleDateString() : 'Unknown',
        position: r.finish_position,
    }));

    // 1. Racecraft/Incident opinion - with REAL data
    if (totalRaces > 0) {
        let sentiment: 'positive' | 'neutral' | 'concern' | 'critical' = 'neutral';
        let summary = '';
        let detail = '';
        let action = '';
        let evidenceSummary = '';
        
        if (avgIncidents <= 2) {
            sentiment = 'positive';
            summary = 'Excellent racecraft. You race clean and avoid incidents consistently.';
            detail = `Across ${totalRaces} races, you average only ${avgIncidents.toFixed(1)} incidents per race. ${cleanRaces.length} of your races (${Math.round(cleanRaces.length/totalRaces*100)}%) were completely clean with 0 incidents. This puts you among the cleanest drivers.`;
            action = 'Keep racing smart. Your clean driving is a major strength.';
            evidenceSummary = `${totalRaces} races analyzed. ${cleanRaces.length} clean races (0 incidents). Average: ${avgIncidents.toFixed(1)} inc/race.`;
        } else if (avgIncidents <= 4) {
            sentiment = 'neutral';
            summary = 'Generally clean racing with occasional incidents.';
            detail = `You average ${avgIncidents.toFixed(1)} incidents per race across ${totalRaces} races. ${highIncidentRaces.length} races had 4+ incidents. Your worst tracks: ${worstTracks.slice(0,2).map(t => `${t.trackName} (${t.avgInc.toFixed(1)} inc/race)`).join(', ')}.`;
            action = 'Stay aware of cars around you, especially in traffic.';
            evidenceSummary = `${totalRaces} races, ${totalIncidents} total incidents. ${highIncidentRaces.length} high-incident races (4+). Worst: ${worstTracks[0]?.trackName || 'N/A'}.`;
        } else {
            sentiment = avgIncidents > 6 ? 'critical' : 'concern';
            summary = avgIncidents > 6 
                ? 'High incident rate is hurting your results and iRating.'
                : 'Incident rate is higher than ideal. Pattern of contact in races.';
            
            // Build specific evidence
            const exampleText = recentRaceExamples.length > 0
                ? `Recent examples: ${recentRaceExamples.map(r => `${r.track} on ${r.date} (${r.incidents} inc, P${r.position})`).join('; ')}.`
                : '';
            
            detail = `You average ${avgIncidents.toFixed(1)} incidents per race across ${totalRaces} races. ${highIncidentRaces.length} of your last 100 races (${Math.round(highIncidentRaces.length/totalRaces*100)}%) had 4+ incidents. ${exampleText} Your worst tracks are: ${worstTracks.map(t => `${t.trackName} (${t.avgInc.toFixed(1)} inc/race over ${t.races} races)`).join(', ')}.`;
            
            action = avgIncidents > 6
                ? 'Focus on finishing races cleanly before worrying about position.'
                : 'Give more space when racing side-by-side. Patience pays off.';
            
            evidenceSummary = `${totalRaces} races, ${totalIncidents} total incidents (${avgIncidents.toFixed(1)}/race). ${highIncidentRaces.length} races with 4+ incidents. Worst track: ${worstTracks[0]?.trackName} at ${worstTracks[0]?.avgInc.toFixed(1)} inc/race.`;
        }

        const opinion = await createEngineerOpinion({
            driver_profile_id: driverProfileId,
            opinion_domain: 'racecraft',
            opinion_context: null,
            opinion_summary: summary,
            opinion_detail: detail,
            opinion_confidence: Math.min(1, totalRaces / 50), // Confidence based on sample size
            opinion_sentiment: sentiment,
            is_actionable: true,
            suggested_action: action,
            priority: sentiment === 'critical' ? 10 : sentiment === 'concern' ? 8 : 5,
            valid_until: null,
            superseded_by: null,
            evidence_sessions: races.slice(0, 5).map(r => r.subsession_id?.toString()).filter(Boolean),
            evidence_summary: evidenceSummary,
        });
        newOpinions.push(opinion);
    }

    // 2. Position/Performance opinion - with REAL data
    if (totalRaces > 0) {
        const racesWithPositions = races.filter(r => r.start_position != null && r.finish_position != null);
        const avgPositionsGained = racesWithPositions.length > 0
            ? racesWithPositions.reduce((sum, r) => sum + (r.start_position - r.finish_position), 0) / racesWithPositions.length
            : 0;
        const avgFinish = racesWithPositions.length > 0
            ? racesWithPositions.reduce((sum, r) => sum + r.finish_position, 0) / racesWithPositions.length
            : 0;
        
        // Find races where they lost the most positions
        const bigLosses = racesWithPositions
            .filter(r => (r.start_position - r.finish_position) < -3)
            .slice(0, 5);
        
        let sentiment: 'positive' | 'neutral' | 'concern' | 'critical' = 'neutral';
        let summary = '';
        let detail = '';
        let action = '';
        let evidenceSummary = '';
        
        if (avgPositionsGained >= 2) {
            sentiment = 'positive';
            summary = 'Strong race pace. You consistently gain positions during races.';
            detail = `You gain an average of ${avgPositionsGained.toFixed(1)} positions per race across ${racesWithPositions.length} races. Your average finish is P${avgFinish.toFixed(1)}. This shows your race pace is stronger than your qualifying pace - you're effective at making passes stick.`;
            action = 'Consider being more aggressive in qualifying to start higher.';
            evidenceSummary = `${racesWithPositions.length} races with position data. Average gain: +${avgPositionsGained.toFixed(1)} positions. Avg finish: P${avgFinish.toFixed(1)}.`;
        } else if (avgPositionsGained >= 0) {
            sentiment = 'neutral';
            summary = 'Consistent race performance. You hold your position well.';
            detail = `You average ${avgPositionsGained >= 0 ? '+' : ''}${avgPositionsGained.toFixed(1)} positions per race. Your average finish is P${avgFinish.toFixed(1)}. You're racing at a consistent level - your qualifying reflects your race pace.`;
            action = 'Focus on finding small gains in both qualifying and race pace.';
            evidenceSummary = `${racesWithPositions.length} races analyzed. Position change: ${avgPositionsGained >= 0 ? '+' : ''}${avgPositionsGained.toFixed(1)}. Avg finish: P${avgFinish.toFixed(1)}.`;
        } else {
            sentiment = 'concern';
            summary = 'Race pace not matching qualifying. Losing positions during races.';
            const lossExamples = bigLosses.length > 0
                ? `Recent examples: ${bigLosses.slice(0,3).map(r => `${r.track_name} (P${r.start_position}→P${r.finish_position})`).join(', ')}.`
                : '';
            detail = `You lose an average of ${Math.abs(avgPositionsGained).toFixed(1)} positions per race. ${lossExamples} This suggests your race pace doesn't match your qualifying pace, or you're losing positions to incidents/mistakes.`;
            action = 'Practice with fuel loads and in traffic. Race pace is different from hotlap pace.';
            evidenceSummary = `${racesWithPositions.length} races. Average loss: ${avgPositionsGained.toFixed(1)} positions. ${bigLosses.length} races with 3+ positions lost.`;
        }

        const opinion = await createEngineerOpinion({
            driver_profile_id: driverProfileId,
            opinion_domain: 'consistency',
            opinion_context: null,
            opinion_summary: summary,
            opinion_detail: detail,
            opinion_confidence: Math.min(1, racesWithPositions.length / 30),
            opinion_sentiment: sentiment,
            is_actionable: true,
            suggested_action: action,
            priority: sentiment === 'concern' ? 7 : 4,
            valid_until: null,
            superseded_by: null,
            evidence_sessions: racesWithPositions.slice(0, 5).map(r => r.subsession_id?.toString()).filter(Boolean),
            evidence_summary: evidenceSummary,
        });
        newOpinions.push(opinion);
    }

    // 3. Trend opinion - compare recent vs older performance with REAL data
    if (totalRaces >= 20) {
        const recent10 = races.slice(0, 10);
        const older10 = races.slice(10, 20);
        
        const recentAvgInc = recent10.reduce((s, r) => s + (r.incidents || 0), 0) / recent10.length;
        const olderAvgInc = older10.reduce((s, r) => s + (r.incidents || 0), 0) / older10.length;
        
        const recentFinishes = recent10.filter(r => r.finish_position != null);
        const olderFinishes = older10.filter(r => r.finish_position != null);
        const recentAvgFinish = recentFinishes.length > 0 ? recentFinishes.reduce((s, r) => s + r.finish_position, 0) / recentFinishes.length : 0;
        const olderAvgFinish = olderFinishes.length > 0 ? olderFinishes.reduce((s, r) => s + r.finish_position, 0) / olderFinishes.length : 0;
        
        let sentiment: 'positive' | 'neutral' | 'concern' | 'critical' = 'neutral';
        let summary = '';
        let detail = '';
        let action = '';
        let evidenceSummary = '';
        
        const incidentChange = recentAvgInc - olderAvgInc;
        const finishChange = recentAvgFinish - olderAvgFinish; // Lower is better
        
        if (incidentChange < -1 && finishChange < 0) {
            sentiment = 'positive';
            summary = 'Strong improvement trend. Your recent races are cleaner and faster.';
            detail = `Comparing your last 10 races to the previous 10: Incidents dropped from ${olderAvgInc.toFixed(1)} to ${recentAvgInc.toFixed(1)} per race. Average finish improved from P${olderAvgFinish.toFixed(1)} to P${recentAvgFinish.toFixed(1)}. Whatever you're doing differently is working.`;
            action = 'Keep doing what you\'re doing. Document what changed so you can maintain it.';
            evidenceSummary = `Last 10 races: ${recentAvgInc.toFixed(1)} inc/race, P${recentAvgFinish.toFixed(1)} avg. Previous 10: ${olderAvgInc.toFixed(1)} inc/race, P${olderAvgFinish.toFixed(1)} avg.`;
        } else if (incidentChange > 1 || finishChange > 2) {
            sentiment = 'concern';
            summary = 'Recent performance declining. Incidents or finishes getting worse.';
            detail = `Comparing your last 10 races to the previous 10: Incidents went from ${olderAvgInc.toFixed(1)} to ${recentAvgInc.toFixed(1)} per race. Average finish went from P${olderAvgFinish.toFixed(1)} to P${recentAvgFinish.toFixed(1)}. Something has changed - review what's different.`;
            action = 'Take a break or run practice sessions. Identify what changed recently.';
            evidenceSummary = `Last 10 races: ${recentAvgInc.toFixed(1)} inc/race, P${recentAvgFinish.toFixed(1)} avg. Previous 10: ${olderAvgInc.toFixed(1)} inc/race, P${olderAvgFinish.toFixed(1)} avg.`;
        } else {
            sentiment = 'neutral';
            summary = 'Consistent recent performance. No major changes in trend.';
            detail = `Your last 10 races vs previous 10 show stable performance: Incidents ${recentAvgInc.toFixed(1)} vs ${olderAvgInc.toFixed(1)}, finishes P${recentAvgFinish.toFixed(1)} vs P${olderAvgFinish.toFixed(1)}. You're racing at a consistent level.`;
            action = 'Look for specific areas to improve - track knowledge, starts, or tire management.';
            evidenceSummary = `Last 10: ${recentAvgInc.toFixed(1)} inc, P${recentAvgFinish.toFixed(1)}. Previous 10: ${olderAvgInc.toFixed(1)} inc, P${olderAvgFinish.toFixed(1)}. Stable trend.`;
        }

        const opinion = await createEngineerOpinion({
            driver_profile_id: driverProfileId,
            opinion_domain: 'mental',
            opinion_context: null,
            opinion_summary: summary,
            opinion_detail: detail,
            opinion_confidence: Math.min(1, totalRaces / 30),
            opinion_sentiment: sentiment,
            is_actionable: true,
            suggested_action: action,
            priority: sentiment === 'concern' ? 6 : 3,
            valid_until: null,
            superseded_by: null,
            evidence_sessions: recent10.slice(0, 5).map(r => r.subsession_id?.toString()).filter(Boolean),
            evidence_summary: evidenceSummary,
        });
        newOpinions.push(opinion);
    }

    return newOpinions;
}

// ========================
// Driver Report Generation
// ========================

export interface DriverReport {
    generatedAt: string;
    summary: {
        totalRaces: number;
        totalLaps: number;
        totalIncidents: number;
        avgIncidentsPerRace: number;
        avgFinishPosition: number;
        avgPositionsGained: number;
        cleanRacePercentage: number;
    };
    problemAreas: {
        track: string;
        incidents: number;
        races: number;
        avgIncidentsPerRace: number;
        recommendation: string;
    }[];
    incidentPatterns: {
        pattern: string;
        frequency: number;
        description: string;
        fix: string;
    }[];
    strengths: {
        area: string;
        evidence: string;
    }[];
    improvementPlan: {
        priority: number;
        focus: string;
        why: string;
        how: string;
        expectedImpact: string;
    }[];
    recentTrend: {
        direction: 'improving' | 'declining' | 'stable';
        description: string;
    };
}

export async function generateDriverReport(userId: string, _driverProfileId: string): Promise<DriverReport> {
    // Fetch all race results
    const result = await pool.query(
        `SELECT * FROM iracing_race_results 
         WHERE admin_user_id = $1 
         ORDER BY session_start_time DESC`,
        [userId]
    );
    const races = result.rows;
    
    // Calculate summary stats
    const totalRaces = races.length;
    const totalLaps = races.reduce((sum, r) => sum + (r.laps_complete || 0), 0);
    const totalIncidents = races.reduce((sum, r) => sum + (r.incidents || 0), 0);
    const avgIncidentsPerRace = totalRaces > 0 ? totalIncidents / totalRaces : 0;
    
    const racesWithFinish = races.filter(r => r.finish_position != null);
    const avgFinishPosition = racesWithFinish.length > 0 
        ? racesWithFinish.reduce((sum, r) => sum + r.finish_position, 0) / racesWithFinish.length 
        : 0;
    
    const racesWithPositions = races.filter(r => r.start_position != null && r.finish_position != null);
    const avgPositionsGained = racesWithPositions.length > 0
        ? racesWithPositions.reduce((sum, r) => sum + (r.start_position - r.finish_position), 0) / racesWithPositions.length
        : 0;
    
    const cleanRaces = races.filter(r => (r.incidents || 0) === 0).length;
    const cleanRacePercentage = totalRaces > 0 ? (cleanRaces / totalRaces) * 100 : 0;
    
    // Analyze incidents by track
    const trackStats: Record<string, { incidents: number; races: number; laps: number }> = {};
    for (const race of races) {
        const track = race.track_name || 'Unknown';
        if (!trackStats[track]) {
            trackStats[track] = { incidents: 0, races: 0, laps: 0 };
        }
        trackStats[track].incidents += race.incidents || 0;
        trackStats[track].races += 1;
        trackStats[track].laps += race.laps_complete || 0;
    }
    
    // Find problem tracks (high incident rate)
    const problemAreas = Object.entries(trackStats)
        .map(([track, stats]) => ({
            track,
            incidents: stats.incidents,
            races: stats.races,
            avgIncidentsPerRace: stats.races > 0 ? stats.incidents / stats.races : 0,
            incidentsPerLap: stats.laps > 0 ? stats.incidents / stats.laps : 0,
        }))
        .filter(t => t.races >= 3 && t.avgIncidentsPerRace > avgIncidentsPerRace * 1.5) // Tracks worse than average
        .sort((a, b) => b.avgIncidentsPerRace - a.avgIncidentsPerRace)
        .slice(0, 5)
        .map(t => ({
            track: t.track,
            incidents: t.incidents,
            races: t.races,
            avgIncidentsPerRace: Math.round(t.avgIncidentsPerRace * 10) / 10,
            recommendation: t.avgIncidentsPerRace > 4 
                ? `Run 5-10 practice laps at ${t.track} before each race. Focus on learning the track limits.`
                : `Review your replays from ${t.track}. Look for the corners where incidents happen.`,
        }));
    
    // Analyze incident patterns
    const incidentPatterns: DriverReport['incidentPatterns'] = [];
    
    // Pattern: Lap 1 incidents (check if incidents happen early)
    const recentRaces = races.slice(0, 50);
    const highIncidentRaces = recentRaces.filter(r => (r.incidents || 0) >= 4);
    const lap1Pattern = highIncidentRaces.length / Math.max(recentRaces.length, 1);
    
    if (lap1Pattern > 0.3) {
        incidentPatterns.push({
            pattern: 'First Lap Aggression',
            frequency: Math.round(lap1Pattern * 100),
            description: `${Math.round(lap1Pattern * 100)}% of your recent races have 4+ incidents. Many incidents happen in the opening laps when the field is bunched.`,
            fix: 'Survive lap 1. Give extra space at turn 1. Positions gained in lap 1 are often lost to damage. Let the chaos unfold ahead of you.',
        });
    }
    
    // Pattern: Late race incidents (fatigue/pressure)
    const dnfRaces = races.filter(r => r.reason_out && r.reason_out !== 'Running');
    const dnfRate = dnfRaces.length / Math.max(totalRaces, 1);
    if (dnfRate > 0.15) {
        incidentPatterns.push({
            pattern: 'Race Completion Issues',
            frequency: Math.round(dnfRate * 100),
            description: `${Math.round(dnfRate * 100)}% of your races end in DNF. This significantly impacts your iRating and SR.`,
            fix: 'Focus on finishing. A P15 finish is worth more than a P5 DNF. Back off if you feel the car getting away from you.',
        });
    }
    
    // Pattern: Consistent high incidents
    if (avgIncidentsPerRace > 6) {
        incidentPatterns.push({
            pattern: 'High Baseline Incidents',
            frequency: 100,
            description: `You average ${avgIncidentsPerRace.toFixed(1)} incidents per race. The target for clean racing is under 4.`,
            fix: 'Slow down by 1-2 seconds per lap. Find a pace you can maintain without incidents. Speed comes after consistency.',
        });
    }
    
    // Pattern: Position loss
    if (avgPositionsGained < -2) {
        incidentPatterns.push({
            pattern: 'Qualifying vs Race Pace Gap',
            frequency: Math.round(Math.abs(avgPositionsGained)),
            description: `You lose an average of ${Math.abs(avgPositionsGained).toFixed(1)} positions per race. You qualify well but struggle in race conditions.`,
            fix: 'Practice in traffic. Join open practice sessions and run with other cars. Race pace is different from hotlap pace.',
        });
    }
    
    // Find strengths
    const strengths: DriverReport['strengths'] = [];
    
    if (cleanRacePercentage > 30) {
        strengths.push({
            area: 'Clean Racing Capability',
            evidence: `${Math.round(cleanRacePercentage)}% of your races are incident-free. You CAN race clean when focused.`,
        });
    }
    
    if (avgPositionsGained > 1) {
        strengths.push({
            area: 'Race Craft',
            evidence: `You gain an average of ${avgPositionsGained.toFixed(1)} positions per race. You're effective at making passes stick.`,
        });
    }
    
    const bestTracks = Object.entries(trackStats)
        .filter(([_, stats]) => stats.races >= 3)
        .map(([track, stats]) => ({ track, avgInc: stats.incidents / stats.races }))
        .sort((a, b) => a.avgInc - b.avgInc)
        .slice(0, 3);
    
    if (bestTracks.length > 0 && bestTracks[0].avgInc < 2) {
        strengths.push({
            area: 'Track Mastery',
            evidence: `You race cleanly at ${bestTracks.map(t => t.track).join(', ')}. Apply what works there to other tracks.`,
        });
    }
    
    // Generate improvement plan
    const improvementPlan: DriverReport['improvementPlan'] = [];
    
    if (avgIncidentsPerRace > 4) {
        improvementPlan.push({
            priority: 1,
            focus: 'Reduce Incidents',
            why: `At ${avgIncidentsPerRace.toFixed(1)} incidents/race, you're losing SR and positions to damage. This is your #1 issue.`,
            how: '1. Run 10 practice laps before each race\n2. Give extra space on lap 1\n3. If you get hit, don\'t retaliate - just survive\n4. Back off 0.5s when in traffic',
            expectedImpact: 'Cutting incidents in half would improve your SR by ~0.5 and iRating by 50-100 points.',
        });
    }
    
    if (problemAreas.length > 0) {
        improvementPlan.push({
            priority: 2,
            focus: `Master Your Problem Tracks`,
            why: `You have ${problemAreas.length} tracks where your incident rate is significantly above average.`,
            how: `Focus practice time on: ${problemAreas.slice(0, 3).map(t => t.track).join(', ')}. Run these in test sessions until you can do 10 clean laps.`,
            expectedImpact: 'Fixing your worst tracks could reduce overall incidents by 20-30%.',
        });
    }
    
    if (avgPositionsGained < 0) {
        improvementPlan.push({
            priority: 3,
            focus: 'Race Pace Development',
            why: `You lose ${Math.abs(avgPositionsGained).toFixed(1)} positions on average. Your race pace doesn't match qualifying.`,
            how: '1. Practice with fuel loads (not empty tank hotlaps)\n2. Join open practice and run in traffic\n3. Learn to manage tires over a stint',
            expectedImpact: 'Matching race pace to quali pace could gain you 2-3 positions per race.',
        });
    }
    
    // Analyze recent trend (last 20 vs previous 20)
    const recent20 = races.slice(0, 20);
    const previous20 = races.slice(20, 40);
    
    let trendDirection: 'improving' | 'declining' | 'stable' = 'stable';
    let trendDescription = 'Your performance has been consistent recently.';
    
    if (recent20.length >= 10 && previous20.length >= 10) {
        const recentAvgInc = recent20.reduce((s, r) => s + (r.incidents || 0), 0) / recent20.length;
        const prevAvgInc = previous20.reduce((s, r) => s + (r.incidents || 0), 0) / previous20.length;
        
        if (recentAvgInc < prevAvgInc * 0.8) {
            trendDirection = 'improving';
            trendDescription = `Your incident rate has dropped from ${prevAvgInc.toFixed(1)} to ${recentAvgInc.toFixed(1)} per race. Keep it up!`;
        } else if (recentAvgInc > prevAvgInc * 1.2) {
            trendDirection = 'declining';
            trendDescription = `Your incident rate has increased from ${prevAvgInc.toFixed(1)} to ${recentAvgInc.toFixed(1)} per race. Something changed - review recent races.`;
        }
    }
    
    return {
        generatedAt: new Date().toISOString(),
        summary: {
            totalRaces,
            totalLaps,
            totalIncidents,
            avgIncidentsPerRace: Math.round(avgIncidentsPerRace * 10) / 10,
            avgFinishPosition: Math.round(avgFinishPosition * 10) / 10,
            avgPositionsGained: Math.round(avgPositionsGained * 10) / 10,
            cleanRacePercentage: Math.round(cleanRacePercentage),
        },
        problemAreas,
        incidentPatterns,
        strengths,
        improvementPlan,
        recentTrend: {
            direction: trendDirection,
            description: trendDescription,
        },
    };
}

// ========================
// Driver Identity Updates
// ========================

export async function updateDriverIdentityFromData(driverProfileId: string): Promise<DriverIdentity | null> {
    const memory = await getDriverMemory(driverProfileId);
    const aggregate = await getGlobalAggregate(driverProfileId, 'all_time') as any;
    const behaviors = await getRecentBehaviorsForAggregation(driverProfileId, 20);

    if (!memory || behaviors.length < 5) {
        return getDriverIdentity(driverProfileId);
    }

    // Determine archetype
    let archetype: 'calculated_racer' | 'aggressive_hunter' | 'consistent_grinder' | 'raw_talent' | 'developing' = 'developing';
    let archetypeConfidence = 0.3;
    let archetypeEvidence = 'Not enough data to determine archetype';

    if (memory.memory_confidence > 0.5) {
        if (memory.incident_proneness && memory.incident_proneness > 0.85 && memory.braking_consistency && memory.braking_consistency > 0.7) {
            archetype = 'calculated_racer';
            archetypeConfidence = memory.memory_confidence;
            archetypeEvidence = 'High consistency and clean racing indicate a calculated approach';
        } else if (memory.overtaking_style === 'aggressive' || memory.corner_entry_style === 'aggressive') {
            archetype = 'aggressive_hunter';
            archetypeConfidence = memory.memory_confidence * 0.8;
            archetypeEvidence = 'Aggressive overtaking and corner entry patterns';
        } else if (memory.braking_consistency && memory.braking_consistency > 0.75) {
            archetype = 'consistent_grinder';
            archetypeConfidence = memory.memory_confidence;
            archetypeEvidence = 'Highly consistent lap times and steady improvement';
        } else if (aggregate && aggregate.session_count > 0 && memory.sessions_analyzed < 30) {
            archetype = 'raw_talent';
            archetypeConfidence = 0.6;
            archetypeEvidence = 'Early results suggest natural ability';
        }
    }

    // Determine skill trajectory
    let skillTrajectory: 'ascending' | 'plateaued' | 'breaking_through' | 'declining' | 'developing' = 'developing';
    let trajectoryEvidence = '';

    if (memory.confidence_trend === 'rising' && memory.memory_confidence > 0.5) {
        skillTrajectory = 'ascending';
        trajectoryEvidence = 'Confidence and results trending upward';
    } else if (memory.confidence_trend === 'falling') {
        skillTrajectory = 'declining';
        trajectoryEvidence = 'Recent results show a downward trend';
    } else if (memory.sessions_analyzed > 50 && memory.braking_consistency && memory.braking_consistency > 0.7) {
        skillTrajectory = 'plateaued';
        trajectoryEvidence = 'Consistent performance over many sessions';
    }

    // Readiness signals
    const readyForLongerRaces = memory.sessions_analyzed > 20 && 
        (memory.late_race_degradation === null || memory.late_race_degradation < 0.3);
    const readyForHigherSplits = aggregate && aggregate.avg_positions_gained && aggregate.avg_positions_gained > 0 &&
        memory.incident_proneness !== null && memory.incident_proneness > 0.7;
    const readyForNewDiscipline = memory.sessions_analyzed > 30;

    // Narrative elements
    let currentChapter = 'Building your foundation';
    let nextMilestone = 'Complete 10 clean races';

    if (memory.sessions_analyzed > 50) {
        currentChapter = 'Refining your craft';
        nextMilestone = 'Consistent top-5 finishes';
    }
    if (aggregate && aggregate.session_count > 30 && aggregate.avg_positions_gained && aggregate.avg_positions_gained > 2) {
        currentChapter = 'Competing for wins';
        nextMilestone = 'Championship contention';
    }

    return updateDriverIdentity(driverProfileId, {
        driver_archetype: archetype,
        archetype_confidence: archetypeConfidence,
        archetype_evidence: archetypeEvidence,
        skill_trajectory: skillTrajectory,
        trajectory_since: new Date(),
        trajectory_evidence: trajectoryEvidence,
        ready_for_longer_races: readyForLongerRaces,
        ready_for_higher_splits: readyForHigherSplits,
        ready_for_new_discipline: readyForNewDiscipline,
        current_chapter: currentChapter,
        next_milestone: nextMilestone,
    });
}

// ========================
// Full Pipeline
// ========================

export async function runMemoryPipeline(
    driverProfileId: string,
    sessionInput?: SessionAnalysisInput
): Promise<{
    behavior: DriverSessionBehavior | null;
    memory: DriverMemory | null;
    opinions: EngineerOpinion[];
    identity: DriverIdentity | null;
}> {
    let behavior: DriverSessionBehavior | null = null;

    // 1. Analyze session if provided
    if (sessionInput) {
        behavior = await analyzeSessionBehavior(sessionInput);
    }

    // 2. Aggregate memory from behaviors
    const memory = await aggregateMemoryFromBehaviors(driverProfileId);

    // 3. Generate engineer opinions
    const opinions = await generateEngineerOpinions(driverProfileId);

    // 4. Update driver identity
    const identity = await updateDriverIdentityFromData(driverProfileId);

    return { behavior, memory, opinions, identity };
}

// ========================
// Backfill from iRacing Race Results
// ========================

export async function backfillFromIRacingResults(userId: string, driverProfileId: string): Promise<number> {
    // Fetch ALL sessions from iracing_race_results table
    const result = await pool.query(
        `SELECT * FROM iracing_race_results 
         WHERE admin_user_id = $1 
         ORDER BY session_start_time ASC NULLS LAST`,
        [userId]
    );
    
    const allSessions = result.rows;
    
    // Categorize sessions for proper analysis weighting
    const sessionBreakdown = {
        official_race: 0,
        unofficial_race: 0,
        practice: 0,
        qualifying: 0,
        other: 0
    };
    
    for (const s of allSessions) {
        const sessionType = s.session_type || 'other';
        if (sessionType === 'official_race') sessionBreakdown.official_race++;
        else if (sessionType === 'unofficial_race') sessionBreakdown.unofficial_race++;
        else if (sessionType === 'practice') sessionBreakdown.practice++;
        else if (sessionType === 'qualifying') sessionBreakdown.qualifying++;
        else sessionBreakdown.other++;
    }
    
    console.log(`[DriverMemory] Session breakdown for analysis:`, sessionBreakdown);
    console.log(`[DriverMemory] Processing ${allSessions.length} total sessions for driver ${driverProfileId}`);
    
    // For RACECRAFT analysis (incident_proneness, overtaking_style, etc.):
    // - Official races: FULL weight (these count for iRating, driver takes them seriously)
    // - Unofficial races: PARTIAL weight (still competitive but lower stakes)
    // - Practice/Qualifying: EXCLUDED from racecraft (different driving style, testing limits)
    
    // For CONSISTENCY analysis (lap time variance, brake consistency):
    // - All session types are useful
    
    let processed = 0;
    let skipped = 0;
    let practiceSkipped = 0;
    
    for (const race of allSessions) {
        try {
            if (!race.subsession_id) {
                skipped++;
                continue;
            }
            
            const sessionType = race.session_type || 'other';
            const eventType = race.event_type || 'race';
            
            // Skip practice sessions for racecraft behavior analysis
            // They're still stored in the DB for track learning/consistency analysis
            if (sessionType === 'practice' || eventType === 'practice') {
                practiceSkipped++;
                continue;
            }
            
            const laps = race.laps_complete || race.laps_lead || 0;
            const incidents = race.incidents ?? 0;
            const startPos = race.start_position;
            const finishPos = race.finish_position;
            
            // Generate a deterministic UUID from subsession_id for deduplication
            const subsessionStr = String(race.subsession_id).padStart(12, '0');
            const sessionUuid = `00000000-0000-4000-8000-${subsessionStr}`;
            
            // Map session_type to behavior sessionType
            let behaviorSessionType: 'practice' | 'qualifying' | 'race' = 'race';
            if (sessionType === 'qualifying' || eventType === 'qualifying') {
                behaviorSessionType = 'qualifying';
            }
            
            const behavior = await analyzeSessionBehavior({
                sessionId: sessionUuid,
                driverProfileId,
                sessionType: behaviorSessionType,
                trackName: race.track_name || 'Unknown',
                carName: race.car_name || 'Unknown',
                laps,
                incidents,
                startPosition: startPos ?? undefined,
                finishPosition: finishPos ?? undefined,
                positionsGained: startPos != null && finishPos != null 
                    ? startPos - finishPos 
                    : undefined,
            });
            if (behavior) {
                processed++;
            } else {
                console.warn(`[DriverMemory] No behavior returned for race ${race.subsession_id}`);
            }
        } catch (error) {
            console.error(`[DriverMemory] Error processing race ${race.subsession_id}:`, error instanceof Error ? error.message : error);
        }
    }
    
    console.log(`[DriverMemory] Skipped ${skipped} sessions with no subsession_id`);
    console.log(`[DriverMemory] Excluded ${practiceSkipped} practice sessions from racecraft analysis`);
    
    // Recalculate stats from actual data (prevents accumulation bugs)
    try {
        await recalculateMemoryStats(driverProfileId, userId);
    } catch (statsError) {
        console.error(`[DriverMemory] Error recalculating stats:`, statsError);
    }
    
    // ALWAYS aggregate memory, generate opinions, and update identity
    // Even if no new behaviors were created (e.g., all already existed), we still need to recalculate
    try {
        console.log(`[DriverMemory] Aggregating memory (processed ${processed} new sessions)...`);
        await aggregateMemoryFromBehaviors(driverProfileId, userId);
    } catch (aggregateError) {
        console.error(`[DriverMemory] Error aggregating memory:`, aggregateError);
    }
    
    try {
        await generateEngineerOpinions(driverProfileId, userId);
    } catch (opinionError) {
        console.error(`[DriverMemory] Error generating opinions:`, opinionError);
    }
    
    try {
        await updateDriverIdentityFromData(driverProfileId);
    } catch (identityError) {
        console.error(`[DriverMemory] Error updating identity:`, identityError);
    }
    
    console.log(`[DriverMemory] Processed ${processed}/${allSessions.length} iRacing races into IDP memory`);
    return processed;
}

// ========================
// Backfill Existing Sessions
// ========================

export async function backfillMemoryFromHistory(driverProfileId: string): Promise<number> {
    const metrics = await getMetricsForDriver(driverProfileId, 100, 0);
    
    let processed = 0;
    for (const metric of metrics) {
        try {
            await analyzeSessionBehavior({
                sessionId: metric.session_id,
                driverProfileId,
                sessionType: 'race',
                trackName: 'Unknown',
                carName: 'Unknown',
                laps: metric.total_laps || 0,
                incidents: metric.incident_count || 0,
                startPosition: metric.start_position ?? undefined,
                finishPosition: metric.finish_position ?? undefined,
                bestLapTime: metric.best_lap_time_ms ? metric.best_lap_time_ms / 1000 : undefined,
                avgLapTime: metric.mean_lap_time_ms ? metric.mean_lap_time_ms / 1000 : undefined,
                lapTimeVariance: metric.lap_time_std_dev_ms ? metric.lap_time_std_dev_ms / 1000 : undefined,
                positionsGained: metric.positions_gained ?? undefined,
            });
            processed++;
        } catch (error) {
            console.error(`[DriverMemory] Error processing session ${metric.session_id}:`, error);
        }
    }

    // Generate opinions and update identity after backfill
    await generateEngineerOpinions(driverProfileId);
    await updateDriverIdentityFromData(driverProfileId);

    return processed;
}
