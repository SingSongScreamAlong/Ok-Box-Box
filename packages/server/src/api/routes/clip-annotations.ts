// =====================================================================
// Clip Annotations API — Timestamped notes within replay clips
// =====================================================================

import { Router, Request, Response } from 'express';
import { pool } from '../../db/client.js';

export const clipAnnotationsRouter = Router();

interface AnnotationRow {
    id: string;
    clip_id: string;
    user_id: string;
    video_time_s: number;
    session_time_ms: number;
    text: string;
    category: string;
    created_at: Date;
    updated_at: Date;
}

function mapRow(r: AnnotationRow) {
    return {
        id: r.id,
        clipId: r.clip_id,
        userId: r.user_id,
        videoTimeS: r.video_time_s,
        sessionTimeMs: r.session_time_ms,
        text: r.text,
        category: r.category,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
    };
}

// ─── GET /api/clips/:clipId/annotations ──────────────────────────────
clipAnnotationsRouter.get('/:clipId/annotations', async (req: Request, res: Response): Promise<void> => {
    try {
        const { clipId } = req.params;
        const result = await pool.query<AnnotationRow>(
            'SELECT * FROM clip_annotations WHERE clip_id = $1 ORDER BY video_time_s ASC',
            [clipId]
        );
        res.json({ success: true, data: result.rows.map(mapRow) });
    } catch (error) {
        console.error('[Annotations] Fetch failed:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch annotations' });
    }
});

// ─── POST /api/clips/:clipId/annotations ─────────────────────────────
clipAnnotationsRouter.post('/:clipId/annotations', async (req: Request, res: Response): Promise<void> => {
    try {
        const { clipId } = req.params;
        const { videoTimeS, sessionTimeMs, text, category, userId } = req.body;

        if (!text || text.trim().length === 0) {
            res.status(400).json({ success: false, error: 'Annotation text is required' });
            return;
        }

        const ownerUserId = userId || (req as any).user?.id || 'anonymous';

        const result = await pool.query<AnnotationRow>(
            `INSERT INTO clip_annotations (clip_id, user_id, video_time_s, session_time_ms, text, category)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [clipId, ownerUserId, videoTimeS || 0, sessionTimeMs || 0, text.trim(), category || 'note']
        );

        res.json({ success: true, data: mapRow(result.rows[0]) });
    } catch (error) {
        console.error('[Annotations] Create failed:', error);
        res.status(500).json({ success: false, error: 'Failed to create annotation' });
    }
});

// ─── PUT /api/clips/:clipId/annotations/:id ──────────────────────────
clipAnnotationsRouter.put('/:clipId/annotations/:id', async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { text, category } = req.body;

        const result = await pool.query<AnnotationRow>(
            `UPDATE clip_annotations SET text = COALESCE($2, text), category = COALESCE($3, category), updated_at = NOW()
             WHERE id = $1 RETURNING *`,
            [id, text, category]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ success: false, error: 'Annotation not found' });
            return;
        }

        res.json({ success: true, data: mapRow(result.rows[0]) });
    } catch (error) {
        console.error('[Annotations] Update failed:', error);
        res.status(500).json({ success: false, error: 'Failed to update annotation' });
    }
});

// ─── DELETE /api/clips/:clipId/annotations/:id ───────────────────────
clipAnnotationsRouter.delete('/:clipId/annotations/:id', async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM clip_annotations WHERE id = $1', [id]);

        if ((result.rowCount ?? 0) === 0) {
            res.status(404).json({ success: false, error: 'Annotation not found' });
            return;
        }

        res.json({ success: true });
    } catch (error) {
        console.error('[Annotations] Delete failed:', error);
        res.status(500).json({ success: false, error: 'Failed to delete annotation' });
    }
});
