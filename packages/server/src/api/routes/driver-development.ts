/**
 * Driver Development API Routes
 * 
 * Endpoints for individual driver development plans and targets.
 */

import { Router, Request, Response } from 'express';
import { driverDevelopmentEngine, DriverTarget, SessionData } from '../../services/driver-development';

const router = Router();

// In-memory storage for demo (replace with DB in production)
const targetStore: Map<string, DriverTarget[]> = new Map();
const sessionStore: Map<string, SessionData[]> = new Map();

/**
 * GET /api/v1/drivers/:driverId/targets
 * Get all targets for a driver
 */
router.get('/:driverId/targets', async (req: Request, res: Response) => {
    try {
        const { driverId } = req.params;
        const { status } = req.query;

        let targets = targetStore.get(driverId) || [];

        // Filter by status if provided
        if (status) {
            targets = targets.filter(t => t.status === status);
        }

        res.json({
            driver_id: driverId,
            targets,
            total: targets.length,
            achieved: targets.filter(t => t.status === 'achieved').length
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/v1/drivers/:driverId/targets
 * Create a new target for a driver
 */
router.post('/:driverId/targets', async (req: Request, res: Response): Promise<void> => {
    try {
        const { driverId } = req.params;
        const { team_id, label, category, target_value, current_value, track, car, deadline, notes, created_by } = req.body;

        if (!label || !category || target_value === undefined) {
            res.status(400).json({ error: 'Missing required fields: label, category, target_value' });
            return;
        }

        const target = driverDevelopmentEngine.createTarget({
            driver_id: driverId,
            team_id: team_id || 'default',
            label,
            category,
            target_value,
            current_value,
            track,
            car,
            deadline,
            notes,
            created_by: created_by || driverId
        });

        // Store the target
        const existing = targetStore.get(driverId) || [];
        existing.push(target);
        targetStore.set(driverId, existing);

        res.status(201).json(target);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * PATCH /api/v1/drivers/:driverId/targets/:targetId
 * Update a target
 */
router.patch('/:driverId/targets/:targetId', async (req: Request, res: Response): Promise<void> => {
    try {
        const { driverId, targetId } = req.params;
        const updates = req.body;

        const targets = targetStore.get(driverId) || [];
        const index = targets.findIndex(t => t.id === targetId);

        if (index === -1) {
            res.status(404).json({ error: 'Target not found' });
            return;
        }

        // Apply updates
        targets[index] = { ...targets[index], ...updates };
        targetStore.set(driverId, targets);

        res.json(targets[index]);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * DELETE /api/v1/drivers/:driverId/targets/:targetId
 * Delete a target
 */
router.delete('/:driverId/targets/:targetId', async (req: Request, res: Response): Promise<void> => {
    try {
        const { driverId, targetId } = req.params;

        const targets = targetStore.get(driverId) || [];
        const filtered = targets.filter(t => t.id !== targetId);

        if (filtered.length === targets.length) {
            res.status(404).json({ error: 'Target not found' });
            return;
        }

        targetStore.set(driverId, filtered);
        res.status(204).send();
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/v1/drivers/:driverId/suggestions
 * Get auto-generated target suggestions based on performance
 */
router.get('/:driverId/suggestions', async (req: Request, res: Response) => {
    try {
        const { driverId } = req.params;

        // Get driver's recent sessions
        const sessions = sessionStore.get(driverId) || [];
        const existingTargets = targetStore.get(driverId) || [];

        // Generate suggestions
        const suggestions = await driverDevelopmentEngine.getSuggestions(
            driverId,
            sessions.slice(-10), // Last 10 sessions
            existingTargets
        );

        res.json({
            driver_id: driverId,
            suggestions,
            based_on_sessions: sessions.length
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/v1/drivers/:driverId/suggestions/:suggestionId/accept
 * Accept a suggested target (convert to active)
 */
router.post('/:driverId/suggestions/:suggestionId/accept', async (req: Request, res: Response): Promise<void> => {
    try {
        const { driverId, suggestionId } = req.params;
        const { team_id } = req.body;

        // Get fresh suggestions
        const sessions = sessionStore.get(driverId) || [];
        const existingTargets = targetStore.get(driverId) || [];
        const suggestions = await driverDevelopmentEngine.getSuggestions(
            driverId,
            sessions.slice(-10),
            existingTargets
        );

        // Find the suggestion
        const suggestion = suggestions.find((s: { id: string }) => s.id === suggestionId);
        if (!suggestion) {
            res.status(404).json({ error: 'Suggestion not found or expired' });
            return;
        }

        // Convert to active target
        const target = driverDevelopmentEngine.acceptSuggestion(suggestion, team_id || 'default');

        // Store it
        const targets = targetStore.get(driverId) || [];
        targets.push(target);
        targetStore.set(driverId, targets);

        res.status(201).json(target);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/v1/drivers/:driverId/sessions
 * Record a new session (triggers progress updates)
 */
router.post('/:driverId/sessions', async (req: Request, res: Response) => {
    try {
        const { driverId } = req.params;
        const sessionData: SessionData = {
            ...req.body,
            driver_id: driverId,
            timestamp: req.body.timestamp || new Date().toISOString()
        };

        // Store session
        const sessions = sessionStore.get(driverId) || [];
        sessions.push(sessionData);
        sessionStore.set(driverId, sessions);

        // Process through development engine
        const existingTargets = targetStore.get(driverId) || [];
        const result = await driverDevelopmentEngine.processSession(
            sessionData,
            existingTargets
        );

        // Update stored targets
        targetStore.set(driverId, result.updatedTargets);

        res.json({
            session_recorded: true,
            targets_updated: result.updatedTargets.filter((t: DriverTarget, i: number) =>
                t.current_value !== existingTargets[i]?.current_value
            ).length,
            achievements: result.achievements,
            new_suggestions: result.newSuggestions.length
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
