/**
 * Corner Analysis Routes
 * Provides corner-by-corner performance analysis
 */

import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const router = express.Router();
const execAsync = promisify(exec);

/**
 * POST /api/analysis/corner-by-corner
 * Analyze lap performance corner by corner
 * 
 * Body:
 * {
 *   sessionId: string,
 *   lapNumber: number,
 *   referenceLapNumber?: number,  // Defaults to personal best
 *   referenceType?: 'personal_best' | 'class_leader' | 'track_record'
 * }
 */
router.post('/corner-by-corner', async (req, res) => {
    try {
        const { sessionId, lapNumber, referenceLapNumber, referenceType = 'personal_best' } = req.body;

        if (!sessionId || !lapNumber) {
            return res.status(400).json({
                error: 'Missing required fields: sessionId, lapNumber'
            });
        }

        // Call Python analyzer
        const scriptPath = path.join(__dirname, '../../relay_agent/corner_performance_analyzer.py');
        const command = `python3 ${scriptPath} --session ${sessionId} --lap ${lapNumber} --reference-type ${referenceType}`;

        const { stdout, stderr } = await execAsync(command);

        if (stderr) {
            console.error('Analysis stderr:', stderr);
        }

        const analysis = JSON.parse(stdout);

        res.json({
            success: true,
            sessionId,
            lapNumber,
            referenceType,
            analysis: {
                corners: analysis.corners,
                summary: {
                    totalTimeLost: analysis.total_time_lost,
                    totalTimeGained: analysis.total_time_gained,
                    netDelta: analysis.net_delta,
                    priorityCorners: analysis.priority_corners
                }
            }
        });

    } catch (error) {
        console.error('Corner analysis error:', error);
        res.status(500).json({
            error: 'Failed to analyze corner performance',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/analysis/corner/:sessionId/:lapNumber
 * Get detailed corner performance for a specific lap
 */
router.get('/corner/:sessionId/:lapNumber', async (req, res) => {
    try {
        const { sessionId, lapNumber } = req.params;

        // TODO: Fetch from database cache if available
        // For now, trigger fresh analysis
        const scriptPath = path.join(__dirname, '../../relay_agent/corner_performance_analyzer.py');
        const command = `python3 ${scriptPath} --session ${sessionId} --lap ${lapNumber}`;

        const { stdout } = await execAsync(command);
        const analysis = JSON.parse(stdout);

        res.json({
            success: true,
            data: analysis
        });

    } catch (error) {
        console.error('Corner fetch error:', error);
        res.status(500).json({
            error: 'Failed to fetch corner analysis',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/analysis/priority-corners/:sessionId
 * Get the top corners where driver is losing the most time
 */
router.get('/priority-corners/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const limit = parseInt(req.query.limit as string) || 5;

        // TODO: Aggregate from all laps in session
        // For now, use latest lap

        res.json({
            success: true,
            priorityCorners: [
                {
                    cornerName: 'Turn 3',
                    avgTimeLoss: 0.312,
                    occurrences: 15,
                    primaryIssue: 'braking_early',
                    advice: 'Brake 15m later. Look for a reference point closer to the corner.',
                    potentialGain: 0.312
                }
            ]
        });

    } catch (error) {
        console.error('Priority corners error:', error);
        res.status(500).json({
            error: 'Failed to get priority corners',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;
