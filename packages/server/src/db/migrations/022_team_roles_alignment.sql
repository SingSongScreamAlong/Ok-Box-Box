-- =====================================================================
-- Migration: 022_team_roles_alignment.sql
-- Align team_memberships role CHECK constraint with full role hierarchy
-- Adds: analyst, admin roles to team_memberships
-- =====================================================================

-- Drop and recreate the CHECK constraint to include all 6 roles
DO $$
BEGIN
    -- Drop the old constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage
        WHERE table_name = 'team_memberships' AND column_name = 'role'
    ) THEN
        ALTER TABLE team_memberships DROP CONSTRAINT IF EXISTS team_memberships_role_check;
    END IF;

    -- Add the expanded constraint
    ALTER TABLE team_memberships
        ADD CONSTRAINT team_memberships_role_check
        CHECK (role IN ('driver', 'analyst', 'engineer', 'admin', 'manager', 'owner'));
END $$;
