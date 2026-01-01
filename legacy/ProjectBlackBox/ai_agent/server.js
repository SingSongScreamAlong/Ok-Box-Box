/**
 * BlackBox AI Agent Service
 * AI-powered driver coaching using GradientAI/OpenAI
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const WebSocket = require('ws');
const axios = require('axios');
const NodeCache = require('node-cache');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Cache for AI responses (5 minute TTL)
const responseCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// Configuration
const config = {
  gradientAI: {
    apiKey: process.env.GRADIENT_AI_API_KEY || process.env.OPENAI_API_KEY,
    baseURL: process.env.GRADIENT_AI_BASE_URL || 'https://api.openai.com/v1',
    model: process.env.AI_MODEL || 'gpt-4',
    temperature: parseFloat(process.env.AI_TEMPERATURE || '0.2'),
    maxTokens: parseInt(process.env.AI_MAX_TOKENS || '1024')
  },
  elevenLabs: {
    apiKey: process.env.ELEVENLABS_API_KEY,
    voiceId: process.env.ELEVENLABS_VOICE_ID || 'default',
    model: process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2'
  },
  relay: {
    url: process.env.RELAY_AGENT_URL || 'http://localhost:8765',
    authToken: process.env.JWT_SECRET
  },
  security: {
    apiKeyRequired: process.env.API_KEY_REQUIRED === 'true',
    apiKey: process.env.API_KEY,
    rateLimit: {
      enabled: process.env.RATE_LIMIT_ENABLED === 'true',
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100'),
      windowSeconds: parseInt(process.env.RATE_LIMIT_WINDOW || '60')
    }
  }
};

// Rate limiting
const rateLimitMap = new Map();

function checkRateLimit(clientId) {
  if (!config.security.rateLimit.enabled) return true;

  const now = Date.now();
  const windowMs = config.security.rateLimit.windowSeconds * 1000;

  if (!rateLimitMap.has(clientId)) {
    rateLimitMap.set(clientId, [now]);
    return true;
  }

  const requests = rateLimitMap.get(clientId).filter(time => now - time < windowMs);

  if (requests.length >= config.security.rateLimit.maxRequests) {
    return false;
  }

  requests.push(now);
  rateLimitMap.set(clientId, requests);
  return true;
}

// API Key middleware
function authenticateAPIKey(req, res, next) {
  if (!config.security.apiKeyRequired) {
    return next();
  }

  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

  if (!apiKey || apiKey !== config.security.apiKey) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
  }

  next();
}

// AI Coaching System Prompts
const COACHING_PROMPTS = {
  driverCoach: `You are an expert sim racing coach for iRacing. Analyze telemetry data and provide concise, actionable coaching feedback.
Focus on:
- Braking points and technique
- Throttle application and modulation
- Racing line optimization
- Tire management
- Consistency and lap time improvement

Provide feedback in 2-3 short sentences, conversational tone, as if speaking to the driver over team radio.`,

  strategy: `You are a race strategy engineer for sim racing. Analyze race data and provide strategic recommendations.
Focus on:
- Pit stop timing and fuel strategy
- Tire compound selection and stint length
- Track position and overtaking opportunities
- Weather and track condition changes
- Risk vs reward analysis

Provide clear, prioritized recommendations in 3-4 bullet points.`,

  telemetryAnalysis: `You are a data analysis expert for sim racing telemetry. Analyze detailed telemetry data and identify areas for improvement.
Focus on:
- Sector and corner-by-corner analysis
- Speed trace comparisons
- Brake pressure and modulation
- Steering input smoothness
- Time gain/loss areas

Provide technical analysis with specific metrics and comparisons.`
};

// AI Analysis Function
async function getAIAnalysis(telemetryData, analysisType = 'driverCoach') {
  try {
    const cacheKey = `${analysisType}_${JSON.stringify(telemetryData).substring(0, 100)}`;
    const cached = responseCache.get(cacheKey);

    if (cached) {
      console.log('Returning cached AI response');
      return cached;
    }

    const systemPrompt = COACHING_PROMPTS[analysisType] || COACHING_PROMPTS.driverCoach;

    // Format telemetry data for AI
    const userPrompt = formatTelemetryForAI(telemetryData);

    // Call AI API (GradientAI/OpenAI compatible)
    const response = await axios.post(
      `${config.gradientAI.baseURL}/chat/completions`,
      {
        model: config.gradientAI.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: config.gradientAI.temperature,
        max_tokens: config.gradientAI.maxTokens
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.gradientAI.apiKey}`
        }
      }
    );

    const analysis = response.data.choices[0].message.content;
    responseCache.set(cacheKey, analysis);

    return analysis;
  } catch (error) {
    console.error('AI Analysis Error:', error.message);
    throw new Error(`AI analysis failed: ${error.message}`);
  }
}

// Format telemetry data for AI consumption
function formatTelemetryForAI(data) {
  if (!data) {
    return 'No telemetry data available';
  }

  const parts = [];

  if (data.lapTime) {
    parts.push(`Lap Time: ${data.lapTime}s`);
  }

  if (data.speed) {
    parts.push(`Current Speed: ${Math.round(data.speed)} km/h`);
  }

  if (data.throttle !== undefined) {
    parts.push(`Throttle: ${Math.round(data.throttle * 100)}%`);
  }

  if (data.brake !== undefined) {
    parts.push(`Brake: ${Math.round(data.brake * 100)}%`);
  }

  if (data.gear) {
    parts.push(`Gear: ${data.gear}`);
  }

  if (data.rpm) {
    parts.push(`RPM: ${data.rpm}`);
  }

  if (data.trackTemp) {
    parts.push(`Track Temp: ${data.trackTemp}°C`);
  }

  if (data.fuelLevel !== undefined) {
    parts.push(`Fuel: ${data.fuelLevel.toFixed(1)}L`);
  }

  if (data.tireWear) {
    parts.push(`Tire Wear: ${JSON.stringify(data.tireWear)}`);
  }

  if (data.position) {
    parts.push(`Position: ${data.position}`);
  }

  if (data.lastLap && data.bestLap) {
    const delta = data.lastLap - data.bestLap;
    parts.push(`Last lap was ${delta > 0 ? '+' : ''}${delta.toFixed(3)}s vs best`);
  }

  return parts.join('\n');
}

// Text-to-Speech via ElevenLabs
async function generateVoice(text) {
  try {
    if (!config.elevenLabs.apiKey) {
      console.warn('ElevenLabs API key not configured, skipping TTS');
      return null;
    }

    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${config.elevenLabs.voiceId}`,
      {
        text: text,
        model_id: config.elevenLabs.model,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      },
      {
        headers: {
          'Accept': 'audio/mpeg',
          'xi-api-key': config.elevenLabs.apiKey,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      }
    );

    return Buffer.from(response.data).toString('base64');
  } catch (error) {
    console.error('TTS Error:', error.message);
    return null;
  }
}

// REST API Endpoints

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'BlackBox AI Agent',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/config', authenticateAPIKey, (req, res) => {
  res.json({
    models: {
      driverCoach: { model: config.gradientAI.model, temperature: config.gradientAI.temperature },
      strategy: { model: config.gradientAI.model, temperature: 0.3 },
      telemetry: { model: config.gradientAI.model, temperature: 0.1 }
    },
    voice: {
      provider: 'elevenlabs',
      enabled: !!config.elevenLabs.apiKey
    }
  });
});

app.post('/analyze', authenticateAPIKey, async (req, res) => {
  try {
    const { telemetry, analysisType = 'driverCoach', includeVoice = false } = req.body;

    if (!telemetry) {
      return res.status(400).json({ error: 'Telemetry data required' });
    }

    // Rate limiting
    const clientId = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    if (!checkRateLimit(clientId)) {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    // Get AI analysis
    const analysis = await getAIAnalysis(telemetry, analysisType);

    const response = {
      analysis,
      analysisType,
      timestamp: new Date().toISOString()
    };

    // Generate voice if requested
    if (includeVoice && config.elevenLabs.apiKey) {
      const audioBase64 = await generateVoice(analysis);
      if (audioBase64) {
        response.audio = audioBase64;
        response.audioFormat = 'mp3';
      }
    }

    res.json(response);
  } catch (error) {
    console.error('Analysis Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/coach', authenticateAPIKey, async (req, res) => {
  try {
    const { telemetry, includeVoice = true } = req.body;

    const analysis = await getAIAnalysis(telemetry, 'driverCoach');

    const response = {
      coaching: analysis,
      timestamp: new Date().toISOString()
    };

    if (includeVoice && config.elevenLabs.apiKey) {
      const audioBase64 = await generateVoice(analysis);
      if (audioBase64) {
        response.audio = audioBase64;
        response.audioFormat = 'mp3';
      }
    }

    res.json(response);
  } catch (error) {
    console.error('Coaching Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/strategy', authenticateAPIKey, async (req, res) => {
  try {
    const { telemetry, raceData } = req.body;

    const combinedData = { ...telemetry, ...raceData };
    const analysis = await getAIAnalysis(combinedData, 'strategy');

    res.json({
      strategy: analysis,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Strategy Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/clear-cache', authenticateAPIKey, (req, res) => {
  responseCache.flushAll();
  res.json({ message: 'Cache cleared successfully' });
});

// WebSocket Server for Real-time Coaching
const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', (ws, req) => {
  console.log('WebSocket client connected');

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'telemetry') {
        // Process telemetry and send coaching
        const analysis = await getAIAnalysis(data.telemetry, 'driverCoach');

        ws.send(JSON.stringify({
          type: 'coaching',
          analysis,
          timestamp: new Date().toISOString()
        }));
      } else if (data.type === 'strategy') {
        const analysis = await getAIAnalysis(data.telemetry, 'strategy');

        ws.send(JSON.stringify({
          type: 'strategy',
          analysis,
          timestamp: new Date().toISOString()
        }));
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        error: error.message
      }));
    }
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`BlackBox AI Agent running on port ${PORT}`);
  console.log(`AI Model: ${config.gradientAI.model}`);
  console.log(`Voice TTS: ${config.elevenLabs.apiKey ? 'Enabled' : 'Disabled'}`);
  console.log(`Rate Limiting: ${config.security.rateLimit.enabled ? 'Enabled' : 'Disabled'}`);
});

// Attach WebSocket server
server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = app;
