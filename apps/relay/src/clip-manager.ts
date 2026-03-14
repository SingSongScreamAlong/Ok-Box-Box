/**
 * ClipManager — Electron-side clip management & local serving
 *
 * Receives clip_saved events from Python relay, indexes clips,
 * serves them via a local HTTP server for the browser dashboard,
 * and manages storage quota.
 *
 * Phase: Replay Intelligence
 */

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';

const CLIP_SERVER_PORT = 9998;
const DEFAULT_MAX_STORAGE_MB = 5000;

export interface ClipInfo {
    clipId: string;
    sessionId: string;
    eventType: string;
    eventLabel: string;
    severity: string;
    sessionTimeMs: number;
    wallClockStart: number;
    wallClockEnd: number;
    wallClockEvent: number;
    durationMs: number;
    frameCount: number;
    resolution: string;
    filePath: string;
    fileSizeBytes: number;
    telemetrySync: {
        sessionTimeMsAtFrame0: number;
        fps: number;
    };
    // Local state
    serveUrl?: string;
}

export class ClipManager extends EventEmitter {
    private clips: Map<string, ClipInfo> = new Map();
    private server: http.Server | null = null;
    private maxStorageMb: number;
    private clipDir: string;
    private serving = false;

    constructor(maxStorageMb = DEFAULT_MAX_STORAGE_MB) {
        super();
        this.maxStorageMb = maxStorageMb;

        // Default clip directory
        const homeDir = process.env.USERPROFILE || process.env.HOME || '';
        this.clipDir = path.join(homeDir, 'Ok-Box-Box', 'clips');
    }

    /**
     * Start the local HTTP server for clip files
     */
    startServer(): void {
        if (this.serving) return;

        this.server = http.createServer((req, res) => {
            this.handleRequest(req, res);
        });

        this.server.listen(CLIP_SERVER_PORT, '127.0.0.1', () => {
            console.log(`📹 Clip server running at http://127.0.0.1:${CLIP_SERVER_PORT}`);
            this.serving = true;
        });

        this.server.on('error', (err: any) => {
            if (err.code === 'EADDRINUSE') {
                console.log(`⚠️ Clip server port ${CLIP_SERVER_PORT} in use, trying ${CLIP_SERVER_PORT + 1}`);
                this.server?.listen(CLIP_SERVER_PORT + 1, '127.0.0.1');
            } else {
                console.error('Clip server error:', err);
            }
        });

        // Scan existing clips on startup
        this.scanExistingClips();
    }

    /**
     * Stop the server
     */
    stopServer(): void {
        if (this.server) {
            this.server.close();
            this.server = null;
            this.serving = false;
        }
    }

    /**
     * Handle clip_saved event from Python relay
     */
    onClipSaved(data: any): void {
        const clip: ClipInfo = {
            clipId: data.clip_id || data.clipId,
            sessionId: data.session_id || data.sessionId || '',
            eventType: data.event_type || data.eventType || 'unknown',
            eventLabel: data.event_label || data.eventLabel || '',
            severity: data.severity || 'minor',
            sessionTimeMs: data.session_time_ms || data.sessionTimeMs || 0,
            wallClockStart: data.wall_clock_start || data.wallClockStart || 0,
            wallClockEnd: data.wall_clock_end || data.wallClockEnd || 0,
            wallClockEvent: data.wall_clock_event || data.wallClockEvent || 0,
            durationMs: data.duration_ms || data.durationMs || 0,
            frameCount: data.frame_count || data.frameCount || 0,
            resolution: data.resolution || '',
            filePath: data.file_path || data.filePath || '',
            fileSizeBytes: data.file_size_bytes || data.fileSizeBytes || 0,
            telemetrySync: {
                sessionTimeMsAtFrame0: data.telemetry_sync?.session_time_ms_at_frame_0
                    || data.telemetrySync?.sessionTimeMsAtFrame0 || 0,
                fps: data.telemetry_sync?.fps || data.telemetrySync?.fps || 15,
            },
        };

        // Generate serve URL
        clip.serveUrl = `http://127.0.0.1:${CLIP_SERVER_PORT}/clips/${clip.clipId}.mp4`;

        this.clips.set(clip.clipId, clip);
        this.emit('clip_added', clip);

        console.log(`📹 Clip indexed: ${clip.clipId} [${clip.eventType}] ${clip.eventLabel}`);
    }

    /**
     * Get all clips for a session
     */
    getSessionClips(sessionId: string): ClipInfo[] {
        return Array.from(this.clips.values())
            .filter(c => c.sessionId === sessionId)
            .sort((a, b) => a.wallClockEvent - b.wallClockEvent);
    }

    /**
     * Get all clips
     */
    getAllClips(): ClipInfo[] {
        return Array.from(this.clips.values())
            .sort((a, b) => b.wallClockEvent - a.wallClockEvent);
    }

    /**
     * Get clip URL for playback
     */
    getClipUrl(clipId: string): string | null {
        const clip = this.clips.get(clipId);
        if (!clip) return null;
        return clip.serveUrl || null;
    }

    /**
     * Scan existing clips on disk
     */
    private scanExistingClips(): void {
        if (!fs.existsSync(this.clipDir)) return;

        const files = fs.readdirSync(this.clipDir);
        let loaded = 0;

        for (const file of files) {
            if (!file.endsWith('.json')) continue;

            try {
                const jsonPath = path.join(this.clipDir, file);
                const raw = fs.readFileSync(jsonPath, 'utf-8');
                const data = JSON.parse(raw);

                // Verify MP4 exists
                const mp4Path = jsonPath.replace('.json', '.mp4');
                if (!fs.existsSync(mp4Path)) continue;

                this.onClipSaved(data);
                loaded++;
            } catch {
                // Skip corrupted metadata files
            }
        }

        if (loaded > 0) {
            console.log(`📂 Loaded ${loaded} existing clips from ${this.clipDir}`);
        }
    }

    /**
     * Handle HTTP requests — serves clip files with CORS headers
     */
    private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
        // CORS headers for browser access
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Range');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length');

        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        const url = req.url || '';

        // GET /clips — list all clips as JSON
        if (url === '/clips' || url === '/clips/') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(this.getAllClips()));
            return;
        }

        // GET /clips/:sessionId — list clips for a session
        if (url.startsWith('/clips/session/')) {
            const sessionId = url.replace('/clips/session/', '');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(this.getSessionClips(sessionId)));
            return;
        }

        // GET /clips/:clipId.mp4 — serve video file with range support
        const mp4Match = url.match(/\/clips\/(.+)\.mp4$/);
        if (mp4Match) {
            const clipId = mp4Match[1];
            const clip = this.clips.get(clipId);

            if (!clip || !clip.filePath || !fs.existsSync(clip.filePath)) {
                // Try direct file path in clips dir
                const directPath = path.join(this.clipDir, `${clipId}.mp4`);
                if (fs.existsSync(directPath)) {
                    this.serveFile(directPath, req, res);
                    return;
                }
                res.writeHead(404);
                res.end('Clip not found');
                return;
            }

            this.serveFile(clip.filePath, req, res);
            return;
        }

        // GET /clips/:clipId_telemetry.json — serve telemetry sidecar
        const telemetryMatch = url.match(/\/clips\/(.+)_telemetry\.json$/);
        if (telemetryMatch) {
            const clipId = telemetryMatch[1];
            const telemetryPath = path.join(this.clipDir, `${clipId}_telemetry.json`);
            if (fs.existsSync(telemetryPath)) {
                const data = fs.readFileSync(telemetryPath, 'utf-8');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(data);
                return;
            }
            res.writeHead(404);
            res.end('Telemetry data not found');
            return;
        }

        // GET /health
        if (url === '/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'ok',
                clips: this.clips.size,
                clipDir: this.clipDir,
            }));
            return;
        }

        res.writeHead(404);
        res.end('Not found');
    }

    /**
     * Serve a file with HTTP range support (for video seeking)
     */
    private serveFile(filePath: string, req: http.IncomingMessage, res: http.ServerResponse): void {
        const stat = fs.statSync(filePath);
        const fileSize = stat.size;
        const range = req.headers.range;

        if (range) {
            // Range request — needed for video seeking
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunkSize = (end - start) + 1;

            const stream = fs.createReadStream(filePath, { start, end });
            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunkSize,
                'Content-Type': 'video/mp4',
            });
            stream.pipe(res);
        } else {
            // Full file
            res.writeHead(200, {
                'Content-Length': fileSize,
                'Content-Type': 'video/mp4',
            });
            fs.createReadStream(filePath).pipe(res);
        }
    }
}
