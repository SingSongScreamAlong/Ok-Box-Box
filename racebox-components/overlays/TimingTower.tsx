// =====================================================================
// Timing Tower Overlay (Week 8)
// OBS Browser Source overlay showing live standings.
// =====================================================================

import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { realtimeClient } from '../../lib/realtime-client';
import type { SessionTiming, TimingEntry } from '@controlbox/common';
import './TimingTower.css';

// =====================================================================
// Types
// =====================================================================

interface OverlayParams {
    sessionId: string;
    theme: 'dark' | 'light';
    scale: number;
    position: 'left' | 'right';
    showFlags: boolean;
    maxDrivers: number;
    demo: boolean;
}

// =====================================================================
// Component
// =====================================================================

export function TimingTowerOverlay() {
    const [searchParams] = useSearchParams();
    const params = parseOverlayParams(searchParams);

    const [entries, setEntries] = useState<TimingEntry[]>([]);
    const [featuredDriverId, setFeaturedDriverId] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const lastUpdateRef = useRef<number>(0);

    // Demo mode: generate fake data
    useEffect(() => {
        if (params.demo) {
            setEntries(generateDemoData());
            setFeaturedDriverId('driver-1');
            return;
        }
    }, [params.demo]);

    // Connect to realtime (broadcast rate: 5Hz baseline)
    useEffect(() => {
        if (params.demo || !params.sessionId) return;

        // Overlay uses broadcast claims
        const broadcastClaims = {
            userId: 'overlay',
            orgId: 'broadcast',
            role: 'broadcast' as const,
            surfaces: ['racebox' as const],
            capabilities: ['racebox:overlay:view' as const],
            displayName: 'Overlay',
        };

        realtimeClient.connect(broadcastClaims, 'racebox');
        realtimeClient.subscribe(params.sessionId, 5);

        const unsubConnection = realtimeClient.onConnection((status) => {
            setIsConnected(status === 'connected');
        });

        return () => {
            unsubConnection();
            realtimeClient.unsubscribe(params.sessionId);
        };
    }, [params.sessionId, params.demo]);

    // Handle timing updates
    useEffect(() => {
        if (params.demo) return;

        const unsubTiming = realtimeClient.onTiming((timing) => {
            // Throttle updates to avoid flicker (max 10 fps for DOM)
            const now = Date.now();
            if (now - lastUpdateRef.current < 100) return;
            lastUpdateRef.current = now;

            setEntries(timing.entries.slice(0, params.maxDrivers));
        });

        return () => unsubTiming();
    }, [params.demo, params.maxDrivers]);

    // Listen for broadcast state (featured driver)
    useEffect(() => {
        if (params.demo) return;

        const handleBroadcastState = (state: { featuredDriverId: string | null }) => {
            setFeaturedDriverId(state.featuredDriverId);
        };

        // Would connect to broadcast:state event here
        // For now, stub

        return () => { };
    }, [params.demo]);

    // Slice to max drivers
    const displayEntries = useMemo(() => {
        return entries.slice(0, params.maxDrivers);
    }, [entries, params.maxDrivers]);

    return (
        <div
            className={`timing-tower timing-tower--${params.theme} timing-tower--${params.position}`}
            style={{ transform: `scale(${params.scale})` }}
            data-overlay="timing-tower"
        >
            {displayEntries.map((entry, index) => (
                <TimingRow
                    key={entry.driverId}
                    entry={entry}
                    index={index}
                    isFeatured={entry.driverId === featuredDriverId}
                    showFlags={params.showFlags}
                />
            ))}
        </div>
    );
}

// =====================================================================
// Timing Row (memoized for performance)
// =====================================================================

interface TimingRowProps {
    entry: TimingEntry;
    index: number;
    isFeatured: boolean;
    showFlags: boolean;
}

function TimingRow({ entry, index, isFeatured, showFlags }: TimingRowProps) {
    const gapText = formatGap(entry.gapToLeader, index);

    return (
        <div
            className={`timing-row ${isFeatured ? 'timing-row--featured' : ''} ${entry.inPit ? 'timing-row--pit' : ''}`}
        >
            <div className="timing-row__pos">{entry.position}</div>
            <div className="timing-row__driver">
                {entry.driverName || entry.driverId.slice(0, 10)}
            </div>
            <div className="timing-row__gap">{gapText}</div>
            {showFlags && entry.inPit && (
                <div className="timing-row__flag timing-row__flag--pit">PIT</div>
            )}
        </div>
    );
}

// =====================================================================
// Helpers
// =====================================================================

function parseOverlayParams(searchParams: URLSearchParams): OverlayParams {
    return {
        sessionId: searchParams.get('sessionId') || '',
        theme: (searchParams.get('theme') as 'dark' | 'light') || 'dark',
        scale: parseFloat(searchParams.get('scale') || '1'),
        position: (searchParams.get('position') as 'left' | 'right') || 'left',
        showFlags: searchParams.get('showFlags') !== 'false',
        maxDrivers: parseInt(searchParams.get('maxDrivers') || '20', 10),
        demo: searchParams.get('demo') === '1' || searchParams.get('demo') === 'true',
    };
}

function formatGap(gap: number | null | undefined, index: number): string {
    if (index === 0) return 'LEADER';
    if (gap === null || gap === undefined) return '—';
    return `+${gap.toFixed(3)}`;
}

function generateDemoData(): TimingEntry[] {
    const drivers = [
        'Max Verstappen', 'Charles Leclerc', 'Lewis Hamilton', 'Lando Norris',
        'Carlos Sainz', 'George Russell', 'Oscar Piastri', 'Fernando Alonso',
        'Sergio Perez', 'Lance Stroll', 'Esteban Ocon', 'Pierre Gasly',
    ];

    return drivers.map((name, i) => ({
        driverId: `driver-${i}`,
        driverName: name,
        carNumber: String((i + 1) * 11),
        carName: '',
        position: i + 1,
        classPosition: i + 1,
        positionsGained: 0,
        currentLap: 15,
        lapsCompleted: 14,
        lastLapTime: 90.5 + Math.random() * 2,
        bestLapTime: 89.8 + Math.random(),
        gapToLeader: i === 0 ? 0 : i * 1.2 + Math.random() * 0.5,
        gapAhead: i === 0 ? 0 : 1.2 + Math.random() * 0.3,
        gapBehind: 1.1 + Math.random() * 0.2,
        sectorTimes: [],
        bestSectors: [],
        inPit: i === 5,
        onOutLap: false,
        pitStops: i % 3,
        incidentCount: 0,
        hasRecentIncident: false,
        isConnected: true,
        lastUpdate: Date.now(),
    }));
}
