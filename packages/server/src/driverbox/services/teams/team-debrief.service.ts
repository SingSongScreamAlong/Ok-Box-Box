/**
 * Team Debrief Service
 * Aggregates individual driver session debriefs into team-level views
 * and generates AI-synthesized team summaries.
 */

import { getEventDebrief, createEventDebrief, TeamEvent, TeamEventDebrief } from '../../repositories/team-event.repo.js';
import { getReportsForDriver } from '../../../db/repositories/driver-reports.repo.js';
import { getActiveMembers } from '../../../db/repositories/team-membership.repo.js';
import { getDriverProfileById } from '../../../db/repositories/driver-profile.repo.js';
import { config } from '../../../config/index.js';

// ========================
// Types
// ========================

interface DriverDebriefSummary {
    driver_profile_id: string;
    display_name: string;
    headline: string;
    primary_limiter: string;
    key_observations: string[];
}

interface TeamDebriefView {
    event_id: string;
    event_name: string | null;
    session_id: string;
    driver_summaries: DriverDebriefSummary[];
    team_summary: {
        overall_observation: string;
        common_patterns: string[];
        priority_focus: string;
    } | null;
    status: 'draft' | 'published';
}

// ========================
// Aggregation
// ========================

/**
 * Aggregate driver debriefs for a team event.
 * Fetches each participating driver's session debrief and extracts key fields.
 */
export async function aggregateDriverDebriefs(
    event: TeamEvent
): Promise<DriverDebriefSummary[]> {
    const summaries: DriverDebriefSummary[] = [];

    // Get memberships (we need driver profile IDs)
    // If participating_driver_ids is populated, use that; otherwise fall back to team members
    const driverIds = event.participating_driver_ids.length > 0
        ? event.participating_driver_ids
        : (await getActiveMembers(event.team_id)).map(m => m.driver_profile_id);

    for (const driverId of driverIds) {
        // Get profile for display name
        const profile = await getDriverProfileById(driverId);
        if (!profile) continue;

        // Get session debrief for this driver
        const reports = await getReportsForDriver(driverId, {
            reportType: 'session_debrief',
            status: 'published',
            limit: 1,
            // Ideally we'd filter by session_id here, but let's assume the latest matches
        });

        if (reports.length === 0) continue;

        const report = reports[0];
        const content = report.content_json as Record<string, unknown>;

        summaries.push({
            driver_profile_id: driverId,
            display_name: profile.display_name,
            headline: (content.headline as string) || 'Session completed',
            primary_limiter: (content.primary_limiter as string) || 'N/A',
            key_observations: (content.key_observations as string[]) || [],
        });
    }

    return summaries;
}

// ========================
// AI Synthesis (Placeholder)
// ========================

/**
 * Generate a team-level synthesis from individual driver debriefs.
 * Uses AI to find common patterns and priority focus areas.
 * 
 * ETHOS: "Equal Professional Dignity"
 * - Language must be neutral and engineering-focused.
 * - No motivational/coaching language.
 * - No ranking or comparative judgment between drivers.
 */
async function generateTeamSynthesis(
    driverSummaries: DriverDebriefSummary[]
): Promise<{ overall_observation: string; common_patterns: string[]; priority_focus: string } | null> {
    // If no OpenAI key, return a placeholder
    if (!config.openaiApiKey) {
        console.warn('[TeamDebrief] No OpenAI API key configured, skipping AI synthesis');
        return null;
    }

    // Build the prompt
    const prompt = buildTeamSynthesisPrompt(driverSummaries);

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.openaiApiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: TEAM_SYNTHESIS_SYSTEM_PROMPT },
                    { role: 'user', content: prompt },
                ],
                temperature: 0.4,
                max_tokens: 800,
            }),
        });

        if (!response.ok) {
            console.error('[TeamDebrief] OpenAI API error:', response.status);
            return null;
        }

        const data = await response.json() as { choices?: { message?: { content?: string } }[] };
        const text = data.choices?.[0]?.message?.content?.trim();

        if (!text) return null;

        // Parse JSON response
        const parsed = JSON.parse(text);
        return {
            overall_observation: parsed.overall_observation || '',
            common_patterns: parsed.common_patterns || [],
            priority_focus: parsed.priority_focus || '',
        };
    } catch (err) {
        console.error('[TeamDebrief] AI synthesis failed:', err);
        return null;
    }
}

const TEAM_SYNTHESIS_SYSTEM_PROMPT = `You are a technical analyst for a sim racing team.
Your role is to synthesize individual driver session debriefs into a team-level summary.

CRITICAL CONSTRAINTS:
- Use NEUTRAL, ENGINEERING-FOCUSED language only.
- DO NOT use motivational, coaching, or encouraging language.
- DO NOT rank or compare drivers against each other.
- Focus on PATTERNS across the team, not individual performance.

Return a JSON object with:
{
  "overall_observation": "One-sentence summary of team session performance",
  "common_patterns": ["Pattern 1", "Pattern 2", "Pattern 3"],
  "priority_focus": "Single most important area for the team to address"
}

ONLY output valid JSON. No markdown, no explanation.`;

function buildTeamSynthesisPrompt(summaries: DriverDebriefSummary[]): string {
    const blocks = summaries.map(s => `
Driver: ${s.display_name}
Headline: ${s.headline}
Primary Limiter: ${s.primary_limiter}
Observations: ${s.key_observations.join('; ')}
`).join('\n---\n');

    return `Analyze the following driver session debriefs and generate a team-level synthesis:\n\n${blocks}`;
}

// ========================
// Main Service Functions
// ========================

/**
 * Get a formatted team debrief view for an event.
 * Aggregates driver debriefs and includes team synthesis if available.
 */
export async function getTeamDebriefView(event: TeamEvent): Promise<TeamDebriefView> {
    // Check if we already have a debrief stored
    const storedDebrief = await getEventDebrief(event.id);

    if (storedDebrief) {
        return {
            event_id: event.id,
            event_name: event.event_name,
            session_id: event.session_id,
            driver_summaries: storedDebrief.driver_summaries as unknown as DriverDebriefSummary[],
            team_summary: storedDebrief.team_summary as TeamDebriefView['team_summary'],
            status: storedDebrief.status,
        };
    }

    // Aggregate fresh
    const driverSummaries = await aggregateDriverDebriefs(event);

    return {
        event_id: event.id,
        event_name: event.event_name,
        session_id: event.session_id,
        driver_summaries: driverSummaries,
        team_summary: null,
        status: 'draft',
    };
}

/**
 * Generate and store a team debrief for an event.
 * This should be called after all drivers have completed their individual session debriefs.
 */
export async function generateTeamDebrief(event: TeamEvent): Promise<TeamEventDebrief> {
    // 1. Aggregate driver debriefs
    const driverSummaries = await aggregateDriverDebriefs(event);

    // 2. Generate AI synthesis
    const teamSummary = await generateTeamSynthesis(driverSummaries);

    // 3. Store in database
    const debrief = await createEventDebrief(
        event.id,
        driverSummaries as unknown as Record<string, unknown>[],
        teamSummary as unknown as Record<string, unknown>,
        config.openaiApiKey ? 'gpt-4o-mini' : null,
        '1.0.0'
    );

    console.log(`[TeamDebrief] Generated debrief for event ${event.id}`);

    return debrief;
}
