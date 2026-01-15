/**
 * Individual Driver Profile (IDP) - Type Definitions
 * The foundational identity layer for Ok, Box Box
 */

// ========================
// Core Entities
// ========================

export interface DriverProfile {
    id: string;
    user_account_id: string | null;
    display_name: string;
    avatar_url: string | null;
    bio: string | null;
    primary_discipline: Discipline;
    timezone: string;
    privacy_level: PrivacyLevel;
    total_sessions: number;
    total_laps: number;
    total_incidents: number;
    created_at: Date;
    updated_at: Date;
}

export type Discipline = 'road' | 'oval' | 'dirt_road' | 'dirt_oval';
export type PrivacyLevel = 'public' | 'team_only' | 'private';

export interface LinkedRacingIdentity {
    id: string;
    driver_profile_id: string;
    platform: RacingPlatform;
    platform_user_id: string;
    platform_display_name: string | null;
    verified_at: Date | null;
    verification_method: VerificationMethod | null;
    verification_token: string | null;
    last_synced_at: Date | null;
    sync_status: SyncStatus;
    created_at: Date;
    updated_at: Date;
}

export type RacingPlatform = 'iracing' | 'acc' | 'rf2';
export type VerificationMethod = 'oauth' | 'relay_handshake' | 'manual';
export type SyncStatus = 'pending' | 'active' | 'failed' | 'stale';

// ========================
// Session Metrics
// ========================

export interface SessionMetrics {
    id: string;
    session_id: string;
    driver_profile_id: string;

    // Lap metrics
    total_laps: number;
    valid_laps: number;
    best_lap_time_ms: number | null;
    median_lap_time_ms: number | null;
    mean_lap_time_ms: number | null;
    lap_time_std_dev_ms: number | null;

    // Pace metrics
    pace_percentile: number | null;
    gap_to_leader_best_pct: number | null;

    // Incident metrics
    incident_count: number;
    incidents_per_100_laps: number | null;

    // Race-specific
    finish_position: number | null;
    start_position: number | null;
    positions_gained: number | null;
    sof: number | null;
    irating_change: number | null;

    // Derived proxies
    pace_dropoff_score: number | null;
    traffic_time_loss_ms: number | null;

    computed_at: Date;
}

// ========================
// Driver Aggregates
// ========================

export interface DriverAggregate {
    id: string;
    driver_profile_id: string;

    // Context
    car_name: string | null;
    track_name: string | null;
    discipline: Discipline | null;

    // Window
    window_type: WindowType;
    window_start: Date | null;
    window_end: Date | null;

    // Counts
    session_count: number;
    lap_count: number;

    // Pace
    avg_pace_percentile: number | null;
    best_pace_percentile: number | null;
    pace_trend: number | null;

    // Consistency
    consistency_index: number | null;
    avg_std_dev_ms: number | null;

    // Risk
    risk_index: number | null;
    avg_incidents_per_100_laps: number | null;

    // Race craft
    avg_positions_gained: number | null;
    start_performance_index: number | null;

    // Endurance
    endurance_fitness_index: number | null;

    computed_at: Date;
}

export type WindowType = 'all_time' | 'rolling_30d' | 'rolling_90d' | 'season';

// ========================
// Driver Traits
// ========================

export interface DriverTrait {
    id: string;
    driver_profile_id: string;
    trait_key: string;
    trait_label: string;
    trait_category: TraitCategory;
    confidence: number;
    evidence_summary: string;
    valid_from: Date;
    valid_until: Date | null;
    computed_at: Date;
}

export type TraitCategory = 'consistency' | 'risk' | 'pace' | 'endurance' | 'racecraft' | 'style';

// Predefined trait keys
export const TRAIT_KEYS = {
    HIGH_VARIANCE: 'high_variance',
    LOW_VARIANCE: 'low_variance',
    CONSERVATIVE_RISK: 'conservative_risk',
    AGGRESSIVE_RISK: 'aggressive_risk',
    LATE_BRAKER: 'late_braker',
    STRONG_LONG_RUN: 'strong_long_run',
    WEAK_LONG_RUN: 'weak_long_run',
    FAST_STARTER: 'fast_starter',
    SLOW_STARTER: 'slow_starter',
    TIRE_SENSITIVE: 'tire_sensitive',
} as const;

// ========================
// Driver Reports
// ========================

export interface DriverReport {
    id: string;
    driver_profile_id: string;
    report_type: ReportType;
    session_id: string | null;
    title: string;
    content_json: Record<string, unknown>;
    content_html: string | null;
    content_markdown: string | null;
    ai_model: string | null;
    ai_prompt_version: string | null;
    generation_context: Record<string, unknown> | null;
    status: ReportStatus;
    published_at: Date | null;
    created_at: Date;
    updated_at: Date;
}

export type ReportType = 'session_debrief' | 'weekly_summary' | 'monthly_narrative' | 'development_focus' | 'custom';
export type ReportStatus = 'draft' | 'published' | 'archived';

// ========================
// Access Grants
// ========================

export interface DriverAccessGrant {
    id: string;
    driver_profile_id: string;
    grantee_type: GranteeType;
    grantee_id: string;
    scope: AccessScope;
    granted_at: Date;
    granted_by: string | null;
    expires_at: Date | null;
    revoked_at: Date | null;
    notes: string | null;
}

export type GranteeType = 'league' | 'user';
export type AccessScope = 'public' | 'team_standard' | 'team_deep';

// ========================
// API DTOs
// ========================

export interface DriverSummary {
    id: string;
    display_name: string;
    avatar_url: string | null;
    primary_discipline: Discipline;
    headline_stats: {
        total_sessions: number;
        total_laps: number;
        avg_pace_percentile: number | null;
        consistency_index: number | null;
        risk_index: number | null;
    };
    current_irating?: number;
    current_traits?: string[];
}

export interface CreateDriverProfileDTO {
    display_name: string;
    avatar_url?: string;
    bio?: string;
    primary_discipline?: Discipline;
    timezone?: string;
    privacy_level?: PrivacyLevel;
}

export interface UpdateDriverProfileDTO {
    display_name?: string;
    avatar_url?: string;
    bio?: string;
    primary_discipline?: Discipline;
    timezone?: string;
    privacy_level?: PrivacyLevel;
}

export interface LinkIdentityDTO {
    platform: RacingPlatform;
    platform_user_id: string;
    platform_display_name?: string;
    verification_method: VerificationMethod;
}

export interface CreateAccessGrantDTO {
    grantee_type: GranteeType;
    grantee_id: string;
    scope: AccessScope;
    expires_at?: Date;
    notes?: string;
}

// ========================
// Resolved Access Context
// ========================

export type ResolvedScope = 'public' | 'team_standard' | 'team_deep' | 'owner' | null;

export interface AccessContext {
    scope: ResolvedScope;
    driver_profile_id: string;
    requester_id: string | null;
    via_grant_id?: string;
}
