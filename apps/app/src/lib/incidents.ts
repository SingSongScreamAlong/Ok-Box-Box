import { supabase } from './supabase';

// Demo incidents for testing
export const DEMO_INCIDENTS: Incident[] = [
  {
    id: 'inc1',
    session_id: 'sess1',
    incident_type: 'contact',
    contact_type: 'side_by_side',
    severity: 'medium',
    severity_score: 6,
    lap_number: 23,
    session_time_ms: 2340000,
    track_position: 0.45,
    corner_name: 'Turn 1',
    involved_drivers: [
      { driverId: 'd1', driverName: 'Alex Rivera', carNumber: '42', role: 'victim', faultProbability: 0.2 },
      { driverId: 'd5', driverName: 'Marcus Thompson', carNumber: '17', role: 'aggressor', faultProbability: 0.8 }
    ],
    fault_attribution: { 'd5': 0.8, 'd1': 0.2 },
    ai_recommendation: 'Drive Through Penalty',
    ai_confidence: 0.85,
    ai_reasoning: 'Car #17 made contact while attempting an overtake with insufficient overlap. Clear case of causing a collision.',
    telemetry_snapshot: {},
    replay_timestamp_ms: 2340000,
    status: 'pending',
    reviewed_by: null,
    reviewed_at: null,
    steward_notes: null,
    created_at: '2026-01-15T16:30:00Z',
    updated_at: '2026-01-15T16:30:00Z',
    session: { track_name: 'Daytona International Speedway', session_type: 'race' }
  },
  {
    id: 'inc2',
    session_id: 'sess1',
    incident_type: 'unsafe_rejoin',
    contact_type: null,
    severity: 'heavy',
    severity_score: 8,
    lap_number: 45,
    session_time_ms: 4500000,
    track_position: 0.72,
    corner_name: 'Bus Stop',
    involved_drivers: [
      { driverId: 'd6', driverName: 'Elena Rodriguez', carNumber: '88', role: 'aggressor', faultProbability: 1.0 },
      { driverId: 'd7', driverName: 'James Wilson', carNumber: '23', role: 'victim', faultProbability: 0 }
    ],
    fault_attribution: { 'd6': 1.0 },
    ai_recommendation: 'Stop and Go Penalty',
    ai_confidence: 0.92,
    ai_reasoning: 'Car #88 rejoined the track unsafely after going off, causing contact with Car #23.',
    telemetry_snapshot: {},
    replay_timestamp_ms: 4500000,
    status: 'reviewing',
    reviewed_by: 'steward-1',
    reviewed_at: null,
    steward_notes: 'Reviewing telemetry data',
    created_at: '2026-01-15T17:15:00Z',
    updated_at: '2026-01-15T17:20:00Z',
    session: { track_name: 'Daytona International Speedway', session_type: 'race' }
  },
  {
    id: 'inc3',
    session_id: 'sess1',
    incident_type: 'blocking',
    contact_type: null,
    severity: 'light',
    severity_score: 3,
    lap_number: 12,
    session_time_ms: 1200000,
    track_position: 0.15,
    corner_name: 'Turn 3',
    involved_drivers: [
      { driverId: 'd8', driverName: 'Carlos Mendez', carNumber: '55', role: 'aggressor', faultProbability: 0.7 },
      { driverId: 'd9', driverName: 'Sarah Chen', carNumber: '31', role: 'victim', faultProbability: 0.3 }
    ],
    fault_attribution: { 'd8': 0.7, 'd9': 0.3 },
    ai_recommendation: 'Warning',
    ai_confidence: 0.65,
    ai_reasoning: 'Borderline blocking - Car #55 made a late defensive move but within acceptable limits.',
    telemetry_snapshot: {},
    replay_timestamp_ms: 1200000,
    status: 'no_action',
    reviewed_by: 'steward-2',
    reviewed_at: '2026-01-15T15:00:00Z',
    steward_notes: 'Racing incident, no further action required.',
    created_at: '2026-01-15T14:45:00Z',
    updated_at: '2026-01-15T15:00:00Z',
    session: { track_name: 'Daytona International Speedway', session_type: 'race' }
  },
  {
    id: 'inc4',
    session_id: 'sess1',
    incident_type: 'causing_collision',
    contact_type: 'rear_end',
    severity: 'critical',
    severity_score: 10,
    lap_number: 67,
    session_time_ms: 6700000,
    track_position: 0.88,
    corner_name: 'International Horseshoe',
    involved_drivers: [
      { driverId: 'd10', driverName: 'Mike Johnson', carNumber: '7', role: 'aggressor', faultProbability: 0.95 },
      { driverId: 'd11', driverName: 'Tom Anderson', carNumber: '12', role: 'victim', faultProbability: 0.05 }
    ],
    fault_attribution: { 'd10': 0.95, 'd11': 0.05 },
    ai_recommendation: 'Disqualification',
    ai_confidence: 0.88,
    ai_reasoning: 'Deliberate contact from behind causing race-ending damage to Car #12.',
    telemetry_snapshot: {},
    replay_timestamp_ms: 6700000,
    status: 'penalty_issued',
    reviewed_by: 'steward-1',
    reviewed_at: '2026-01-15T18:30:00Z',
    steward_notes: 'Disqualified from event. 3 penalty points added to license.',
    created_at: '2026-01-15T18:00:00Z',
    updated_at: '2026-01-15T18:30:00Z',
    session: { track_name: 'Daytona International Speedway', session_type: 'race' }
  }
];

export interface Incident {
  id: string;
  session_id: string | null;
  incident_type: string;
  contact_type: string | null;
  severity: string;
  severity_score: number | null;
  lap_number: number | null;
  session_time_ms: number | null;
  track_position: number | null;
  corner_name: string | null;
  involved_drivers: InvolvedDriver[];
  fault_attribution: Record<string, number>;
  ai_recommendation: string | null;
  ai_confidence: number | null;
  ai_reasoning: string | null;
  telemetry_snapshot: Record<string, unknown>;
  replay_timestamp_ms: number | null;
  status: 'pending' | 'reviewing' | 'penalty_issued' | 'no_action' | 'dismissed';
  reviewed_by: string | null;
  reviewed_at: string | null;
  steward_notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  session?: {
    track_name: string;
    session_type: string;
  };
}

export interface InvolvedDriver {
  driverId: string;
  driverName: string;
  carNumber: string;
  role: 'aggressor' | 'victim' | 'involved' | 'unknown';
  faultProbability?: number;
}

export interface IncidentFilters {
  leagueId?: string;
  sessionId?: string;
  status?: string;
  severity?: string;
  type?: string;
}

// Get incidents for a league
export async function getLeagueIncidents(
  leagueId: string,
  filters: IncidentFilters = {}
): Promise<Incident[]> {
  // Return demo incidents for demo league
  if (leagueId === 'demo') {
    let incidents = [...DEMO_INCIDENTS];
    if (filters.status) {
      incidents = incidents.filter(i => i.status === filters.status);
    }
    if (filters.severity) {
      incidents = incidents.filter(i => i.severity === filters.severity);
    }
    if (filters.type) {
      incidents = incidents.filter(i => i.incident_type === filters.type);
    }
    return incidents;
  }

  let query = supabase
    .from('incidents')
    .select(`
      *,
      session:sessions(track_name, session_type, league_id)
    `)
    .order('created_at', { ascending: false });

  // Filter by league through sessions
  query = query.eq('session.league_id', leagueId);

  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.severity) {
    query = query.eq('severity', filters.severity);
  }
  if (filters.type) {
    query = query.eq('incident_type', filters.type);
  }
  if (filters.sessionId) {
    query = query.eq('session_id', filters.sessionId);
  }

  const { data, error } = await query.limit(100);

  if (error) {
    console.error('Error fetching incidents:', error);
    return [];
  }

  return (data || []).filter(i => i.session?.league_id === leagueId);
}

// Get a single incident by ID
export async function getIncident(incidentId: string): Promise<Incident | null> {
  const { data, error } = await supabase
    .from('incidents')
    .select(`
      *,
      session:sessions(track_name, session_type, league_id)
    `)
    .eq('id', incidentId)
    .single();

  if (error) {
    console.error('Error fetching incident:', error);
    return null;
  }

  return data;
}

// Update incident status
export async function updateIncidentStatus(
  incidentId: string,
  status: Incident['status'],
  reviewedBy: string,
  stewardNotes?: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('incidents')
    .update({
      status,
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      steward_notes: stewardNotes || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', incidentId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Get incident counts by status for a league
export async function getIncidentCounts(leagueId: string): Promise<Record<string, number>> {
  const incidents = await getLeagueIncidents(leagueId);
  
  const counts: Record<string, number> = {
    pending: 0,
    reviewing: 0,
    penalty_issued: 0,
    no_action: 0,
    dismissed: 0,
    total: incidents.length
  };

  incidents.forEach(incident => {
    if (counts[incident.status] !== undefined) {
      counts[incident.status]++;
    }
  });

  return counts;
}

// Format helpers
export function formatIncidentType(type: string): string {
  const typeMap: Record<string, string> = {
    'contact': 'Contact',
    'off_track': 'Off Track',
    'unsafe_rejoin': 'Unsafe Rejoin',
    'blocking': 'Blocking',
    'pit_lane_violation': 'Pit Lane Violation',
    'jump_start': 'Jump Start',
    'cutting': 'Track Cutting',
    'causing_collision': 'Causing Collision'
  };
  return typeMap[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export function formatSeverity(severity: string): string {
  const severityMap: Record<string, string> = {
    'light': 'Light',
    'medium': 'Medium',
    'heavy': 'Heavy',
    'critical': 'Critical'
  };
  return severityMap[severity] || severity;
}

export function getSeverityColor(severity: string): string {
  const colorMap: Record<string, string> = {
    'light': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    'medium': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    'heavy': 'bg-red-500/20 text-red-400 border-red-500/30',
    'critical': 'bg-red-600/30 text-red-300 border-red-600/50'
  };
  return colorMap[severity] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
}

export function getStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    'pending': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'reviewing': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    'penalty_issued': 'bg-red-500/20 text-red-400 border-red-500/30',
    'no_action': 'bg-green-500/20 text-green-400 border-green-500/30',
    'dismissed': 'bg-slate-500/20 text-slate-400 border-slate-500/30'
  };
  return colorMap[status] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
}
