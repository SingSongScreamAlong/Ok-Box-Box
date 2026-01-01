/**
 * Voice API Routes
 * 
 * Endpoints for voice interactions:
 * - POST /voice/query - Process driver voice query (audio → STT → AI → TTS → audio)
 */

import { Router, Request, Response } from 'express';
import { getWhisperService, getVoiceService, VOICE_PRESETS } from '../../services/voice/index.js';

const router = Router();

interface VoiceQueryRequest {
    sessionId: string;
    driverId: string;
}

// Simple in-memory audio buffer handling (no multer needed for small audio)
interface AudioRequest extends Request {
    body: VoiceQueryRequest & { audio?: string }; // Base64 encoded audio
}

/**
 * POST /voice/query
 * Process a driver voice query:
 * 1. Decode base64 audio
 * 2. Transcribe with Whisper
 * 3. Generate AI response
 * 4. Convert response to speech with ElevenLabs
 * 5. Return audio response
 */
router.post('/query', async (req: AudioRequest, res: Response) => {
    try {
        const { sessionId, driverId, audio } = req.body;

        if (!audio) {
            res.status(400).json({ error: 'No audio data provided' });
            return;
        }

        const whisperService = getWhisperService();
        const voiceService = getVoiceService();

        // Check services are available
        if (!whisperService.isServiceAvailable()) {
            res.status(503).json({ error: 'Speech-to-text service unavailable' });
            return;
        }

        // Decode base64 audio
        const audioBuffer = Buffer.from(audio, 'base64');

        // 1. Transcribe audio
        const transcription = await whisperService.transcribe({
            audioBuffer,
            language: 'en'
        });

        if (!transcription.success || !transcription.text) {
            res.status(500).json({ error: 'Failed to transcribe audio' });
            return;
        }

        console.log(`🎙️ Driver ${driverId}: "${transcription.text}"`);

        // 2. Generate AI response
        const conversation = await whisperService.processDriverQuery(
            audioBuffer,
            {
                sessionId: sessionId || 'unknown',
                driverId: driverId || 'driver',
                recentMessages: []
            }
        );

        if (!conversation) {
            res.status(500).json({ error: 'Failed to process query' });
            return;
        }

        // 3. Convert response to speech
        let audioBase64: string | undefined;
        if (voiceService.isServiceAvailable()) {
            const ttsResult = await voiceService.textToSpeech({
                text: conversation.response,
                ...VOICE_PRESETS.raceEngineer
            });

            if (ttsResult.success && ttsResult.audioBuffer) {
                audioBase64 = ttsResult.audioBuffer.toString('base64');
            }
        }

        // 4. Return response
        res.json({
            success: true,
            query: conversation.query,
            response: conversation.response,
            audioBase64
        });

    } catch (error) {
        console.error('Voice query error:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Voice query failed'
        });
    }
});

/**
 * GET /voice/status
 * Check voice services availability
 */
router.get('/status', async (_req: Request, res: Response) => {
    const whisperService = getWhisperService();
    const voiceService = getVoiceService();

    res.json({
        whisper: whisperService.isServiceAvailable(),
        tts: voiceService.isServiceAvailable()
    });
});

export default router;
