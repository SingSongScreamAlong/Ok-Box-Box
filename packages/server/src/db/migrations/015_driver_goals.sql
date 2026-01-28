-- =====================================================================
-- IDP Migration: 015_driver_goals.sql
-- Driver Goals System - Personal & AI-Generated Development Targets
-- =====================================================================
--
-- This system supports:
-- 1. Driver-set personal goals
-- 2. AI-recommended goals based on IDP data analysis
-- 3. Auto-tracking of goal progress from session data
-- 4. Goal suggestions on iRacing account connection
--

-- ========================
-- 1. DRIVER GOALS (Core Goals Table)
-- ========================
CREATE TABLE IF NOT EXISTS driver_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_profile_id UUID NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
    
    -- Goal definition
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL, -- 'irating', 'safety_rating', 'lap_time', 'consistency', 'wins', 'podiums', 'clean_races', 'license', 'custom'
    
    -- Target & Progress
    metric_key VARCHAR(100), -- e.g., 'irating', 'safety_rating', 'best_lap_ms', 'incident_rate'
    target_value DECIMAL(12,3) NOT NULL,
    current_value DECIMAL(12,3) DEFAULT 0,
    starting_value DECIMAL(12,3), -- Value when goal was created
    unit VARCHAR(50), -- 'iR', 'SR', 'ms', '%', 'count'
    
    -- Context (optional scoping)
    track_name VARCHAR(255),
    car_name VARCHAR(255),
    discipline VARCHAR(50), -- 'road', 'oval', 'dirt_road', 'dirt_oval'
    series_name VARCHAR(255),
    
    -- Status & Timeline
    status VARCHAR(20) DEFAULT 'active', -- 'suggested', 'active', 'achieved', 'failed', 'dismissed', 'paused'
    priority INTEGER DEFAULT 5, -- 1-10 (10 = highest)
    deadline TIMESTAMPTZ,
    
    -- Source & Attribution
    source VARCHAR(30) NOT NULL, -- 'self_set', 'ai_recommended', 'team_assigned', 'system_milestone'
    ai_rationale TEXT, -- Why AI suggested this goal
    ai_confidence DECIMAL(4,3), -- How confident AI is this is a good goal (0-1)
    
    -- Progress tracking
    progress_pct DECIMAL(5,2) DEFAULT 0, -- Computed progress percentage
    last_progress_update TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    achieved_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_driver_goals_profile ON driver_goals(driver_profile_id);
CREATE INDEX IF NOT EXISTS idx_driver_goals_status ON driver_goals(driver_profile_id, status);
CREATE INDEX IF NOT EXISTS idx_driver_goals_category ON driver_goals(category);
CREATE INDEX IF NOT EXISTS idx_driver_goals_active ON driver_goals(driver_profile_id) WHERE status = 'active';

-- ========================
-- 2. GOAL PROGRESS HISTORY (Track changes over time)
-- ========================
CREATE TABLE IF NOT EXISTS goal_progress_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES driver_goals(id) ON DELETE CASCADE,
    
    -- Progress snapshot
    value DECIMAL(12,3) NOT NULL,
    progress_pct DECIMAL(5,2),
    
    -- What triggered this update
    trigger_type VARCHAR(50) NOT NULL, -- 'session_complete', 'manual_update', 'api_sync', 'recalculation'
    trigger_session_id UUID,
    trigger_notes TEXT,
    
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goal_progress_goal ON goal_progress_history(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_progress_time ON goal_progress_history(goal_id, recorded_at DESC);

-- ========================
-- 3. GOAL TEMPLATES (Predefined goal types for quick creation)
-- ========================
CREATE TABLE IF NOT EXISTS goal_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Template definition
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    metric_key VARCHAR(100),
    
    -- Default values
    default_target_formula TEXT, -- e.g., 'current_irating + 500'
    suggested_deadline_days INTEGER,
    
    -- Display
    icon VARCHAR(50),
    color VARCHAR(20),
    
    -- Conditions for when to suggest this template
    suggest_when JSONB, -- e.g., {"irating_below": 2000, "sr_above": 3.0}
    
    -- Ordering
    display_order INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default goal templates
INSERT INTO goal_templates (name, description, category, metric_key, default_target_formula, suggested_deadline_days, icon, suggest_when, display_order) VALUES
    ('Reach Next iRating Milestone', 'Push your iRating to the next 500-point milestone', 'irating', 'irating', 'CEIL(current_irating / 500) * 500 + 500', 30, 'trending-up', '{"has_irating": true}', 10),
    ('Achieve A License', 'Earn your A class license through clean racing', 'license', 'license_level', '4', 60, 'award', '{"license_below": 4}', 20),
    ('Safety Rating 4.0+', 'Maintain elite safety rating above 4.0', 'safety_rating', 'safety_rating', '4.0', 30, 'shield', '{"sr_below": 4.0}', 30),
    ('Win a Race', 'Take the checkered flag first', 'wins', 'race_wins', 'current_wins + 1', NULL, 'trophy', '{"has_races": true}', 40),
    ('5 Clean Races', 'Complete 5 races with 0 incidents', 'clean_races', 'clean_race_streak', '5', 14, 'check-circle', '{"incident_rate_above": 1.0}', 50),
    ('Podium Finish', 'Finish in the top 3', 'podiums', 'podium_count', 'current_podiums + 1', NULL, 'medal', '{"has_races": true}', 60),
    ('Improve Consistency', 'Reduce lap time variance below 0.5%', 'consistency', 'lap_variance_pct', '0.5', 21, 'activity', '{"variance_above": 0.5}', 70),
    ('Track Personal Best', 'Set a new personal best at a specific track', 'lap_time', 'best_lap_ms', NULL, NULL, 'clock', '{}', 80)
ON CONFLICT DO NOTHING;

-- ========================
-- 4. GOAL ACHIEVEMENTS (Celebration moments)
-- ========================
CREATE TABLE IF NOT EXISTS goal_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES driver_goals(id) ON DELETE CASCADE,
    driver_profile_id UUID NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
    
    -- Achievement details
    achieved_value DECIMAL(12,3),
    achievement_session_id UUID,
    achievement_context JSONB, -- Additional context (track, car, position, etc.)
    
    -- Celebration
    celebration_message TEXT,
    shared_to_team BOOLEAN DEFAULT false,
    
    achieved_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goal_achievements_driver ON goal_achievements(driver_profile_id);
CREATE INDEX IF NOT EXISTS idx_goal_achievements_time ON goal_achievements(achieved_at DESC);

-- ========================
-- 5. FUNCTIONS FOR GOAL MANAGEMENT
-- ========================

-- Function to calculate goal progress percentage
CREATE OR REPLACE FUNCTION calculate_goal_progress(
    p_starting_value DECIMAL,
    p_current_value DECIMAL,
    p_target_value DECIMAL
) RETURNS DECIMAL AS $$
DECLARE
    v_progress DECIMAL;
    v_total_distance DECIMAL;
    v_current_distance DECIMAL;
BEGIN
    -- Handle edge cases
    IF p_target_value = p_starting_value THEN
        RETURN CASE WHEN p_current_value >= p_target_value THEN 100 ELSE 0 END;
    END IF;
    
    v_total_distance := ABS(p_target_value - p_starting_value);
    v_current_distance := ABS(p_current_value - p_starting_value);
    
    -- Check direction (are we going up or down toward target?)
    IF p_target_value > p_starting_value THEN
        -- Going up (e.g., iRating increase)
        IF p_current_value >= p_target_value THEN
            RETURN 100;
        ELSIF p_current_value <= p_starting_value THEN
            RETURN 0;
        ELSE
            v_progress := (v_current_distance / v_total_distance) * 100;
        END IF;
    ELSE
        -- Going down (e.g., reducing incident rate)
        IF p_current_value <= p_target_value THEN
            RETURN 100;
        ELSIF p_current_value >= p_starting_value THEN
            RETURN 0;
        ELSE
            v_progress := (v_current_distance / v_total_distance) * 100;
        END IF;
    END IF;
    
    RETURN LEAST(100, GREATEST(0, v_progress));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update goal progress from current stats
CREATE OR REPLACE FUNCTION update_goal_progress(
    p_goal_id UUID,
    p_new_value DECIMAL,
    p_trigger_type VARCHAR DEFAULT 'manual_update',
    p_trigger_session_id UUID DEFAULT NULL,
    p_trigger_notes TEXT DEFAULT NULL
) RETURNS driver_goals AS $$
DECLARE
    v_goal driver_goals;
    v_progress DECIMAL;
    v_was_achieved BOOLEAN;
BEGIN
    -- Get current goal
    SELECT * INTO v_goal FROM driver_goals WHERE id = p_goal_id;
    
    IF v_goal IS NULL THEN
        RAISE EXCEPTION 'Goal not found: %', p_goal_id;
    END IF;
    
    -- Calculate new progress
    v_progress := calculate_goal_progress(
        COALESCE(v_goal.starting_value, 0),
        p_new_value,
        v_goal.target_value
    );
    
    -- Check if goal was just achieved
    v_was_achieved := v_goal.status = 'active' AND v_progress >= 100;
    
    -- Update goal
    UPDATE driver_goals SET
        current_value = p_new_value,
        progress_pct = v_progress,
        last_progress_update = NOW(),
        updated_at = NOW(),
        status = CASE WHEN v_was_achieved THEN 'achieved' ELSE status END,
        achieved_at = CASE WHEN v_was_achieved THEN NOW() ELSE achieved_at END
    WHERE id = p_goal_id
    RETURNING * INTO v_goal;
    
    -- Record progress history
    INSERT INTO goal_progress_history (goal_id, value, progress_pct, trigger_type, trigger_session_id, trigger_notes)
    VALUES (p_goal_id, p_new_value, v_progress, p_trigger_type, p_trigger_session_id, p_trigger_notes);
    
    -- If achieved, create achievement record
    IF v_was_achieved THEN
        INSERT INTO goal_achievements (goal_id, driver_profile_id, achieved_value, achievement_session_id)
        VALUES (p_goal_id, v_goal.driver_profile_id, p_new_value, p_trigger_session_id);
    END IF;
    
    RETURN v_goal;
END;
$$ LANGUAGE plpgsql;

-- Function to generate AI goal suggestions for a driver
CREATE OR REPLACE FUNCTION generate_goal_suggestions(
    p_driver_profile_id UUID,
    p_current_irating INTEGER DEFAULT NULL,
    p_current_sr DECIMAL DEFAULT NULL,
    p_current_license INTEGER DEFAULT NULL,
    p_incident_rate DECIMAL DEFAULT NULL,
    p_race_count INTEGER DEFAULT NULL
) RETURNS TABLE (
    template_id UUID,
    template_name VARCHAR,
    category VARCHAR,
    suggested_target DECIMAL,
    rationale TEXT,
    priority INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        t.category,
        CASE 
            WHEN t.category = 'irating' AND p_current_irating IS NOT NULL THEN
                (CEIL(p_current_irating::DECIMAL / 500) * 500 + 500)::DECIMAL
            WHEN t.category = 'safety_rating' THEN 4.0
            WHEN t.category = 'license' THEN 4.0
            WHEN t.category = 'clean_races' THEN 5.0
            ELSE t.default_target_formula::DECIMAL
        END as suggested_target,
        CASE
            WHEN t.category = 'irating' THEN 
                'Based on your current iRating of ' || p_current_irating || ', reaching ' || 
                (CEIL(p_current_irating::DECIMAL / 500) * 500 + 500)::TEXT || ' is an achievable next milestone.'
            WHEN t.category = 'safety_rating' AND p_current_sr < 4.0 THEN
                'Your SR of ' || p_current_sr || ' is close to the elite 4.0 threshold. Clean racing will get you there.'
            WHEN t.category = 'clean_races' AND p_incident_rate > 1.0 THEN
                'Your incident rate of ' || ROUND(p_incident_rate, 2) || ' suggests focusing on clean races would improve your results.'
            ELSE t.description
        END as rationale,
        CASE
            WHEN t.category = 'irating' AND p_current_irating < 1500 THEN 8
            WHEN t.category = 'safety_rating' AND p_current_sr < 3.0 THEN 9
            WHEN t.category = 'clean_races' AND p_incident_rate > 2.0 THEN 7
            ELSE 5
        END as priority
    FROM goal_templates t
    WHERE t.is_active = true
    AND NOT EXISTS (
        -- Don't suggest goals the driver already has active
        SELECT 1 FROM driver_goals g 
        WHERE g.driver_profile_id = p_driver_profile_id 
        AND g.category = t.category 
        AND g.status IN ('active', 'suggested')
    )
    AND (
        -- Apply suggestion conditions
        (t.category = 'irating' AND p_current_irating IS NOT NULL)
        OR (t.category = 'safety_rating' AND p_current_sr IS NOT NULL AND p_current_sr < 4.0)
        OR (t.category = 'license' AND p_current_license IS NOT NULL AND p_current_license < 4)
        OR (t.category = 'clean_races' AND p_incident_rate IS NOT NULL AND p_incident_rate > 1.0)
        OR (t.category IN ('wins', 'podiums') AND p_race_count IS NOT NULL AND p_race_count > 5)
    )
    ORDER BY priority DESC, t.display_order ASC
    LIMIT 5;
END;
$$ LANGUAGE plpgsql;

-- ========================
-- 6. TRIGGER TO UPDATE TIMESTAMPS
-- ========================
CREATE OR REPLACE FUNCTION update_goal_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_goal_timestamp ON driver_goals;
CREATE TRIGGER trg_update_goal_timestamp
    BEFORE UPDATE ON driver_goals
    FOR EACH ROW
    EXECUTE FUNCTION update_goal_timestamp();
