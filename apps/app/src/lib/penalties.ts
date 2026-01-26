import { supabase } from './supabase';

export interface Penalty {
  id: string;
  session_id: string | null;
  incident_id: string | null;
  rulebook_id: string | null;
  driver_id: string;
  driver_name: string;
  car_number: string | null;
  penalty_type: string;
  penalty_value: string | null;
  rule_reference: string | null;
  severity: string | null;
  points: number | null;
  rationale: string | null;
  evidence_bundle: Record<string, unknown>;
  status: 'proposed' | 'approved' | 'applied' | 'revoked' | 'appealed';
  proposed_by: string;
  approved_by: string | null;
  approved_at: string | null;
  applied_at: string | null;
  is_appealed: boolean;
  appeal: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  incident?: {
    incident_type: string;
    lap_number: number;
  };
  session?: {
    track_name: string;
  };
}

export interface PenaltyFilters {
  leagueId?: string;
  sessionId?: string;
  status?: string;
  driverId?: string;
}

// Get penalties for a league (through sessions)
export async function getLeaguePenalties(
  leagueId: string,
  filters: PenaltyFilters = {}
): Promise<Penalty[]> {
  let query = supabase
    .from('penalties')
    .select(`
      *,
      incident:incidents(incident_type, lap_number),
      session:sessions(track_name, league_id)
    `)
    .order('created_at', { ascending: false });

  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.driverId) {
    query = query.eq('driver_id', filters.driverId);
  }
  if (filters.sessionId) {
    query = query.eq('session_id', filters.sessionId);
  }

  const { data, error } = await query.limit(100);

  if (error) {
    console.error('Error fetching penalties:', error);
    return [];
  }

  // Filter by league through sessions
  return (data || []).filter(p => p.session?.league_id === leagueId);
}

// Get a single penalty by ID
export async function getPenalty(penaltyId: string): Promise<Penalty | null> {
  const { data, error } = await supabase
    .from('penalties')
    .select(`
      *,
      incident:incidents(incident_type, lap_number),
      session:sessions(track_name, league_id)
    `)
    .eq('id', penaltyId)
    .single();

  if (error) {
    console.error('Error fetching penalty:', error);
    return null;
  }

  return data;
}

// Create a new penalty
export async function createPenalty(
  penalty: Omit<Penalty, 'id' | 'created_at' | 'updated_at' | 'incident' | 'session'>
): Promise<{ data: Penalty | null; error: string | null }> {
  const { data, error } = await supabase
    .from('penalties')
    .insert(penalty)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

// Update penalty status
export async function updatePenaltyStatus(
  penaltyId: string,
  status: Penalty['status'],
  approvedBy?: string
): Promise<{ success: boolean; error?: string }> {
  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString()
  };

  if (status === 'approved' && approvedBy) {
    updates.approved_by = approvedBy;
    updates.approved_at = new Date().toISOString();
  }

  if (status === 'applied') {
    updates.applied_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('penalties')
    .update(updates)
    .eq('id', penaltyId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Get penalty counts by status for a league
export async function getPenaltyCounts(leagueId: string): Promise<Record<string, number>> {
  const penalties = await getLeaguePenalties(leagueId);
  
  const counts: Record<string, number> = {
    proposed: 0,
    approved: 0,
    applied: 0,
    revoked: 0,
    appealed: 0,
    total: penalties.length
  };

  penalties.forEach(penalty => {
    if (counts[penalty.status] !== undefined) {
      counts[penalty.status]++;
    }
  });

  return counts;
}

// Penalty type display helpers
export function formatPenaltyType(type: string): string {
  const typeMap: Record<string, string> = {
    'warning': 'Warning',
    'reprimand': 'Reprimand',
    'time_penalty': 'Time Penalty',
    'position_penalty': 'Position Penalty',
    'drive_through': 'Drive Through',
    'stop_go': 'Stop & Go',
    'grid_penalty': 'Grid Penalty',
    'points_deduction': 'Points Deduction',
    'disqualification': 'Disqualification',
    'race_ban': 'Race Ban'
  };
  return typeMap[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export function getPenaltyStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    'proposed': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    'approved': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'applied': 'bg-green-500/20 text-green-400 border-green-500/30',
    'revoked': 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    'appealed': 'bg-purple-500/20 text-purple-400 border-purple-500/30'
  };
  return colorMap[status] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
}

export function getPenaltyTypeColor(type: string): string {
  const colorMap: Record<string, string> = {
    'warning': 'bg-amber-500/20 text-amber-400',
    'reprimand': 'bg-amber-500/20 text-amber-400',
    'time_penalty': 'bg-orange-500/20 text-orange-400',
    'position_penalty': 'bg-orange-500/20 text-orange-400',
    'drive_through': 'bg-red-500/20 text-red-400',
    'stop_go': 'bg-red-500/20 text-red-400',
    'grid_penalty': 'bg-red-500/20 text-red-400',
    'points_deduction': 'bg-red-500/20 text-red-400',
    'disqualification': 'bg-red-600/30 text-red-300',
    'race_ban': 'bg-red-600/30 text-red-300'
  };
  return colorMap[type] || 'bg-slate-500/20 text-slate-400';
}
