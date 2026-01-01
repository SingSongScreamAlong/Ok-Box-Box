// =====================================================================
// Public Timing Page (Week 8)
// Spectator-mode timing board with featured driver highlight.
// =====================================================================

import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { realtimeClient } from '../../lib/realtime-client';
import type { SessionTiming, TimingEntry } from '@controlbox/common';
import './PublicTiming.css';

// =====================================================================
// Component
// =====================================================================

export function PublicTimingPage() {
    const { sessionId: paramSessionId } = useParams<{ sessionId: string }>();
    const [searchParams] = useSearchParams();
    const sessionId = paramSessionId || searchParams.get('sessionId') || '';

    const [entries, setEntries] = useState<TimingEntry[]>([]);
    const [featuredDriverId, setFeaturedDriverId] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [sessionInfo, setSessionInfo] = useState<{ name: string; state: string } | null>(null);
    const lastUpdateRef = useRef<number>(0);

    // Connect with public/broadcast claims
    useEffect(() => {
        if (!sessionId) return;

        const publicClaims = {
            userId: 'public',
            orgId: 'public',
            role: 'broadcast' as const,
            surfaces: ['racebox' as const],
            capabilities: ['racebox:timing:access' as const],
            displayName: 'Spectator',
        };

        realtimeClient.connect(publicClaims, 'racebox');
        realtimeClient.subscribe(sessionId, 5);  // 5Hz for spectators

        const unsubConnection = realtimeClient.onConnection(status => {
            setIsConnected(status === 'connected');
        });

        return () => {
            unsubConnection();
            realtimeClient.unsubscribe(sessionId);
        };
    }, [sessionId]);

    // Handle timing updates
    useEffect(() => {
        const unsubTiming = realtimeClient.onTiming(timing => {
            // Throttle DOM updates to 10fps
            const now = Date.now();
            if (now - lastUpdateRef.current < 100) return;
            lastUpdateRef.current = now;

            setEntries(timing.entries);
            setSessionInfo({
                name: timing.sessionId,
                state: timing.sessionState,
            });
        });

        return () => unsubTiming();
    }, []);

    // Virtual list for performance (simple slicing for now)
    const displayEntries = useMemo(() => {
        return entries.slice(0, 60);  // Max 60 cars
    }, [entries]);

    // Session select if no ID provided
    if (!sessionId) {
        return (
            <div className="public-timing public-timing--no-session">
                <h1>📊 Live Timing</h1>
                <p>No session selected. Please use a direct link with session ID.</p>
            </div>
        );
    }

    return (
        <div className="public-timing">
            <header className="public-timing__header">
                <h1>📊 Live Timing</h1>
                <div className="session-info">
                    <span className={`status ${isConnected ? 'connected' : 'disconnected'}`}>
                        {isConnected ? '● LIVE' : '○ Connecting...'}
                    </span>
                    {sessionInfo && (
                        <>
                            <span className="session-state">{sessionInfo.state.toUpperCase()}</span>
                        </>
                    )}
                </div>
            </header>

            <div className="timing-table">
                <div className="timing-table__header">
                    <div className="col pos">POS</div>
                    <div className="col driver">DRIVER</div>
                    <div className="col gap">GAP</div>
                    <div className="col interval">INT</div>
                    <div className="col last">LAST LAP</div>
                    <div className="col best">BEST LAP</div>
                    <div className="col status">STATUS</div>
                </div>

                <div className="timing-table__body">
                    {displayEntries.map((entry, index) => (
                        <TimingRow
                            key={entry.driverId}
                            entry={entry}
                            index={index}
                            isFeatured={entry.driverId === featuredDriverId}
                        />
                    ))}
                </div>
            </div>

            <footer className="public-timing__footer">
                <span>Powered by Ok, Box Box</span>
            </footer>
        </div>
    );
}

// =====================================================================
// Timing Row
// =====================================================================

interface TimingRowProps {
    entry: TimingEntry;
    index: number;
    isFeatured: boolean;
}

function TimingRow({ entry, index, isFeatured }: TimingRowProps) {
    return (
        <div
            className={`timing-row ${isFeatured ? 'timing-row--featured' : ''} ${entry.inPit ? 'timing-row--pit' : ''}`}
        >
            <div className="col pos">{entry.position}</div>
            <div className="col driver">{entry.driverName || entry.driverId}</div>
            <div className="col gap">{formatGap(entry.gapToLeader, index)}</div>
            <div className="col interval">{formatInterval(entry.gapAhead, index)}</div>
            <div className="col last">{formatLapTime(entry.lastLapTime)}</div>
            <div className="col best">{formatLapTime(entry.bestLapTime)}</div>
            <div className="col status">
                {entry.inPit && <span className="badge pit">PIT</span>}
                {entry.hasRecentIncident && <span className="badge incident">⚠️</span>}
                {!entry.isConnected && <span className="badge offline">OFF</span>}
            </div>
        </div>
    );
}

// =====================================================================
// Helpers
// =====================================================================

function formatGap(gap: number | null | undefined, index: number): string {
    if (index === 0) return 'LEADER';
    if (gap === null || gap === undefined) return '—';
    return `+${gap.toFixed(3)}`;
}

function formatInterval(interval: number | null | undefined, index: number): string {
    if (index === 0) return '—';
    if (interval === null || interval === undefined) return '—';
    return `+${interval.toFixed(3)}`;
}

function formatLapTime(seconds: number | null | undefined): string {
    if (!seconds || seconds <= 0) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(3);
    return mins > 0 ? `${mins}:${secs.padStart(6, '0')}` : secs;
}
