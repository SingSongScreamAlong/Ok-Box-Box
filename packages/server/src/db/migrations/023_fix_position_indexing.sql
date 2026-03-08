-- Fix 0-indexed positions from iRacing Data API
-- iRacing REST API returns positions starting at 0 (0 = 1st place)
-- All app code expects 1-indexed positions (1 = 1st place)
-- This migration converts existing data; new syncs already fixed in code.

-- Fix iracing_race_results table
UPDATE iracing_race_results
SET start_position = start_position + 1
WHERE start_position IS NOT NULL;

UPDATE iracing_race_results
SET finish_position = finish_position + 1
WHERE finish_position IS NOT NULL;

UPDATE iracing_race_results
SET finish_position_in_class = finish_position_in_class + 1
WHERE finish_position_in_class IS NOT NULL;

-- Fix session_metrics table (populated by IDP pipeline from the same 0-indexed source)
UPDATE session_metrics
SET start_position = start_position + 1
WHERE start_position IS NOT NULL;

UPDATE session_metrics
SET finish_position = finish_position + 1
WHERE finish_position IS NOT NULL;

-- Recalculate positions_gained from corrected values (no net change, but ensures consistency)
UPDATE session_metrics
SET positions_gained = start_position - finish_position
WHERE start_position IS NOT NULL AND finish_position IS NOT NULL;
