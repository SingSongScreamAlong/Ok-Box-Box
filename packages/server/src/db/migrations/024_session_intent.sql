-- Phase 2a: Session Intent Mode
-- Allows drivers to declare their intent before a session (practice, race sim, limit pushing, etc.)
-- This changes how telemetry and incidents are interpreted in the IDP pipeline.

-- Add session_intent column to iracing_race_results
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'iracing_race_results' AND column_name = 'session_intent'
    ) THEN
        ALTER TABLE iracing_race_results
        ADD COLUMN session_intent TEXT DEFAULT NULL;

        COMMENT ON COLUMN iracing_race_results.session_intent IS
            'Driver-declared intent: practice, quali_sim, race_sim, limit_pushing, testing, or NULL (undeclared)';
    END IF;
END $$;

-- Add session_intent column to sessions table (for relay-tracked sessions)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sessions' AND column_name = 'session_intent'
    ) THEN
        ALTER TABLE sessions
        ADD COLUMN session_intent TEXT DEFAULT NULL;
    END IF;
END $$;

-- Create a table to store the driver's current/default intent preference
CREATE TABLE IF NOT EXISTS driver_session_intent (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    current_intent TEXT NOT NULL DEFAULT 'race_sim',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(admin_user_id)
);

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_driver_session_intent_user ON driver_session_intent(admin_user_id);
