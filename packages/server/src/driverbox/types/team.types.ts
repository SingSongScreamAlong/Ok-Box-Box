/**
 * Team System Types
 * Type definitions for team entities and aggregated views
 * 
 * Teams are a permissioned view layer over IDP - they READ driver data,
 * they do not own or modify it.
 */

// ========================
// Core Entities
// ========================

export interface Team {
    id: string;
    name: string;
    short_name: string | null;
    logo_url: string | null;
    primary_color: string | null;
    owner_user_id: string | null;
    status: TeamStatus;
    created_at: Date;
    updated_at: Date;
}

export type TeamStatus = 'active' | 'archived' | 'suspended';

export interface TeamMembership {
    id: string;
    team_id: string;
    driver_profile_id: string;
    role: TeamRole;
    status: MembershipStatus;
    invited_at: Date;
    invited_by: string | null;
    joined_at: Date | null;
    left_at: Date | null;
    access_grant_id: string | null;
}

export type TeamRole = 'driver' | 'engineer' | 'manager' | 'owner';
export type MembershipStatus = 'invited' | 'active' | 'left' | 'removed';

export interface TeamEvent {
    id: string;
    team_id: string;
    session_id: string;
    event_name: string | null;
    event_type: EventType | null;
    participating_driver_ids: string[];
    notes: string | null;
    created_at: Date;
    created_by: string | null;
}

export type EventType = 'practice' | 'qualifying' | 'race' | 'endurance' | 'other';

export interface TeamEventDebrief {
    id: string;
    team_event_id: string;
    content_json: TeamDebriefContent;
    ai_model: string | null;
    ai_prompt_version: string | null;
    status: 'draft' | 'published' | 'archived';
    created_at: Date;
}

// ========================
// DTOs
// ========================

export interface CreateTeamDTO {
    name: string;
    short_name?: string;
    logo_url?: string;
    primary_color?: string;
}

export interface UpdateTeamDTO {
    name?: string;
    short_name?: string;
    logo_url?: string;
    primary_color?: string;
    status?: TeamStatus;
}

export interface InviteDriverDTO {
    driver_profile_id: string;
    role?: TeamRole;
    requested_scope: 'team_standard' | 'team_deep';
}

export interface CreateTeamEventDTO {
    session_id: string;
    event_name?: string;
    event_type?: EventType;
    participating_driver_ids: string[];
    notes?: string;
}

// ========================
// View Models (Aggregated from IDP)
// ========================

/**
 * Team roster with aggregated driver data
 * Data is fetched from IDP respecting access grants
 */
export interface TeamRosterView {
    team_id: string;
    team_name: string;
    member_count: number;
    members: TeamMemberView[];
}

export interface TeamMemberView {
    membership_id: string;
    driver_profile_id: string;
    display_name: string;
    avatar_url: string | null;
    role: TeamRole;
    joined_at: Date | null;
    access_scope: string | null;
    // Aggregated from IDP (if access granted)
    summary?: DriverSummaryForTeam;
}

/**
 * Driver summary visible to team (scope-filtered)
 */
export interface DriverSummaryForTeam {
    total_sessions: number;
    total_laps: number;
    avg_pace_percentile: number | null;
    consistency_index: number | null;
    headline_traits: string[];
    recent_form: 'improving' | 'stable' | 'declining' | 'insufficient_data';
}

/**
 * Team event with participant details
 */
export interface TeamEventView {
    id: string;
    team_id: string;
    session_id: string;
    event_name: string | null;
    event_type: EventType | null;
    created_at: Date;
    participants: Array<{
        driver_profile_id: string;
        display_name: string;
        // From session metrics if available
        finish_position?: number | null;
        best_lap_time_ms?: number | null;
    }>;
    has_debrief: boolean;
}

/**
 * Team event debrief content structure
 */
export interface TeamDebriefContent {
    // Aggregated from individual driver debriefs
    driver_summaries: Array<{
        driver_profile_id: string;
        display_name: string;
        headline: string;
        primary_limiter: string;
    }>;
    // AI-generated team synthesis
    team_synthesis: {
        overall_observation: string;
        common_patterns: string[];
        priority_focus: string;
    };
}

// ========================
// Permission Helpers
// ========================

export type TeamPermission =
    | 'team:view'          // View team details
    | 'team:edit'          // Edit team settings
    | 'team:manage_members' // Invite/remove members
    | 'team:create_events' // Create team events
    | 'team:delete';       // Archive/delete team

export function getPermissionsForRole(role: TeamRole): TeamPermission[] {
    switch (role) {
        case 'owner':
            return ['team:view', 'team:edit', 'team:manage_members', 'team:create_events', 'team:delete'];
        case 'manager':
            return ['team:view', 'team:edit', 'team:manage_members', 'team:create_events'];
        case 'engineer':
            return ['team:view', 'team:create_events'];
        case 'driver':
            return ['team:view'];
        default:
            return [];
    }
}
