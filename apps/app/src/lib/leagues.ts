import { supabase } from './supabase';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

async function apiAuthHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

export interface League {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

// Demo league for testing
export const DEMO_LEAGUE: League = {
  id: 'demo',
  name: 'IMSA Endurance Series',
  description: 'Multi-class endurance racing championship featuring GT3, GTP, and LMP2 classes.',
  owner_id: 'demo-owner',
  created_at: '2025-09-01T00:00:00Z',
  updated_at: '2026-01-15T00:00:00Z'
};

export const DEMO_LEAGUE_MEMBERS: LeagueMembership[] = [
  { id: 'm1', league_id: 'demo', user_id: 'demo-owner', role: 'owner', joined_at: '2025-09-01T00:00:00Z' },
  { id: 'm2', league_id: 'demo', user_id: 'steward-1', role: 'steward', joined_at: '2025-09-15T00:00:00Z' },
  { id: 'm3', league_id: 'demo', user_id: 'steward-2', role: 'steward', joined_at: '2025-10-01T00:00:00Z' },
  { id: 'm4', league_id: 'demo', user_id: 'admin-1', role: 'admin', joined_at: '2025-09-10T00:00:00Z' },
];

export interface LeagueMembership {
  id: string;
  league_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'steward' | 'member';
  joined_at: string;
}

export interface LeagueWithRole extends League {
  role: 'owner' | 'admin' | 'steward' | 'member';
}

export interface LeagueInvitation {
  id: string;
  league_id: string;
  email: string;
  token: string;
  invited_by: string | null;
  expires_at: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  created_at: string;
}

// Get all leagues the user is a member of
export async function getUserLeagues(userId: string): Promise<LeagueWithRole[]> {
  const { data: memberships, error: membershipError } = await supabase
    .from('league_memberships')
    .select('league_id, role')
    .eq('user_id', userId);

  // Always include demo league
  const demoLeague: LeagueWithRole = { ...DEMO_LEAGUE, role: 'owner' };

  if (membershipError || !memberships?.length) {
    return [demoLeague];
  }

  const leagueIds = memberships.map(m => m.league_id);
  
  const { data: leagues, error: leaguesError } = await supabase
    .from('leagues')
    .select('*')
    .in('id', leagueIds);

  if (leaguesError || !leagues) {
    return [demoLeague];
  }

  const userLeagues = leagues.map(league => ({
    ...league,
    role: memberships.find(m => m.league_id === league.id)?.role || 'member'
  }));

  return [demoLeague, ...userLeagues];
}

// Get a single league by ID
export async function getLeague(leagueId: string): Promise<League | null> {
  // Return demo league for demo ID
  if (leagueId === 'demo') {
    return DEMO_LEAGUE;
  }

  const { data, error } = await supabase
    .from('leagues')
    .select('*')
    .eq('id', leagueId)
    .single();

  if (error) {
    console.error('Error fetching league:', error);
    return null;
  }

  return data;
}

// Get user's role in a league
export async function getUserLeagueRole(leagueId: string, userId: string): Promise<'owner' | 'admin' | 'steward' | 'member' | null> {
  // Return owner role for demo league
  if (leagueId === 'demo') {
    return 'owner';
  }

  const { data, error } = await supabase
    .from('league_memberships')
    .select('role')
    .eq('league_id', leagueId)
    .eq('user_id', userId)
    .single();

  if (error) {
    return null;
  }

  return data?.role || null;
}

// Create a new league
export async function createLeague(
  name: string,
  ownerId: string,
  description?: string
): Promise<{ data: League | null; error: string | null }> {
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .insert({ name, owner_id: ownerId, description: description || null })
    .select()
    .single();

  if (leagueError) {
    console.error('Error creating league:', leagueError);
    return { data: null, error: leagueError.message };
  }

  // Add owner as a member with 'owner' role
  const { error: memberError } = await supabase
    .from('league_memberships')
    .insert({
      league_id: league.id,
      user_id: ownerId,
      role: 'owner'
    });

  if (memberError) {
    console.error('Error adding owner membership:', memberError);
  }

  return { data: league, error: null };
}

// Update league
export async function updateLeague(
  leagueId: string,
  updates: { name?: string; description?: string }
): Promise<{ data: League | null; error: string | null }> {
  const { data, error } = await supabase
    .from('leagues')
    .update(updates)
    .eq('id', leagueId)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

// Delete league
export async function deleteLeague(leagueId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('leagues')
    .delete()
    .eq('id', leagueId);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

// Get league members
export async function getLeagueMembers(leagueId: string): Promise<LeagueMembership[]> {
  // Return demo members for demo league
  if (leagueId === 'demo') {
    return DEMO_LEAGUE_MEMBERS;
  }

  const { data, error } = await supabase
    .from('league_memberships')
    .select('*')
    .eq('league_id', leagueId)
    .order('joined_at', { ascending: true });

  if (error) {
    console.error('Error fetching league members:', error);
    return [];
  }

  return data || [];
}

// Create invitation
export async function createLeagueInvitation(
  leagueId: string,
  email: string,
  invitedBy: string
): Promise<{ data: LeagueInvitation | null; error: string | null }> {
  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { data, error } = await supabase
    .from('league_invitations')
    .insert({
      league_id: leagueId,
      email: email.toLowerCase(),
      token,
      invited_by: invitedBy,
      expires_at: expiresAt.toISOString()
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

// Get pending invitations for a league
export async function getLeagueInvitations(leagueId: string): Promise<LeagueInvitation[]> {
  const { data, error } = await supabase
    .from('league_invitations')
    .select('*')
    .eq('league_id', leagueId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching invitations:', error);
    return [];
  }

  return data || [];
}

// ===========================================================================
// Protests
// ===========================================================================

export interface LeagueProtest {
  id: string;
  leagueId: string;
  incidentId: string | null;
  penaltyId: string | null;
  submittedByDriverId: string | null;
  submittedByName: string;
  status: 'pending' | 'under_review' | 'upheld' | 'denied' | 'withdrawn';
  grounds: string;
  evidenceUrls: string[];
  stewardNotes: string | null;
  resolution: string | null;
  resolvedByName: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  incidentType: string | null;
  incidentSeverity: string | null;
}

function mapProtestStatus(apiStatus: string): LeagueProtest['status'] {
  if (apiStatus === 'submitted') return 'pending';
  if (apiStatus === 'rejected') return 'denied';
  return apiStatus as LeagueProtest['status'];
}

export async function fetchLeagueProtests(
  leagueId: string,
  status?: string
): Promise<LeagueProtest[]> {
  try {
    const auth = await apiAuthHeader();
    if (!auth.Authorization) return [];
    const qs = status ? `leagueId=${leagueId}&status=${status}` : `leagueId=${leagueId}`;
    const res = await fetch(`${API_BASE}/api/protests?${qs}`, { headers: auth });
    if (!res.ok) return [];
    const { data } = await res.json();
    return (data || []).map((row: Record<string, unknown>) => ({
      ...row,
      status: mapProtestStatus(row.status as string),
    })) as LeagueProtest[];
  } catch {
    return [];
  }
}

export async function updateProtestStatus(
  protestId: string,
  status: 'upheld' | 'denied',
  resolution: string
): Promise<boolean> {
  try {
    const auth = await apiAuthHeader();
    if (!auth.Authorization) return false;
    const res = await fetch(`${API_BASE}/api/protests/${protestId}`, {
      method: 'PUT',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: status === 'denied' ? 'rejected' : status, resolution }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ===========================================================================
// Series / Seasons / Standings
// ===========================================================================

export interface LeagueSeries {
  id: string;
  leagueId: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface LeagueSeason {
  id: string;
  seriesId: string;
  leagueId: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
}

export interface LeagueStanding {
  id: string;
  seasonId: string;
  driverId: string;
  driverName: string;
  teamId: string | undefined;
  teamName: string | undefined;
  carClass: string | undefined;
  position: number;
  classPosition: number | undefined;
  points: number;
  pointsWithDrops: number;
  wins: number;
  podiums: number;
  poles: number;
  dnfs: number;
  racesStarted: number;
  behindLeader: number | null;
}

export async function fetchLeagueSeries(leagueId: string): Promise<LeagueSeries[]> {
  try {
    const auth = await apiAuthHeader();
    if (!auth.Authorization) return [];
    const res = await fetch(`${API_BASE}/api/leagues/${leagueId}/series`, { headers: auth });
    if (!res.ok) return [];
    const { data } = await res.json();
    return data || [];
  } catch {
    return [];
  }
}

export async function fetchSeriesSeasons(seriesId: string): Promise<LeagueSeason[]> {
  try {
    const auth = await apiAuthHeader();
    if (!auth.Authorization) return [];
    const res = await fetch(`${API_BASE}/api/leagues/series/${seriesId}/seasons`, { headers: auth });
    if (!res.ok) return [];
    const { data } = await res.json();
    return data || [];
  } catch {
    return [];
  }
}

export async function fetchSeasonStandings(seasonId: string): Promise<LeagueStanding[]> {
  try {
    const auth = await apiAuthHeader();
    if (!auth.Authorization) return [];
    const res = await fetch(`${API_BASE}/api/seasons/${seasonId}/standings`, { headers: auth });
    if (!res.ok) return [];
    const { data } = await res.json();
    return data || [];
  } catch {
    return [];
  }
}
