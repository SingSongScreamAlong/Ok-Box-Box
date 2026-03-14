// =====================================================================
// Clips API — Replay Intelligence Cloud Storage
//
// Provides presigned upload/download URLs for replay clips and
// stores clip metadata in the database for cross-device access.
// =====================================================================

import { Router, Request, Response } from 'express';
import {
    generatePresignedUploadUrl,
    generatePresignedDownloadUrl,
    isStorageConfigured,
} from '../../services/storage/s3-client.js';
import { pool } from '../../db/client.js';

export const clipsRouter = Router();

// ─── POST /api/clips/upload — Get presigned upload URL ───────────────
clipsRouter.post('/upload', async (req: Request, res: Response): Promise<void> => {
    try {
        const {
            clipId,
            sessionId,
            eventType,
            eventLabel,
            severity,
            sessionTimeMs,
            durationMs,
            frameCount,
            resolution,
            fileSizeBytes,
            telemetrySync,
            userId,
        } = req.body;

        if (!clipId || !sessionId) {
            res.status(400).json({ success: false, error: 'clipId and sessionId are required' });
            return;
        }

        if (!isStorageConfigured()) {
            res.status(503).json({ success: false, error: 'Cloud storage not configured' });
            return;
        }

        // Storage path: clips/{userId}/{sessionId}/{clipId}.mp4
        const ownerUserId = userId || (req as any).user?.id || 'anonymous';
        const storagePath = `clips/${ownerUserId}/${sessionId}/${clipId}.mp4`;
        const telemetryPath = `clips/${ownerUserId}/${sessionId}/${clipId}_telemetry.json`;

        // Generate presigned upload URLs for both video and telemetry
        const videoUploadUrl = await generatePresignedUploadUrl(storagePath, 'video/mp4');
        const telemetryUploadUrl = await generatePresignedUploadUrl(telemetryPath, 'application/json');

        // Upsert clip metadata into database
        await pool.query(
            `INSERT INTO replay_clips (
                clip_id, session_id, user_id, event_type, event_label, severity,
                session_time_ms, duration_ms, frame_count, resolution,
                file_size_bytes, storage_path, telemetry_path,
                telemetry_sync, uploaded_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
            ON CONFLICT (clip_id) DO UPDATE SET
                storage_path = EXCLUDED.storage_path,
                telemetry_path = EXCLUDED.telemetry_path,
                uploaded_at = NOW()`,
            [
                clipId, sessionId, ownerUserId, eventType || 'unknown',
                eventLabel || '', severity || 'minor',
                sessionTimeMs || 0, durationMs || 0, frameCount || 0,
                resolution || '', fileSizeBytes || 0,
                storagePath, telemetryPath,
                JSON.stringify(telemetrySync || {}),
            ]
        );

        res.json({
            success: true,
            data: {
                clipId,
                videoUploadUrl,
                telemetryUploadUrl,
                storagePath,
                telemetryPath,
            },
        });
    } catch (error) {
        console.error('[Clips] Upload URL generation failed:', error);
        res.status(500).json({ success: false, error: 'Failed to generate upload URL' });
    }
});

// ─── GET /api/clips/:clipId/url — Get presigned download URL ─────────
clipsRouter.get('/:clipId/url', async (req: Request, res: Response): Promise<void> => {
    try {
        const { clipId } = req.params;

        const result = await pool.query(
            'SELECT storage_path, telemetry_path FROM replay_clips WHERE clip_id = $1',
            [clipId]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ success: false, error: 'Clip not found' });
            return;
        }

        const { storage_path, telemetry_path } = result.rows[0];
        const videoUrl = await generatePresignedDownloadUrl(storage_path);
        const telemetryUrl = telemetry_path
            ? await generatePresignedDownloadUrl(telemetry_path)
            : null;

        res.json({
            success: true,
            data: { clipId, videoUrl, telemetryUrl },
        });
    } catch (error) {
        console.error('[Clips] Download URL generation failed:', error);
        res.status(500).json({ success: false, error: 'Failed to generate download URL' });
    }
});

// ─── GET /api/clips/:clipId/share — Generate long-lived shareable URL ─
clipsRouter.get('/:clipId/share', async (req: Request, res: Response): Promise<void> => {
    try {
        const { clipId } = req.params;

        const result = await pool.query(
            'SELECT storage_path, event_type, event_label, duration_ms FROM replay_clips WHERE clip_id = $1',
            [clipId]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ success: false, error: 'Clip not found' });
            return;
        }

        const { storage_path, event_type, event_label, duration_ms } = result.rows[0];
        // 7-day expiry for shared links
        const videoUrl = await generatePresignedDownloadUrl(storage_path, 7 * 24 * 3600);

        res.json({
            success: true,
            data: {
                clipId,
                videoUrl,
                expiresIn: '7 days',
                meta: { eventType: event_type, eventLabel: event_label, durationMs: duration_ms },
            },
        });
    } catch (error) {
        console.error('[Clips] Share URL generation failed:', error);
        res.status(500).json({ success: false, error: 'Failed to generate share URL' });
    }
});

// ─── GET /api/clips/session/:sessionId — List clips for a session ────
clipsRouter.get('/session/:sessionId', async (req: Request, res: Response): Promise<void> => {
    try {
        const { sessionId } = req.params;

        const result = await pool.query(
            `SELECT clip_id, session_id, user_id, event_type, event_label, severity,
                    session_time_ms, duration_ms, frame_count, resolution,
                    file_size_bytes, storage_path, telemetry_sync, uploaded_at
             FROM replay_clips
             WHERE session_id = $1
             ORDER BY session_time_ms ASC`,
            [sessionId]
        );

        const clips = result.rows.map(r => ({
            clipId: r.clip_id,
            sessionId: r.session_id,
            userId: r.user_id,
            eventType: r.event_type,
            eventLabel: r.event_label,
            severity: r.severity,
            sessionTimeMs: r.session_time_ms,
            durationMs: r.duration_ms,
            frameCount: r.frame_count,
            resolution: r.resolution,
            fileSizeBytes: r.file_size_bytes,
            telemetrySync: r.telemetry_sync,
            uploadedAt: r.uploaded_at,
        }));

        res.json({ success: true, data: clips });
    } catch (error) {
        console.error('[Clips] Session clips fetch failed:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch clips' });
    }
});

// ─── GET /api/clips/session/:sessionId/highlights — Auto-generated session highlights ─
clipsRouter.get('/session/:sessionId/highlights', async (req: Request, res: Response): Promise<void> => {
    try {
        const { sessionId } = req.params;
        const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);

        // Prioritize: incidents > overtakes > fastest_lap > highlights > others
        // Order by severity (major > moderate > minor) then by session time
        const result = await pool.query(
            `SELECT clip_id, session_id, event_type, event_label, severity,
                    session_time_ms, duration_ms, frame_count, resolution,
                    file_size_bytes, telemetry_sync, uploaded_at
             FROM replay_clips
             WHERE session_id = $1
             ORDER BY
                CASE event_type
                    WHEN 'incident' THEN 1
                    WHEN 'overtake' THEN 2
                    WHEN 'fastest_lap' THEN 3
                    WHEN 'spin' THEN 4
                    WHEN 'position_lost' THEN 5
                    WHEN 'race_start' THEN 6
                    WHEN 'hard_braking' THEN 7
                    ELSE 8
                END,
                CASE severity
                    WHEN 'major' THEN 1
                    WHEN 'moderate' THEN 2
                    ELSE 3
                END,
                session_time_ms ASC
             LIMIT $2`,
            [sessionId, limit]
        );

        const highlights = result.rows.map(r => ({
            clipId: r.clip_id,
            sessionId: r.session_id,
            eventType: r.event_type,
            eventLabel: r.event_label,
            severity: r.severity,
            sessionTimeMs: r.session_time_ms,
            durationMs: r.duration_ms,
            frameCount: r.frame_count,
            resolution: r.resolution,
            fileSizeBytes: r.file_size_bytes,
            telemetrySync: r.telemetry_sync,
            uploadedAt: r.uploaded_at,
        }));

        res.json({
            success: true,
            data: {
                sessionId,
                totalClips: highlights.length,
                highlights,
            },
        });
    } catch (error) {
        console.error('[Clips] Session highlights fetch failed:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch highlights' });
    }
});

// ─── GET /api/clips/user/:userId — List all clips for a user ─────────
clipsRouter.get('/user/:userId', async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.params;
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);

        const result = await pool.query(
            `SELECT clip_id, session_id, user_id, event_type, event_label, severity,
                    session_time_ms, duration_ms, frame_count, resolution,
                    file_size_bytes, telemetry_sync, uploaded_at
             FROM replay_clips
             WHERE user_id = $1
             ORDER BY uploaded_at DESC
             LIMIT $2`,
            [userId, limit]
        );

        const clips = result.rows.map(r => ({
            clipId: r.clip_id,
            sessionId: r.session_id,
            userId: r.user_id,
            eventType: r.event_type,
            eventLabel: r.event_label,
            severity: r.severity,
            sessionTimeMs: r.session_time_ms,
            durationMs: r.duration_ms,
            frameCount: r.frame_count,
            resolution: r.resolution,
            fileSizeBytes: r.file_size_bytes,
            telemetrySync: r.telemetry_sync,
            uploadedAt: r.uploaded_at,
        }));

        res.json({ success: true, data: clips });
    } catch (error) {
        console.error('[Clips] User clips fetch failed:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch clips' });
    }
});
