/**
 * Bootstrap Types
 * 
 * Types for the /me/bootstrap response.
 * Single source of truth for client initialization.
 */

// ============================================================================
// USER
// ============================================================================

export interface BootstrapUser {
    id: string;
    email: string;
    displayName: string;
}

// ============================================================================
// MEMBERSHIPS
// ============================================================================

export interface TeamMembership {
    id: string;
    name: string;
    role: 'driver' | 'engineer' | 'manager' | 'viewer';
}

export interface LeagueMembership {
    id: string;
    name: string;
    role: 'racecontrol' | 'steward' | 'admin' | 'viewer';
}

export interface BootstrapMemberships {
    teams: TeamMembership[];
    leagues: LeagueMembership[];
}

// ============================================================================
// LICENSES
// ============================================================================

export interface BootstrapLicenses {
    blackbox: boolean;
    controlbox: boolean;
    racebox_plus: boolean;
}

// ============================================================================
// ROLES & CAPABILITIES
// ============================================================================

export type BootstrapRole = 'driver' | 'team' | 'racecontrol' | 'admin';

export interface BootstrapCapabilities {
    // BlackBox - Driver (Live Race Execution)
    driver_hud: boolean;
    situational_awareness: boolean;  // NOT "ai_coaching"
    voice_engineer: boolean;
    personal_telemetry: boolean;

    // BlackBox - Team
    pitwall_view: boolean;
    multi_car_monitor: boolean;
    strategy_timeline: boolean;

    // ControlBox - Race Control
    incident_review: boolean;
    penalty_assign: boolean;
    protest_review: boolean;
    rulebook_manage: boolean;
    session_authority: boolean;

    // RaceBox Plus - Broadcast
    racebox_access: boolean;
    broadcast_overlays: boolean;
    director_controls: boolean;
    public_timing: boolean;
}

export type CapabilityKey = keyof BootstrapCapabilities;

// ============================================================================
// SURFACES & UI
// ============================================================================

export type BootstrapSurface = 'driver' | 'team' | 'racecontrol' | 'broadcast' | 'driverbox';

export interface BootstrapUI {
    /** Default landing page after login */
    defaultLanding: string;
    /** Surfaces user can access based on capabilities */
    availableSurfaces: BootstrapSurface[];
}

// ============================================================================
// FULL RESPONSE
// ============================================================================

export interface BootstrapResponse {
    user: BootstrapUser;
    memberships: BootstrapMemberships;
    licenses: BootstrapLicenses;
    roles: BootstrapRole[];
    capabilities: BootstrapCapabilities;
    ui: BootstrapUI;
}

// ============================================================================
// CAPABILITY → ROUTE/SURFACE MAPPING
// ============================================================================

/**
 * Maps routes to required capabilities.
 * App should NEVER branch on license name — only capabilities.
 */
export const ROUTE_CAPABILITIES: Record<string, CapabilityKey> = {
    '/team': 'pitwall_view',
    '/team/:sessionId': 'pitwall_view',
    '/incidents': 'incident_review',
    '/incidents/:id': 'incident_review',
    '/protests': 'protest_review',
    '/rulebooks': 'rulebook_manage',
    '/penalties': 'penalty_assign',
    '/audit': 'session_authority',
    '/broadcast': 'racebox_access',
} as const;

/**
 * Maps surfaces to required capabilities.
 * Used by relay to determine mode availability.
 */
export const SURFACE_CAPABILITIES: Record<BootstrapSurface, CapabilityKey> = {
    driver: 'driver_hud',
    team: 'pitwall_view',
    racecontrol: 'incident_review',
    broadcast: 'racebox_access',
    driverbox: 'personal_telemetry', // Team IDP uses personal telemetry capability
} as const;
