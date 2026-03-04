/**
 * Voice API Routes
 *
 * Endpoints for voice interactions:
 * - POST /voice/query - Process driver voice query with NDJSON streaming:
 *     {type:"transcript"} → {type:"ack"} → {type:"response"} → {type:"audio"} → {type:"done"}
 */

import { Router, Request, Response } from 'express';
import { requireAuth, requireCapability } from '../middleware/auth.js';
import { getWhisperService, getVoiceService, VOICE_PRESETS } from '../../services/voice/index.js';
import { buildLiveTelemetryContext, fetchDriverContextForVoice } from '../../driverbox/routes/drivers.js';

const router = Router();

interface AudioRequest extends Request {
    body: {
        sessionId?: string;
        driverId?: string;
        audio?: string; // Base64 encoded audio
    };
}

// ============================================================================
// NDJSON helper
// ============================================================================

function sendChunk(res: Response, obj: Record<string, unknown>): void {
    res.write(JSON.stringify(obj) + '\n');
}

// ============================================================================
// POST /voice/query
// Streaming pipeline: STT → ack → LLM → TTS → done
// ============================================================================

router.post('/query', requireAuth, requireCapability('voice_engineer'), async (req: AudioRequest, res: Response) => {
    const { driverId, audio } = req.body;

    if (!audio) {
        res.status(400).json({ error: 'No audio data provided' });
        return;
    }

    const whisperService = getWhisperService();
    const voiceService = getVoiceService();

    if (!whisperService.isServiceAvailable()) {
        res.status(503).json({ error: 'Speech-to-text service unavailable' });
        return;
    }

    // Switch to NDJSON streaming
    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');
    res.flushHeaders();

    try {
        const audioBuffer = Buffer.from(audio, 'base64');

        // ── 1. Transcribe (single call — fixed double-transcription bug) ──────
        const transcription = await whisperService.transcribe({ audioBuffer, language: 'en' });

        if (!transcription.success || !transcription.text) {
            sendChunk(res, { type: 'error', message: 'Failed to transcribe audio' });
            res.end();
            return;
        }

        const transcript = transcription.text;
        console.log(`🎙️ Driver ${driverId || '?'}: "${transcript}"`);
        sendChunk(res, { type: 'transcript', text: transcript });

        // ── 2. Load driver context + ack audio in parallel ───────────────────
        // Driver context is cached after first call (10-min TTL) — negligible latency.
        // Live telemetry is synchronous (local state, no DB).
        const liveContext = buildLiveTelemetryContext();
        const [driverContext, ackBuffer] = await Promise.all([
            driverId ? fetchDriverContextForVoice(driverId) : Promise.resolve(''),
            voiceService.getAckAudio(),
        ]);

        const isLive = liveContext.length > 0;
        const allContext = [driverContext, liveContext].filter(Boolean).join('\n');

        const systemPrompt = `You are a professional motorsport race engineer talking to your driver over radio.
Technical, precise, data-driven. Reference actual numbers from the data when available.
VOICE MODE — keep responses to 1-2 sentences. The driver is at speed. Be clear and actionable.
Never make up data.
${isLive ? 'The driver is IN A LIVE SESSION. Use live data for current car state (tires, fuel, gaps, damage). Cross-reference their profile for context (e.g. "that pace is consistent with your norm" or "your tires are degrading faster than usual").' : 'The driver is NOT in a live session. Answer from their historical profile data.'}
${allContext || 'No driver or session data available.'}`;

        // ── 3. Send ack immediately, then call LLM ───────────────────────────
        if (ackBuffer) {
            sendChunk(res, { type: 'ack', audioBase64: ackBuffer.toString('base64') });
        }

        const llmResponse = await callLLM(systemPrompt, transcript);
        const responseText = llmResponse || 'Copy, standby.';
        console.log(`🎧 Engineer → "${responseText}"`);
        sendChunk(res, { type: 'response', text: responseText });

        // TTS is handled by the client via GET /voice/tts-stream — no audio chunk here
        sendChunk(res, { type: 'done' });
        res.end();

    } catch (error) {
        console.error('Voice query error:', error);
        sendChunk(res, { type: 'error', message: 'Voice query failed' });
        res.end();
    }
});

// ============================================================================
// LLM helper — gpt-4o-mini, hardcoded for voice latency
// ============================================================================

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_API_URL = 'https://api.openai.com/v1';

async function callLLM(systemPrompt: string, userMessage: string): Promise<string | null> {
    if (!OPENAI_API_KEY) return null;

    try {
        const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userMessage },
                ],
                max_tokens: 100,
                temperature: 0.7,
            }),
        });

        if (!response.ok) return null;

        const data = await response.json() as { choices?: { message?: { content?: string } }[] };
        return data.choices?.[0]?.message?.content ?? null;
    } catch {
        return null;
    }
}

// ============================================================================
// POST /voice/query-text
// Fast-path: browser Web Speech already transcribed — skip Whisper entirely.
// Pipeline: ack + LLM → done  (no audio chunk; client streams via /tts-stream)
// ============================================================================

router.post('/query-text', requireAuth, requireCapability('voice_engineer'), async (req: Request, res: Response) => {
    const { transcript, driverId } = req.body as { transcript?: string; driverId?: string };

    if (!transcript?.trim()) {
        res.status(400).json({ error: 'transcript is required' });
        return;
    }

    const voiceService = getVoiceService();

    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');
    res.flushHeaders();

    try {
        console.log(`⚡ [BrowserSTT] Driver ${driverId || '?'}: "${transcript}"`);
        sendChunk(res, { type: 'transcript', text: transcript });

        const liveContext = buildLiveTelemetryContext();
        const [driverContext, ackBuffer] = await Promise.all([
            driverId ? fetchDriverContextForVoice(driverId) : Promise.resolve(''),
            voiceService.getAckAudio(),
        ]);

        const isLive = liveContext.length > 0;
        const allContext = [driverContext, liveContext].filter(Boolean).join('\n');

        const systemPrompt = `You are a professional motorsport race engineer talking to your driver over radio.
Technical, precise, data-driven. Reference actual numbers from the data when available.
VOICE MODE — keep responses to 1-2 sentences. The driver is at speed. Be clear and actionable.
Never make up data.
${isLive ? 'The driver is IN A LIVE SESSION. Use live data for current car state (tires, fuel, gaps, damage). Cross-reference their profile for context (e.g. "that pace is consistent with your norm" or "your tires are degrading faster than usual").' : 'The driver is NOT in a live session. Answer from their historical profile data.'}
${allContext || 'No driver or session data available.'}`;

        if (ackBuffer) {
            sendChunk(res, { type: 'ack', audioBase64: ackBuffer.toString('base64') });
        }

        const llmResponse = await callLLM(systemPrompt, transcript);
        const responseText = llmResponse || 'Copy, standby.';
        console.log(`🎧 [BrowserSTT] Engineer → "${responseText}"`);
        // Send response text — client fetches audio via /tts-stream separately
        sendChunk(res, { type: 'response', text: responseText });
        sendChunk(res, { type: 'done' });
        res.end();

    } catch (error) {
        console.error('query-text error:', error);
        sendChunk(res, { type: 'error', message: 'Voice query failed' });
        res.end();
    }
});

// ============================================================================
// GET /voice/tts-stream
// Streams audio/mpeg directly from ElevenLabs (or cache) — no base64 overhead.
// Client plays via <audio src="..."> connected to Web Audio filter chain.
// ============================================================================

router.get('/tts-stream', requireAuth, requireCapability('voice_engineer'), async (req: Request, res: Response) => {
    const text = typeof req.query.text === 'string' ? req.query.text.trim() : '';

    if (!text || text.length > 500) {
        res.status(400).end();
        return;
    }

    const voiceService = getVoiceService();
    const voiceId = VOICE_PRESETS.raceEngineer.voiceId;

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Cache hit: serve instantly (browser buffers locally, starts playing in <5ms)
    const cached = voiceService.getCachedAudioBuffer(text, voiceId);
    if (cached) {
        res.setHeader('Content-Length', String(cached.length));
        res.send(cached);
        return;
    }

    // Cache miss: pipe ElevenLabs stream, accumulate for cache
    const elevenResponse = await voiceService.fetchElevenLabsStream({
        text,
        ...VOICE_PRESETS.raceEngineer,
    });

    if (!elevenResponse?.body) {
        res.status(503).end();
        return;
    }

    const chunks: Buffer[] = [];
    const reader = elevenResponse.body.getReader();

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                // Store the full audio for future cache hits
                voiceService.cacheAudioBuffer(text, voiceId, Buffer.concat(chunks));
                res.end();
                break;
            }
            const chunk = Buffer.from(value);
            chunks.push(chunk);
            res.write(chunk);
        }
    } catch {
        res.end();
    }
});

// ============================================================================
// GET /voice/status
// ============================================================================

router.get('/status', async (_req: Request, res: Response) => {
    const whisperService = getWhisperService();
    const voiceService = getVoiceService();

    res.json({
        whisper: whisperService.isServiceAvailable(),
        tts: voiceService.isServiceAvailable()
    });
});

export default router;
