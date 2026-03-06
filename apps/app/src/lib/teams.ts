import { supabase } from './supabase';

export interface Team {
  id: string;
  name: string;
  owner_id: string;       // alias for owner_user_id for backwards compat
  owner_user_id: string;
  status?: string;
  short_name?: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamMembership {
  id: string;
  team_id: string;
  // user_id holds driver_profile_id when sourced from v1 API roster —
  // kept as-is for backwards compat with TeamSettings/TeamDashboard
  user_id: string;
  role: 'owner' | 'manager' | 'member';
  joined_at: string;
}

export interface TeamWithRole extends Team {
  role: 'owner' | 'manager' | 'member';
}

export interface TeamMemberWithProfile extends TeamMembership {
  user_email?: string;
  display_name?: string;
}

export interface TeamInvitation {
  id: string;
  team_id: string;
  email: string;
  token: string;
  invited_by: string | null;
  expires_at: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  created_at: string;
}

// ========================
// API helpers
// ========================

const API_BASE = import.meta.env.VITE_API_URL || '';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  return headers;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...headers, ...(init?.headers as Record<string, string> || {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

function mapRole(role: string): 'owner' | 'manager' | 'member' {
  if (role === 'owner') return 'owner';
  if (role === 'manager') return 'manager';
  return 'member'; // driver, engineer → member for UI purposes
}

function mapTeam(t: any): Team {
  return {
    id: t.id,
    name: t.name,
    owner_id: t.owner_user_id,
    owner_user_id: t.owner_user_id,
    status: t.status,
    short_name: t.short_name ?? null,
    logo_url: t.logo_url ?? null,
    primary_color: t.primary_color ?? null,
    created_at: t.created_at,
    updated_at: t.updated_at,
  };
}

// ========================
// Teams
// ========================

export async function getUserTeams(_userId: string): Promise<TeamWithRole[]> {
  try {
    const data = await apiFetch<{ teams: any[] }>('/api/v1/teams');
    return (data.teams || []).map(t => ({
      ...mapTeam(t),
      role: mapRole(t.role),
    }));
  } catch (err) {
    console.error('Error fetching user teams:', err);
    return [];
  }
}

export async function getTeam(teamId: string): Promise<Team | null> {
  try {
    const t = await apiFetch<any>(`/api/v1/teams/${teamId}`);
    return mapTeam(t);
  } catch (err) {
    console.error('Error fetching team:', err);
    return null;
  }
}

export async function getUserTeamRole(teamId: string, _userId: string): Promise<'owner' | 'manager' | 'member' | null> {
  try {
    const data = await apiFetch<{ teams: any[] }>('/api/v1/teams');
    const team = (data.teams || []).find((t: any) => t.id === teamId);
    return team ? mapRole(team.role) : null;
  } catch {
    return null;
  }
}

export async function createTeam(
  name: string,
  _ownerId: string
): Promise<{ data: Team | null; error: string | null }> {
  try {
    const t = await apiFetch<any>('/api/v1/teams', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    return { data: mapTeam(t), error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to create team' };
  }
}

export async function updateTeam(
  teamId: string,
  updates: { name?: string }
): Promise<{ data: Team | null; error: string | null }> {
  try {
    const t = await apiFetch<any>(`/api/v1/teams/${teamId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return { data: mapTeam(t), error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to update team' };
  }
}

export async function deleteTeam(teamId: string): Promise<{ error: string | null }> {
  try {
    await apiFetch(`/api/v1/teams/${teamId}`, { method: 'DELETE' });
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to delete team' };
  }
}

// ========================
// Members
// ========================

export async function getTeamMembers(teamId: string): Promise<TeamMembership[]> {
  try {
    // Roster endpoint returns TeamRosterView: { team_id, team_name, member_count, members[] }
    const data = await apiFetch<{ members: any[] }>(`/api/v1/teams/${teamId}/roster`);
    return (data.members || []).map(m => ({
      id: m.membership_id,
      team_id: teamId,
      // user_id field holds driver_profile_id — kept for backwards compat with UI
      user_id: m.driver_profile_id,
      role: mapRole(m.role),
      joined_at: m.joined_at || new Date().toISOString(),
    }));
  } catch (err) {
    console.error('Error fetching team members:', err);
    return [];
  }
}

export async function removeMember(
  teamId: string,
  driverProfileId: string
): Promise<{ error: string | null }> {
  try {
    await apiFetch(`/api/v1/teams/${teamId}/members/${driverProfileId}`, { method: 'DELETE' });
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to remove member' };
  }
}

export async function leaveTeam(
  teamId: string,
  _userId: string
): Promise<{ error: string | null }> {
  try {
    await apiFetch(`/api/v1/teams/${teamId}/leave`, { method: 'POST' });
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to leave team' };
  }
}

// updateMemberRole — v1 API does not yet have a role-update endpoint.
// Falls back to direct Supabase update for now.
export async function updateMemberRole(
  teamId: string,
  userId: string,
  role: 'manager' | 'member'
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('team_memberships')
    .update({ role })
    .eq('team_id', teamId)
    .eq('user_id', userId);

  return { error: error?.message ?? null };
}

// ========================
// Invitations
// ========================
// Email-based invitations use the legacy team_invitations table.
// The v1 API uses driver_profile_id-based invites (different model).

export async function createInvitation(
  teamId: string,
  email: string,
  invitedBy: string
): Promise<{ data: TeamInvitation | null; error: string | null }> {
  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { data, error } = await supabase
    .from('team_invitations')
    .insert({
      team_id: teamId,
      email: email.toLowerCase(),
      token,
      invited_by: invitedBy,
      expires_at: expiresAt.toISOString()
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function getTeamInvitations(teamId: string): Promise<TeamInvitation[]> {
  const { data, error } = await supabase
    .from('team_invitations')
    .select('*')
    .eq('team_id', teamId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching invitations:', error);
    return [];
  }
  return data || [];
}

export async function acceptInvitation(
  token: string,
  userId: string
): Promise<{ error: string | null }> {
  const { data: invitation, error: fetchError } = await supabase
    .from('team_invitations')
    .select('*')
    .eq('token', token)
    .eq('status', 'pending')
    .single();

  if (fetchError || !invitation) return { error: 'Invalid or expired invitation' };

  if (new Date(invitation.expires_at) < new Date()) {
    await supabase.from('team_invitations').update({ status: 'expired' }).eq('id', invitation.id);
    return { error: 'Invitation has expired' };
  }

  const { error: memberError } = await supabase
    .from('team_memberships')
    .insert({ team_id: invitation.team_id, user_id: userId, role: 'member' });

  if (memberError) return { error: memberError.message };

  await supabase.from('team_invitations').update({ status: 'accepted' }).eq('id', invitation.id);
  return { error: null };
}

export async function getUserInvitations(email: string): Promise<(TeamInvitation & { team_name?: string })[]> {
  const { data, error } = await supabase
    .from('team_invitations')
    .select('*, teams(name)')
    .eq('email', email.toLowerCase())
    .eq('status', 'pending');

  if (error) {
    console.error('Error fetching user invitations:', error);
    return [];
  }
  return (data || []).map(inv => ({
    ...inv,
    team_name: (inv.teams as any)?.name
  }));
}
