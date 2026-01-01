/**
 * Setup Analysis Routes
 * Track and analyze setup changes
 */

import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const router = express.Router();
const execAsync = promisify(exec);

/**
 * POST /api/setup/track-change
 * Record a setup change
 * 
 * Body:
 * {
 *   sessionId: string,
 *   component: string,  // 'front_wing', 'rear_wing', etc.
 *   parameter: string,  // 'angle', 'stiffness', etc.
 *   oldValue: number,
 *   newValue: number,
 *   unit: string  // 'clicks', 'psi', 'degrees'
 * }
 */
router.post('/track-change', async (req, res) => {
    try {
        const { sessionId, component, parameter, oldValue, newValue, unit } = req.body;

        if (!sessionId || !component || !parameter || oldValue === undefined || newValue === undefined) {
            return res.status(400).json({
                error: 'Missing required fields'
            });
        }

        // TODO: Store in database
        // For now, just acknowledge

        res.json({
            success: true,
            change: {
                sessionId,
                component,
                parameter,
                oldValue,
                newValue,
                delta: newValue - oldValue,
                unit: unit || 'clicks',
                timestamp: Date.now()
            }
        });

    } catch (error) {
        console.error('Setup tracking error:', error);
        res.status(500).json({
            error: 'Failed to track setup change',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/setup/analyze-change
 * Analyze impact of a setup change
 * 
 * Body:
 * {
 *   sessionId: string,
 *   changeId: string,
 *   lapsBeforeChange: number,
 *   lapsAfterChange: number
 * }
 */
router.post('/analyze-change', async (req, res) => {
    try {
        const { sessionId, changeId, lapsBeforeChange, lapsAfterChange } = req.body;

        if (!sessionId || !changeId) {
            return res.status(400).json({
                error: 'Missing required fields: sessionId, changeId'
            });
        }

        // Call Python analyzer
        const scriptPath = path.join(__dirname, '../../relay_agent/setup_analyzer.py');
        const command = `python3 ${scriptPath} --session ${sessionId} --change ${changeId} --before ${lapsBeforeChange || 3} --after ${lapsAfterChange || 3}`;

        const { stdout, stderr } = await execAsync(command);

        if (stderr) {
            console.error('Setup analysis stderr:', stderr);
        }

        const analysis = JSON.parse(stdout);

        res.json({
            success: true,
            analysis: {
                lapTimeDelta: analysis.lap_time_delta,
                consistencyDelta: analysis.consistency_delta,
                handlingImpact: {
                    understeer: analysis.understeer_delta,
                    oversteer: analysis.oversteer_delta
                },
                tireImpact: analysis.tire_temp_delta,
                wasImprovement: analysis.was_improvement,
                confidence: analysis.confidence,
                recommendation: analysis.recommendation,
                keepOrRevert: analysis.keep_or_revert
            }
        });

    } catch (error) {
        console.error('Setup analysis error:', error);
        res.status(500).json({
            error: 'Failed to analyze setup change',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/setup/recommend
 * Get setup recommendations for a specific issue
 * 
 * Body:
 * {
 *   issue: string,  // 'understeer', 'oversteer', 'tire_wear', 'inconsistency'
 *   currentSetup: object  // Current setup configuration
 * }
 */
router.post('/recommend', async (req, res) => {
    try {
        const { issue, currentSetup } = req.body;

        if (!issue) {
            return res.status(400).json({
                error: 'Missing required field: issue'
            });
        }

        // Call Python analyzer
        const scriptPath = path.join(__dirname, '../../relay_agent/setup_analyzer.py');
        const setupJson = JSON.stringify(currentSetup || {});
        const command = `python3 ${scriptPath} --recommend "${issue}" --setup '${setupJson}'`;

        const { stdout } = await execAsync(command);
        const recommendations = JSON.parse(stdout);

        res.json({
            success: true,
            issue,
            recommendations: recommendations.map((rec: any) => ({
                component: rec.component,
                parameter: rec.parameter,
                change: rec.change,
                unit: rec.unit,
                expectedEffect: rec.expected_effect,
                confidence: rec.confidence
            }))
        });

    } catch (error) {
        console.error('Setup recommendation error:', error);
        res.status(500).json({
            error: 'Failed to generate recommendations',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/setup/history/:sessionId
 * Get setup change history for a session
 */
router.get('/history/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;

        // TODO: Fetch from database

        res.json({
            success: true,
            history: [
                {
                    id: '1',
                    timestamp: Date.now() - 3600000,
                    component: 'front_wing',
                    parameter: 'angle',
                    oldValue: 5,
                    newValue: 4,
                    delta: -1,
                    unit: 'clicks',
                    analyzed: true,
                    lapTimeDelta: -0.222,
                    recommendation: 'KEEP'
                }
            ]
        });

    } catch (error) {
        console.error('Setup history error:', error);
        res.status(500).json({
            error: 'Failed to fetch setup history',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;
