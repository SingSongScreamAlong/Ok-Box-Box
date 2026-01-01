/**
 * Incident Analysis Routes
 * Auto-detect and analyze incidents with prevention advice
 */

import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const router = express.Router();
const execAsync = promisify(exec);

/**
 * POST /api/incidents/analyze
 * Analyze session for incidents
 * 
 * Body:
 * {
 *   sessionId: string,
 *   lapNumber?: number  // Optional: analyze specific lap, otherwise whole session
 * }
 */
router.post('/analyze', async (req, res) => {
    try {
        const { sessionId, lapNumber } = req.body;

        if (!sessionId) {
            return res.status(400).json({
                error: 'Missing required field: sessionId'
            });
        }

        // Call Python analyzer
        const scriptPath = path.join(__dirname, '../../relay_agent/incident_analyzer.py');
        const lapArg = lapNumber ? `--lap ${lapNumber}` : '';
        const command = `python3 ${scriptPath} --session ${sessionId} ${lapArg}`;

        const { stdout, stderr } = await execAsync(command);

        if (stderr) {
            console.error('Incident analysis stderr:', stderr);
        }

        const analysis = JSON.parse(stdout);

        res.json({
            success: true,
            sessionId,
            lapNumber: lapNumber || 'all',
            incidents: analysis.incidents,
            summary: {
                totalIncidents: analysis.total_incidents,
                totalTimeLost: analysis.total_time_lost,
                totalIncidentPoints: analysis.total_incident_points,
                byType: analysis.by_type
            }
        });

    } catch (error) {
        console.error('Incident analysis error:', error);
        res.status(500).json({
            error: 'Failed to analyze incidents',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/incidents/:sessionId
 * Get all incidents for a session
 */
router.get('/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;

        // TODO: Fetch from database cache
        // For now, trigger fresh analysis
        const scriptPath = path.join(__dirname, '../../relay_agent/incident_analyzer.py');
        const command = `python3 ${scriptPath} --session ${sessionId}`;

        const { stdout } = await execAsync(command);
        const analysis = JSON.parse(stdout);

        res.json({
            success: true,
            data: analysis
        });

    } catch (error) {
        console.error('Incident fetch error:', error);
        res.status(500).json({
            error: 'Failed to fetch incidents',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/incidents/patterns/:driverId
 * Analyze incident patterns across multiple sessions
 * Helps identify recurring mistakes
 */
router.get('/patterns/:driverId', async (req, res) => {
    try {
        const { driverId } = req.params;
        const limit = parseInt(req.query.sessions as string) || 10;

        // TODO: Aggregate incidents across sessions
        // Identify patterns like:
        // - "Always spinning in Turn 3"
        // - "Lockups in 80% of heavy braking zones"
        // - "Off-track in wet conditions"

        res.json({
            success: true,
            patterns: [
                {
                    incidentType: 'spin',
                    location: 'Turn 3',
                    occurrences: 8,
                    percentOfSessions: 80,
                    commonCause: 'Excessive throttle application',
                    recommendation: 'Practice progressive throttle in Turn 3. Current: 90% immediate, Target: 60% → 90% over 0.5s'
                }
            ]
        });

    } catch (error) {
        console.error('Pattern analysis error:', error);
        res.status(500).json({
            error: 'Failed to analyze patterns',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/incidents/report/:sessionId
 * Generate formatted incident report
 */
router.get('/report/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const format = req.query.format || 'json';

        const scriptPath = path.join(__dirname, '../../relay_agent/incident_analyzer.py');
        const command = `python3 ${scriptPath} --session ${sessionId} --report`;

        const { stdout } = await execAsync(command);

        if (format === 'text') {
            res.type('text/plain').send(stdout);
        } else {
            const analysis = JSON.parse(stdout);
            res.json(analysis);
        }

    } catch (error) {
        console.error('Report generation error:', error);
        res.status(500).json({
            error: 'Failed to generate report',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;
