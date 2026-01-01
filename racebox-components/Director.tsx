// =====================================================================
// Director View (Week 8)
// Control panel for broadcast state and overlay cues.
// =====================================================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../lib/auth-context';
import { realtimeClient } from '../../lib/realtime-client';
import type { SessionTiming, TimingEntry } from '@controlbox/common';
import './Director.css';

// =====================================================================
// Types
// =====================================================================

interface BroadcastState {
    sessionId: string;
    featuredDriverId: string | null;
    featuredBattle: { driverA: string; driverB: string } | null;
    activeCue: { type: string; expiresAt: number | null } | null;
    sceneName: string;
    delayMs: number;
}

// =====================================================================
// Component
// =====================================================================

export function DirectorView() {
    const { claims, hasCap } = useAuth();
    const canControl = hasCap('racebox:director:control');

    const [sessionId, setSessionId] = useState<string>('');
    const [isConnected, setIsConnected] = useState(false);
    const [entries, setEntries] = useState<TimingEntry[]>([]);
    const [broadcastState, setBroadcastState] = useState<BroadcastState | null>(null);

    // Selected states
    const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
    const [selectedBattleA, setSelectedBattleA] = useState<string | null>(null);
    const [selectedBattleB, setSelectedBattleB] = useState<string | null>(null);
    const [delayMs, setDelayMs] = useState(0);

    // Connect to session
    useEffect(() => {
        if (!sessionId || !claims) return;

        realtimeClient.connect(claims, 'racebox');
        realtimeClient.subscribe(sessionId, 10);

        const unsubConnection = realtimeClient.onConnection(status => {
            setIsConnected(status === 'connected');
        });

        return () => {
            unsubConnection();
            realtimeClient.unsubscribe(sessionId);
        };
    }, [sessionId, claims]);

    // Listen for timing updates
    useEffect(() => {
        const unsubTiming = realtimeClient.onTiming(timing => {
            setEntries(timing.entries);
        });

        return () => unsubTiming();
    }, []);

    // Find battles (gap < 1.0s)
    const battles = useMemo(() => {
        const result: { a: TimingEntry; b: TimingEntry; gap: number }[] = [];
        for (let i = 0; i < entries.length - 1; i++) {
            const gap = Math.abs((entries[i].gapAhead || 0));
            if (gap < 1.0 && gap > 0) {
                result.push({ a: entries[i], b: entries[i + 1], gap });
            }
        }
        return result;
    }, [entries]);

    // Send command to server
    const sendCommand = useCallback((action: string, payload: Record<string, unknown>) => {
        if (!canControl) return;

        // In a real implementation, this would emit to server
        // For now, update local state
        console.log('📺 Director command:', action, payload);

        // Simulate broadcast state update
        if (action === 'setFeaturedDriver') {
            setBroadcastState(prev => prev ? { ...prev, featuredDriverId: payload.driverId as string } : null);
        }
    }, [canControl]);

    // Handler functions
    const handleFeatureDriver = (driverId: string) => {
        setSelectedDriver(driverId);
        sendCommand('setFeaturedDriver', { driverId });
    };

    const handleSetBattle = () => {
        if (selectedBattleA && selectedBattleB) {
            sendCommand('setFeaturedBattle', { driverA: selectedBattleA, driverB: selectedBattleB });
        }
    };

    const handleTriggerCue = (type: string, durationMs?: number) => {
        sendCommand('triggerCue', { type, durationMs });
    };

    const handleSetDelay = (ms: number) => {
        setDelayMs(ms);
        sendCommand('setDelay', { delayMs: ms });
    };

    if (!canControl) {
        return (
            <div className="director director--unauthorized">
                <h2>🚫 Director Access Required</h2>
                <p>You need the racebox:director:control capability.</p>
            </div>
        );
    }

    return (
        <div className="director">
            <header className="director__header">
                <h1>🎬 Broadcast Director</h1>
                <div className="connection-status">
                    {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
                </div>
            </header>

            {/* Session Selector */}
            <section className="director__section">
                <h2>Session</h2>
                <div className="session-input">
                    <input
                        type="text"
                        placeholder="Session ID"
                        value={sessionId}
                        onChange={(e) => setSessionId(e.target.value)}
                    />
                </div>
            </section>

            {/* Delay Control */}
            <section className="director__section">
                <h2>Broadcast Delay</h2>
                <div className="delay-buttons">
                    {[0, 10000, 30000, 60000, 120000].map(ms => (
                        <button
                            key={ms}
                            className={delayMs === ms ? 'active' : ''}
                            onClick={() => handleSetDelay(ms)}
                        >
                            {ms === 0 ? 'LIVE' : `${ms / 1000}s`}
                        </button>
                    ))}
                </div>
            </section>

            {/* Driver List */}
            <section className="director__section">
                <h2>Drivers ({entries.length})</h2>
                <div className="driver-list">
                    {entries.map(entry => (
                        <div
                            key={entry.driverId}
                            className={`driver-item ${selectedDriver === entry.driverId ? 'selected' : ''}`}
                            onClick={() => handleFeatureDriver(entry.driverId)}
                        >
                            <span className="pos">P{entry.position}</span>
                            <span className="name">{entry.driverName || entry.driverId}</span>
                            <button
                                className="feature-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleFeatureDriver(entry.driverId);
                                }}
                            >
                                ⭐ Feature
                            </button>
                        </div>
                    ))}
                </div>
            </section>

            {/* Battle Finder */}
            <section className="director__section">
                <h2>Battles ({battles.length})</h2>
                <div className="battle-list">
                    {battles.map((battle, i) => (
                        <div
                            key={i}
                            className="battle-item"
                            onClick={() => {
                                setSelectedBattleA(battle.a.driverId);
                                setSelectedBattleB(battle.b.driverId);
                            }}
                        >
                            <span className="drivers">
                                {battle.a.driverName} vs {battle.b.driverName}
                            </span>
                            <span className="gap">{battle.gap.toFixed(3)}s</span>
                            <button onClick={() => {
                                setSelectedBattleA(battle.a.driverId);
                                setSelectedBattleB(battle.b.driverId);
                                handleSetBattle();
                            }}>
                                📺 Show
                            </button>
                        </div>
                    ))}
                    {battles.length === 0 && (
                        <div className="empty">No close battles</div>
                    )}
                </div>
            </section>

            {/* Overlay Cues */}
            <section className="director__section">
                <h2>Overlay Cues</h2>
                <div className="cue-buttons">
                    <button onClick={() => handleTriggerCue('lower-third', 5000)}>
                        Show Lower Third (5s)
                    </button>
                    <button onClick={() => handleTriggerCue('battle-box')}>
                        Show Battle Box
                    </button>
                    <button onClick={() => handleTriggerCue('incident-banner')}>
                        Show Incident Banner
                    </button>
                    <button onClick={() => sendCommand('dismissCue', {})}>
                        ✕ Dismiss All
                    </button>
                </div>
            </section>

            {/* OBS URLs */}
            <section className="director__section">
                <h2>OBS Browser Source URLs</h2>
                <div className="obs-urls">
                    <div className="url-item">
                        <label>Timing Tower:</label>
                        <code>{`/racebox/overlay/timing-tower?sessionId=${sessionId}&theme=dark`}</code>
                    </div>
                    <div className="url-item">
                        <label>Lower Third:</label>
                        <code>{`/racebox/overlay/lower-third?sessionId=${sessionId}&driverId=${selectedDriver || ''}`}</code>
                    </div>
                    <div className="url-item">
                        <label>Battle Box:</label>
                        <code>{`/racebox/overlay/battle-box?sessionId=${sessionId}&driverA=${selectedBattleA || ''}&driverB=${selectedBattleB || ''}`}</code>
                    </div>
                </div>
            </section>
        </div>
    );
}
