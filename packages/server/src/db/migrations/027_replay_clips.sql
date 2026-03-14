-- =====================================================================
-- 027: Replay Clips — Cloud storage metadata for Replay Intelligence
-- =====================================================================

CREATE TABLE IF NOT EXISTS replay_clips (
    clip_id         TEXT PRIMARY KEY,
    session_id      TEXT NOT NULL,
    user_id         TEXT NOT NULL,
    event_type      TEXT NOT NULL DEFAULT 'unknown',
    event_label     TEXT NOT NULL DEFAULT '',
    severity        TEXT NOT NULL DEFAULT 'minor',
    session_time_ms INTEGER NOT NULL DEFAULT 0,
    duration_ms     INTEGER NOT NULL DEFAULT 0,
    frame_count     INTEGER NOT NULL DEFAULT 0,
    resolution      TEXT NOT NULL DEFAULT '',
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    storage_path    TEXT NOT NULL DEFAULT '',
    telemetry_path  TEXT,
    tags            TEXT[] DEFAULT '{}',
    telemetry_sync  JSONB DEFAULT '{}',
    thumbnail_path  TEXT,
    uploaded_at     TIMESTAMPTZ DEFAULT NOW(),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_replay_clips_session ON replay_clips (session_id);
CREATE INDEX IF NOT EXISTS idx_replay_clips_user    ON replay_clips (user_id);
CREATE INDEX IF NOT EXISTS idx_replay_clips_uploaded ON replay_clips (uploaded_at DESC);
