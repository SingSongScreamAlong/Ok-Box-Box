import { supabase } from './supabase';

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
