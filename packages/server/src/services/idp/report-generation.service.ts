/**
 * Driver Report Generation Service
 * Generates AI-powered reports using LLM with structured prompt templates
 * 
 * ETHOS: Equal Professional Dignity
 * - AI outputs use race engineer language, not coaching/motivation
 * - All drivers receive the same professional treatment
 * - Reports are factual, neutral, concise, actionable
 */

import { createDriverReport, CreateDriverReportDTO } from '../../db/repositories/driver-reports.repo.js';
import { getSessionMetrics } from '../../db/repositories/session-metrics.repo.js';
import { getGlobalAggregate } from '../../db/repositories/driver-aggregates.repo.js';
import { getCurrentTraits } from '../../db/repositories/driver-traits.repo.js';
import { getDriverProfileById } from '../../db/repositories/driver-profile.repo.js';
import { pool } from '../../db/client.js';
import { DriverReport, SessionMetrics, DriverTrait, DriverAggregate } from '../../types/idp.types.js';

// ========================
// Prompt Templates
// ========================

const PROMPT_VERSION = '2.0'; // Updated for Equal Professional Dignity ethos

interface SessionDebriefContext {
    driver_name: string;
    car_name: string;
    track_name: string;
    session_type: string;
    metrics: SessionMetrics;
    traits: DriverTrait[];
}

interface MonthlyNarrativeContext {
    driver_name: string;
    discipline: string;
    month_name: string;
    year: number;
    monthly_metrics: {
        session_count: number;
        lap_count: number;
        cars_driven: string[];
        tracks_visited: string[];
    };
    aggregate: DriverAggregate;
    traits: DriverTrait[];
    previous_aggregate?: DriverAggregate;
}

function buildSessionDebriefPrompt(ctx: SessionDebriefContext): string {
    return `## System Prompt
You are a race engineer providing post-session analysis.
Use neutral, engineering-grade language. State observations plainly.
Be factual, concise, and actionable. Avoid emotional judgment or motivational language.

## Context
Driver: ${ctx.driver_name}
Car: ${ctx.car_name}
Track: ${ctx.track_name}
Session Type: ${ctx.session_type}
Laps Completed: ${ctx.metrics.total_laps}

## Metrics Snapshot
- Best Lap: ${formatLapTime(ctx.metrics.best_lap_time_ms)}${ctx.metrics.gap_to_leader_best_pct ? ` (${ctx.metrics.gap_to_leader_best_pct.toFixed(2)}% delta to field reference)` : ''}
- Median Lap: ${formatLapTime(ctx.metrics.median_lap_time_ms)}
- Lap Time Variance (σ): ${ctx.metrics.lap_time_std_dev_ms ?? 'N/A'}ms
- Incident Count: ${ctx.metrics.incident_count} (${ctx.metrics.incidents_per_100_laps?.toFixed(1) ?? 'N/A'} per 100 laps)
- Pace Degradation Index: ${ctx.metrics.pace_dropoff_score?.toFixed(0) ?? 'N/A'} / 100
${ctx.metrics.finish_position ? `- Classification: P${ctx.metrics.finish_position} (grid P${ctx.metrics.start_position})` : ''}
${ctx.metrics.positions_gained !== null ? `- Position Delta: ${ctx.metrics.positions_gained > 0 ? '+' : ''}${ctx.metrics.positions_gained}` : ''}

## Current Characteristic Indicators
${ctx.traits.length > 0 ? ctx.traits.map(t => `- ${t.trait_label} (${(t.confidence * 100).toFixed(0)}%)`).join('\n') : '- Insufficient data for characteristic indicators'}

## Task
Generate a session analysis report containing:
1. Primary performance limiter identified this session
2. Secondary observation
3. Recommended focus area for next session

LANGUAGE RULES:
- Use neutral, technical language only
- No praise, criticism, or emotional framing
- No motivational language ("great job", "keep practicing", etc.)
- Frame limitations as technical variables, not personal failings

Output as JSON:
{
  "headline": "...",
  "primary_limiter": "...",
  "secondary_observation": "...",
  "recommended_focus": "..."
}`;
}

function buildMonthlyNarrativePrompt(ctx: MonthlyNarrativeContext): string {
    const deltas = ctx.previous_aggregate ? {
        pace: (ctx.aggregate.avg_pace_percentile ?? 0) - (ctx.previous_aggregate.avg_pace_percentile ?? 0),
        consistency: (ctx.aggregate.consistency_index ?? 0) - (ctx.previous_aggregate.consistency_index ?? 0),
        risk: (ctx.aggregate.risk_index ?? 0) - (ctx.previous_aggregate.risk_index ?? 0),
    } : null;

    return `## System Prompt
You are a performance analyst writing a monthly technical summary.
Use neutral, engineering-grade language. State observations plainly.
Be factual, concise, and actionable. Avoid emotional judgment or motivational language.

## Driver Context
Driver: ${ctx.driver_name}
Primary Discipline: ${ctx.discipline}
Period: ${ctx.month_name} ${ctx.year}

## Activity Summary
- Sessions: ${ctx.monthly_metrics.session_count}
- Laps: ${ctx.monthly_metrics.lap_count}
- Platforms Utilized: ${ctx.monthly_metrics.cars_driven.join(', ') || 'N/A'}
- Circuits: ${ctx.monthly_metrics.tracks_visited.join(', ') || 'N/A'}

## Performance Indices
- Pace Percentile: ${ctx.aggregate.avg_pace_percentile?.toFixed(1) ?? 'N/A'}${deltas ? ` (Δ ${formatDelta(deltas.pace)})` : ''}
- Consistency Index: ${ctx.aggregate.consistency_index?.toFixed(1) ?? 'N/A'}${deltas ? ` (Δ ${formatDelta(deltas.consistency)})` : ''}
- Risk Index: ${ctx.aggregate.risk_index?.toFixed(1) ?? 'N/A'}${deltas ? ` (Δ ${formatDelta(deltas.risk)})` : ''}
- Endurance Index: ${ctx.aggregate.endurance_fitness_index?.toFixed(1) ?? 'N/A'}

## Characteristic Indicators
${ctx.traits.map(t => `- ${t.trait_label}`).join('\n') || '- Insufficient data'}

## Task
Generate a monthly performance summary containing:
1. Period assessment (1-2 sentences, neutral)
2. Notable observations (2-3 items)
3. Patterns identified in data
4. Recommended development priorities (3 items, ranked by impact)

LANGUAGE RULES:
- Use neutral, technical language only
- No praise, criticism, or emotional framing
- No motivational language or "achievements"
- Frame all observations as data points, not judgments

Output as JSON:
{
  "title": "...",
  "period_assessment": "...",
  "observations": ["...", "..."],
  "patterns": ["..."],
  "development_priorities": ["...", "...", "..."]
}`;
}

// ========================
// Helpers
// ========================

function formatLapTime(ms: number | null): string {
    if (ms === null) return 'N/A';
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(3);
    return minutes > 0 ? `${minutes}:${seconds.padStart(6, '0')}` : `${seconds}s`;
}

function formatDelta(delta: number): string {
    const sign = delta >= 0 ? '+' : '';
    return `${sign}${delta.toFixed(1)}`;
}

async function callLLM(prompt: string): Promise<Record<string, unknown>> {
    // TODO: Replace with actual LLM service call (OpenAI, Anthropic, etc.)
    console.log('[ReportGen] LLM prompt length:', prompt.length);

    // Mock response - engineering-grade language, no motivation
    return {
        headline: 'Variance Elevated in Sector 2',
        primary_limiter: 'Brake release timing at corner entry. Lap time variance of 1.2s concentrated in Turns 4-6 complex.',
        secondary_observation: 'Pace degradation index indicates tire management is within acceptable parameters.',
        recommended_focus: 'Isolate Turns 4-6 for reference lap analysis. Target consistent brake release point before throttle application.',
    };
}

// ========================
// Report Generation
// ========================

export async function generateSessionDebrief(
    sessionId: string,
    driverProfileId: string
): Promise<DriverReport> {
    console.log(`[ReportGen] Generating session debrief for session ${sessionId}`);

    // Fetch required data
    const [profile, metrics, traits] = await Promise.all([
        getDriverProfileById(driverProfileId),
        getSessionMetrics(sessionId, driverProfileId),
        getCurrentTraits(driverProfileId),
    ]);

    if (!profile) throw new Error('Driver profile not found');
    if (!metrics) throw new Error('Session metrics not found');

    // Get session details
    const sessionResult = await pool.query<{ track_name: string; session_type: string; metadata: Record<string, unknown> }>(
        'SELECT track_name, session_type, metadata FROM sessions WHERE id = $1',
        [sessionId]
    );
    const session = sessionResult.rows[0];
    if (!session) throw new Error('Session not found');

    // Build context
    const context: SessionDebriefContext = {
        driver_name: profile.display_name,
        car_name: (session.metadata?.car_name as string) || 'Unknown Car',
        track_name: session.track_name || 'Unknown Track',
        session_type: session.session_type || 'Unknown',
        metrics,
        traits,
    };

    // Generate prompt and call LLM
    const prompt = buildSessionDebriefPrompt(context);
    const llmResponse = await callLLM(prompt);

    // Create report
    const dto: CreateDriverReportDTO = {
        driver_profile_id: driverProfileId,
        report_type: 'session_debrief',
        session_id: sessionId,
        title: `Session Analysis: ${session.track_name}`,
        content_json: llmResponse,
        ai_model: 'mock',
        ai_prompt_version: PROMPT_VERSION,
        generation_context: context as unknown as Record<string, unknown>,
        status: 'published',
    };

    const report = await createDriverReport(dto);
    console.log(`[ReportGen] Created session analysis report ${report.id}`);
    return report;
}

export async function generateMonthlyNarrative(
    driverProfileId: string,
    month: number,
    year: number
): Promise<DriverReport> {
    console.log(`[ReportGen] Generating monthly summary for ${month}/${year}`);

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    // Fetch required data
    const [profile, aggregate, traits] = await Promise.all([
        getDriverProfileById(driverProfileId),
        getGlobalAggregate(driverProfileId, 'rolling_30d'),
        getCurrentTraits(driverProfileId),
    ]);

    if (!profile) throw new Error('Driver profile not found');
    if (!aggregate) throw new Error('No aggregates found');

    // Get monthly session stats
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const monthlyResult = await pool.query<{
        session_count: string;
        lap_count: string;
        cars: string[];
        tracks: string[];
    }>(
        `SELECT 
      COUNT(DISTINCT sm.session_id) as session_count,
      SUM(sm.total_laps) as lap_count,
      ARRAY_AGG(DISTINCT s.metadata->>'car_name') FILTER (WHERE s.metadata->>'car_name' IS NOT NULL) as cars,
      ARRAY_AGG(DISTINCT s.track_name) FILTER (WHERE s.track_name IS NOT NULL) as tracks
     FROM session_metrics sm
     JOIN sessions s ON s.id = sm.session_id
     WHERE sm.driver_profile_id = $1
       AND s.started_at >= $2
       AND s.started_at <= $3`,
        [driverProfileId, startDate, endDate]
    );

    const monthly = monthlyResult.rows[0];

    // Build context
    const context: MonthlyNarrativeContext = {
        driver_name: profile.display_name,
        discipline: profile.primary_discipline,
        month_name: monthNames[month - 1],
        year,
        monthly_metrics: {
            session_count: parseInt(monthly.session_count, 10) || 0,
            lap_count: parseInt(monthly.lap_count, 10) || 0,
            cars_driven: monthly.cars || [],
            tracks_visited: monthly.tracks || [],
        },
        aggregate,
        traits,
    };

    // Generate prompt and call LLM
    const prompt = buildMonthlyNarrativePrompt(context);
    const llmResponse = await callLLM(prompt);

    // Create report
    const dto: CreateDriverReportDTO = {
        driver_profile_id: driverProfileId,
        report_type: 'monthly_narrative',
        title: `${monthNames[month - 1]} ${year} Performance Summary`,
        content_json: llmResponse,
        ai_model: 'mock',
        ai_prompt_version: PROMPT_VERSION,
        generation_context: context as unknown as Record<string, unknown>,
        status: 'published',
    };

    const report = await createDriverReport(dto);
    console.log(`[ReportGen] Created monthly summary report ${report.id}`);
    return report;
}
