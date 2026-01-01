/**
 * AI Coaching Routes
 * Integration with AI Agent service for driver coaching and telemetry analysis
 */

import express from 'express';
import { pool } from './db.js';
import { authenticateToken } from './auth.js';
import { aiLimiter } from './middleware/rate-limit.js';

const router = express.Router();

// AI Agent service configuration
const AI_AGENT_URL = process.env.AI_AGENT_URL || 'http://localhost:5000';
const AI_AGENT_API_KEY = process.env.AI_AGENT_API_KEY || process.env.OPENAI_API_KEY || '';

/**
 * Request AI coaching analysis for a session
 * POST /api/ai/analyze
 * Body: { sessionId, analysisType?, lapNumber?, includeVoice? }
 */
router.post('/analyze', aiLimiter, authenticateToken, async (req, res) => {
  try {
    const {
      sessionId,
      analysisType = 'driverCoach',
      lapNumber,
      includeVoice = false
    } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    // Fetch session info
    const sessionResult = await pool.query(
      'SELECT id, name, track FROM sessions WHERE id = $1',
      [sessionId]
    );

    if (sessionResult.rowCount === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = sessionResult.rows[0];

    // Fetch telemetry data
    let telemetryQuery = `
      SELECT
        extract(epoch from ts) as timestamp,
        lap, sector, speed, rpm, gear, throttle, brake,
        tire_fl_temp, tire_fr_temp, tire_rl_temp, tire_rr_temp,
        tire_fl_wear, tire_fr_wear, tire_rl_wear, tire_rr_wear,
        tire_fl_pressure, tire_fr_pressure, tire_rl_pressure, tire_rr_pressure,
        g_lat, g_long, g_vert,
        track_position, race_position
      FROM telemetry
      WHERE session_id = $1
    `;

    const queryParams: any[] = [sessionId];

    if (lapNumber !== undefined) {
      telemetryQuery += ' AND lap = $2';
      queryParams.push(lapNumber);
    }

    telemetryQuery += ' ORDER BY ts ASC LIMIT 1000';

    const telemetryResult = await pool.query(telemetryQuery, queryParams);

    if (telemetryResult.rowCount === 0) {
      return res.status(404).json({ error: 'No telemetry data found for this session' });
    }

    // Prepare telemetry for AI analysis
    const telemetryData = {
      session: {
        name: session.name || 'Unknown',
        track: session.track || 'Unknown'
      },
      samples: telemetryResult.rows.map(row => ({
        timestamp: row.timestamp ? Math.round(Number(row.timestamp) * 1000) : 0,
        lap: row.lap || 0,
        sector: row.sector || 0,
        speed: row.speed || 0,
        rpm: row.rpm || 0,
        gear: row.gear || 0,
        throttle: row.throttle || 0,
        brake: row.brake || 0,
        tires: {
          temp: {
            fl: row.tire_fl_temp || 0,
            fr: row.tire_fr_temp || 0,
            rl: row.tire_rl_temp || 0,
            rr: row.tire_rr_temp || 0
          },
          wear: {
            fl: row.tire_fl_wear || 0,
            fr: row.tire_fr_wear || 0,
            rl: row.tire_rl_wear || 0,
            rr: row.tire_rr_wear || 0
          },
          pressure: {
            fl: row.tire_fl_pressure || 0,
            fr: row.tire_fr_pressure || 0,
            rl: row.tire_rl_pressure || 0,
            rr: row.tire_rr_pressure || 0
          }
        },
        gForce: {
          lateral: row.g_lat || 0,
          longitudinal: row.g_long || 0,
          vertical: row.g_vert || 0
        },
        trackPosition: row.track_position || 0,
        racePosition: row.race_position || 0
      }))
    };

    // Use OpenAI service directly
    try {
      const { OpenAIService } = await import('./openai-service.js');
      const openaiService = new OpenAIService();

      if (!openaiService.isEnabled()) {
        return res.status(503).json({
          error: 'AI coaching service not configured',
          detail: 'OPENAI_API_KEY environment variable not set'
        });
      }

      const analysis = await openaiService.analyzeTelemetryData(
        telemetryData.samples,
        { track: session.track, sessionId },
        { id: (req as any).user?.id || 'unknown', name: (req as any).user?.name }
      );

      return res.json({
        sessionId,
        analysisType,
        analysis: analysis.analysis.performance,
        recommendations: analysis.analysis.recommendations,
        keyInsights: analysis.analysis.keyInsights,
        riskLevel: analysis.analysis.riskLevel,
        lapNumber: lapNumber || 'all',
        timestamp: Date.now()
      });

    } catch (aiError) {
      console.error('Error calling OpenAI:', aiError);
      return res.status(503).json({
        error: 'Failed to analyze telemetry',
        detail: aiError instanceof Error ? aiError.message : 'Unknown error'
      });
    }

  } catch (error) {
    console.error('Error in AI analysis:', error);
    return res.status(500).json({
      error: 'Internal server error during AI analysis',
      detail: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get AI coaching history for a session
 * GET /api/ai/history/:sessionId
 */
router.get('/history/:sessionId', aiLimiter, authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Note: This would require a coaching_history table
    // For now, return a placeholder response
    return res.json({
      sessionId,
      history: [],
      message: 'Coaching history tracking not yet implemented'
    });

  } catch (error) {
    console.error('Error fetching AI history:', error);
    return res.status(500).json({ error: 'Failed to fetch coaching history' });
  }
});

/**
 * Get available AI analysis types
 * GET /api/ai/types
 */
router.get('/types', authenticateToken, async (req, res) => {
  return res.json({
    analysisTypes: [
      {
        id: 'driverCoach',
        name: 'Driver Coach',
        description: 'Personalized driving technique coaching focusing on braking points, throttle application, and racing line',
        icon: '🏎️'
      },
      {
        id: 'strategy',
        name: 'Race Strategy',
        description: 'Race strategy analysis including tire management, fuel consumption, and pit stop optimization',
        icon: '📊'
      },
      {
        id: 'telemetryAnalysis',
        name: 'Telemetry Analysis',
        description: 'Deep dive into telemetry data patterns, vehicle dynamics, and setup recommendations',
        icon: '📈'
      }
    ],
    voiceCoachingAvailable: !!process.env.ELEVENLABS_API_KEY,
    rateLimits: {
      requestsPerMinute: 10,
      message: 'AI coaching is resource-intensive. Please use sparingly.'
    }
  });
});

/**
 * Health check for AI Agent service
 * GET /api/ai/health
 */
router.get('/health', async (req, res) => {
  try {
    const aiResponse = await fetch(`${AI_AGENT_URL}/health`, {
      method: 'GET',
      headers: {
        'X-API-Key': AI_AGENT_API_KEY
      }
    });

    const isHealthy = aiResponse.ok;

    return res.json({
      aiAgentUrl: AI_AGENT_URL,
      status: isHealthy ? 'healthy' : 'unavailable',
      statusCode: aiResponse.status,
      timestamp: Date.now()
    });

  } catch (error) {
    return res.json({
      aiAgentUrl: AI_AGENT_URL,
      status: 'unavailable',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    });
  }
});

export default router;
