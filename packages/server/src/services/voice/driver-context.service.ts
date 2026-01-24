/**
 * Driver Context Service for Voice AI
 * 
 * Fetches IDP profile, traits, goals, and team strategy to give the AI
 * engineer full knowledge of the driver they're working with.
 */

import { pool } from '../../db/client.js';

export interface DriverContext {
    // Profile
    driverName: string;
    displayName: string;
    primaryDiscipline: string;
    bio: string | null;
    
    // Stats
    totalSessions: number;
    totalLaps: number;
    totalIncidents: number;
    
    // Ratings (0-100)
    paceRating: number | null;
    consistencyRating: number | null;
    safetyRating: number | null;
    racecraftRating: number | null;
    enduranceRating: number | null;
    
    // Traits
    traits: DriverTrait[];
    
    // Development Goals
    developmentGoals: DevelopmentGoal[];
    
    // Recent Performance
    recentSessions: RecentSession[];
    
    // Team Info
    teamName: string | null;
    teamRole: string | null;
    teamStrategy: TeamStrategy | null;
}

export interface DriverTrait {
    key: string;
    label: string;
    category: string;
    confidence: number;
    evidence: string;
}

export interface DevelopmentGoal {
    id: string;
    title: string;
    description: string;
    category: string;
    targetValue: number | null;
    currentValue: number | null;
    status: string;
    priority: number;
    dueDate: Date | null;
}

export interface RecentSession {
    trackName: string;
    carName: string;
    sessionType: string;
    finishPosition: number | null;
    bestLapTime: number | null;
    incidentCount: number;
    iRatingChange: number | null;
    date: Date;
}

export interface TeamStrategy {
    pitWindow: { start: number; end: number } | null;
    fuelStrategy: string | null;
    tireStrategy: string | null;
    raceNotes: string | null;
    targetPosition: number | null;
    keyRivals: string[];
}

/**
 * Fetch full driver context for the AI engineer
 */
export async function getDriverContextForVoice(iRacingId: string): Promise<DriverContext | null> {
    try {
        // Find driver profile by iRacing ID
        const profileResult = await pool.query(`
            SELECT dp.*, li.platform_display_name as iracing_name
            FROM driver_profiles dp
            LEFT JOIN linked_racing_identities li ON dp.id = li.driver_profile_id
            WHERE li.platform = 'iracing' AND li.platform_user_id = $1
            LIMIT 1
        `, [iRacingId]);
        
        if (profileResult.rows.length === 0) {
            return null;
        }
        
        const profile = profileResult.rows[0];
        const driverId = profile.id;
        
        // Fetch aggregates (stats)
        const statsResult = await pool.query(`
            SELECT * FROM driver_aggregates
            WHERE driver_profile_id = $1 AND window_type = 'all_time'
            LIMIT 1
        `, [driverId]);
        const stats = statsResult.rows[0] || {};
        
        // Fetch current traits
        const traitsResult = await pool.query(`
            SELECT trait_key, trait_label, trait_category, confidence, evidence_summary
            FROM driver_traits
            WHERE driver_profile_id = $1 AND (valid_until IS NULL OR valid_until > NOW())
            ORDER BY confidence DESC
            LIMIT 10
        `, [driverId]);
        
        // Fetch development goals
        const goalsResult = await pool.query(`
            SELECT id, title, description, category, target_value, current_value, status, priority, due_date
            FROM development_goals
            WHERE driver_profile_id = $1 AND status IN ('active', 'in_progress')
            ORDER BY priority ASC, created_at DESC
            LIMIT 5
        `, [driverId]);
        
        // Fetch recent sessions
        const sessionsResult = await pool.query(`
            SELECT sm.*, s.track_name, s.car_name, s.session_type, s.created_at as session_date
            FROM session_metrics sm
            JOIN sessions s ON sm.session_id = s.id
            WHERE sm.driver_profile_id = $1
            ORDER BY s.created_at DESC
            LIMIT 5
        `, [driverId]);
        
        // Fetch team info
        const teamResult = await pool.query(`
            SELECT t.name as team_name, tm.role as team_role
            FROM team_members tm
            JOIN teams t ON tm.team_id = t.id
            WHERE tm.driver_profile_id = $1 AND tm.status = 'active'
            LIMIT 1
        `, [driverId]);
        const team = teamResult.rows[0];
        
        // Fetch team strategy if in a team
        let teamStrategy: TeamStrategy | null = null;
        if (team) {
            const strategyResult = await pool.query(`
                SELECT pit_window_start, pit_window_end, fuel_strategy, tire_strategy, 
                       race_notes, target_position, key_rivals
                FROM team_strategies
                WHERE team_id = (SELECT team_id FROM team_members WHERE driver_profile_id = $1 LIMIT 1)
                AND is_active = true
                LIMIT 1
            `, [driverId]);
            
            if (strategyResult.rows.length > 0) {
                const s = strategyResult.rows[0];
                teamStrategy = {
                    pitWindow: s.pit_window_start ? { start: s.pit_window_start, end: s.pit_window_end } : null,
                    fuelStrategy: s.fuel_strategy,
                    tireStrategy: s.tire_strategy,
                    raceNotes: s.race_notes,
                    targetPosition: s.target_position,
                    keyRivals: s.key_rivals || []
                };
            }
        }
        
        return {
            driverName: profile.iracing_name || profile.display_name,
            displayName: profile.display_name,
            primaryDiscipline: profile.primary_discipline,
            bio: profile.bio,
            
            totalSessions: profile.total_sessions || 0,
            totalLaps: profile.total_laps || 0,
            totalIncidents: profile.total_incidents || 0,
            
            paceRating: stats.avg_pace_percentile || null,
            consistencyRating: stats.consistency_index || null,
            safetyRating: stats.risk_index ? Math.round(100 - stats.risk_index) : null,
            racecraftRating: stats.start_performance_index ? Math.round((stats.start_performance_index + 1) * 50) : null,
            enduranceRating: stats.endurance_fitness_index || null,
            
            traits: traitsResult.rows.map(t => ({
                key: t.trait_key,
                label: t.trait_label,
                category: t.trait_category,
                confidence: t.confidence,
                evidence: t.evidence_summary
            })),
            
            developmentGoals: goalsResult.rows.map(g => ({
                id: g.id,
                title: g.title,
                description: g.description,
                category: g.category,
                targetValue: g.target_value,
                currentValue: g.current_value,
                status: g.status,
                priority: g.priority,
                dueDate: g.due_date
            })),
            
            recentSessions: sessionsResult.rows.map(s => ({
                trackName: s.track_name,
                carName: s.car_name,
                sessionType: s.session_type,
                finishPosition: s.finish_position,
                bestLapTime: s.best_lap_time_ms ? s.best_lap_time_ms / 1000 : null,
                incidentCount: s.incident_count || 0,
                iRatingChange: s.irating_change,
                date: s.session_date
            })),
            
            teamName: team?.team_name || null,
            teamRole: team?.team_role || null,
            teamStrategy
        };
        
    } catch (error) {
        console.error('Error fetching driver context:', error);
        return null;
    }
}

/**
 * Format driver context for AI prompt
 */
export function formatDriverContextForAI(ctx: DriverContext): string {
    let output = `
DRIVER PROFILE:
- Name: ${ctx.driverName}
- Discipline: ${ctx.primaryDiscipline}
- Experience: ${ctx.totalSessions} sessions, ${ctx.totalLaps} laps
${ctx.bio ? `- Bio: ${ctx.bio}` : ''}

DRIVER RATINGS:
- Pace: ${ctx.paceRating !== null ? ctx.paceRating + '/100' : 'N/A'}
- Consistency: ${ctx.consistencyRating !== null ? ctx.consistencyRating + '/100' : 'N/A'}
- Safety: ${ctx.safetyRating !== null ? ctx.safetyRating + '/100' : 'N/A'}
- Racecraft: ${ctx.racecraftRating !== null ? ctx.racecraftRating + '/100' : 'N/A'}
- Endurance: ${ctx.enduranceRating !== null ? ctx.enduranceRating + '/100' : 'N/A'}
`;

    if (ctx.traits.length > 0) {
        output += '\nDRIVER TRAITS:\n';
        for (const trait of ctx.traits) {
            output += `- ${trait.label} (${trait.category}, ${Math.round(trait.confidence * 100)}% confidence)\n`;
        }
    }

    if (ctx.developmentGoals.length > 0) {
        output += '\nDEVELOPMENT GOALS:\n';
        for (const goal of ctx.developmentGoals) {
            const progress = goal.targetValue && goal.currentValue 
                ? ` (${Math.round(goal.currentValue / goal.targetValue * 100)}% complete)`
                : '';
            output += `- [${goal.status.toUpperCase()}] ${goal.title}${progress}\n`;
            if (goal.description) {
                output += `  ${goal.description}\n`;
            }
        }
    }

    if (ctx.recentSessions.length > 0) {
        output += '\nRECENT SESSIONS:\n';
        for (const session of ctx.recentSessions.slice(0, 3)) {
            const result = session.finishPosition ? `P${session.finishPosition}` : 'DNF';
            const iRating = session.iRatingChange ? ` (${session.iRatingChange > 0 ? '+' : ''}${session.iRatingChange} iR)` : '';
            output += `- ${session.trackName} (${session.sessionType}): ${result}${iRating}, ${session.incidentCount}x incidents\n`;
        }
    }

    if (ctx.teamName) {
        output += `\nTEAM: ${ctx.teamName} (${ctx.teamRole || 'Member'})\n`;
        
        if (ctx.teamStrategy) {
            const ts = ctx.teamStrategy;
            output += 'TEAM STRATEGY:\n';
            if (ts.pitWindow) {
                output += `- Pit Window: Lap ${ts.pitWindow.start} - ${ts.pitWindow.end}\n`;
            }
            if (ts.fuelStrategy) {
                output += `- Fuel: ${ts.fuelStrategy}\n`;
            }
            if (ts.tireStrategy) {
                output += `- Tires: ${ts.tireStrategy}\n`;
            }
            if (ts.targetPosition) {
                output += `- Target: P${ts.targetPosition}\n`;
            }
            if (ts.keyRivals && ts.keyRivals.length > 0) {
                output += `- Key Rivals: ${ts.keyRivals.join(', ')}\n`;
            }
            if (ts.raceNotes) {
                output += `- Notes: ${ts.raceNotes}\n`;
            }
        }
    }

    return output;
}

// Cache for driver context (refresh every 5 minutes)
const driverContextCache: Map<string, { context: DriverContext; timestamp: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getCachedDriverContext(iRacingId: string): Promise<DriverContext | null> {
    const cached = driverContextCache.get(iRacingId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.context;
    }
    
    const context = await getDriverContextForVoice(iRacingId);
    if (context) {
        driverContextCache.set(iRacingId, { context, timestamp: Date.now() });
    }
    return context;
}
