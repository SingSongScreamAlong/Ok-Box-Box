/**
 * Team Roles & Permissions System - Open Team Culture
 * 
 * Philosophy: Transparency fosters growth, not judgment.
 * Roles control WHO CAN EDIT, not who can SEE.
 * Everyone sees teammates' progress to support each other.
 * 
 * Hierarchy: Owner > Team Principal / Engineer > Custom Roles > Driver
 */

// Built-in role identifiers
export type BuiltInRole = 'owner' | 'team_principal' | 'team_engineer' | 'driver';

// Permission scopes
export type Permission =
    // IDP visibility
    | 'view_own_idp'           // See own development plan
    | 'view_team_idp'          // See all team members' IDPs
    | 'view_team_assignments'  // See assignments given to you

    // Goal management
    | 'manage_own_goals'       // Create/edit own personal goals
    | 'manage_team_goals'      // Create/edit goals for any team member
    | 'manage_shared_goals'    // Create/edit shared team goals

    // Role management
    | 'manage_roles'           // Create/edit custom roles
    | 'assign_roles'           // Assign roles to members

    // Team management
    | 'manage_members'         // Add/remove team members
    | 'manage_team_settings'   // Edit team name, branding, etc.

    // Strategy & planning
    | 'view_strategy'          // View team strategy
    | 'manage_strategy'        // Create/edit stints, assignments
    | 'view_setups'            // View team setups
    | 'manage_setups';         // Upload/edit setups

// Role definition
export interface TeamRole {
    id: string;
    team_id: string;
    name: string;
    slug: BuiltInRole | string;  // Built-in or custom slug
    permissions: Permission[];
    is_builtin: boolean;
    hierarchy_level: number;     // Lower = more authority (owner=0)
    created_by?: string;
    created_at: string;
}

// Team membership with role
export interface TeamMembership {
    id: string;
    team_id: string;
    user_id: string;
    role_id: string;
    display_name: string;
    joined_at: string;
}

// Built-in role definitions
export const BUILT_IN_ROLES: Record<BuiltInRole, { permissions: Permission[]; hierarchy_level: number }> = {
    owner: {
        hierarchy_level: 0,
        permissions: [
            'view_own_idp', 'view_team_idp', 'view_team_assignments',
            'manage_own_goals', 'manage_team_goals', 'manage_shared_goals',
            'manage_roles', 'assign_roles',
            'manage_members', 'manage_team_settings',
            'view_strategy', 'manage_strategy',
            'view_setups', 'manage_setups'
        ]
    },
    team_principal: {
        hierarchy_level: 1,
        permissions: [
            'view_own_idp', 'view_team_idp', 'view_team_assignments',
            'manage_own_goals', 'manage_team_goals', 'manage_shared_goals',
            'manage_roles', 'assign_roles',  // Can create sub-roles
            'manage_members',
            'view_strategy', 'manage_strategy',
            'view_setups', 'manage_setups'
        ]
    },
    team_engineer: {
        hierarchy_level: 1,  // Same level as TP (can't affect each other)
        permissions: [
            'view_own_idp', 'view_team_idp', 'view_team_assignments',
            'manage_own_goals', 'manage_team_goals', 'manage_shared_goals',
            'manage_roles', 'assign_roles',  // Can create sub-roles
            'view_strategy', 'manage_strategy',
            'view_setups', 'manage_setups'
        ]
    },
    driver: {
        hierarchy_level: 10,
        permissions: [
            'view_own_idp', 'view_team_idp', 'view_team_assignments',  // Open culture: see teammates!
            'manage_own_goals',
            'view_strategy',
            'view_setups'
        ]
    }
};

/**
 * Team Role Manager
 */
export class TeamRoleManager {
    private roles: Map<string, TeamRole> = new Map();
    private memberships: Map<string, TeamMembership> = new Map();

    /**
     * Initialize built-in roles for a team
     */
    initializeTeamRoles(teamId: string): TeamRole[] {
        const roles: TeamRole[] = [];

        for (const [slug, config] of Object.entries(BUILT_IN_ROLES)) {
            const role: TeamRole = {
                id: `${teamId}-${slug}`,
                team_id: teamId,
                name: this.formatRoleName(slug as BuiltInRole),
                slug,
                permissions: config.permissions,
                is_builtin: true,
                hierarchy_level: config.hierarchy_level,
                created_at: new Date().toISOString()
            };
            roles.push(role);
            this.roles.set(role.id, role);
        }

        return roles;
    }

    /**
     * Create a custom role
     */
    createCustomRole(params: {
        team_id: string;
        name: string;
        slug: string;
        permissions: Permission[];
        created_by: string;
    }): TeamRole {
        const role: TeamRole = {
            id: `${params.team_id}-${params.slug}`,
            team_id: params.team_id,
            name: params.name,
            slug: params.slug,
            permissions: params.permissions,
            is_builtin: false,
            hierarchy_level: 5,  // Custom roles below TP/Eng but above base driver
            created_by: params.created_by,
            created_at: new Date().toISOString()
        };

        this.roles.set(role.id, role);
        return role;
    }

    /**
     * Check if a user has a specific permission
     */
    hasPermission(userId: string, teamId: string, permission: Permission): boolean {
        const membership = this.getMembership(userId, teamId);
        if (!membership) return false;

        const role = this.roles.get(membership.role_id);
        if (!role) return false;

        return role.permissions.includes(permission);
    }

    /**
     * Check if user can manage another user's role
     */
    canManageRole(managerUserId: string, targetUserId: string, teamId: string): boolean {
        const managerMembership = this.getMembership(managerUserId, teamId);
        const targetMembership = this.getMembership(targetUserId, teamId);

        if (!managerMembership || !targetMembership) return false;

        const managerRole = this.roles.get(managerMembership.role_id);
        const targetRole = this.roles.get(targetMembership.role_id);

        if (!managerRole || !targetRole) return false;

        // Can only manage users at lower hierarchy level
        // Exception: TP and Engineer can't affect each other (same level)
        if (managerRole.hierarchy_level >= targetRole.hierarchy_level) {
            return false;
        }

        // Check manage_roles permission
        return managerRole.permissions.includes('manage_roles');
    }

    /**
     * Get IDP data - Open by default for team culture!
     * 
     * Philosophy: Teammates see each other's development journeys
     * to celebrate progress and support growth together.
     * Private goals are filtered out separately.
     */
    getVisibleIDPData(
        viewerUserId: string,
        _targetUserId: string,
        _teamId: string,
        fullIDPData: any
    ): any {
        // Open team culture: everyone sees full IDP data
        // Private goals are handled by goal filtering, not IDP hiding
        // 
        // This builds camaraderie:
        // - New drivers learn from experienced teammates' journeys
        // - Everyone celebrates milestones together
        // - Transparency builds trust, not judgment

        // Only truly personal data (private goals) is filtered elsewhere
        return {
            ...fullIDPData,
            // Filter out private goals (handled by GoalVisibilityManager)
            goals: fullIDPData.goals?.filter((g: any) =>
                g.visibility !== 'private' || g.target_user_id === viewerUserId
            )
        };
    }

    private getMembership(userId: string, teamId: string): TeamMembership | undefined {
        for (const m of this.memberships.values()) {
            if (m.user_id === userId && m.team_id === teamId) {
                return m;
            }
        }
        return undefined;
    }

    private formatRoleName(slug: BuiltInRole): string {
        const names: Record<BuiltInRole, string> = {
            owner: 'Owner',
            team_principal: 'Team Principal',
            team_engineer: 'Team Engineer',
            driver: 'Driver'
        };
        return names[slug];
    }
}

// Export singleton
export const teamRoleManager = new TeamRoleManager();
