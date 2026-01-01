/**
 * Notification Service
 * In-app notification system for session events, badges, incidents
 */

import { pool } from '../db.js';

export interface Notification {
    id: string;
    userId: string;
    type: 'badge' | 'session' | 'incident' | 'system';
    title: string;
    message: string;
    read: boolean;
    createdAt: number;
    metadata?: Record<string, any>;
}

class NotificationService {

    async createNotification(
        userId: string,
        type: Notification['type'],
        title: string,
        message: string,
        metadata?: Record<string, any>
    ): Promise<Notification | null> {
        try {
            const result = await pool.query(`
        INSERT INTO notifications (user_id, type, title, message, metadata, read, created_at)
        VALUES ($1, $2, $3, $4, $5, false, NOW())
        RETURNING id, user_id, type, title, message, read, extract(epoch from created_at)*1000 as created_at, metadata
      `, [userId, type, title, message, metadata ? JSON.stringify(metadata) : null]);

            const row = result.rows[0];
            return {
                id: row.id,
                userId: row.user_id,
                type: row.type,
                title: row.title,
                message: row.message,
                read: row.read,
                createdAt: Math.round(row.created_at),
                metadata: row.metadata
            };
        } catch (error) {
            console.error('Error creating notification:', error);
            return null;
        }
    }

    async getNotifications(userId: string, limit = 20): Promise<Notification[]> {
        try {
            const result = await pool.query(`
        SELECT id, user_id, type, title, message, read, extract(epoch from created_at)*1000 as created_at, metadata
        FROM notifications
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `, [userId, limit]);

            return result.rows.map(row => ({
                id: row.id,
                userId: row.user_id,
                type: row.type,
                title: row.title,
                message: row.message,
                read: row.read,
                createdAt: Math.round(row.created_at),
                metadata: row.metadata
            }));
        } catch (error) {
            console.error('Error fetching notifications:', error);
            return [];
        }
    }

    async getUnreadCount(userId: string): Promise<number> {
        try {
            const result = await pool.query(`
        SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = false
      `, [userId]);
            return parseInt(result.rows[0].count);
        } catch (error) {
            return 0;
        }
    }

    async markAsRead(notificationId: string, userId: string): Promise<boolean> {
        try {
            await pool.query(`
        UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2
      `, [notificationId, userId]);
            return true;
        } catch (error) {
            return false;
        }
    }

    async markAllAsRead(userId: string): Promise<boolean> {
        try {
            await pool.query(`UPDATE notifications SET read = true WHERE user_id = $1`, [userId]);
            return true;
        } catch (error) {
            return false;
        }
    }

    // Convenience methods for common notifications
    async notifyBadgeEarned(userId: string, badgeName: string, badgeIcon: string): Promise<void> {
        await this.createNotification(
            userId,
            'badge',
            'Badge Earned! 🏆',
            `You earned the "${badgeName}" badge!`,
            { badgeName, badgeIcon }
        );
    }

    async notifySessionComplete(userId: string, sessionName: string, bestLap: string): Promise<void> {
        await this.createNotification(
            userId,
            'session',
            'Session Complete',
            `${sessionName} finished. Best lap: ${bestLap}`,
            { sessionName, bestLap }
        );
    }

    async notifyIncident(userId: string, incidentType: string, lap: number): Promise<void> {
        await this.createNotification(
            userId,
            'incident',
            'Incident Detected',
            `${incidentType} detected on lap ${lap}`,
            { incidentType, lap }
        );
    }
}

export default new NotificationService();
