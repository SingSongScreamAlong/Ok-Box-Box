/**
 * Team Roles - Dashboard Types & Utilities
 * 
 * Open Team Culture: Transparency fosters growth, not judgment.
 * Everyone sees teammates' progress to support each other.
 */

// Built-in roles
export type BuiltInRole = 'owner' | 'team_principal' | 'team_engineer' | 'driver';

// Permission scopes
export type Permission =
    | 'view_own_idp'
    | 'view_team_idp'
    | 'view_team_assignments'
    | 'manage_own_goals'
    | 'manage_team_goals'
    | 'manage_shared_goals'
    | 'manage_roles'
    | 'assign_roles'
    | 'manage_members'
    | 'manage_team_settings'
    | 'view_strategy'
    | 'manage_strategy'
    | 'view_setups'
    | 'manage_setups';

// Goal visibility - simplified for open culture
// Shared by default, private is opt-in for truly personal matters
export type GoalVisibility = 'shared' | 'private';

// Team role definition
export interface TeamRole {
    id: string;
    name: string;
    slug: BuiltInRole | string;
    permissions: Permission[];
    is_builtin: boolean;
    hierarchy_level: number;
}

// Team member with role
export interface TeamMember {
    id: string;
    user_id: string;
    display_name: string;
    role: TeamRole;
    joined_at: string;

    // iRacing stats - visible to all teammates (open culture!)
    irating?: number;
    safety_rating?: number;
    license_class?: string;

    // IDP is open to all - we support each other's growth
    // Only private goals are filtered out
}

// Role display metadata
export const ROLE_DISPLAY: Record<BuiltInRole, { label: string; color: string; icon: string }> = {
    owner: {
        label: 'Owner',
        color: 'text-racing-yellow bg-racing-yellow/10',
        icon: '👑'
    },
    team_principal: {
        label: 'Team Principal',
        color: 'text-purple-400 bg-purple-400/10',
        icon: '🎩'
    },
    team_engineer: {
        label: 'Team Engineer',
        color: 'text-racing-blue bg-racing-blue/10',
        icon: '⚙️'
    },
    driver: {
        label: 'Driver',
        color: 'text-zinc-400 bg-zinc-400/10',
        icon: '🏎️'
    }
};

// Goal visibility display - simplified for open culture
export const GOAL_VISIBILITY_DISPLAY: Record<GoalVisibility, { label: string; color: string; icon: string }> = {
    shared: {
        label: 'Team Goal',
        color: 'text-racing-green bg-racing-green/10',
        icon: '👥'  // Visible to team
    },
    private: {
        label: 'Private',
        color: 'text-zinc-400 bg-zinc-400/10',
        icon: '🔒'  // Only you can see
    }
};

/**
 * Check if a role has a permission
 */
export function hasPermission(role: TeamRole, permission: Permission): boolean {
    return role.permissions.includes(permission);
}

/**
 * Check if user can view IDP - Open by default in open culture!
 * Everyone sees teammates' development journeys.
 */
export function canViewFullIDP(_viewerRole: TeamRole, _targetUserId: string, _viewerUserId: string): boolean {
    // Open culture: everyone can see teammates' IDP
    // Private goals are filtered separately, not here
    return true;
}

/**
 * Check if user can manage another user (hierarchy check)
 */
export function canManageUser(managerRole: TeamRole, targetRole: TeamRole): boolean {
    // Can only manage users at lower hierarchy (higher number)
    return managerRole.hierarchy_level < targetRole.hierarchy_level;
}

// Mock current user role for demo
export const DEMO_USER_ROLE: TeamRole = {
    id: 'demo-owner',
    name: 'Owner',
    slug: 'owner',
    permissions: [
        'view_own_idp', 'view_team_idp', 'view_team_assignments',
        'manage_own_goals', 'manage_team_goals', 'manage_shared_goals',
        'manage_roles', 'assign_roles',
        'manage_members', 'manage_team_settings',
        'view_strategy', 'manage_strategy',
        'view_setups', 'manage_setups'
    ],
    is_builtin: true,
    hierarchy_level: 0
};
