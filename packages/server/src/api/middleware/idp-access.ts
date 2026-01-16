/**
 * IDP Access Control Middleware
 * Resolves and enforces scoped access to driver profiles
 */

import { Request, Response, NextFunction } from 'express';
import { resolveAccessScope } from '../../db/repositories/driver-profile.repo.js';
import { ResolvedScope } from '../../driverbox/types/idp.types.js';

// Extend Express Request to include IDP context
declare global {
    namespace Express {
        interface Request {
            idpContext?: {
                driverProfileId: string;
                scope: ResolvedScope;
            };
        }
    }
}

/**
 * Middleware factory for IDP access control
 * @param requiredScope Minimum scope required for this route
 */
export function requireIDPAccess(requiredScope: ResolvedScope) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const driverProfileId = req.params.id || req.params.driverProfileId;

            if (!driverProfileId) {
                res.status(400).json({ error: 'Driver profile ID required' });
                return;
            }

            // Get requester context
            const requesterId = req.user?.id || null;
            // Note: leagues would come from a user's team memberships - simplified for now
            const requesterLeagues: string[] = [];

            // Resolve access scope
            const scope = await resolveAccessScope(driverProfileId, requesterId, requesterLeagues);

            // Check if scope meets requirement
            if (!meetsRequirement(scope, requiredScope)) {
                res.status(403).json({
                    error: 'Insufficient access',
                    required: requiredScope,
                    granted: scope || 'none'
                });
                return;
            }

            // Attach context for downstream handlers
            req.idpContext = {
                driverProfileId,
                scope,
            };

            next();
        } catch (error) {
            console.error('[IDP Access] Error resolving scope:', error);
            res.status(500).json({ error: 'Failed to resolve access permissions' });
        }
    };
}

/**
 * Check if granted scope meets the required level
 */
function meetsRequirement(granted: ResolvedScope, required: ResolvedScope): boolean {
    if (!granted) return false;
    if (required === null) return true; // No requirement

    const scopeHierarchy: Record<string, number> = {
        'owner': 4,
        'team_deep': 3,
        'team_standard': 2,
        'public': 1,
    };

    return scopeHierarchy[granted] >= scopeHierarchy[required];
}

/**
 * Middleware that only allows profile owners
 */
export const requireOwner = requireIDPAccess('owner');

/**
 * Middleware that requires team_deep access
 */
export const requireTeamDeep = requireIDPAccess('team_deep');

/**
 * Middleware that requires team_standard access
 */
export const requireTeamStandard = requireIDPAccess('team_standard');

/**
 * Middleware that allows public access (still validates profile exists)
 */
export const allowPublic = requireIDPAccess('public');

/**
 * Filter response data based on access scope
 */
export function filterByScope<T extends object>(
    data: T,
    scope: ResolvedScope,
    fieldRules: Record<string, ResolvedScope>
): Partial<T> {
    if (scope === 'owner') {
        return data; // Owner sees everything
    }

    const filtered: Partial<T> = {};

    for (const [key, value] of Object.entries(data)) {
        const requiredScope = fieldRules[key] || 'public';
        if (meetsRequirement(scope, requiredScope)) {
            (filtered as Record<string, unknown>)[key] = value;
        }
    }

    return filtered;
}
