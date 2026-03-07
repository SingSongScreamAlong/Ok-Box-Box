import { supabase } from './supabase';

const API_BASE = import.meta.env.VITE_API_URL || 'https://octopus-app-qsi3i.ondigitalocean.app';

export interface Team {
  id: string;
  name: string;
  short_name?: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
  owner_user_id?: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMembership {
  id: string;
  team_id: string;
  driver_profile_id: string;
  role: string;
  status: string;
  joined_at: string | null;
  display_name?: string;
}

export interface TeamWithRole extends Team {
  role: string;
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

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    return { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' };
  }
  return { 'Content-Type': 'application/json' };
}

// Get all teams the user is a member of
export async function getUserTeams(_userId: string): Promise<TeamWithRole[]> {
  try {
    const headers = await getAuthHeader();
    if (!headers.Authorization) return [];

    const response = await fetch(`${API_BASE}/api/v1/teams`, { headers });
    if (!response.ok) return [];

    const data = await response.json();
    return (data.teams || data || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      short_name: t.short_name,
      logo_url: t.logo_url,
      primary_color: t.primary_color,
      owner_user_id: t.owner_user_id,
      created_at: t.created_at,
      updated_at: t.updated_at,
      role: t.role || t.user_role || 'member',
    }));
  } catch (error) {
    console.error('[Teams] Error fetching user teams:', error);
    return [];
  }
}

// Get a single team by ID
export async function getTeam(teamId: string): Promise<Team | null> {
  try {
    const headers = await getAuthHeader();
    if (!headers.Authorization) return null;

    const response = await fetch(`${API_BASE}/api/v1/teams/${teamId}`, { headers });
    if (!response.ok) return null;

    return await response.json();
  } catch (error) {
    console.error('[Teams] Error fetching team:', error);
    return null;
  }
}

// Get user's role in a team
export async function getUserTeamRole(teamId: string, _userId: string): Promise<string | null> {
  try {
    const headers = await getAuthHeader();
    if (!headers.Authorization) return null;

    const response = await fetch(`${API_BASE}/api/v1/teams/${teamId}/my-role`, { headers });
    if (!response.ok) {
      // Fallback: try fetching team details which may include role
      const teamRes = await fetch(`${API_BASE}/api/v1/teams/${teamId}`, { headers });
      if (!teamRes.ok) return null;
      const team = await teamRes.json();
      return team.user_role || team.role || 'member';
    }

    const data = await response.json();
    return data.role || null;
  } catch (error) {
    console.error('[Teams] Error fetching role:', error);
    return null;
  }
}

// Create a new team
export async function createTeam(
  name: string,
  _ownerId: string
): Promise<{ data: Team | null; error: string | null }> {
  try {
    const headers = await getAuthHeader();
    if (!headers.Authorization) return { data: null, error: 'Not authenticated' };

    const response = await fetch(`${API_BASE}/api/v1/teams`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { data: null, error: err.error || 'Failed to create team' };
    }

    const team = await response.json();
    return { data: team, error: null };
  } catch (error) {
    console.error('[Teams] Error creating team:', error);
    return { data: null, error: 'Failed to create team' };
  }
}

// Update team
export async function updateTeam(
  teamId: string,
  updates: { name?: string }
): Promise<{ data: Team | null; error: string | null }> {
  try {
    const headers = await getAuthHeader();
    if (!headers.Authorization) return { data: null, error: 'Not authenticated' };

    const response = await fetch(`${API_BASE}/api/v1/teams/${teamId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { data: null, error: err.error || 'Failed to update team' };
    }

    const team = await response.json();
    return { data: team, error: null };
  } catch (error) {
    console.error('[Teams] Error updating team:', error);
    return { data: null, error: 'Failed to update team' };
  }
}

// Delete (archive) team
export async function deleteTeam(teamId: string): Promise<{ error: string | null }> {
  try {
    const headers = await getAuthHeader();
    if (!headers.Authorization) return { error: 'Not authenticated' };

    const response = await fetch(`${API_BASE}/api/v1/teams/${teamId}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { error: err.error || 'Failed to delete team' };
    }

    return { error: null };
  } catch (error) {
    console.error('[Teams] Error deleting team:', error);
    return { error: 'Failed to delete team' };
  }
}

// Get team members
export async function getTeamMembers(teamId: string): Promise<TeamMembership[]> {
  try {
    const headers = await getAuthHeader();
    if (!headers.Authorization) return [];

    const response = await fetch(`${API_BASE}/api/v1/teams/${teamId}/drivers`, { headers });
    if (!response.ok) return [];

    const data = await response.json();
    return (data.drivers || []).map((d: any) => ({
      id: d.membershipId || d.id,
      team_id: teamId,
      driver_profile_id: d.id,
      role: d.role || 'driver',
      status: 'active',
      joined_at: d.joinedAt,
      display_name: d.displayName,
    }));
  } catch (error) {
    console.error('[Teams] Error fetching members:', error);
    return [];
  }
}

// Update member role
export async function updateMemberRole(
  teamId: string,
  membershipId: string,
  role: string
): Promise<{ error: string | null }> {
  try {
    const headers = await getAuthHeader();
    if (!headers.Authorization) return { error: 'Not authenticated' };

    const response = await fetch(`${API_BASE}/api/v1/teams/${teamId}/members/${membershipId}/role`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ role }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { error: err.error || 'Failed to update role' };
    }

    return { error: null };
  } catch (error) {
    console.error('[Teams] Error updating member role:', error);
    return { error: 'Failed to update role' };
  }
}

// Remove member from team
export async function removeMember(
  teamId: string,
  driverProfileId: string
): Promise<{ error: string | null }> {
  try {
    const headers = await getAuthHeader();
    if (!headers.Authorization) return { error: 'Not authenticated' };

    const response = await fetch(`${API_BASE}/api/v1/teams/${teamId}/members/${driverProfileId}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { error: err.error || 'Failed to remove member' };
    }

    return { error: null };
  } catch (error) {
    console.error('[Teams] Error removing member:', error);
    return { error: 'Failed to remove member' };
  }
}

// Leave team
export async function leaveTeam(
  teamId: string,
  _userId: string
): Promise<{ error: string | null }> {
  try {
    const headers = await getAuthHeader();
    if (!headers.Authorization) return { error: 'Not authenticated' };

    const response = await fetch(`${API_BASE}/api/v1/teams/${teamId}/leave`, {
      method: 'POST',
      headers,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { error: err.error || 'Failed to leave team' };
    }

    return { error: null };
  } catch (error) {
    console.error('[Teams] Error leaving team:', error);
    return { error: 'Failed to leave team' };
  }
}

// Create invitation
export async function createInvitation(
  teamId: string,
  email: string,
  _invitedBy: string
): Promise<{ data: TeamInvitation | null; error: string | null }> {
  try {
    const headers = await getAuthHeader();
    if (!headers.Authorization) return { data: null, error: 'Not authenticated' };

    const response = await fetch(`${API_BASE}/api/v1/teams/${teamId}/invite`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { data: null, error: err.error || 'Failed to send invitation' };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    console.error('[Teams] Error creating invitation:', error);
    return { data: null, error: 'Failed to send invitation' };
  }
}

// Get pending invitations for a team
export async function getTeamInvitations(teamId: string): Promise<TeamInvitation[]> {
  try {
    const headers = await getAuthHeader();
    if (!headers.Authorization) return [];

    const response = await fetch(`${API_BASE}/api/v1/teams/${teamId}/invitations`, { headers });
    if (!response.ok) return [];

    const data = await response.json();
    return data.invitations || data || [];
  } catch (error) {
    console.error('[Teams] Error fetching invitations:', error);
    return [];
  }
}

// Accept invitation
export async function acceptInvitation(
  token: string,
  _userId: string
): Promise<{ error: string | null }> {
  try {
    const headers = await getAuthHeader();
    if (!headers.Authorization) return { error: 'Not authenticated' };

    const response = await fetch(`${API_BASE}/api/v1/teams/join`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { error: err.error || 'Failed to accept invitation' };
    }

    return { error: null };
  } catch (error) {
    console.error('[Teams] Error accepting invitation:', error);
    return { error: 'Failed to accept invitation' };
  }
}

// Get user's pending invitations
export async function getUserInvitations(_email: string): Promise<(TeamInvitation & { team_name?: string })[]> {
  try {
    const headers = await getAuthHeader();
    if (!headers.Authorization) return [];

    const response = await fetch(`${API_BASE}/api/v1/teams/invitations/pending`, { headers });
    if (!response.ok) return [];

    const data = await response.json();
    return data.invitations || data || [];
  } catch (error) {
    console.error('[Teams] Error fetching user invitations:', error);
    return [];
  }
}
