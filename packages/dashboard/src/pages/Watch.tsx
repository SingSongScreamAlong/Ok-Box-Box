/**
 * Watch Page - RaceBox Public Viewer
 * 
 * Public spectator page for viewing live race broadcasts.
 * Features:
 * - Live timing tower overlay
 * - Session information
 * - No authentication required
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { socketClient } from '../lib/socket-client';
import { TimingOverlay, IncidentOverlay, RaceControlOverlay, PenaltyOverlay } from '../components/overlays/BroadcastOverlay';
import './Watch.css';

interface SessionInfo {
    sessionId: string;
    trackName: string;
    sessionType: string;
    lapNumber: number;
    isLive: boolean;
}

interface TimingEntry {
    driverId: string;
    carNumber: string;
    driverName: string;
    position: number;
    gapToLeader: number;
    lastLapTime: number;
}

export const Watch: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const [session, setSession] = useState<SessionInfo | null>(null);
    const [timing, setTiming] = useState<TimingEntry[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [showOverlays, setShowOverlays] = useState({
        timing: true,
        incidents: true,
        penalties: true,
        raceControl: true
    });

    useEffect(() => {
        // Connect to session room
        if (sessionId) {
            socketClient.emit('session:join' as any, { sessionId });
        }

        // Listen for session updates
        socketClient.on('onSessionActive', (msg: any) => {
            setSession({
                sessionId: msg.sessionId,
                trackName: msg.trackName,
                sessionType: msg.sessionType,
                lapNumber: msg.lapNumber || 1,
                isLive: true
            });
            setIsConnected(true);
        });

        // Listen for timing updates
        socketClient.on('onTimingUpdate', (msg: any) => {
            if (msg.entries) {
                setTiming(msg.entries);
            }
        });

        socketClient.on('disconnect', () => {
            setIsConnected(false);
        });

        return () => {
            socketClient.off('onSessionActive');
            socketClient.off('onTimingUpdate');
            socketClient.off('disconnect');
        };
    }, [sessionId]);

    const toggleOverlay = (key: keyof typeof showOverlays) => {
        setShowOverlays(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="watch-page">
            {/* Header */}
            <div className="watch-header">
                <div className="brand">
                    <span className="brand-text">OK, BOX BOX</span>
                    <span className="brand-sub">LIVE</span>
                </div>
                <div className="session-info">
                    {session ? (
                        <>
                            <span className="track-name">{session.trackName}</span>
                            <span className="session-type">{session.sessionType.toUpperCase()}</span>
                            <span className="lap-info">LAP {session.lapNumber}</span>
                        </>
                    ) : (
                        <span className="connecting">Connecting to session...</span>
                    )}
                </div>
                <div className={`live-indicator ${isConnected ? 'live' : ''}`}>
                    {isConnected ? '● LIVE' : '○ OFFLINE'}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="watch-content">
                {/* Overlays */}
                <div className="overlays-container">
                    {showOverlays.timing && <TimingOverlay theme="dark" showBackground={true} />}
                    {showOverlays.incidents && <IncidentOverlay theme="dark" showBackground={true} />}
                    {showOverlays.penalties && <PenaltyOverlay theme="dark" showBackground={true} />}
                    {showOverlays.raceControl && <RaceControlOverlay theme="dark" showBackground={true} />}
                </div>

                {/* Inline Timing Tower (for mobile) */}
                <div className="timing-tower">
                    <div className="tower-header">
                        <span>STANDINGS</span>
                    </div>
                    {timing.length === 0 ? (
                        <div className="tower-empty">Waiting for timing data...</div>
                    ) : (
                        timing.slice(0, 20).map((entry, idx) => (
                            <div key={entry.driverId} className={`tower-row ${idx < 3 ? 'podium' : ''}`}>
                                <span className="position">{idx + 1}</span>
                                <span className="car-number">#{entry.carNumber}</span>
                                <span className="driver-name">{entry.driverName}</span>
                                <span className="gap">
                                    {idx === 0 ? 'LEADER' : `+${entry.gapToLeader?.toFixed(1) || '--'}`}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Overlay Controls (Desktop) */}
            <div className="overlay-controls">
                <button
                    className={`control-btn ${showOverlays.timing ? 'active' : ''}`}
                    onClick={() => toggleOverlay('timing')}
                >
                    Timing
                </button>
                <button
                    className={`control-btn ${showOverlays.incidents ? 'active' : ''}`}
                    onClick={() => toggleOverlay('incidents')}
                >
                    Incidents
                </button>
                <button
                    className={`control-btn ${showOverlays.penalties ? 'active' : ''}`}
                    onClick={() => toggleOverlay('penalties')}
                >
                    Penalties
                </button>
                <button
                    className={`control-btn ${showOverlays.raceControl ? 'active' : ''}`}
                    onClick={() => toggleOverlay('raceControl')}
                >
                    Race Control
                </button>
            </div>

            {/* Footer */}
            <div className="watch-footer">
                <span className="powered-by">Powered by Ok, Box Box • RaceBox</span>
            </div>
        </div>
    );
};

export default Watch;
