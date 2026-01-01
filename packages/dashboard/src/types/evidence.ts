/**
 * Evidence Payload Types
 * 
 * Standardized schema for the "Trust First, Verify on Demand" UI model.
 * Every clickable element in the dashboard provides evidence via this structure.
 */

// ============================================================================
// CONFIDENCE & QUALITY
// ============================================================================

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export type DataQuality =
    | 'CLEAN'           // Unobstructed, valid data
    | 'TRAFFIC'         // Affected by traffic
    | 'CAUTION'         // Under yellow/caution
    | 'MIXED'           // Multiple quality levels
    | 'UNKNOWN';        // Insufficient data

export type DataProvenance =
    | 'SDK_DIRECT'      // Directly from iRacing SDK
    | 'DERIVED'         // Calculated from SDK data
    | 'INFERRED'        // Estimated with uncertainty
    | 'UNKNOWN';        // No data source

// ============================================================================
// SIGNAL TYPES
// ============================================================================

/**
 * A primary signal is a key data point driving a decision.
 */
export interface PrimarySignal {
    label: string;              // "Lap time slope"
    value: string;              // "+0.18s/lap"
    trend?: 'up' | 'down' | 'stable';
    importance: 'critical' | 'important' | 'supporting';
}

/**
 * A secondary signal provides additional context.
 */
export interface SecondarySignal {
    label: string;
    value: string;
    note?: string;              // Optional clarification
}

// ============================================================================
// MICRO VISUALS
// ============================================================================

/**
 * Compact visual data for popovers.
 * NO LARGE CHARTS. These are micro-visuals only.
 */
export interface MicroVisualData {
    type: 'sparkline' | 'bars' | 'trend';

    // For sparklines (lap times, segment times)
    sparklineData?: number[];
    sparklineLabel?: string;

    // For comparison bars
    barData?: {
        label: string;
        value: number;
        baseline: number;       // For comparison
        unit: string;
    }[];

    // For simple trend
    trendDirection?: 'up' | 'down' | 'stable';
    trendMagnitude?: 'small' | 'medium' | 'large';
}

// ============================================================================
// EVIDENCE PAYLOAD (CORE SCHEMA)
// ============================================================================

/**
 * Complete evidence payload for any UI element.
 * This is the contract between data services and UI.
 */
export interface EvidencePayload {
    // HEADER
    claim: string;              // Human-readable sentence
    confidence: ConfidenceLevel;

    // WHY THIS IS FLAGGED
    primarySignals: PrimarySignal[];

    // ADDITIONAL CONTEXT
    secondarySignals: SecondarySignal[];

    // COMPACT VISUALS
    microVisuals?: MicroVisualData[];

    // DATA QUALITY & LIMITS
    dataQuality: DataQuality;
    provenance: DataProvenance;
    limitations: string[];      // Known unknowns

    // WHAT THIS AFFECTS
    affectedDecisions: string[];

    // METADATA
    timestamp: number;
    sourceEventType?: string;   // e.g., "segment:pace_update"
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

/**
 * Semantic colors (LOCKED - never repurpose)
 */
export type StatusColor = 'green' | 'yellow' | 'red' | 'gray';

/**
 * Maps status to semantic meaning
 */
export const STATUS_SEMANTICS: Record<StatusColor, string> = {
    green: 'No action required',
    yellow: 'Prepare / monitor',
    red: 'Action required',
    gray: 'Unknown / suppressed'
};

/**
 * Role-based visibility permissions
 */
export type UserRole = 'driver' | 'spotter' | 'strategist' | 'engineer' | 'crew_chief';

export interface RolePermissions {
    canSeePopovers: boolean;
    canSeeEvidence: boolean;
    evidenceDepth: 'none' | 'limited' | 'full';
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
    driver: { canSeePopovers: false, canSeeEvidence: false, evidenceDepth: 'none' },
    spotter: { canSeePopovers: true, canSeeEvidence: true, evidenceDepth: 'limited' },
    strategist: { canSeePopovers: true, canSeeEvidence: true, evidenceDepth: 'full' },
    engineer: { canSeePopovers: true, canSeeEvidence: true, evidenceDepth: 'full' },
    crew_chief: { canSeePopovers: true, canSeeEvidence: true, evidenceDepth: 'full' }
};

// ============================================================================
// DASHBOARD PANE TYPES
// ============================================================================

/**
 * Race state for the top-left pane
 */
export interface RaceStateData {
    sessionType: string;        // "Race", "Qualifying", etc.
    currentLap: number;
    totalLaps: number | null;   // null for timed races
    timeRemaining: number | null;
    flagState: 'green' | 'yellow' | 'red' | 'white' | 'checkered';
    position: number;
    classPosition?: number;
    gap: string;                // Gap to leader
}

/**
 * Car status for the left pane
 */
export interface CarStatusData {
    fuel: {
        level: number;          // Liters
        percentage: number;     // 0-1
        lapsRemaining: number | null;
        status: StatusColor;
        evidence?: EvidencePayload;
    };
    tires: {
        wear: { fl: number; fr: number; rl: number; rr: number };
        temps: { fl: number; fr: number; rl: number; rr: number };
        compound?: string;
        status: StatusColor;
        evidence?: EvidencePayload;
    };
    damage: {
        aero: number;           // 0-1
        engine: number;         // 0-1
        status: StatusColor;
        evidence?: EvidencePayload;
    };
    stint: {
        currentLap: number;
        avgPace: string | null;
        degradationSlope: number | null;
    };
}

/**
 * Strategy timeline event
 */
export interface TimelineEvent {
    id: string;
    type: 'pit_window' | 'fuel_critical' | 'tire_cliff' | 'damage_limit' | 'decision';
    label: string;
    lapStart: number;
    lapEnd?: number;
    status: StatusColor;
    evidence?: EvidencePayload;
}

/**
 * Opponent intelligence card
 */
export interface OpponentIntelCard {
    carId: number;
    driverId: string;
    driverName: string;
    carNumber: string;
    position: number;
    gap: number;                // Seconds
    gapTrend: 'closing' | 'extending' | 'stable';
    threatLevel: StatusColor;
    pitWindow?: { earliest: number; latest: number };
    tirePhase?: 'fresh' | 'optimal' | 'degraded' | 'critical' | 'unknown';
    evidence?: EvidencePayload;
}

/**
 * Event log entry
 */
export interface EventLogEntry {
    id: string;
    timestamp: number;
    category: 'strategy' | 'opponent' | 'system' | 'warning';
    message: string;
    importance: 'info' | 'warning' | 'critical';
    evidence?: EvidencePayload;
}
