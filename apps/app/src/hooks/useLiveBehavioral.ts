/**
 * useLiveBehavioral Hook
 * Subscribes to live behavioral metrics via WebSocket
 * Provides real-time BSI, TCI, CPI-2, RCI and coaching hints
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

export interface LiveBehavioralMetrics {
    runId: string;
    ts: number;
    
    pillars: {
        pace: number;
        consistency: number;
        technique: number;
        safety: number;
        reliability: number;
    };
    
    behavioral: {
        bsi: number;
        tci: number;
        cpi2: number;
        rci: number;
    };
    
    currentLap: number;
    lastLapTime: number | null;
    bestLapTime: number | null;
    position: number;
    
    coaching: string[];
    warnings: string[];
    
    confidence: number;
    ticksProcessed: number;
}

interface UseLiveBehavioralOptions {
    runId: string;
    sessionId?: string;
    driverProfileId?: string;
    enabled?: boolean;
}

interface UseLiveBehavioralResult {
    metrics: LiveBehavioralMetrics | null;
    isConnected: boolean;
    isSubscribed: boolean;
    error: string | null;
    subscribe: () => void;
    unsubscribe: () => void;
}

export function useLiveBehavioral(options: UseLiveBehavioralOptions): UseLiveBehavioralResult {
    const { runId, sessionId, driverProfileId, enabled = true } = options;
    
    const [metrics, setMetrics] = useState<LiveBehavioralMetrics | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const socketRef = useRef<Socket | null>(null);
    const subscribedRunRef = useRef<string | null>(null);

    // Initialize socket connection
    useEffect(() => {
        if (!enabled) return;

        const socket = io(WS_URL, {
            transports: ['websocket'],
            autoConnect: true,
        });

        socket.on('connect', () => {
            setIsConnected(true);
            setError(null);
            console.log('[LiveBehavioral] Connected');
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
            setIsSubscribed(false);
            console.log('[LiveBehavioral] Disconnected');
        });

        socket.on('connect_error', (err) => {
            setError(`Connection error: ${err.message}`);
            console.error('[LiveBehavioral] Connection error:', err);
        });

        socket.on('behavioral:update', (data: LiveBehavioralMetrics) => {
            setMetrics(data);
        });

        socket.on('behavioral:subscribed', (data: { runId: string }) => {
            setIsSubscribed(true);
            subscribedRunRef.current = data.runId;
            console.log('[LiveBehavioral] Subscribed to', data.runId);
        });

        socket.on('behavioral:unsubscribed', (data: { runId: string }) => {
            setIsSubscribed(false);
            subscribedRunRef.current = null;
            setMetrics(null);
            console.log('[LiveBehavioral] Unsubscribed from', data.runId);
        });

        socket.on('behavioral:error', (data: { error: string }) => {
            setError(data.error);
            console.error('[LiveBehavioral] Error:', data.error);
        });

        socketRef.current = socket;

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [enabled]);

    // Subscribe to run
    const subscribe = useCallback(() => {
        if (!socketRef.current || !runId) return;
        
        socketRef.current.emit('behavioral:subscribe', {
            runId,
            sessionId,
            driverProfileId,
        });
    }, [runId, sessionId, driverProfileId]);

    // Unsubscribe from run
    const unsubscribe = useCallback(() => {
        if (!socketRef.current || !subscribedRunRef.current) return;
        
        socketRef.current.emit('behavioral:unsubscribe', {
            runId: subscribedRunRef.current,
        });
    }, []);

    // Auto-subscribe when runId changes
    useEffect(() => {
        if (!enabled || !isConnected || !runId) return;

        // Unsubscribe from previous run if different
        if (subscribedRunRef.current && subscribedRunRef.current !== runId) {
            unsubscribe();
        }

        // Subscribe to new run
        subscribe();

        return () => {
            if (subscribedRunRef.current === runId) {
                unsubscribe();
            }
        };
    }, [enabled, isConnected, runId, subscribe, unsubscribe]);

    return {
        metrics,
        isConnected,
        isSubscribed,
        error,
        subscribe,
        unsubscribe,
    };
}

/**
 * Format behavioral index as a grade
 */
export function getBehavioralGrade(value: number): { grade: string; color: string } {
    if (value >= 90) return { grade: 'A+', color: 'text-emerald-400' };
    if (value >= 80) return { grade: 'A', color: 'text-emerald-400' };
    if (value >= 70) return { grade: 'B', color: 'text-cyan-400' };
    if (value >= 60) return { grade: 'C', color: 'text-yellow-400' };
    if (value >= 50) return { grade: 'D', color: 'text-orange-400' };
    return { grade: 'F', color: 'text-red-400' };
}

/**
 * Get primary coaching focus based on lowest behavioral index
 */
export function getPrimaryFocus(behavioral: LiveBehavioralMetrics['behavioral']): {
    area: 'braking' | 'throttle' | 'cornering' | 'rhythm';
    label: string;
    value: number;
} {
    const areas = [
        { area: 'braking' as const, label: 'Braking Stability', value: behavioral.bsi },
        { area: 'throttle' as const, label: 'Throttle Control', value: behavioral.tci },
        { area: 'cornering' as const, label: 'Cornering Precision', value: behavioral.cpi2 },
        { area: 'rhythm' as const, label: 'Rhythm & Consistency', value: behavioral.rci },
    ];
    
    return areas.reduce((min, curr) => curr.value < min.value ? curr : min);
}
