import { supabase } from './supabase';

export interface Team {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMembership {
  id: string;
  team_id: string;
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

// Get all teams the user is a member of
export async function getUserTeams(userId: string): Promise<TeamWithRole[]> {
  const { data: memberships, error: membershipError } = await supabase
    .from('team_memberships')
    .select('team_id, role')
    .eq('user_id', userId);

  if (membershipError || !memberships?.length) {
    return [];
  }

  const teamIds = memberships.map(m => m.team_id);
  
  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select('*')
    .in('id', teamIds);

  if (teamsError || !teams) {
    return [];
  }

  return teams.map(team => ({
    ...team,
    role: memberships.find(m => m.team_id === team.id)?.role || 'member'
  }));
}

// Get a single team by ID
export async function getTeam(teamId: string): Promise<Team | null> {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('id', teamId)
    .single();

  if (error) {
    console.error('Error fetching team:', error);
    return null;
  }

  return data;
}

// Get user's role in a team
export async function getUserTeamRole(teamId: string, userId: string): Promise<'owner' | 'manager' | 'member' | null> {
  const { data, error } = await supabase
    .from('team_memberships')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .single();

  if (error) {
    return null;
  }

  return data?.role || null;
}

// Create a new team
export async function createTeam(
  name: string,
  ownerId: string
): Promise<{ data: Team | null; error: string | null }> {
  // Create the team
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .insert({ name, owner_id: ownerId })
    .select()
    .single();

  if (teamError) {
    console.error('Error creating team:', teamError);
    return { data: null, error: teamError.message };
  }

  // Add owner as a member with 'owner' role
  const { error: memberError } = await supabase
    .from('team_memberships')
    .insert({
      team_id: team.id,
      user_id: ownerId,
      role: 'owner'
    });

  if (memberError) {
    console.error('Error adding owner membership:', memberError);
    // Team was created but membership failed - still return team
  }

  return { data: team, error: null };
}

// Update team
export async function updateTeam(
  teamId: string,
  updates: { name?: string }
): Promise<{ data: Team | null; error: string | null }> {
  const { data, error } = await supabase
    .from('teams')
    .update(updates)
    .eq('id', teamId)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

// Delete team
export async function deleteTeam(teamId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('teams')
    .delete()
    .eq('id', teamId);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

// Get team members
export async function getTeamMembers(teamId: string): Promise<TeamMembership[]> {
  const { data, error } = await supabase
    .from('team_memberships')
    .select('*')
    .eq('team_id', teamId)
    .order('joined_at', { ascending: true });

  if (error) {
    console.error('Error fetching team members:', error);
    return [];
  }

  return data || [];
}

// Update member role
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

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

// Remove member from team
export async function removeMember(
  teamId: string,
  userId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('team_memberships')
    .delete()
    .eq('team_id', teamId)
    .eq('user_id', userId);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

// Leave team
export async function leaveTeam(
  teamId: string,
  userId: string
): Promise<{ error: string | null }> {
  return removeMember(teamId, userId);
}

// Create invitation
export async function createInvitation(
  teamId: string,
  email: string,
  invitedBy: string
): Promise<{ data: TeamInvitation | null; error: string | null }> {
  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

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

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

// Get pending invitations for a team
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

// Accept invitation
export async function acceptInvitation(
  token: string,
  userId: string
): Promise<{ error: string | null }> {
  // Get the invitation
  const { data: invitation, error: fetchError } = await supabase
    .from('team_invitations')
    .select('*')
    .eq('token', token)
    .eq('status', 'pending')
    .single();

  if (fetchError || !invitation) {
    return { error: 'Invalid or expired invitation' };
  }

  // Check if expired
  if (new Date(invitation.expires_at) < new Date()) {
    await supabase
      .from('team_invitations')
      .update({ status: 'expired' })
      .eq('id', invitation.id);
    return { error: 'Invitation has expired' };
  }

  // Add user to team
  const { error: memberError } = await supabase
    .from('team_memberships')
    .insert({
      team_id: invitation.team_id,
      user_id: userId,
      role: 'member'
    });

  if (memberError) {
    return { error: memberError.message };
  }

  // Update invitation status
  await supabase
    .from('team_invitations')
    .update({ status: 'accepted' })
    .eq('id', invitation.id);

  return { error: null };
}

// Get user's pending invitations
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
