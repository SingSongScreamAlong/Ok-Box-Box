/**
 * Team Guard Middleware
 * Authorization guards for team-related endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { getTeamById } from '../../db/repositories/team.repo.js';
import { getActiveMembership } from '../../db/repositories/team-membership.repo.js';
import { getDriverProfileByUserId } from '../../db/repositories/driver-profile.repo.js';

export type TeamRole = 'driver' | 'engineer' | 'analyst' | 'admin' | 'manager' | 'owner';

const ROLE_HIERARCHY: Record<TeamRole, number> = {
    driver: 1,
    analyst: 2,
    engineer: 3,
    admin: 4,
    manager: 5,
    owner: 6,
};

export function requireTeamMember(paramName = 'id') {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const teamId = req.params[paramName];
            if (!teamId) { res.status(400).json({ error: 'Team ID required' }); return; }

            const team = await getTeamById(teamId);
            if (!team) { res.status(404).json({ error: 'Team not found' }); return; }

            const isOwner = team.owner_user_id === req.user!.id;
            const driverProfile = await getDriverProfileByUserId(req.user!.id);
            let membership = null;

            if (driverProfile) {
                membership = await getActiveMembership(team.id, driverProfile.id);
            }

            if (!isOwner && !membership) {
                res.status(403).json({ error: 'Not a member of this team' });
                return;
            }

            (req as any).team = team;
            (req as any).teamMembership = membership;
            (req as any).isTeamOwner = isOwner;
            next();
        } catch (error) {
            console.error('[TeamGuard] Error:', error);
            res.status(500).json({ error: 'Authorization check failed' });
        }
    };
}

export function requireTeamRole(minRole: TeamRole) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const isOwner = (req as any).isTeamOwner;
        const membership = (req as any).teamMembership;

        if (isOwner) { next(); return; }
        if (!membership) { res.status(403).json({ error: 'Team membership required' }); return; }

        const userRoleLevel = ROLE_HIERARCHY[membership.role as TeamRole] || 0;
        const requiredLevel = ROLE_HIERARCHY[minRole] || 0;

        if (userRoleLevel < requiredLevel) {
            res.status(403).json({ error: `Requires ${minRole} role or higher`, current_role: membership.role });
            return;
        }
        next();
    };
}

export function rateLimit(key: string, maxPerDay: number) {
    const counters = new Map<string, { count: number; resetAt: number }>();
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const userId = req.user!.id;
        const counterKey = `${key}:${userId}`;
        const now = Date.now();

        let counter = counters.get(counterKey);
        if (!counter || counter.resetAt < now) {
            counter = { count: 0, resetAt: now + 24 * 60 * 60 * 1000 };
        }
        counter.count++;
        counters.set(counterKey, counter);

        if (counter.count > maxPerDay) {
            res.status(429).json({ error: `Rate limit exceeded. Maximum ${maxPerDay} ${key} per day.`, retry_after_seconds: Math.ceil((counter.resetAt - now) / 1000) });
            return;
        }
        next();
    };
}
