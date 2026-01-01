// =====================================================================
// Socket Tap
// WebSocket connection and event tracking for ops monitoring
// =====================================================================

import { socketEvents, type SocketEventEntry } from './ring-buffer.js';
import { wsLogger } from './logger.js';

// =====================================================================
// Active Connections Tracking
// =====================================================================

interface ActiveSocket {
    socketId: string;
    role: string;
    surface: string;
    joinedRooms: Set<string>;
    connectedAt: number;
    lastSeenAt: number;
}

const activeConnections = new Map<string, ActiveSocket>();

// Counters
let totalConnects = 0;
let totalDisconnects = 0;
let totalAuthFails = 0;
let totalJoins = 0;
let totalLeaves = 0;

// =====================================================================
// Recording Functions
// =====================================================================

export function recordConnect(socketId: string, role: string = 'unknown', surface: string = 'unknown'): void {
    totalConnects++;

    activeConnections.set(socketId, {
        socketId,
        role,
        surface,
        joinedRooms: new Set(),
        connectedAt: Date.now(),
        lastSeenAt: Date.now()
    });

    socketEvents.push({
        type: 'connect',
        socketId: redactSocketId(socketId),
        role,
        surface
    } as Omit<SocketEventEntry, 'id' | 'timestamp'>);

    wsLogger.debug({ socketId: redactSocketId(socketId), role, surface }, 'Socket connected');
}

export function recordDisconnect(socketId: string, reason: string = 'unknown'): void {
    totalDisconnects++;

    activeConnections.delete(socketId);

    socketEvents.push({
        type: 'disconnect',
        socketId: redactSocketId(socketId),
        reason
    } as Omit<SocketEventEntry, 'id' | 'timestamp'>);

    wsLogger.debug({ socketId: redactSocketId(socketId), reason }, 'Socket disconnected');
}

export function recordAuthFail(socketId: string, reason: string): void {
    totalAuthFails++;

    socketEvents.push({
        type: 'auth_fail',
        socketId: redactSocketId(socketId),
        reason
    } as Omit<SocketEventEntry, 'id' | 'timestamp'>);

    wsLogger.warn({ socketId: redactSocketId(socketId), reason }, 'Socket auth failed');
}

export function recordJoin(socketId: string, room: string): void {
    totalJoins++;

    const socket = activeConnections.get(socketId);
    if (socket) {
        socket.joinedRooms.add(room);
        socket.lastSeenAt = Date.now();
    }

    socketEvents.push({
        type: 'join',
        socketId: redactSocketId(socketId),
        room: redactRoom(room)
    } as Omit<SocketEventEntry, 'id' | 'timestamp'>);
}

export function recordLeave(socketId: string, room: string): void {
    totalLeaves++;

    const socket = activeConnections.get(socketId);
    if (socket) {
        socket.joinedRooms.delete(room);
        socket.lastSeenAt = Date.now();
    }

    socketEvents.push({
        type: 'leave',
        socketId: redactSocketId(socketId),
        room: redactRoom(room)
    } as Omit<SocketEventEntry, 'id' | 'timestamp'>);
}

export function recordSocketError(socketId: string, error: string): void {
    socketEvents.push({
        type: 'error',
        socketId: redactSocketId(socketId),
        reason: error.slice(0, 200)
    } as Omit<SocketEventEntry, 'id' | 'timestamp'>);

    wsLogger.error({ socketId: redactSocketId(socketId), error }, 'Socket error');
}

export function updateSocketActivity(socketId: string): void {
    const socket = activeConnections.get(socketId);
    if (socket) {
        socket.lastSeenAt = Date.now();
    }
}

// =====================================================================
// Query Functions
// =====================================================================

export function getActiveConnections(): ActiveSocket[] {
    return Array.from(activeConnections.values()).map(s => ({
        ...s,
        socketId: redactSocketId(s.socketId),
        joinedRooms: new Set(Array.from(s.joinedRooms).map(redactRoom))
    }));
}

export function getActiveConnectionsByRole(): Record<string, number> {
    const byRole: Record<string, number> = {};
    for (const socket of activeConnections.values()) {
        byRole[socket.role] = (byRole[socket.role] || 0) + 1;
    }
    return byRole;
}

export function getActiveConnectionsBySurface(): Record<string, number> {
    const bySurface: Record<string, number> = {};
    for (const socket of activeConnections.values()) {
        bySurface[socket.surface] = (bySurface[socket.surface] || 0) + 1;
    }
    return bySurface;
}

export function getSocketStats(): {
    totalConnections: number;
    activeConnections: number;
    totalConnects: number;
    totalDisconnects: number;
    totalAuthFails: number;
    totalJoins: number;
    totalLeaves: number;
    byRole: Record<string, number>;
    bySurface: Record<string, number>;
} {
    return {
        totalConnections: activeConnections.size,
        activeConnections: activeConnections.size,
        totalConnects,
        totalDisconnects,
        totalAuthFails,
        totalJoins,
        totalLeaves,
        byRole: getActiveConnectionsByRole(),
        bySurface: getActiveConnectionsBySurface()
    };
}

// =====================================================================
// Redaction Helpers
// =====================================================================

function redactSocketId(socketId: string): string {
    if (!socketId || socketId.length <= 8) return socketId;
    return socketId.slice(0, 4) + '...' + socketId.slice(-4);
}

function redactRoom(room: string): string {
    // Keep room type prefix, redact session ID portion
    if (room.includes(':')) {
        const parts = room.split(':');
        if (parts.length >= 2 && parts[1].length > 8) {
            parts[1] = parts[1].slice(0, 4) + '...' + parts[1].slice(-4);
        }
        return parts.join(':');
    }
    return room;
}
