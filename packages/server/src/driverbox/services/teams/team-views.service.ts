/**
 * Team Views Service
 * Aggregates data from Individual Driver Profile (IDP) system for team consumption.
 * 
 * CRITICAL CONSTRAINT: READ-ONLY
 * This service must NEVER modify driver data. It only reads data that the team
 * has been granted access to via `driver_access_grants`.
 */

import { getActiveMembers } from '../../../db/repositories/team-membership.repo.js';
import { getDriverProfileById } from '../../../db/repositories/driver-profile.repo.js';
import { getGlobalAggregate } from '../../../db/repositories/driver-aggregates.repo.js';
import { getCurrentTraits } from '../../../db/repositories/driver-traits.repo.js';
import type {
    TeamRosterView,
    TeamMemberView,
    DriverSummaryForTeam,
} from '../../types/team.types.js';
import { getTeamById } from '../../../db/repositories/team.repo.js';

/**
 * Get the full team roster with aggregated driver summaries.
 * Each driver's data is filtered based on their specific access grant scope.
 */
export async function getTeamRosterView(teamId: string): Promise<TeamRosterView | null> {
    const team = await getTeamById(teamId);
    if (!team) return null;

    const memberships = await getActiveMembers(teamId);

    const memberViews = await Promise.all(memberships.map(async (m) => {
        // 1. Get base profile (public info)
        const profile = await getDriverProfileById(m.driver_profile_id);
        if (!profile) return null;

        // 2. Determine access scope
        // If access_grant_id exists, we have at least 'team_standard'
        // We can also re-verify the grant here if strictness is needed
        const hasAccess = !!m.access_grant_id;

        // 3. Aggregate data if access granted
        let summary: DriverSummaryForTeam | undefined;

        if (hasAccess) {
            // Fetch global aggregates (all_time)
            const aggregates = await getGlobalAggregate(m.driver_profile_id, 'all_time');

            // Fetch traits
            const traits = await getCurrentTraits(m.driver_profile_id);

            // Determine recent form (placeholder logic - would use windowed aggregates)
            // TODO: Implement actual form logic comparing 30d vs 90d aggregates
            const form: 'improving' | 'stable' | 'declining' | 'insufficient_data' =
                aggregates ? 'stable' : 'insufficient_data';

            if (aggregates) {
                summary = {
                    total_sessions: aggregates.session_count,
                    total_laps: aggregates.lap_count,
                    avg_pace_percentile: aggregates.avg_pace_percentile,
                    consistency_index: aggregates.consistency_index,
                    headline_traits: traits
                        .filter(t => t.confidence > 0.7) // Only high confidence traits for roster
                        .map(t => t.trait_label)
                        .slice(0, 3), // Top 3 only
                    recent_form: form,
                };
            }
        }

        const view: TeamMemberView = {
            membership_id: m.id,
            driver_profile_id: m.driver_profile_id,
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
            role: m.role,
            joined_at: m.joined_at,
            access_scope: m.access_grant_id ? 'granted' : 'pending',
            summary,
        };

        return view;
    }));

    // Filter out nulls (deleted profiles)
    const validMembers = memberViews.filter((m): m is TeamMemberView => m !== null);

    return {
        team_id: team.id,
        team_name: team.name,
        member_count: validMembers.length,
        members: validMembers,
    };
}
