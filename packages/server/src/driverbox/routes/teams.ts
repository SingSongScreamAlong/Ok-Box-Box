/**
 * Team System v1 API Routes
 * Endpoints for team management, membership, and aggregated views
 * 
 * Teams are a permissioned view layer over IDP - they READ driver data,
 * they do not own or modify it.
 * 
 * Mounted at: /api/v1/teams
 */

import { Router, Request, Response } from 'express';
import {
    createTeam,
    getTeamById,
    getTeamsForUser,
    updateTeam,
    archiveTeam,
    isTeamOwner,
    getTeamMemberCount,
} from '../../db/repositories/team.repo.js';
import {
    inviteDriver,
    acceptInvitation,
    declineInvitation,
    leaveTeam,
    removeDriver,
    getPendingInvitation,
    getActiveMembership,
    hasTeamPermission,
    getPendingInvitations,
} from '../../db/repositories/team-membership.repo.js';
import { getTeamRosterView } from '../services/teams/team-views.service.js';
import { getDriverProfileById, getDriverProfileByUserId } from '../../db/repositories/driver-profile.repo.js';
import { requireAuth } from '../../api/middleware/auth.js';
import type { CreateTeamDTO, UpdateTeamDTO, InviteDriverDTO } from '../types/team.types.js';

const router = Router();

// ========================
// Team CRUD
// ========================

/**
 * POST /api/v1/teams
 * Create a new team
 */
router.post('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const dto: CreateTeamDTO = req.body;
        if (!dto.name) {
            res.status(400).json({ error: 'Team name is required' });
            return;
        }

        const team = await createTeam(dto, req.user!.id);
        res.status(201).json(team);
    } catch (error) {
        console.error('[Team] Error creating team:', error);
        res.status(500).json({ error: 'Failed to create team' });
    }
});

/**
 * GET /api/v1/teams
 * List teams for current user (owned or member of)
 */
router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const teams = await getTeamsForUser(req.user!.id);
        res.json({ teams, count: teams.length });
    } catch (error) {
        console.error('[Team] Error listing teams:', error);
        res.status(500).json({ error: 'Failed to list teams' });
    }
});

/**
 * GET /api/v1/teams/invitations
 * Get pending invitations for current user
 * Must be before /:id route
 */
router.get('/invitations', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const driverProfile = await getDriverProfileByUserId(req.user!.id);
        if (!driverProfile) {
            res.json({ invitations: [] });
            return;
        }

        const invitations = await getPendingInvitations(driverProfile.id);

        // Enrich with team names
        const enriched = await Promise.all(
            invitations.map(async (inv) => {
                const team = await getTeamById(inv.team_id);
                return {
                    ...inv,
                    team_name: team?.name || 'Unknown',
                    team_logo_url: team?.logo_url || null,
                };
            })
        );

        res.json({ invitations: enriched });
    } catch (error) {
        console.error('[Team] Error fetching invitations:', error);
        res.status(500).json({ error: 'Failed to fetch invitations' });
    }
});

/**
 * GET /api/v1/teams/:id
 * Get team details (requires membership or ownership)
 */
router.get('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const team = await getTeamById(req.params.id);
        if (!team) {
            res.status(404).json({ error: 'Team not found' });
            return;
        }

        // Check access: owner or member
        const isOwner = team.owner_user_id === req.user!.id;
        const driverProfile = await getDriverProfileByUserId(req.user!.id);
        const isMember = driverProfile
            ? await getActiveMembership(team.id, driverProfile.id) !== null
            : false;

        if (!isOwner && !isMember) {
            res.status(403).json({ error: 'Not a member of this team' });
            return;
        }

        const memberCount = await getTeamMemberCount(team.id);
        res.json({ ...team, member_count: memberCount });
    } catch (error) {
        console.error('[Team] Error fetching team:', error);
        res.status(500).json({ error: 'Failed to fetch team' });
    }
});

/**
 * PATCH /api/v1/teams/:id
 * Update team (owner only)
 */
router.patch('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const isOwner = await isTeamOwner(req.params.id, req.user!.id);
        if (!isOwner) {
            res.status(403).json({ error: 'Only team owner can update' });
            return;
        }

        const dto: UpdateTeamDTO = req.body;
        const team = await updateTeam(req.params.id, dto);
        if (!team) {
            res.status(404).json({ error: 'Team not found' });
            return;
        }

        res.json(team);
    } catch (error) {
        console.error('[Team] Error updating team:', error);
        res.status(500).json({ error: 'Failed to update team' });
    }
});

/**
 * DELETE /api/v1/teams/:id
 * Archive team (owner only)
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const isOwner = await isTeamOwner(req.params.id, req.user!.id);
        if (!isOwner) {
            res.status(403).json({ error: 'Only team owner can delete' });
            return;
        }

        const success = await archiveTeam(req.params.id);
        if (!success) {
            res.status(404).json({ error: 'Team not found' });
            return;
        }

        res.status(204).send();
    } catch (error) {
        console.error('[Team] Error archiving team:', error);
        res.status(500).json({ error: 'Failed to archive team' });
    }
});

// ========================
// Membership
// ========================

/**
 * POST /api/v1/teams/:id/invite
 * Invite a driver to the team (manager+ only)
 */
router.post('/:id/invite', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        // Check permission
        const driverProfile = await getDriverProfileByUserId(req.user!.id);
        const isOwner = await isTeamOwner(req.params.id, req.user!.id);

        if (!isOwner) {
            if (!driverProfile || !(await hasTeamPermission(req.params.id, driverProfile.id, 'manager'))) {
                res.status(403).json({ error: 'Manager permission required' });
                return;
            }
        }

        const dto: InviteDriverDTO = req.body;
        if (!dto.driver_profile_id) {
            res.status(400).json({ error: 'driver_profile_id is required' });
            return;
        }

        // Check if target driver exists
        const targetDriver = await getDriverProfileById(dto.driver_profile_id);
        if (!targetDriver) {
            res.status(404).json({ error: 'Driver profile not found' });
            return;
        }

        // Check if already invited/member
        const existing = await getPendingInvitation(req.params.id, dto.driver_profile_id);
        if (existing) {
            res.status(409).json({ error: 'Driver already invited' });
            return;
        }

        const activeMembership = await getActiveMembership(req.params.id, dto.driver_profile_id);
        if (activeMembership) {
            res.status(409).json({ error: 'Driver already a member' });
            return;
        }

        const membership = await inviteDriver(req.params.id, dto, req.user!.id);
        res.status(201).json(membership);
    } catch (error) {
        console.error('[Team] Error inviting driver:', error);
        res.status(500).json({ error: 'Failed to invite driver' });
    }
});

/**
 * POST /api/v1/teams/:id/join
 * Accept invitation and join team
 */
router.post('/:id/join', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const driverProfile = await getDriverProfileByUserId(req.user!.id);
        if (!driverProfile) {
            res.status(400).json({ error: 'User has no driver profile' });
            return;
        }

        // Get pending invitation
        const invitation = await getPendingInvitation(req.params.id, driverProfile.id);
        if (!invitation) {
            res.status(404).json({ error: 'No pending invitation found' });
            return;
        }

        const scope = req.body.scope || 'team_standard';
        if (!['team_standard', 'team_deep'].includes(scope)) {
            res.status(400).json({ error: 'Invalid scope' });
            return;
        }

        const membership = await acceptInvitation(invitation.id, driverProfile.id, scope);
        if (!membership) {
            res.status(500).json({ error: 'Failed to accept invitation' });
            return;
        }

        res.json(membership);
    } catch (error) {
        console.error('[Team] Error joining team:', error);
        res.status(500).json({ error: 'Failed to join team' });
    }
});

/**
 * POST /api/v1/teams/:id/decline
 * Decline invitation
 */
router.post('/:id/decline', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const driverProfile = await getDriverProfileByUserId(req.user!.id);
        if (!driverProfile) {
            res.status(400).json({ error: 'User has no driver profile' });
            return;
        }

        const invitation = await getPendingInvitation(req.params.id, driverProfile.id);
        if (!invitation) {
            res.status(404).json({ error: 'No pending invitation found' });
            return;
        }

        const success = await declineInvitation(invitation.id, driverProfile.id);
        if (!success) {
            res.status(500).json({ error: 'Failed to decline invitation' });
            return;
        }

        res.status(204).send();
    } catch (error) {
        console.error('[Team] Error declining invitation:', error);
        res.status(500).json({ error: 'Failed to decline invitation' });
    }
});

/**
 * POST /api/v1/teams/:id/leave
 * Leave team (self-action)
 */
router.post('/:id/leave', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const driverProfile = await getDriverProfileByUserId(req.user!.id);
        if (!driverProfile) {
            res.status(400).json({ error: 'User has no driver profile' });
            return;
        }

        const success = await leaveTeam(req.params.id, driverProfile.id);
        if (!success) {
            res.status(404).json({ error: 'Not a member of this team' });
            return;
        }

        res.status(204).send();
    } catch (error) {
        console.error('[Team] Error leaving team:', error);
        res.status(500).json({ error: 'Failed to leave team' });
    }
});

/**
 * DELETE /api/v1/teams/:id/members/:driverId
 * Remove a driver from team (manager+ only)
 */
router.delete('/:id/members/:driverId', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        // Check permission
        const driverProfile = await getDriverProfileByUserId(req.user!.id);
        const isOwner = await isTeamOwner(req.params.id, req.user!.id);

        if (!isOwner) {
            if (!driverProfile || !(await hasTeamPermission(req.params.id, driverProfile.id, 'manager'))) {
                res.status(403).json({ error: 'Manager permission required' });
                return;
            }
        }

        const success = await removeDriver(req.params.id, req.params.driverId);
        if (!success) {
            res.status(404).json({ error: 'Member not found' });
            return;
        }

        res.status(204).send();
    } catch (error) {
        console.error('[Team] Error removing driver:', error);
        res.status(500).json({ error: 'Failed to remove driver' });
    }
});

/**
 * GET /api/v1/teams/:id/roster
 * Get team roster with aggregated driver data
 */
router.get('/:id/roster', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const team = await getTeamById(req.params.id);
        if (!team) {
            res.status(404).json({ error: 'Team not found' });
            return;
        }

        // Check access
        const driverProfile = await getDriverProfileByUserId(req.user!.id);
        const isOwner = team.owner_user_id === req.user!.id;
        const isMember = driverProfile
            ? await getActiveMembership(team.id, driverProfile.id) !== null
            : false;

        if (!isOwner && !isMember) {
            res.status(403).json({ error: 'Not a member of this team' });
            return;
        }

        // Use aggregate service for roster view
        const roster = await getTeamRosterView(req.params.id);
        if (!roster) {
            res.status(500).json({ error: 'Failed to build roster view' });
            return;
        }

        res.json(roster);
    } catch (error) {
        console.error('[Team] Error fetching roster:', error);
        res.status(500).json({ error: 'Failed to fetch roster' });
    }
});

// ========================
// Team Events
// ========================

import {
    createTeamEvent,
    getTeamEvents,
    getTeamEventById,
} from '../repositories/team-event.repo.js';
import { getTeamDebriefView, generateTeamDebrief } from '../services/teams/team-debrief.service.js';

/**
 * POST /api/v1/teams/:id/events
 * Create a team event (associate session with team)
 */
router.post('/:id/events', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const team = await getTeamById(req.params.id);
        if (!team) {
            res.status(404).json({ error: 'Team not found' });
            return;
        }

        // Only managers/owners can create events
        const isOwner = team.owner_user_id === req.user!.id;
        const driverProfile = await getDriverProfileByUserId(req.user!.id);
        const hasPermission = driverProfile
            ? await hasTeamPermission(team.id, driverProfile.id, 'manager')
            : false;

        if (!isOwner && !hasPermission) {
            res.status(403).json({ error: 'Not authorized to create events' });
            return;
        }

        const { session_id, event_name, event_type, participating_driver_ids } = req.body;

        if (!session_id) {
            res.status(400).json({ error: 'session_id is required' });
            return;
        }

        const event = await createTeamEvent({
            team_id: team.id,
            session_id,
            event_name,
            event_type,
            participating_driver_ids,
        });

        res.status(201).json(event);
    } catch (error) {
        console.error('[Team] Error creating event:', error);
        res.status(500).json({ error: 'Failed to create event' });
    }
});

/**
 * GET /api/v1/teams/:id/events
 * List team events
 */
router.get('/:id/events', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const team = await getTeamById(req.params.id);
        if (!team) {
            res.status(404).json({ error: 'Team not found' });
            return;
        }

        // Check membership
        const driverProfile = await getDriverProfileByUserId(req.user!.id);
        const isOwner = team.owner_user_id === req.user!.id;
        const isMember = driverProfile
            ? await getActiveMembership(team.id, driverProfile.id) !== null
            : false;

        if (!isOwner && !isMember) {
            res.status(403).json({ error: 'Not a member of this team' });
            return;
        }

        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;

        const events = await getTeamEvents(team.id, limit, offset);
        res.json({ team_id: team.id, count: events.length, events });
    } catch (error) {
        console.error('[Team] Error fetching events:', error);
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});

/**
 * GET /api/v1/teams/:id/events/:eventId/debrief
 * Get event debrief (aggregated driver debriefs + team synthesis)
 */
router.get('/:id/events/:eventId/debrief', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const event = await getTeamEventById(req.params.eventId);
        if (!event || event.team_id !== req.params.id) {
            res.status(404).json({ error: 'Event not found' });
            return;
        }

        // Check membership
        const team = await getTeamById(req.params.id);
        if (!team) {
            res.status(404).json({ error: 'Team not found' });
            return;
        }

        const driverProfile = await getDriverProfileByUserId(req.user!.id);
        const isOwner = team.owner_user_id === req.user!.id;
        const isMember = driverProfile
            ? await getActiveMembership(team.id, driverProfile.id) !== null
            : false;

        if (!isOwner && !isMember) {
            res.status(403).json({ error: 'Not a member of this team' });
            return;
        }

        const debrief = await getTeamDebriefView(event);
        res.json(debrief);
    } catch (error) {
        console.error('[Team] Error fetching debrief:', error);
        res.status(500).json({ error: 'Failed to fetch debrief' });
    }
});

/**
 * POST /api/v1/teams/:id/events/:eventId/debrief/generate
 * Trigger generation of team debrief (AI synthesis)
 */
router.post('/:id/events/:eventId/debrief/generate', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const event = await getTeamEventById(req.params.eventId);
        if (!event || event.team_id !== req.params.id) {
            res.status(404).json({ error: 'Event not found' });
            return;
        }

        // Only managers/owners can trigger generation
        const team = await getTeamById(req.params.id);
        if (!team) {
            res.status(404).json({ error: 'Team not found' });
            return;
        }

        const isOwner = team.owner_user_id === req.user!.id;
        const driverProfile = await getDriverProfileByUserId(req.user!.id);
        const hasPermission = driverProfile
            ? await hasTeamPermission(team.id, driverProfile.id, 'manager')
            : false;

        if (!isOwner && !hasPermission) {
            res.status(403).json({ error: 'Not authorized' });
            return;
        }

        const debrief = await generateTeamDebrief(event);
        res.status(201).json(debrief);
    } catch (error) {
        console.error('[Team] Error generating debrief:', error);
        res.status(500).json({ error: 'Failed to generate debrief' });
    }
});

export default router;
