/**
 * Voice Communication Routes
 * Real-time voice I/O for conversational race engineer
 */

import express from 'express';
import { authenticateToken } from './auth.js';
import { spawn } from 'child_process';
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { WebSocketServer, WebSocket } from 'ws';
import multer from 'multer';
import { pool } from './db.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Multer configuration for audio file uploads
const storage = multer.diskStorage({
  destination: '/tmp',
  filename: (req, file, cb) => {
    cb(null, `voice_${uuidv4()}_${Date.now()}.wav`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files allowed'));
    }
  }
});

/**
 * Active voice sessions
 * Maps sessionId -> { ws: WebSocket, context: EngineerContext }
 */
const activeSessions = new Map<string, {
  ws: WebSocket | null;
  context: EngineerContext;
  conversationHistory: ConversationMessage[];
}>();

interface EngineerContext {
  sessionId: string;
  driverId: string;
  driverName: string;
  trackName: string;
  currentLap: number;
  position: number;
  gapAhead: number;
  gapBehind: number;
  tireTemps: {
    LF: number;
    RF: number;
    LR: number;
    RR: number;
  };
  fuelLevel: number;
  lastLapTime: number;
  bestLapTime: number;
  currentSpeed: number;
  currentGear: number;
  inPit: boolean;
  flagStatus: string;
  timestamp: number;
}

interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  audioUrl?: string;
}

/**
 * Initialize voice session for a racing session
 * POST /api/voice/session/init
 * Body: { sessionId: string, driverId: string }
 */
router.post('/session/init', authenticateToken, async (req, res) => {
  try {
    const { sessionId, driverId } = req.body;

    if (!sessionId || !driverId) {
      return res.status(400).json({
        error: 'Missing required fields',
        detail: 'sessionId and driverId are required'
      });
    }

    // Fetch session details
    const sessionResult = await pool.query(
      'SELECT * FROM sessions WHERE id = $1 AND driver_id = $2',
      [sessionId, driverId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = sessionResult.rows[0];

    // Fetch driver info
    const driverResult = await pool.query(
      'SELECT username FROM users WHERE id = $1',
      [driverId]
    );

    const driverName = driverResult.rows[0]?.username || 'Driver';

    // Initialize session context
    const context: EngineerContext = {
      sessionId,
      driverId,
      driverName,
      trackName: session.track || 'Unknown Track',
      currentLap: 0,
      position: 0,
      gapAhead: 0,
      gapBehind: 0,
      tireTemps: { LF: 0, RF: 0, LR: 0, RR: 0 },
      fuelLevel: 0,
      lastLapTime: 0,
      bestLapTime: 0,
      currentSpeed: 0,
      currentGear: 0,
      inPit: false,
      flagStatus: 'green',
      timestamp: Date.now()
    };

    activeSessions.set(sessionId, {
      ws: null,
      context,
      conversationHistory: []
    });

    return res.json({
      success: true,
      sessionId,
      message: 'Voice session initialized',
      wsUrl: `/api/voice/stream?sessionId=${sessionId}`
    });

  } catch (error) {
    console.error('Voice session init error:', error);
    return res.status(500).json({
      error: 'Failed to initialize voice session',
      detail: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Update race context (called by telemetry updates)
 * POST /api/voice/context/:sessionId
 * Body: { telemetry data }
 */
router.post('/context/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const telemetryData = req.body;

    const session = activeSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Voice session not found' });
    }

    // Update context with latest telemetry
    session.context = {
      ...session.context,
      currentLap: telemetryData.lap || session.context.currentLap,
      position: telemetryData.position || session.context.position,
      gapAhead: telemetryData.gapAhead || session.context.gapAhead,
      gapBehind: telemetryData.gapBehind || session.context.gapBehind,
      tireTemps: {
        LF: telemetryData.tireTempLF || session.context.tireTemps.LF,
        RF: telemetryData.tireTempRF || session.context.tireTemps.RF,
        LR: telemetryData.tireTempLR || session.context.tireTemps.LR,
        RR: telemetryData.tireTempRR || session.context.tireTemps.RR
      },
      fuelLevel: telemetryData.fuel || session.context.fuelLevel,
      lastLapTime: telemetryData.lastLapTime || session.context.lastLapTime,
      bestLapTime: telemetryData.bestLapTime || session.context.bestLapTime,
      currentSpeed: telemetryData.speed || session.context.currentSpeed,
      currentGear: telemetryData.gear || session.context.currentGear,
      inPit: telemetryData.inPit !== undefined ? telemetryData.inPit : session.context.inPit,
      flagStatus: telemetryData.flag || session.context.flagStatus,
      timestamp: Date.now()
    };

    // Notify WebSocket client if connected
    if (session.ws && session.ws.readyState === WebSocket.OPEN) {
      session.ws.send(JSON.stringify({
        type: 'context_update',
        data: session.context
      }));
    }

    return res.json({ success: true, context: session.context });

  } catch (error) {
    return res.status(500).json({ error: 'Failed to update context' });
  }
});

/**
 * Process driver voice message
 * POST /api/voice/message
 * Body: { sessionId: string, text: string } OR multipart with audio file
 */
router.post('/message', authenticateToken, upload.single('audio'), async (req, res) => {
  try {
    const { sessionId, text } = req.body;
    const audioFile = req.file;

    const session = activeSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Voice session not found' });
    }

    let driverMessage = text;

    // If audio file uploaded, transcribe it
    if (audioFile && !text) {
      const transcription = await transcribeAudio(audioFile.path);
      if (!transcription) {
        return res.status(500).json({ error: 'Transcription failed' });
      }
      driverMessage = transcription;

      // Cleanup
      try {
        unlinkSync(audioFile.path);
      } catch (e) {
        /* ignore */
      }
    }

    if (!driverMessage) {
      return res.status(400).json({ error: 'No message or audio provided' });
    }

    // Add to conversation history
    session.conversationHistory.push({
      role: 'user',
      content: driverMessage,
      timestamp: Date.now()
    });

    // Generate engineer response
    const engineerResponse = await generateEngineerResponse(
      driverMessage,
      session.context,
      session.conversationHistory
    );

    // Add response to history
    session.conversationHistory.push({
      role: 'assistant',
      content: engineerResponse,
      timestamp: Date.now()
    });

    // Keep history limited (last 20 messages)
    if (session.conversationHistory.length > 20) {
      session.conversationHistory = session.conversationHistory.slice(-20);
    }

    // Generate voice audio (optional)
    let audioUrl = null;
    if (req.body.includeVoice === 'true' || req.body.includeVoice === true) {
      const voiceProfile = req.body.voiceProfile || 'professional';
      const audioData = await generateVoiceResponse(engineerResponse, voiceProfile);
      if (audioData) {
        // Save to temp file and return URL
        const audioFilename = `engineer_${uuidv4()}.mp3`;
        const audioPath = join('/tmp', audioFilename);
        writeFileSync(audioPath, audioData);
        audioUrl = `/api/voice/audio/${audioFilename}`;
      }
    }

    return res.json({
      success: true,
      driverMessage,
      engineerResponse,
      audioUrl,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Voice message error:', error);
    return res.status(500).json({
      error: 'Failed to process message',
      detail: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get conversation history
 * GET /api/voice/history/:sessionId
 */
router.get('/history/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = activeSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Voice session not found' });
    }

    return res.json({
      sessionId,
      conversationHistory: session.conversationHistory,
      context: session.context
    });

  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch history' });
  }
});

/**
 * Serve audio file
 * GET /api/voice/audio/:filename
 */
router.get('/audio/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const audioPath = join('/tmp', filename);

    if (!existsSync(audioPath)) {
      return res.status(404).json({ error: 'Audio file not found' });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.sendFile(audioPath);

  } catch (error) {
    return res.status(500).json({ error: 'Failed to serve audio' });
  }
});

/**
 * End voice session
 * DELETE /api/voice/session/:sessionId
 */
router.delete('/session/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = activeSessions.get(sessionId);
    if (session && session.ws) {
      session.ws.close();
    }

    activeSessions.delete(sessionId);

    return res.json({
      success: true,
      message: 'Voice session ended'
    });

  } catch (error) {
    return res.status(500).json({ error: 'Failed to end session' });
  }
});

/**
 * Get available voice commands
 * GET /api/voice/commands
 */
router.get('/commands', authenticateToken, async (req, res) => {
  const commands = [
    {
      category: 'Gap Information',
      examples: [
        "What's my gap?",
        "How far ahead is P1?",
        "Distance to the car behind?"
      ]
    },
    {
      category: 'Tire Management',
      examples: [
        "How are my tires?",
        "Tire temperatures?",
        "Can I push on these tires?"
      ]
    },
    {
      category: 'Fuel Strategy',
      examples: [
        "Do I need to save fuel?",
        "How much fuel left?",
        "Can I make it to the end?"
      ]
    },
    {
      category: 'Pace Analysis',
      examples: [
        "What was my last lap time?",
        "Am I faster than the car ahead?",
        "What's my delta?"
      ]
    },
    {
      category: 'Strategy',
      examples: [
        "Should I pit?",
        "What's the undercut window?",
        "When should I box?"
      ]
    },
    {
      category: 'Position & Standing',
      examples: [
        "What position am I in?",
        "How many cars ahead?",
        "Am I on the lead lap?"
      ]
    }
  ];

  return res.json({ commands });
});

/**
 * Get available ElevenLabs voice profiles
 * GET /api/voice/profiles
 */
router.get('/profiles', authenticateToken, async (req, res) => {
  const profiles = Object.entries(ENGINEER_VOICES).map(([key, value]) => ({
    id: key,
    voiceId: value.id,
    name: value.name,
    description: value.description
  }));

  return res.json({
    profiles,
    default: 'professional',
    provider: 'ElevenLabs',
    model: 'eleven_turbo_v2_5'
  });
});

/**
 * Helper: Transcribe audio using OpenAI Whisper
 */
async function transcribeAudio(audioFilePath: string): Promise<string | null> {
  return new Promise((resolve) => {
    const pythonScript = join(__dirname, '../../relay_agent/voice_race_engineer.py');

    // Call Python transcription
    const python = spawn('python3', [
      '-c',
      `
import asyncio
import sys
sys.path.append('${join(__dirname, '../../relay_agent')}')
from voice_race_engineer import VoiceRaceEngineer

async def transcribe():
    engineer = VoiceRaceEngineer()
    result = await engineer.transcribe_audio('${audioFilePath}')
    print(result or '')

asyncio.run(transcribe())
      `
    ]);

    let output = '';
    python.stdout.on('data', (data) => {
      output += data.toString();
    });

    python.on('close', (code) => {
      if (code === 0 && output.trim()) {
        resolve(output.trim());
      } else {
        resolve(null);
      }
    });

    setTimeout(() => {
      python.kill();
      resolve(null);
    }, 30000);
  });
}

/**
 * Helper: Generate engineer response using AI
 */
async function generateEngineerResponse(
  driverMessage: string,
  context: EngineerContext,
  history: ConversationMessage[]
): Promise<string> {
  // Build system prompt with context
  const systemPrompt = buildEngineerPrompt(context);

  // Call OpenAI (simplified - in production use proper SDK)
  try {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return "Race engineer offline - check API configuration";
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',  // 4x faster than GPT-4 (~300ms vs 1200ms)
        messages: [
          { role: 'system', content: systemPrompt },
          ...history.slice(-10).map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          { role: 'user', content: driverMessage }
        ],
        max_tokens: 80,  // Reduced for speed - keep responses brief
        temperature: 0.6  // Lower for faster, more focused responses
      })
    });

    const data = await response.json();
    return data.choices[0]?.message?.content || "Sorry, I didn't catch that.";

  } catch (error) {
    console.error('OpenAI error:', error);
    return "Engineer response unavailable - focus on your driving.";
  }
}

/**
 * Helper: Build engineer system prompt with race context
 */
function buildEngineerPrompt(context: EngineerContext): string {
  return `You are a professional race engineer for ${context.driverName} at ${context.trackName}.

Current Race Status:
- Lap: ${context.currentLap}
- Position: P${context.position}
- Gap to car ahead: ${context.gapAhead.toFixed(1)}s
- Gap to car behind: ${context.gapBehind.toFixed(1)}s
- Last lap: ${context.lastLapTime > 0 ? context.lastLapTime.toFixed(3) + 's' : 'N/A'}
- Best lap: ${context.bestLapTime > 0 ? context.bestLapTime.toFixed(3) + 's' : 'N/A'}
- Fuel: ${context.fuelLevel.toFixed(1)}L
- Tire temps: LF=${context.tireTemps.LF.toFixed(0)}°C, RF=${context.tireTemps.RF.toFixed(0)}°C, LR=${context.tireTemps.LR.toFixed(0)}°C, RR=${context.tireTemps.RR.toFixed(0)}°C
- Flag: ${context.flagStatus}
- In pit: ${context.inPit}

Instructions:
- Provide clear, concise responses (1-2 sentences max)
- Be supportive and professional like a real F1/IndyCar engineer
- Use data to back up your advice
- Respond naturally to questions about gaps, tires, fuel, strategy
- If asked about something you don't have data for, be honest
- Use racing terminology (delta, stint, deg, undercut, etc.)
- Keep responses brief - driver needs to focus on driving

Examples:
Driver: "How are my tires?"
Engineer: "Fronts are at 92°C, rears at 95°C. You're in the optimal window, keep pushing."

Driver: "What's my gap?"
Engineer: "2.3 seconds to P3, you're gaining 2 tenths per lap. Keep this pace."`;
}

/**
 * ElevenLabs Voice Profiles for Race Engineers
 */
const ENGINEER_VOICES = {
  professional: {
    id: 'pNInz6obpgDQGcFmaJgB',  // Adam - Professional, authoritative
    name: 'Adam',
    description: 'Professional male voice, calm and authoritative'
  },
  experienced: {
    id: 'VR6AewLTigWG4xSOukaG',  // Arnold - Experienced, reassuring
    name: 'Arnold',
    description: 'Mature male voice, experienced and reassuring'
  },
  dynamic: {
    id: 'ErXwobaYiN019PkySvjV',  // Antoni - Dynamic, energetic
    name: 'Antoni',
    description: 'Dynamic male voice, energetic and engaging'
  },
  calm: {
    id: 'TxGEqnHWrfWFTfGW9XjX',  // Josh - Calm, focused
    name: 'Josh',
    description: 'Calm male voice, focused and precise'
  }
};

/**
 * Helper: Generate voice audio using ElevenLabs
 */
async function generateVoiceResponse(
  text: string,
  voiceProfile: string = 'professional'
): Promise<Buffer | null> {
  try {
    const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenLabsKey) {
      console.log('ElevenLabs API key not configured');
      return null;
    }

    // Get voice ID for selected profile
    const voice = ENGINEER_VOICES[voiceProfile as keyof typeof ENGINEER_VOICES] || ENGINEER_VOICES.professional;

    console.log(`Generating voice with ${voice.name} (${voice.description})`);

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': elevenLabsKey
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2_5',  // Fastest model for real-time racing
        voice_settings: {
          stability: 0.65,  // Balanced for consistent delivery
          similarity_boost: 0.80,  // High similarity for professional tone
          style: 0.45,  // Moderate style for natural speech
          use_speaker_boost: true  // Enhanced clarity
        },
        output_format: 'mp3_44100_128'  // High quality MP3
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', response.status, errorText);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);
    console.log(`✓ Voice generated: ${audioBuffer.length} bytes`);
    return audioBuffer;

  } catch (error) {
    console.error('ElevenLabs voice generation error:', error);
    return null;
  }
}

/**
 * WebSocket handler setup (called from server.ts)
 */
export function setupVoiceWebSocket(wss: WebSocketServer) {
  wss.on('connection', (ws: WebSocket, req) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const sessionId = url.searchParams.get('sessionId');

    if (!sessionId) {
      ws.close(1008, 'Session ID required');
      return;
    }

    const session = activeSessions.get(sessionId);
    if (!session) {
      ws.close(1008, 'Invalid session ID');
      return;
    }

    // Attach WebSocket to session
    session.ws = ws;
    console.log(`Voice WebSocket connected for session ${sessionId}`);

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'driver_message') {
          const response = await generateEngineerResponse(
            message.text,
            session.context,
            session.conversationHistory
          );

          // Add to history
          session.conversationHistory.push(
            { role: 'user', content: message.text, timestamp: Date.now() },
            { role: 'assistant', content: response, timestamp: Date.now() }
          );

          // Send response
          ws.send(JSON.stringify({
            type: 'engineer_response',
            text: response,
            timestamp: Date.now()
          }));
        }

      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      console.log(`Voice WebSocket closed for session ${sessionId}`);
      if (session.ws === ws) {
        session.ws = null;
      }
    });
  });
}

export default router;
