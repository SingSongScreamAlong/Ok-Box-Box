import { supabase } from './supabase';

export interface League {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

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

  if (membershipError || !memberships?.length) {
    return [];
  }

  const leagueIds = memberships.map(m => m.league_id);
  
  const { data: leagues, error: leaguesError } = await supabase
    .from('leagues')
    .select('*')
    .in('id', leagueIds);

  if (leaguesError || !leagues) {
    return [];
  }

  return leagues.map(league => ({
    ...league,
    role: memberships.find(m => m.league_id === league.id)?.role || 'member'
  }));
}

// Get a single league by ID
export async function getLeague(leagueId: string): Promise<League | null> {
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
