/**
 * Driver Report Generation Service
 * Generates AI-powered reports using OpenAI with structured prompt templates
 * 
 * ETHOS: Equal Professional Dignity
 * - AI outputs use race engineer language, not coaching/motivation
 * - All drivers receive the same professional treatment
 * - Reports are factual, neutral, concise, actionable
 */

import OpenAI from 'openai';
import { createDriverReport, CreateDriverReportDTO } from '../../../db/repositories/driver-reports.repo.js';
import { getSessionMetrics } from '../../../db/repositories/session-metrics.repo.js';
import { getGlobalAggregate } from '../../../db/repositories/driver-aggregates.repo.js';
import { getCurrentTraits } from '../../../db/repositories/driver-traits.repo.js';
import { getDriverProfileById } from '../../../db/repositories/driver-profile.repo.js';
import { pool } from '../../../db/client.js';
import { DriverReport, SessionMetrics, DriverTrait, DriverAggregate } from '../../types/idp.types.js';
import { config } from '../../../config/index.js';

// ========================
// OpenAI Client (Lazy-loaded)
// ========================

let _openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
    if (!_openai) {
        const apiKey = config.openaiApiKey || process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OpenAI API key not configured. Set OPENAI_API_KEY environment variable.');
        }
        _openai = new OpenAI({ apiKey });
    }
    return _openai;
}

const AI_MODEL = 'gpt-4o-mini'; // Cost-effective for structured analysis
const PROMPT_VERSION = '2.0';

// ========================
// Prompt Templates
// ========================

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

function buildSessionDebriefPrompt(
    ctx: SessionDebriefContext,
    clips: { clipId: string; eventType: string; eventLabel: string; tags: string[]; sessionTimeMs: number }[] = [],
): string {
    const clipsSection = clips.length > 0
        ? `\n## Replay Clips Captured (${clips.length} total)\n${clips.map((c, i) =>
            `${i + 1}. [${c.eventType}] "${c.eventLabel}" at session time ${(c.sessionTimeMs / 1000).toFixed(0)}s (clipId: ${c.clipId}, tags: ${c.tags.join(', ') || 'none'})`
        ).join('\n')}\n`
        : '';

    const clipsInstruction = clips.length > 0
        ? `\n- clip_references: Array of objects, each with { clipId, reason } linking a specific replay clip to a debrief point. Reference clips that illustrate the primary_limiter, biggest_mistake, key_improvement, or strongest_segment.`
        : '';

    return `You are a race engineer providing post-session analysis.
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
${clipsSection}
Generate a session analysis as JSON with these exact fields:
- headline: One-line session summary
- primary_limiter: Primary performance limiter identified this session
- secondary_observation: Secondary technical observation
- recommended_focus: Recommended focus area for next session
- summary: 1-2 sentence engineer assessment of the session overall
- key_improvement: One specific area where driver improved vs baseline or showed strength
- key_weakness: One specific area that limited performance most
- biggest_mistake: Single most costly error or loss (null if clean session)
- strongest_segment: Best segment/stint/phase of the session and why${clipsInstruction}

LANGUAGE RULES:
- Use neutral, technical language only
- No praise, criticism, or emotional framing
- Frame limitations as technical variables, not personal failings`;
}

function buildMonthlyNarrativePrompt(ctx: MonthlyNarrativeContext): string {
    const deltas = ctx.previous_aggregate ? {
        pace: (ctx.aggregate.avg_pace_percentile ?? 0) - (ctx.previous_aggregate.avg_pace_percentile ?? 0),
        consistency: (ctx.aggregate.consistency_index ?? 0) - (ctx.previous_aggregate.consistency_index ?? 0),
        risk: (ctx.aggregate.risk_index ?? 0) - (ctx.previous_aggregate.risk_index ?? 0),
    } : null;

    return `You are a performance analyst writing a monthly technical summary.
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

Generate a monthly performance summary containing:
1. Period assessment (1-2 sentences, neutral)
2. Notable observations (2-3 items)
3. Patterns identified in data
4. Recommended development priorities (3 items, ranked by impact)

LANGUAGE RULES:
- Use neutral, technical language only
- No praise, criticism, or emotional framing
- Frame all observations as data points, not judgments`;
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

interface SessionDebriefResponse {
    headline: string;
    primary_limiter: string;
    secondary_observation: string;
    recommended_focus: string;
    // Phase 0: 4-point debrief fields for DebriefCard
    summary?: string;
    key_improvement?: string | null;
    key_weakness?: string | null;
    biggest_mistake?: string | null;
    strongest_segment?: string | null;
}

interface MonthlyNarrativeResponse {
    title: string;
    period_assessment: string;
    observations: string[];
    patterns: string[];
    development_priorities: string[];
}

async function callOpenAI<T>(
    prompt: string,
    responseSchema: 'session_debrief' | 'monthly_narrative'
): Promise<T> {
    // Check if API key is configured
    if (!config.openaiApiKey && !process.env.OPENAI_API_KEY) {
        console.warn('[ReportGen] OpenAI API key not configured, using mock response');
        return getMockResponse(responseSchema) as T;
    }

    try {
        const completion = await getOpenAIClient().chat.completions.create({
            model: AI_MODEL,
            messages: [
                {
                    role: 'system',
                    content: 'You are a race engineer providing technical analysis. Always respond with valid JSON matching the requested schema.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            response_format: { type: 'json_object' },
            max_tokens: 500,
            temperature: 0.3, // Low temp for consistency
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
            throw new Error('Empty response from OpenAI');
        }

        return JSON.parse(content) as T;
    } catch (error) {
        console.error('[ReportGen] OpenAI call failed:', error);
        // Fallback to mock response
        return getMockResponse(responseSchema) as T;
    }
}

function getMockResponse(type: 'session_debrief' | 'monthly_narrative'): SessionDebriefResponse | MonthlyNarrativeResponse {
    if (type === 'session_debrief') {
        return {
            headline: 'Variance Elevated in Sector 2',
            primary_limiter: 'Brake release timing at corner entry. Lap time variance concentrated in mid-sector complex.',
            secondary_observation: 'Pace degradation index indicates tire management within acceptable parameters.',
            recommended_focus: 'Isolate sector 2 corners for reference lap analysis. Target consistent brake release point.',
            summary: 'Lap time variance concentrated in sector 2 entry phase. Tire management nominal. Brake release timing is the primary development target.',
            key_improvement: 'Tire management within target window across full stint length.',
            key_weakness: 'Brake release timing at corner entry producing elevated lap variance.',
            biggest_mistake: null,
            strongest_segment: 'Final stint pace remained within 0.3% of opening stint median.',
        };
    }
    return {
        title: 'Monthly Performance Summary',
        period_assessment: 'Activity level nominal. Performance indices stable relative to prior period.',
        observations: ['Consistency index improved', 'Incident rate reduced'],
        patterns: ['Elevated variance on high-downforce circuits'],
        development_priorities: ['Brake consistency', 'Long run pace management', 'Qualifying lap execution'],
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

    // Fetch required data (including replay clips for this session)
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

    // Fetch replay clips for this session (if any)
    let clipsSummary: { clipId: string; eventType: string; eventLabel: string; tags: string[]; sessionTimeMs: number }[] = [];
    try {
        const clipsResult = await pool.query<{
            clip_id: string; event_type: string; event_label: string;
            tags: string[] | null; session_time_ms: number;
        }>(
            'SELECT clip_id, event_type, event_label, tags, session_time_ms FROM replay_clips WHERE session_id = $1 ORDER BY session_time_ms ASC',
            [sessionId]
        );
        clipsSummary = clipsResult.rows.map(r => ({
            clipId: r.clip_id,
            eventType: r.event_type,
            eventLabel: r.event_label,
            tags: r.tags || [],
            sessionTimeMs: r.session_time_ms,
        }));
    } catch {
        // replay_clips table may not exist yet — skip gracefully
    }

    // Build context
    const context: SessionDebriefContext = {
        driver_name: profile.display_name,
        car_name: (session.metadata?.car_name as string) || 'Unknown Car',
        track_name: session.track_name || 'Unknown Track',
        session_type: session.session_type || 'Unknown',
        metrics,
        traits,
    };

    // Generate prompt and call OpenAI
    const prompt = buildSessionDebriefPrompt(context, clipsSummary);
    const llmResponse = await callOpenAI<SessionDebriefResponse>(prompt, 'session_debrief');

    // Create report (include clips in content for browser rendering)
    const contentWithClips = {
        ...llmResponse as unknown as Record<string, unknown>,
        replay_clips: clipsSummary,
    };

    const dto: CreateDriverReportDTO = {
        driver_profile_id: driverProfileId,
        report_type: 'session_debrief',
        session_id: sessionId,
        title: `Session Analysis: ${session.track_name}`,
        content_json: contentWithClips,
        ai_model: AI_MODEL,
        ai_prompt_version: PROMPT_VERSION,
        generation_context: context as unknown as Record<string, unknown>,
        status: 'published',
    };

    const report = await createDriverReport(dto);
    console.log(`[ReportGen] Created session analysis report ${report.id} (${clipsSummary.length} clips linked)`);
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

    // Generate prompt and call OpenAI
    const prompt = buildMonthlyNarrativePrompt(context);
    const llmResponse = await callOpenAI<MonthlyNarrativeResponse>(prompt, 'monthly_narrative');

    // Create report
    const dto: CreateDriverReportDTO = {
        driver_profile_id: driverProfileId,
        report_type: 'monthly_narrative',
        title: `${monthNames[month - 1]} ${year} Performance Summary`,
        content_json: llmResponse as unknown as Record<string, unknown>,
        ai_model: AI_MODEL,
        ai_prompt_version: PROMPT_VERSION,
        generation_context: context as unknown as Record<string, unknown>,
        status: 'published',
    };

    const report = await createDriverReport(dto);
    console.log(`[ReportGen] Created monthly summary report ${report.id}`);
    return report;
}
