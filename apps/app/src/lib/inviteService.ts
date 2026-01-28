import { supabase } from './supabase';

// Invite types
export type InviteType = 'team' | 'league';
export type InviteStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';

export interface TeamRole {
  id: string;
  label: string;
  description: string;
  permissions: string[];
}

export interface LeagueRole {
  id: string;
  label: string;
  description: string;
  permissions: string[];
}

export const TEAM_ROLES: TeamRole[] = [
  {
    id: 'driver',
    label: 'Driver',
    description: 'Can view team data, participate in sessions, and access their own telemetry',
    permissions: ['view_team', 'join_sessions', 'view_own_telemetry']
  },
  {
    id: 'team_engineer',
    label: 'Engineer',
    description: 'Can view all telemetry, manage setups, and provide race strategy',
    permissions: ['view_team', 'view_all_telemetry', 'manage_setups', 'edit_strategy']
  },
  {
    id: 'team_principal',
    label: 'Team Principal',
    description: 'Full access to team management, roster, and all data',
    permissions: ['view_team', 'manage_roster', 'manage_settings', 'view_all_telemetry', 'edit_strategy']
  },
  {
    id: 'spotter',
    label: 'Spotter',
    description: 'Can view live sessions and provide voice communication',
    permissions: ['view_team', 'view_live_sessions', 'voice_comms']
  },
  {
    id: 'analyst',
    label: 'Analyst',
    description: 'Can view all telemetry and reports, but cannot modify settings',
    permissions: ['view_team', 'view_all_telemetry', 'view_reports']
  }
];

export const LEAGUE_ROLES: LeagueRole[] = [
  {
    id: 'member',
    label: 'Member',
    description: 'Can view league info, standings, and participate in events',
    permissions: ['view_league', 'view_standings', 'join_events']
  },
  {
    id: 'steward',
    label: 'Steward',
    description: 'Can review incidents, issue penalties, and manage protests',
    permissions: ['view_league', 'review_incidents', 'issue_penalties', 'manage_protests']
  },
  {
    id: 'admin',
    label: 'Administrator',
    description: 'Full access to league settings, events, and member management',
    permissions: ['view_league', 'manage_members', 'manage_events', 'manage_settings', 'review_incidents']
  },
  {
    id: 'broadcaster',
    label: 'Broadcaster',
    description: 'Can access broadcast tools and public timing data',
    permissions: ['view_league', 'broadcast_access', 'public_timing']
  }
];

export interface Invite {
  id: string;
  type: InviteType;
  targetId: string; // team_id or league_id
  targetName: string;
  inviteeEmail: string;
  inviteeName?: string;
  inviteeUserId?: string; // If inviting existing user
  role: string;
  message?: string;
  invitedBy: string;
  invitedByName: string;
  status: InviteStatus;
  token: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  respondedAt?: string;
}

export interface CreateInviteParams {
  type: InviteType;
  targetId: string;
  targetName: string;
  inviteeEmail: string;
  inviteeName?: string;
  inviteeUserId?: string;
  role: string;
  message?: string;
  sendEmail: boolean;
}

export interface InviteEmailTemplate {
  subject: string;
  previewText: string;
  bodyHtml: string;
}

// Demo invites for testing
const DEMO_TEAM_INVITES: Invite[] = [
  {
    id: 'inv-1',
    type: 'team',
    targetId: 'demo',
    targetName: 'Throttle Works Racing',
    inviteeEmail: 'marcus.t@email.com',
    inviteeName: 'Marcus Thompson',
    role: 'driver',
    message: 'Hey Marcus! We\'d love to have you join our endurance team for the upcoming IMSA season.',
    invitedBy: 'u1',
    invitedByName: 'Alex Rivera',
    status: 'pending',
    token: 'tok-abc123',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'inv-2',
    type: 'team',
    targetId: 'demo',
    targetName: 'Throttle Works Racing',
    inviteeEmail: 'sarah.chen@email.com',
    inviteeName: 'Sarah Chen',
    role: 'team_engineer',
    invitedBy: 'u1',
    invitedByName: 'Alex Rivera',
    status: 'accepted',
    token: 'tok-def456',
    expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    respondedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const DEMO_LEAGUE_INVITES: Invite[] = [
  {
    id: 'inv-l1',
    type: 'league',
    targetId: 'demo',
    targetName: 'IMSA Endurance Series',
    inviteeEmail: 'james.w@email.com',
    inviteeName: 'James Wilson',
    role: 'steward',
    message: 'We need experienced stewards for our growing league. Your reputation precedes you!',
    invitedBy: 'demo-owner',
    invitedByName: 'League Admin',
    status: 'pending',
    token: 'tok-league1',
    expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Generate invite token
function generateToken(): string {
  return 'tok-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Build email template
export function buildInviteEmail(invite: Invite, type: InviteType): InviteEmailTemplate {
  const roleLabel = type === 'team' 
    ? TEAM_ROLES.find(r => r.id === invite.role)?.label || invite.role
    : LEAGUE_ROLES.find(r => r.id === invite.role)?.label || invite.role;

  const acceptUrl = `${window.location.origin}/invite/${invite.token}`;
  
  const subject = type === 'team'
    ? `You're invited to join ${invite.targetName} on Ok, Box Box`
    : `You're invited to join ${invite.targetName} League on Ok, Box Box`;

  const previewText = type === 'team'
    ? `${invite.invitedByName} has invited you to join their racing team as ${roleLabel}`
    : `${invite.invitedByName} has invited you to join their racing league as ${roleLabel}`;

  const bodyHtml = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0e0e0e; color: #ffffff; padding: 40px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="display: inline-flex; gap: 4px;">
          <div style="width: 8px; height: 28px; background: #ffffff; border-radius: 4px; transform: rotate(12deg);"></div>
          <div style="width: 8px; height: 28px; background: #3b82f6; border-radius: 4px; transform: rotate(12deg);"></div>
          <div style="width: 8px; height: 28px; background: #f97316; border-radius: 4px; transform: rotate(12deg);"></div>
        </div>
        <h1 style="font-family: 'Orbitron', sans-serif; font-size: 24px; margin-top: 20px; letter-spacing: 2px;">OK, BOX BOX</h1>
      </div>
      
      <div style="background: #1a1a1a; border: 1px solid rgba(255,255,255,0.1); padding: 30px; margin-bottom: 20px;">
        <h2 style="font-size: 18px; margin: 0 0 20px 0; color: #3b82f6;">
          ${type === 'team' ? '🏎️ Team Invitation' : '🏆 League Invitation'}
        </h2>
        
        <p style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
          <strong>${invite.invitedByName}</strong> has invited you to join 
          <strong style="color: #3b82f6;">${invite.targetName}</strong> as a 
          <strong style="color: #f97316;">${roleLabel}</strong>.
        </p>
        
        ${invite.message ? `
          <div style="background: rgba(59, 130, 246, 0.1); border-left: 3px solid #3b82f6; padding: 15px; margin: 20px 0;">
            <p style="color: #ffffff; font-size: 14px; margin: 0; font-style: italic;">"${invite.message}"</p>
          </div>
        ` : ''}
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="${acceptUrl}" style="display: inline-block; background: #3b82f6; color: #ffffff; text-decoration: none; padding: 14px 40px; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
            Accept Invitation
          </a>
        </div>
        
        <p style="color: rgba(255,255,255,0.5); font-size: 12px; text-align: center; margin-top: 20px;">
          This invitation expires in 7 days.
        </p>
      </div>
      
      <p style="color: rgba(255,255,255,0.4); font-size: 11px; text-align: center;">
        If you didn't expect this invitation, you can safely ignore this email.
      </p>
    </div>
  `;

  return { subject, previewText, bodyHtml };
}

// API Functions
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

// Create and send invite
export async function createInvite(params: CreateInviteParams): Promise<{ data: Invite | null; error: string | null }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      // Demo mode - create mock invite
      const mockInvite: Invite = {
        id: 'inv-' + Date.now(),
        type: params.type,
        targetId: params.targetId,
        targetName: params.targetName,
        inviteeEmail: params.inviteeEmail,
        inviteeName: params.inviteeName,
        inviteeUserId: params.inviteeUserId,
        role: params.role,
        message: params.message,
        invitedBy: 'demo-user',
        invitedByName: 'Demo User',
        status: 'pending',
        token: generateToken(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      console.log('[InviteService] Demo mode - invite created:', mockInvite);
      if (params.sendEmail) {
        const emailTemplate = buildInviteEmail(mockInvite, params.type);
        console.log('[InviteService] Demo mode - email would be sent:', emailTemplate);
      }
      
      return { data: mockInvite, error: null };
    }

    const response = await fetch(`${API_BASE}/api/v1/invites`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create invite');
    }

    const invite = await response.json();
    return { data: invite, error: null };
  } catch (error) {
    console.error('[InviteService] Error creating invite:', error);
    return { data: null, error: (error as Error).message };
  }
}

// Get invites for a team or league
export async function getInvites(type: InviteType, targetId: string): Promise<Invite[]> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      // Demo mode
      return type === 'team' 
        ? DEMO_TEAM_INVITES.filter(i => i.targetId === targetId)
        : DEMO_LEAGUE_INVITES.filter(i => i.targetId === targetId);
    }

    const response = await fetch(`${API_BASE}/api/v1/invites?type=${type}&targetId=${targetId}`, {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    });

    if (!response.ok) throw new Error('Failed to fetch invites');
    return await response.json();
  } catch (error) {
    console.warn('[InviteService] Using demo invites:', error);
    return type === 'team' ? DEMO_TEAM_INVITES : DEMO_LEAGUE_INVITES;
  }
}

// Cancel an invite
export async function cancelInvite(inviteId: string): Promise<{ error: string | null }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      console.log('[InviteService] Demo mode - invite cancelled:', inviteId);
      return { error: null };
    }

    const response = await fetch(`${API_BASE}/api/v1/invites/${inviteId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    });

    if (!response.ok) throw new Error('Failed to cancel invite');
    return { error: null };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

// Resend invite email
export async function resendInvite(inviteId: string): Promise<{ error: string | null }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      console.log('[InviteService] Demo mode - invite resent:', inviteId);
      return { error: null };
    }

    const response = await fetch(`${API_BASE}/api/v1/invites/${inviteId}/resend`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    });

    if (!response.ok) throw new Error('Failed to resend invite');
    return { error: null };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

// Accept invite (for the invitee)
export async function acceptInvite(token: string): Promise<{ error: string | null }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    const response = await fetch(`${API_BASE}/api/v1/invites/accept`, {
      method: 'POST',
      headers: {
        'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token })
    });

    if (!response.ok) throw new Error('Failed to accept invite');
    return { error: null };
  } catch (error) {
    console.log('[InviteService] Demo mode - invite accepted');
    return { error: null };
  }
}

// Decline invite (for the invitee)
export async function declineInvite(token: string): Promise<{ error: string | null }> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/invites/decline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });

    if (!response.ok) throw new Error('Failed to decline invite');
    return { error: null };
  } catch (error) {
    console.log('[InviteService] Demo mode - invite declined');
    return { error: null };
  }
}

// Search for existing users to invite
export async function searchUsers(query: string): Promise<{ id: string; name: string; email: string; irating?: number }[]> {
  if (query.length < 2) return [];
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      // Demo search results
      const demoUsers = [
        { id: 'obb-1', name: 'Marcus Thompson', email: 'marcus.t@email.com', irating: 3245 },
        { id: 'obb-2', name: 'Elena Rodriguez', email: 'elena.r@email.com', irating: 4102 },
        { id: 'obb-3', name: 'James Wilson', email: 'james.w@email.com', irating: 2876 },
        { id: 'obb-4', name: 'Sarah Chen', email: 'sarah.c@email.com', irating: 5234 },
        { id: 'obb-5', name: 'Carlos Mendez', email: 'carlos.m@email.com', irating: 3891 },
      ];
      return demoUsers.filter(u => 
        u.name.toLowerCase().includes(query.toLowerCase()) ||
        u.email.toLowerCase().includes(query.toLowerCase())
      );
    }

    const response = await fetch(`${API_BASE}/api/v1/users/search?q=${encodeURIComponent(query)}`, {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    });

    if (!response.ok) throw new Error('Search failed');
    return await response.json();
  } catch (error) {
    console.warn('[InviteService] Using demo search:', error);
    return [];
  }
}
