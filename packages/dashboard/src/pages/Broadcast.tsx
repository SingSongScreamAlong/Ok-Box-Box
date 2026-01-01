/**
 * Broadcast Page - RaceBox Director Controls
 * 
 * Director interface for managing live race broadcasts.
 * Features:
 * - Stream delay controls
 * - Overlay management
 * - Go live toggle
 * - Plus features gated for paid tier
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { socketClient } from '../lib/socket-client';
import { useBootstrap } from '../hooks/useBootstrap';
import { TimingOverlay, IncidentOverlay, RaceControlOverlay, PenaltyOverlay } from '../components/overlays/BroadcastOverlay';
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
    const { hasCapability } = useBootstrap();
    const hasRaceBoxPlus = hasCapability('racebox_access');

    const [session, setSession] = useState<BroadcastSession | null>(null);
    const [overlays, setOverlays] = useState<OverlayConfig>({
        timingTower: true,
        lowerThird: true,
        battleBox: false,
        incidentBanner: false
    });
    const [delaySeconds, setDelaySeconds] = useState(5);
    const [isLive, setIsLive] = useState(false);
    const [previewMode, setPreviewMode] = useState(false);

    useEffect(() => {
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
        // Battle box and incident banner are Plus features
        if ((key === 'battleBox' || key === 'incidentBanner') && !hasRaceBoxPlus) {
            return;
        }
        setOverlays(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const goLive = () => {
        if (!session) return;
        setIsLive(true);
        // Emit broadcast:start event
        socketClient.emit('broadcast:start' as any, {
            sessionId: session.sessionId,
            delaySeconds
        });
    };

    const stopBroadcast = () => {
        setIsLive(false);
        // Emit broadcast:stop event
        socketClient.emit('broadcast:stop' as any, {
            sessionId: session?.sessionId
        });
    };

    const copyWatchUrl = () => {
        if (!session) return;
        const url = `${window.location.origin}/watch/${session.sessionId}`;
        navigator.clipboard.writeText(url);
    };

    return (
        <div className="broadcast-page">
            {/* Header */}
            <header className="broadcast-header">
                <div className="header-brand">
                    <span className="brand-text">RaceBox Director</span>
                    {hasRaceBoxPlus && <span className="plus-badge">PLUS</span>}
                </div>
                <div className="header-actions">
                    <button onClick={() => navigate('/home')} className="back-btn">
                        ← Back
                    </button>
                </div>
            </header>

            <div className="broadcast-layout">
                {/* Left Panel - Controls */}
                <aside className="controls-panel">
                    {/* Session Info */}
                    <section className="control-section">
                        <h3>Session</h3>
                        {session ? (
                            <div className="session-details">
                                <p><strong>{session.trackName}</strong></p>
                                <p>{session.sessionType}</p>
                                <p className="session-id">ID: {session.sessionId}</p>
                            </div>
                        ) : (
                            <p className="no-session">No active session</p>
                        )}
                    </section>

                    {/* Delay Control */}
                    <section className="control-section">
                        <h3>Stream Delay</h3>
                        <div className="delay-control">
                            <input
                                type="range"
                                min="0"
                                max="60"
                                value={delaySeconds}
                                onChange={(e) => setDelaySeconds(Number(e.target.value))}
                                disabled={!hasRaceBoxPlus || isLive}
                            />
                            <span className="delay-value">{delaySeconds}s</span>
                            {!hasRaceBoxPlus && (
                                <span className="plus-required">Plus required</span>
                            )}
                        </div>
                    </section>

                    {/* Overlay Toggles */}
                    <section className="control-section">
                        <h3>Overlays</h3>
                        <div className="overlay-toggles">
                            <label className="toggle-row">
                                <input
                                    type="checkbox"
                                    checked={overlays.timingTower}
                                    onChange={() => toggleOverlay('timingTower')}
                                />
                                <span>Timing Tower</span>
                            </label>
                            <label className="toggle-row">
                                <input
                                    type="checkbox"
                                    checked={overlays.lowerThird}
                                    onChange={() => toggleOverlay('lowerThird')}
                                />
                                <span>Lower Third</span>
                            </label>
                            <label className={`toggle-row ${!hasRaceBoxPlus ? 'locked' : ''}`}>
                                <input
                                    type="checkbox"
                                    checked={overlays.battleBox}
                                    onChange={() => toggleOverlay('battleBox')}
                                    disabled={!hasRaceBoxPlus}
                                />
                                <span>Battle Box {!hasRaceBoxPlus && '🔒'}</span>
                            </label>
                            <label className={`toggle-row ${!hasRaceBoxPlus ? 'locked' : ''}`}>
                                <input
                                    type="checkbox"
                                    checked={overlays.incidentBanner}
                                    onChange={() => toggleOverlay('incidentBanner')}
                                    disabled={!hasRaceBoxPlus}
                                />
                                <span>Incident Banner {!hasRaceBoxPlus && '🔒'}</span>
                            </label>
                        </div>
                    </section>

                    {/* Go Live */}
                    <section className="control-section live-section">
                        {isLive ? (
                            <button className="stop-btn" onClick={stopBroadcast}>
                                ⏹ Stop Broadcast
                            </button>
                        ) : (
                            <button
                                className="go-live-btn"
                                onClick={goLive}
                                disabled={!session}
                            >
                                🔴 Go Live
                            </button>
                        )}
                        <button className="copy-url-btn" onClick={copyWatchUrl} disabled={!session}>
                            📋 Copy Watch URL
                        </button>
                    </section>
                </aside>

                {/* Main - Preview */}
                <main className="preview-area">
                    <div className="preview-header">
                        <h3>Preview</h3>
                        <label className="preview-toggle">
                            <input
                                type="checkbox"
                                checked={previewMode}
                                onChange={(e) => setPreviewMode(e.target.checked)}
                            />
                            <span>Show Overlays</span>
                        </label>
                    </div>
                    <div className="preview-content">
                        {previewMode && (
                            <div className="preview-overlays">
                                {overlays.timingTower && <TimingOverlay theme="dark" />}
                                {overlays.incidentBanner && <IncidentOverlay theme="dark" />}
                                <PenaltyOverlay theme="dark" />
                                <RaceControlOverlay theme="dark" />
                            </div>
                        )}
                        <div className="preview-placeholder">
                            <p>OBS/Stream Preview</p>
                            <p className="preview-hint">
                                Add browser sources in OBS pointing to /overlay/* endpoints
                            </p>
                        </div>
                    </div>
                </main>
            </div>

            {/* Status Bar */}
            <footer className="broadcast-footer">
                <span className={`status ${isLive ? 'live' : ''}`}>
                    {isLive ? '🔴 LIVE' : '⚫ OFFLINE'}
                </span>
                <span className="viewer-count">
                    {session?.viewerCount || 0} viewers
                </span>
                <span className="delay-info">
                    Delay: {delaySeconds}s
                </span>
            </footer>
        </div>
    );
};

export default Broadcast;
