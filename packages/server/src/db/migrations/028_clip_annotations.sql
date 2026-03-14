-- =====================================================================
-- 028: Clip Annotations — Timestamped notes within replay clips
-- =====================================================================

CREATE TABLE IF NOT EXISTS clip_annotations (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    clip_id         TEXT NOT NULL REFERENCES replay_clips(clip_id) ON DELETE CASCADE,
    user_id         TEXT NOT NULL,
    video_time_s    REAL NOT NULL DEFAULT 0,       -- seconds into video
    session_time_ms INTEGER NOT NULL DEFAULT 0,    -- iRacing session time
    text            TEXT NOT NULL DEFAULT '',
    category        TEXT NOT NULL DEFAULT 'note',   -- note, technique, mistake, highlight
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clip_annotations_clip ON clip_annotations (clip_id);
CREATE INDEX IF NOT EXISTS idx_clip_annotations_user ON clip_annotations (user_id);
