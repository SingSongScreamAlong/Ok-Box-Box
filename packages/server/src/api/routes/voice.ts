/**
 * Voice API Routes
 *
 * Endpoints for voice interactions:
 * - POST /voice/query - Process driver voice query with NDJSON streaming:
 *     {type:"transcript"} → {type:"ack"} → {type:"response"} → {type:"audio"} → {type:"done"}
 */

import { Router, Request, Response } from 'express';
import { getWhisperService, getVoiceService, VOICE_PRESETS } from '../../services/voice/index.js';
import { buildLiveTelemetryContext } from '../../driverbox/routes/drivers.js';

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

router.post('/query', async (req: AudioRequest, res: Response) => {
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

        // ── 2. Ack audio + LLM in parallel ───────────────────────────────────
        // Live telemetry context is fast (local state, no DB)
        const liveContext = buildLiveTelemetryContext();

        const systemPrompt = `You are a professional motorsport race engineer talking to your driver over radio.
Technical, precise, data-driven. Reference actual numbers from the data when available.
VOICE MODE — keep responses to 1-2 sentences. The driver is at speed. Be clear and actionable.
Never make up data.${liveContext ? '\nThe driver is IN A LIVE SESSION. They just spoke over radio. Reply in 1-2 sentences max.' : ''}
${liveContext || 'No live session data available.'}`;

        const [ackBuffer, llmResponse] = await Promise.all([
            voiceService.getAckAudio(),
            callLLM(systemPrompt, transcript),
        ]);

        // Stream ack immediately so the driver hears something right away
        if (ackBuffer) {
            sendChunk(res, { type: 'ack', audioBase64: ackBuffer.toString('base64') });
        }

        const responseText = llmResponse || 'Copy, standby.';
        console.log(`🎧 Engineer → "${responseText}"`);
        sendChunk(res, { type: 'response', text: responseText });

        // ── 3. TTS for the full response ──────────────────────────────────────
        if (voiceService.isServiceAvailable()) {
            const ttsResult = await voiceService.textToSpeech({
                text: responseText,
                ...VOICE_PRESETS.raceEngineer,
            });
            if (ttsResult.success && ttsResult.audioBuffer) {
                sendChunk(res, { type: 'audio', audioBase64: ttsResult.audioBuffer.toString('base64') });
            }
        }

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
