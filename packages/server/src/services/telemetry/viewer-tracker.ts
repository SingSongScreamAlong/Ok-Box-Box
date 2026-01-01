/**
 * Viewer Tracker Service
 *
 * Tracks active viewers per session to control adaptive streaming.
 * When viewers ≥ 1, sends `relay:viewers` control message to relay
 * to activate 15Hz controls stream.
 */

import { EventEmitter } from 'events';
import type { Server as SocketServer, Socket } from 'socket.io';

// ============================================================================
// TYPES
// ============================================================================

interface SessionViewers {
    sessionId: string;
    viewerCount: number;
    viewers: Map<string, ViewerInfo>;
    lastControlsRequestTime: number;
}

interface ViewerInfo {
    socketId: string;
    joinedAt: number;
    clientType: 'web' | 'relay' | 'unknown';
}

export interface ViewerCountMessage {
    type: 'relay:viewers';
    sessionId: string;
    viewerCount: number;
    requestControls: boolean;
}

// ============================================================================
// SERVICE
// ============================================================================

export class ViewerTracker extends EventEmitter {
    private sessions: Map<string, SessionViewers> = new Map();
    private socketToSession: Map<string, string> = new Map();
    private io: SocketServer | null = null;

    /**
     * Initialize with Socket.IO server instance
     */
    initialize(io: SocketServer): void {
        this.io = io;
    }

    /**
     * Handle viewer joining a session room
     */
    viewerJoined(
        socket: Socket,
        sessionId: string,
        clientType: 'web' | 'relay' | 'unknown' = 'web'
    ): void {
        let session = this.sessions.get(sessionId);

        if (!session) {
            session = {
                sessionId,
                viewerCount: 0,
                viewers: new Map(),
                lastControlsRequestTime: 0,
            };
            this.sessions.set(sessionId, session);
        }

        // Don't count relay as a viewer
        if (clientType === 'relay') {
            return;
        }

        // Add viewer
        session.viewers.set(socket.id, {
            socketId: socket.id,
            joinedAt: Date.now(),
            clientType,
        });
        session.viewerCount = session.viewers.size;

        // Track socket → session mapping for cleanup
        this.socketToSession.set(socket.id, sessionId);

        console.log(`👁️ Viewer joined session ${sessionId}: ${session.viewerCount} viewers`);

        // Emit control message to relay
        this.emitViewerCount(sessionId);
    }

    /**
     * Handle viewer leaving a session room
     */
    viewerLeft(socket: Socket, sessionId: string): void {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        session.viewers.delete(socket.id);
        session.viewerCount = session.viewers.size;

        this.socketToSession.delete(socket.id);

        console.log(`👁️ Viewer left session ${sessionId}: ${session.viewerCount} viewers`);

        // Emit control message to relay
        this.emitViewerCount(sessionId);

        // Clean up empty sessions
        if (session.viewerCount === 0) {
            this.sessions.delete(sessionId);
        }
    }

    /**
     * Handle socket disconnect (cleanup all sessions)
     */
    handleDisconnect(socket: Socket): void {
        const sessionId = this.socketToSession.get(socket.id);
        if (sessionId) {
            this.viewerLeft(socket, sessionId);
        }
    }

    /**
     * Emit viewer count to relay for a session
     */
    private emitViewerCount(sessionId: string): void {
        const session = this.sessions.get(sessionId);
        const viewerCount = session?.viewerCount || 0;

        const message: ViewerCountMessage = {
            type: 'relay:viewers',
            sessionId,
            viewerCount,
            requestControls: viewerCount > 0,
        };

        // Emit to the session room (relay should be in this room)
        if (this.io) {
            this.io.to(`session:${sessionId}`).emit('relay:viewers', message);
        }

        // Also emit event for internal use
        this.emit('viewerCountChanged', message);

        console.log(
            `📤 Sent viewer count to relay: ${sessionId} = ${viewerCount} (controls: ${viewerCount > 0 ? 'ON' : 'OFF'
            })`
        );
    }

    /**
     * Get viewer count for a session
     */
    getViewerCount(sessionId: string): number {
        return this.sessions.get(sessionId)?.viewerCount || 0;
    }

    /**
     * Check if controls stream should be active
     */
    shouldSendControls(sessionId: string): boolean {
        return this.getViewerCount(sessionId) > 0;
    }

    /**
     * Get all active sessions with viewers
     */
    getActiveViewerSessions(): { sessionId: string; viewerCount: number }[] {
        return Array.from(this.sessions.values())
            .filter((s) => s.viewerCount > 0)
            .map((s) => ({
                sessionId: s.sessionId,
                viewerCount: s.viewerCount,
            }));
    }
}

// Singleton
let viewerTrackerInstance: ViewerTracker | null = null;

export function getViewerTracker(): ViewerTracker {
    if (!viewerTrackerInstance) {
        viewerTrackerInstance = new ViewerTracker();
    }
    return viewerTrackerInstance;
}
