// =====================================================================
// useRcoRealtime Hook
// Socket.IO connection for real-time RCO data
// =====================================================================

import { useEffect, useCallback, useRef } from 'react';
import { socketClient } from '../lib/socket-client';
import type { RcoIncident, StandingsEntry, IncidentType, IncidentSeverity } from '../types/rco';

interface UseRcoRealtimeProps {
    onIncident: (incident: RcoIncident) => void;
    onStandings: (standings: StandingsEntry[]) => void;
    onSessionActive: (sessionId: string, trackName: string, sessionType: string) => void;
    onConnectionChange: (connected: boolean) => void;
}

function mapIncidentType(type: string): IncidentType {
    const typeMap: Record<string, IncidentType> = {
        'contact': 'contact',
        'off_track': 'off_track',
        'spin': 'spin',
        'unsafe_rejoin': 'unsafe_rejoin',
        'speeding': 'speeding',
        'blocking': 'blocking',
        'cutting': 'cutting',
        'loss_of_control': 'spin',
    };
    return typeMap[type] || 'other';
}

function mapSeverity(severity: string): IncidentSeverity {
    const severityMap: Record<string, IncidentSeverity> = {
        'light': 'info',
        'medium': 'warn',
        'heavy': 'critical',
        'low': 'info',
        'high': 'critical',
    };
    return severityMap[severity] || 'warn';
}

export function useRcoRealtime({
    onIncident,
    onStandings,
    onSessionActive,
    onConnectionChange,
}: UseRcoRealtimeProps) {
    const isConnectedRef = useRef(false);

    // Normalize incoming incident from server format to RCO format
    const normalizeIncident = useCallback((raw: any): RcoIncident => {
        const involved = (raw.involvedDrivers || raw.involved || []).map((d: any) => ({
            carNumber: d.carNumber || d.carId?.toString() || '?',
            driverName: d.driverName || 'Unknown Driver',
            teamName: d.teamName,
            carClass: d.carClass || d.class,
            iRating: d.iRating,
        }));

        const trackLocation = {
            x: raw.trackLocation?.x || 0,
            y: raw.trackLocation?.y || 0,
            lapDistPct: raw.trackPosition || raw.lapDistPct || raw.trackLocation?.lapDistPct || 0,
        };

        return {
            incidentId: raw.id || raw.incidentId || `inc-${Date.now()}`,
            timestamp: raw.createdAt ? new Date(raw.createdAt).getTime() : Date.now(),
            sessionTime: raw.sessionTimeMs ? raw.sessionTimeMs / 1000 : undefined,
            lapNumber: raw.lapNumber || raw.lap,
            trackLocation,
            cornerName: raw.cornerName,
            sectorName: raw.sectorName,
            type: mapIncidentType(raw.type),
            severity: mapSeverity(raw.severity),
            involved,
            summary: raw.summary || generateSummary(raw, involved),
            explanation: raw.explanation || raw.why,
            status: raw.status || 'new',
            evidence: raw.evidence ? {
                replayTime: raw.evidence.replayTime || raw.replayTimestampMs,
                clipId: raw.evidence.clipId,
                link: raw.evidence.link,
            } : undefined,
        };
    }, []);

    // Generate summary if not provided
    const generateSummary = (raw: any, involved: any[]): string => {
        const type = raw.type || 'incident';
        const driver1 = involved[0]?.driverName || 'Unknown';
        const driver2 = involved[1]?.driverName;
        const corner = raw.cornerName || 'track';

        if (type === 'contact' && driver2) {
            return `Contact between ${driver1} and ${driver2} at ${corner}`;
        }
        return `${type.replace('_', ' ')} involving ${driver1} at ${corner}`;
    };

    // Normalize standings from timing update
    const normalizeStandings = useCallback((timing: any): StandingsEntry[] => {
        const entries = timing?.entries || timing?.timing?.entries || [];
        return entries.map((entry: any, idx: number) => ({
            position: entry.position || idx + 1,
            carNumber: entry.carNumber || entry.driverId?.toString() || '?',
            driverName: entry.driverName || 'Unknown',
            teamName: entry.teamName,
            carClass: entry.carClass,
            gap: entry.gapToLeader ? `+${entry.gapToLeader.toFixed(1)}s` : (idx === 0 ? 'Leader' : '--'),
            lastLap: entry.lastLapTime ? formatLapTime(entry.lastLapTime) : '--',
            bestLap: entry.bestLapTime ? formatLapTime(entry.bestLapTime) : undefined,
            lapDistPct: entry.lapDistPct || entry.lapProgress || 0,
            inPit: entry.inPit || entry.onPitRoad,
        }));
    }, []);

    const formatLapTime = (seconds: number): string => {
        if (!seconds || seconds <= 0) return '--';
        const mins = Math.floor(seconds / 60);
        const secs = (seconds % 60).toFixed(3);
        return mins > 0 ? `${mins}:${secs.padStart(6, '0')}` : secs;
    };

    useEffect(() => {
        // Connect to socket
        socketClient.connect();

        // Connection handlers
        socketClient.on('onConnect', () => {
            isConnectedRef.current = true;
            onConnectionChange(true);
        });

        socketClient.on('onDisconnect', () => {
            isConnectedRef.current = false;
            onConnectionChange(false);
        });

        // Session active handler
        socketClient.on('onSessionActive', (message) => {
            onSessionActive(message.sessionId, message.trackName, message.sessionType);
        });

        // Incident handler
        socketClient.on('onIncidentNew', (message) => {
            const incident = normalizeIncident(message.incident || message);
            onIncident(incident);
        });

        // Timing/standings handler
        socketClient.on('onTimingUpdate', (message) => {
            const standings = normalizeStandings(message);
            if (standings.length > 0) {
                onStandings(standings);
            }
        });

        // Check initial connection status
        if (socketClient.getStatus() === 'connected') {
            isConnectedRef.current = true;
            onConnectionChange(true);
        }

        return () => {
            socketClient.off('onConnect');
            socketClient.off('onDisconnect');
            socketClient.off('onSessionActive');
            socketClient.off('onIncidentNew');
            socketClient.off('onTimingUpdate');
        };
    }, [onIncident, onStandings, onSessionActive, onConnectionChange, normalizeIncident, normalizeStandings]);

    return {
        isConnected: () => isConnectedRef.current,
        joinSession: (sessionId: string) => socketClient.joinSession(sessionId),
        leaveSession: (sessionId: string) => socketClient.leaveSession(sessionId),
    };
}
