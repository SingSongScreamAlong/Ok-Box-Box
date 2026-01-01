/**
 * Watch Page - Public RaceBox Viewer
 * 
 * Public-facing page for spectators to view live race broadcasts.
 * Shows timing tower, battle boxes, and other overlays.
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { socketClient } from '../lib/socket-client';
import './Watch.css';

interface TimingEntry {
    position: number;
    driverName: string;
    gap: string;
    lastLap: string;
    onTrack: boolean;
}

interface BroadcastState {
    sessionId: string;
    trackName: string;
    sessionType: string;
    lap: number;
    totalLaps: number | null;
    timing: TimingEntry[];
}

export const Watch: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const [broadcast, setBroadcast] = useState<BroadcastState | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (!sessionId) return;

        // Connect and join session
        socketClient.connect();
        socketClient.joinSession(sessionId);

        socketClient.on('onConnect', () => {
            setIsConnected(true);
        });

        socketClient.on('onTimingUpdate', (msg: any) => {
            setBroadcast(prev => ({
                sessionId: sessionId,
                trackName: prev?.trackName || 'Unknown Track',
                sessionType: prev?.sessionType || 'Race',
                lap: msg.lap || prev?.lap || 0,
                totalLaps: msg.totalLaps || prev?.totalLaps || null,
                timing: msg.entries || prev?.timing || []
            }));
        });

        socketClient.on('onSessionState', (msg: any) => {
            setBroadcast(prev => ({
                ...prev!,
                trackName: msg.trackName || prev?.trackName || 'Unknown',
                sessionType: msg.sessionType || prev?.sessionType || 'Race',
                lap: msg.lap ?? prev?.lap ?? 0,
                totalLaps: msg.totalLaps ?? prev?.totalLaps ?? null
            }));
        });

        return () => {
            socketClient.leaveSession(sessionId);
        };
    }, [sessionId]);

    if (!broadcast) {
        return (
            <div className="watch-page loading">
                <div className="loading-content">
                    <div className="spinner"></div>
                    <h2>Connecting to broadcast...</h2>
                    <p>Session: {sessionId}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="watch-page">
            {/* Header */}
            <header className="watch-header">
                <div className="brand">
                    <span className="brand-icon">🏎️</span>
                    <span className="brand-text">RaceBox</span>
                </div>
                <div className="session-badge">
                    <span className="live-dot">●</span>
                    LIVE
                </div>
            </header>

            {/* Track Info */}
            <div className="track-info">
                <h1>{broadcast.trackName}</h1>
                <div className="session-info">
                    <span>{broadcast.sessionType}</span>
                    {broadcast.totalLaps && (
                        <span>Lap {broadcast.lap} / {broadcast.totalLaps}</span>
                    )}
                </div>
            </div>

            {/* Timing Tower */}
            <div className="timing-tower">
                <div className="tower-header">
                    <span>POS</span>
                    <span>DRIVER</span>
                    <span>GAP</span>
                    <span>LAST</span>
                </div>
                <div className="tower-entries">
                    {broadcast.timing.map((entry, i) => (
                        <div
                            key={i}
                            className={`tower-entry ${!entry.onTrack ? 'off-track' : ''}`}
                        >
                            <span className="pos">{entry.position}</span>
                            <span className="driver">{entry.driverName}</span>
                            <span className="gap">{entry.gap}</span>
                            <span className="last">{entry.lastLap}</span>
                        </div>
                    ))}
                    {broadcast.timing.length === 0 && (
                        <div className="no-data">
                            Waiting for timing data...
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <footer className="watch-footer">
                <p>Powered by Ok, Box Box</p>
                <span className={`connection ${isConnected ? 'connected' : ''}`}>
                    {isConnected ? '● Connected' : '○ Connecting...'}
                </span>
            </footer>
        </div>
    );
};

export default Watch;
