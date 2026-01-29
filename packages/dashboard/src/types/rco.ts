// =====================================================================
// RCO (Race Control Observation) Types
// Normalized incident model and state types for live race control
// =====================================================================

export type IncidentSeverity = 'info' | 'warn' | 'critical';
export type IncidentStatus = 'new' | 'acknowledged' | 'under_review' | 'closed';
export type IncidentType = 
    | 'contact' 
    | 'off_track' 
    | 'spin' 
    | 'unsafe_rejoin' 
    | 'speeding' 
    | 'blocking' 
    | 'cutting' 
    | 'other';

export interface InvolvedDriver {
    carNumber: string;
    driverName: string;
    teamName?: string;
    carClass?: string;
    iRating?: number;
}

export interface TrackLocation {
    x: number;
    y: number;
    lapDistPct: number;
}

export interface IncidentEvidence {
    replayTime?: number;
    clipId?: string;
    link?: string;
}

export interface RcoIncident {
    incidentId: string;
    timestamp: number;
    sessionTime?: number;
    lapNumber?: number;
    trackLocation: TrackLocation;
    cornerName?: string;
    sectorName?: string;
    type: IncidentType;
    severity: IncidentSeverity;
    involved: InvolvedDriver[];
    summary: string;
    explanation?: string;
    status: IncidentStatus;
    evidence?: IncidentEvidence;
}

export interface RcoFilters {
    severity: IncidentSeverity | 'all';
    type: IncidentType | 'all';
    carClass: string | 'all';
    driver: string | 'all';
    team: string | 'all';
}

export interface StandingsEntry {
    position: number;
    carNumber: string;
    driverName: string;
    teamName?: string;
    carClass?: string;
    gap: string;
    lastLap: string;
    bestLap?: string;
    lapDistPct: number;
    inPit?: boolean;
}

export type RcoConnectionStatus = 'live' | 'demo' | 'disconnected';

export interface RcoState {
    connectionStatus: RcoConnectionStatus;
    sessionId: string | null;
    trackName: string;
    sessionType: string;
    incidents: RcoIncident[];
    standings: StandingsEntry[];
    selectedIncidentId: string | null;
    autoFollowLatest: boolean;
    filters: RcoFilters;
}

export const DEFAULT_RCO_FILTERS: RcoFilters = {
    severity: 'all',
    type: 'all',
    carClass: 'all',
    driver: 'all',
    team: 'all',
};
