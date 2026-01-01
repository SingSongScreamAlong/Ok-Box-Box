/**
 * Notification Routes
 * API endpoints for in-app notifications
 */

import express from 'express';
import { authenticateToken } from './auth.js';
import { apiLimiter } from './middleware/rate-limit.js';
import NotificationService from './services/NotificationService.js';

const router = express.Router();

/**
 * Get user notifications
 * GET /api/notifications
 */
router.get('/', apiLimiter, authenticateToken, async (req, res) => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const limit = parseInt(req.query.limit as string) || 20;
        const notifications = await NotificationService.getNotifications(userId, limit);
        const unreadCount = await NotificationService.getUnreadCount(userId);

        return res.json({ notifications, unreadCount });

    } catch (error) {
        console.error('Error fetching notifications:', error);
        return res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

/**
 * Get unread count
 * GET /api/notifications/unread
 */
router.get('/unread', apiLimiter, authenticateToken, async (req, res) => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const count = await NotificationService.getUnreadCount(userId);
        return res.json({ count });

    } catch (error) {
        return res.status(500).json({ error: 'Failed to get unread count' });
    }
});

/**
 * Mark notification as read
 * POST /api/notifications/:id/read
 */
router.post('/:id/read', apiLimiter, authenticateToken, async (req, res) => {
    try {
        const userId = (req as any).user?.id;
        const { id } = req.params;

        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        await NotificationService.markAsRead(id, userId);
        return res.json({ success: true });

    } catch (error) {
        return res.status(500).json({ error: 'Failed to mark as read' });
    }
});

/**
 * Mark all as read
 * POST /api/notifications/read-all
 */
router.post('/read-all', apiLimiter, authenticateToken, async (req, res) => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        await NotificationService.markAllAsRead(userId);
        return res.json({ success: true });

    } catch (error) {
        return res.status(500).json({ error: 'Failed to mark all as read' });
    }
});

export default router;
