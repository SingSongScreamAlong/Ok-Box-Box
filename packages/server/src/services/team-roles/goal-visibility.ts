/**
 * Goal Visibility System - Open Team Culture
 * 
 * Philosophy: Transparency fosters growth, not judgment.
 * Everyone sees teammates' goals to support each other.
 * Private goals are opt-in for truly personal matters.
 */

import { Permission } from '../team-roles';

// Simplified visibility: shared by default, opt-in privacy
export type GoalVisibility = 'shared' | 'private';

// Extended target with visibility
export interface TeamGoal {
    id: string;
    team_id: string;
    target_user_id: string;          // Who the goal is for
    created_by_user_id: string;       // Who created it

    // Core goal data
    label: string;
    category: 'lap_time' | 'consistency' | 'safety' | 'irating' | 'custom';
    target_value: number | string;
    current_value: number | string;
    status: 'active' | 'achieved' | 'failed' | 'dismissed';

    // Visibility - shared by default!
    visibility: GoalVisibility;

    // Metadata
    track?: string;
    deadline?: string;
    notes?: string;
    progress_history?: { date: string; value: string | number }[];
    achieved_at?: string;
    created_at: string;
}

/**
 * Open Team Culture Visibility Rules:
 * 
 * SHARED (default):
 *   - Visible to: ALL team members
 *   - Purpose: Build camaraderie, celebrate growth together
 *   - Created by: Anyone (self goals) or leadership (team goals)
 *   - Editable by: Goal owner or leadership
 * 
 * PRIVATE (opt-in):
 *   - Visible to: Only the driver themselves
 *   - Purpose: Personal matters driver chooses not to share
 *   - Created by: Driver themselves
 *   - Editable by: Only that driver
 * 
 * Admin permissions control WHO CAN EDIT, not who can SEE.
 * Transparency builds trust. Hiding builds walls.
 */

export class GoalVisibilityManager {
    /**
     * Filter goals based on viewer - open by default!
     */
    filterVisibleGoals(
        goals: TeamGoal[],
        viewerUserId: string,
        _viewerPermissions: Permission[] // Permissions mostly for edit, not view
    ): TeamGoal[] {
        return goals.filter(goal => {
            // Private goals - only visible to the driver themselves
            if (goal.visibility === 'private') {
                return goal.target_user_id === viewerUserId;
            }

            // Shared goals (default) - visible to ALL team members
            // This includes goals from leadership AND self-goals
            // Everyone supports everyone's growth!
            return true;
        });
    }

    /**
     * Check if user can create goals for a target
     */
    canCreateGoalFor(
        creatorUserId: string,
        targetUserId: string,
        visibility: GoalVisibility,
        creatorPermissions: Permission[]
    ): boolean {
        // Private goals - only for yourself
        if (visibility === 'private') {
            return creatorUserId === targetUserId;
        }

        // Shared goals:
        // - Can always create for yourself
        // - Need manage_team_goals to create for others
        if (visibility === 'shared') {
            if (creatorUserId === targetUserId) {
                return true; // Anyone can set their own shared goals
            }
            return creatorPermissions.includes('manage_team_goals');
        }

        return false;
    }

    /**
     * Check if user can edit a goal
     */
    canEditGoal(
        goal: TeamGoal,
        editorUserId: string,
        editorPermissions: Permission[]
    ): boolean {
        // Private goals - only owner can edit
        if (goal.visibility === 'private') {
            return goal.target_user_id === editorUserId;
        }

        // Shared goals - owner OR leadership can edit
        if (goal.visibility === 'shared') {
            // The person the goal is for can always edit their own goals
            if (goal.target_user_id === editorUserId) {
                return true;
            }
            // Leadership can also edit (for team coordination)
            return editorPermissions.includes('manage_team_goals');
        }

        return false;
    }

    /**
     * Check if user can make a goal private
     * Only the goal owner can mark their own goals as private
     */
    canSetPrivate(goal: TeamGoal, userId: string): boolean {
        return goal.target_user_id === userId;
    }

    /**
     * Get display label for goal visibility
     */
    getVisibilityLabel(visibility: GoalVisibility): string {
        const labels: Record<GoalVisibility, string> = {
            shared: 'Team Goal',
            private: 'Private'
        };
        return labels[visibility];
    }

    /**
     * Get visibility badge styling
     */
    getVisibilityColor(visibility: GoalVisibility): string {
        const colors: Record<GoalVisibility, string> = {
            shared: 'text-racing-green bg-racing-green/10',
            private: 'text-zinc-400 bg-zinc-400/10'
        };
        return colors[visibility];
    }

    /**
     * Get visibility icon
     */
    getVisibilityIcon(visibility: GoalVisibility): string {
        const icons: Record<GoalVisibility, string> = {
            shared: 'users',      // Team icon
            private: 'lock'       // Private icon
        };
        return icons[visibility];
    }
}

export const goalVisibilityManager = new GoalVisibilityManager();
