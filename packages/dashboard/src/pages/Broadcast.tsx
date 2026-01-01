/**
 * Broadcast Page - RaceBox Director Controls
 * 
 * Director interface for managing live race broadcasts.
 * Features:
 * - Stream delay controls
 * - Overlay management
 * - Camera/car selection
 * - Go live toggle
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { socketClient } from '../lib/socket-client';
import './Broadcast.css';

interface BroadcastSession {
    sessionId: string;
    trackName: string;
    sessionType: string;
    isLive: boolean;
    viewerCount: number;
    delaySeconds: number;
}

interface OverlayConfig {
    timingTower: boolean;
    lowerThird: boolean;
    battleBox: boolean;
    incidentBanner: boolean;
}

export const Broadcast: React.FC = () => {
    const navigate = useNavigate();
    const [session, setSession] = useState<BroadcastSession | null>(null);
    const [overlays, setOverlays] = useState<OverlayConfig>({
        timingTower: true,
        lowerThird: true,
        battleBox: false,
        incidentBanner: true
    });
    const [delaySeconds, setDelaySeconds] = useState(5);
    const [isLive, setIsLive] = useState(false);

    useEffect(() => {
        // Listen for active sessions
        socketClient.on('onSessionActive', (msg) => {
            setSession({
                sessionId: msg.sessionId,
                trackName: msg.trackName,
                sessionType: msg.sessionType,
                isLive: false,
                viewerCount: 0,
                delaySeconds: 5
            });
        });

        return () => {
            socketClient.off('onSessionActive');
        };
    }, []);

    const toggleOverlay = (key: keyof OverlayConfig) => {
        setOverlays(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const goLive = () => {
        if (!session) return;
        setIsLive(true);
        // Would emit to server to start broadcast
    };

    const stopBroadcast = () => {
        setIsLive(false);
    };

    const copyWatchUrl = () => {
        if (!session) return;
        const url = `${window.location.origin}/watch/${session.sessionId}`;
        navigator.clipboard.writeText(url);
    };

    return (
        <div className="broadcast-page">
            <header className="broadcast-header">
                <div className="brand">
                    <h1>🏎️ RaceBox</h1>
                    <span className="subtitle">Broadcast Director</span>
                </div>
                <button className="back-btn" onClick={() => navigate('/home')}>
                    ← Back
                </button>
            </header>

            <div className="broadcast-content">
                {/* Session Info */}
                <section className="broadcast-section session-info">
                    <h2>Session</h2>
                    {session ? (
                        <div className="session-details">
                            <div className="detail">
                                <span className="label">Track</span>
                                <span className="value">{session.trackName}</span>
                            </div>
                            <div className="detail">
                                <span className="label">Type</span>
                                <span className="value">{session.sessionType}</span>
                            </div>
                            <div className="detail">
                                <span className="label">Status</span>
                                <span className={`value status ${isLive ? 'live' : 'offline'}`}>
                                    {isLive ? '● LIVE' : '○ Offline'}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="no-session">
                            <p>No active session detected.</p>
                            <p className="hint">Start iRacing to begin broadcasting.</p>
                        </div>
                    )}
                </section>

                {/* Delay Controls */}
                <section className="broadcast-section delay-controls">
                    <h2>Broadcast Delay</h2>
                    <div className="delay-options">
                        {[5, 10, 30, 60].map(seconds => (
                            <button
                                key={seconds}
                                className={`delay-btn ${delaySeconds === seconds ? 'active' : ''}`}
                                onClick={() => setDelaySeconds(seconds)}
                            >
                                {seconds}s
                            </button>
                        ))}
                    </div>
                    <p className="delay-hint">
                        Delays telemetry to prevent ghosting in online lobbies.
                    </p>
                </section>

                {/* Overlay Controls */}
                <section className="broadcast-section overlay-controls">
                    <h2>Overlays</h2>
                    <div className="overlay-toggles">
                        <label className="toggle">
                            <input
                                type="checkbox"
                                checked={overlays.timingTower}
                                onChange={() => toggleOverlay('timingTower')}
                            />
                            <span className="toggle-label">Timing Tower</span>
                        </label>
                        <label className="toggle">
                            <input
                                type="checkbox"
                                checked={overlays.lowerThird}
                                onChange={() => toggleOverlay('lowerThird')}
                            />
                            <span className="toggle-label">Lower Third</span>
                        </label>
                        <label className="toggle">
                            <input
                                type="checkbox"
                                checked={overlays.battleBox}
                                onChange={() => toggleOverlay('battleBox')}
                            />
                            <span className="toggle-label">Battle Box</span>
                        </label>
                        <label className="toggle">
                            <input
                                type="checkbox"
                                checked={overlays.incidentBanner}
                                onChange={() => toggleOverlay('incidentBanner')}
                            />
                            <span className="toggle-label">Incident Banner</span>
                        </label>
                    </div>
                </section>

                {/* Go Live Controls */}
                <section className="broadcast-section live-controls">
                    {!isLive ? (
                        <button
                            className="go-live-btn"
                            onClick={goLive}
                            disabled={!session}
                        >
                            🔴 Go Live
                        </button>
                    ) : (
                        <div className="live-actions">
                            <button className="copy-url-btn" onClick={copyWatchUrl}>
                                📋 Copy Watch URL
                            </button>
                            <button className="stop-btn" onClick={stopBroadcast}>
                                ⏹️ Stop Broadcast
                            </button>
                        </div>
                    )}
                    {session && isLive && (
                        <p className="watch-url">
                            Watch at: <code>/watch/{session.sessionId}</code>
                        </p>
                    )}
                </section>
            </div>
        </div>
    );
};

export default Broadcast;
