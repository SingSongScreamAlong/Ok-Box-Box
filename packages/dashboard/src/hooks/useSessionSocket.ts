/**
 * useSessionSocket Hook
 * Provides a socket connection scoped to a specific session.
 */

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

// Socket.io connects to the same origin as the page in production
// In development, use VITE_API_URL or localhost
const getSocketUrl = () => {
    // In production (served from same origin), use window.location.origin
    if (import.meta.env.PROD) {
        return window.location.origin;
    }
    // In development, use env var or localhost
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    try {
        const url = new URL(apiUrl);
        return url.origin;
    } catch {
        return apiUrl;
    }
};

const SERVER_URL = getSocketUrl();

export function useSessionSocket(sessionId: string | null) {
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        if (!sessionId) {
            setIsConnected(false);
            return;
        }

        console.log('[useSessionSocket] Connecting to:', SERVER_URL);

        // Create socket connection
        const token = localStorage.getItem('accessToken');
        const socket = io(SERVER_URL, {
            transports: ['websocket', 'polling'],
            auth: {
                token
            }
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('[useSessionSocket] Connected to server, socket.id:', socket.id);
            console.log('[useSessionSocket] Joining session:', sessionId);
            socket.emit('room:join', { sessionId });
            setIsConnected(true);
        });

        socket.on('connect_error', (err) => {
            console.error('[useSessionSocket] Connection error:', err.message);
        });

        socket.on('disconnect', (reason) => {
            console.log('[useSessionSocket] Disconnected:', reason);
            setIsConnected(false);
        });

        socket.on('room:joined', (data: { sessionId: string }) => {
            console.log('[useSessionSocket] Successfully joined room:', data.sessionId);
        });

        socket.on('session:state', (data: any) => {
            console.log('[useSessionSocket] Session state received:', data);
        });

        return () => {
            if (sessionId) {
                socket.emit('room:leave', { sessionId });
            }
            socket.disconnect();
            socketRef.current = null;
        };
    }, [sessionId]);

    return {
        socket: socketRef.current,
        isConnected
    };
}
