-- =====================================================================
-- Session Categorization Migration
-- Adds official_session flag to distinguish official vs hosted races
-- Also adds session_type for practice/qualifying/race categorization
-- =====================================================================

-- Add official_session column (true = official iRacing race, false = hosted/league)
ALTER TABLE iracing_race_results 
ADD COLUMN IF NOT EXISTS official_session BOOLEAN DEFAULT NULL;

-- Add session_type for more granular categorization
-- Values: 'official_race', 'unofficial_race', 'practice', 'qualifying', 'time_trial'
ALTER TABLE iracing_race_results 
ADD COLUMN IF NOT EXISTS session_type VARCHAR(50) DEFAULT NULL;

-- Index for filtering by session type
CREATE INDEX IF NOT EXISTS idx_iracing_results_session_type 
    ON iracing_race_results(admin_user_id, session_type);

CREATE INDEX IF NOT EXISTS idx_iracing_results_official 
    ON iracing_race_results(admin_user_id, official_session);

-- Update existing records based on event_type
-- This is a best-effort migration for existing data
UPDATE iracing_race_results 
SET session_type = CASE 
    WHEN LOWER(event_type) = 'race' THEN 'official_race'
    WHEN LOWER(event_type) = 'practice' THEN 'practice'
    WHEN LOWER(event_type) = 'qualifying' THEN 'qualifying'
    WHEN LOWER(event_type) = 'time trial' THEN 'time_trial'
    ELSE 'official_race'
END
WHERE session_type IS NULL;
