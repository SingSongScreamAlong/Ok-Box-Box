/**
 * Team System Types (Frontend)
 * Mirrors the backend types for IDP Team System
 */

export interface Team {
    id: string;
    name: string;
    short_name: string | null;
    logo_url: string | null;
    primary_color: string | null;
    owner_user_id: string | null;
    status: 'active' | 'archived' | 'suspended';
    member_count?: number;
}

export interface TeamRosterView {
    team_id: string;
    team_name: string;
    member_count: number;
    members: DriverSummaryForTeam[];
}

// Extended driver summary used in roster and profile views
export interface DriverSummaryForTeam {
    membership_id: string;
    driver_id: string;
    user_id: string;
    display_name: string;
    avatar_url?: string | null;
    role: string;
    access_scope: string;
    joined_at: string;
    total_sessions?: number;
    total_laps?: number;
    avg_incident_rate?: number;
    traits?: string[];
    // iRacing stats
    irating?: number;
    safety_rating?: number;
    license_class?: string;
}

// Full driver profile for profile page
export interface DriverProfile {
    id: string;
    user_id: string | null;
    display_name: string;
    avatar_url: string | null;
    bio: string | null;
    primary_discipline: 'road' | 'oval' | 'dirt_road' | 'dirt_oval';
    timezone: string;
    privacy_level: 'public' | 'team_only' | 'private';
    total_sessions: number;
    total_laps: number;
    total_incidents: number;
    created_at: string;
}

// Driver trait from IDP system
export interface DriverTrait {
    key: string;
    label: string;
    category: 'consistency' | 'risk' | 'pace' | 'endurance' | 'racecraft' | 'style';
    confidence: number;
    evidence?: string;
}

// Session metrics for history table
export interface SessionMetric {
    id: string;
    session_id: string;
    session_name?: string;
    track_name?: string;
    car_name?: string;
    total_laps: number;
    valid_laps: number;
    best_lap_time_ms: number | null;
    median_lap_time_ms: number | null;
    incident_count: number;
    finish_position: number | null;
    start_position: number | null;
    irating_change: number | null;
    computed_at: string;
}

// Aggregated performance data
export interface PerformanceData {
    driver_profile_id: string;
    global: {
        session_count: number;
        lap_count: number;
        avg_pace_percentile: number | null;
        best_pace_percentile: number | null;
        consistency_index: number | null;
        risk_index: number | null;
        avg_positions_gained: number | null;
    } | null;
    traits: DriverTrait[];
    computed_at: string;
}

// Legacy interface for backwards compatibility
export interface TeamMemberView {
    membership_id: string;
    driver_profile_id: string;
    display_name: string;
    avatar_url: string | null;
    role: 'driver' | 'engineer' | 'manager' | 'owner';
    joined_at: string | null;
    access_scope: 'granted' | 'pending' | null;
    summary?: {
        total_sessions: number;
        total_laps: number;
        avg_pace_percentile: number | null;
        consistency_index: number | null;
        headline_traits: string[];
        recent_form: 'improving' | 'stable' | 'declining' | 'insufficient_data';
    };
}
