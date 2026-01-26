import { supabase } from './supabase';

export interface Rule {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  severity: 'warning' | 'minor' | 'major' | 'severe';
  defaultPenalty: string;
  isActive: boolean;
}

export interface PenaltyOption {
  type: string;
  displayName: string;
  isEnabled: boolean;
  defaultValue?: string;
}

export interface Rulebook {
  id: string;
  name: string;
  league_name: string | null;
  version: string | null;
  description: string | null;
  rules: Rule[];
  penalty_matrix: Record<string, PenaltyOption[]>;
  settings: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Get all rulebooks
export async function getRulebooks(): Promise<Rulebook[]> {
  const { data, error } = await supabase
    .from('rulebooks')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching rulebooks:', error);
    return [];
  }

  return data || [];
}

// Get rulebook by ID
export async function getRulebook(id: string): Promise<Rulebook | null> {
  const { data, error } = await supabase
    .from('rulebooks')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching rulebook:', error);
    return null;
  }

  return data;
}

// Get rulebooks for a league
export async function getLeagueRulebooks(leagueName: string): Promise<Rulebook[]> {
  const { data, error } = await supabase
    .from('rulebooks')
    .select('*')
    .or(`league_name.eq.${leagueName},league_name.is.null`)
    .order('name');

  if (error) {
    console.error('Error fetching league rulebooks:', error);
    return [];
  }

  return data || [];
}

// Create rulebook
export async function createRulebook(
  rulebook: Omit<Rulebook, 'id' | 'created_at' | 'updated_at'>
): Promise<{ data: Rulebook | null; error: string | null }> {
  const { data, error } = await supabase
    .from('rulebooks')
    .insert(rulebook)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

// Update rulebook
export async function updateRulebook(
  id: string,
  updates: Partial<Omit<Rulebook, 'id' | 'created_at' | 'updated_at'>>
): Promise<{ data: Rulebook | null; error: string | null }> {
  const { data, error } = await supabase
    .from('rulebooks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

// Delete rulebook
export async function deleteRulebook(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('rulebooks')
    .delete()
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

// Rule categories
export const RULE_CATEGORIES = [
  { value: 'contact', label: 'Contact & Collisions' },
  { value: 'track_limits', label: 'Track Limits' },
  { value: 'pit_lane', label: 'Pit Lane' },
  { value: 'start_procedure', label: 'Start Procedure' },
  { value: 'flags', label: 'Flags & Signals' },
  { value: 'conduct', label: 'Driver Conduct' },
  { value: 'technical', label: 'Technical Regulations' },
  { value: 'other', label: 'Other' }
];

// Severity levels
export const SEVERITY_LEVELS = [
  { value: 'warning', label: 'Warning', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  { value: 'minor', label: 'Minor', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { value: 'major', label: 'Major', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { value: 'severe', label: 'Severe', color: 'bg-red-600/30 text-red-300 border-red-600/50' }
];

// Penalty types
export const PENALTY_TYPES = [
  { value: 'warning', label: 'Warning' },
  { value: 'reprimand', label: 'Reprimand' },
  { value: 'time_penalty', label: 'Time Penalty' },
  { value: 'position_penalty', label: 'Position Penalty' },
  { value: 'drive_through', label: 'Drive Through' },
  { value: 'stop_go', label: 'Stop & Go' },
  { value: 'grid_penalty', label: 'Grid Penalty' },
  { value: 'points_deduction', label: 'Points Deduction' },
  { value: 'disqualification', label: 'Disqualification' },
  { value: 'race_ban', label: 'Race Ban' }
];
