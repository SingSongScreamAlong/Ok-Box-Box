// =====================================================================
// Battle Box Overlay (Week 8)
// Head-to-head battle comparison for OBS.
// =====================================================================

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { realtimeClient, type ThinTelemetryFrame } from '../../lib/realtime-client';
import './BattleBox.css';

// =====================================================================
// Component
// =====================================================================

export function BattleBoxOverlay() {
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get('sessionId') || '';
    const theme = (searchParams.get('theme') as 'dark' | 'light') || 'dark';
    const demo = searchParams.get('demo') === '1';

    const [driverA, setDriverA] = useState<BattleDriver | null>(null);
    const [driverB, setDriverB] = useState<BattleDriver | null>(null);
    const [visible, setVisible] = useState(false);

    // Demo mode
    useEffect(() => {
        if (demo) {
            setDriverA({
                id: 'driver-1',
                name: 'Max Verstappen',
                position: 1,
                lastLap: 89.432,
                bestLap: 89.012,
                speed: 312,
            });
            setDriverB({
                id: 'driver-2',
                name: 'Charles Leclerc',
                position: 2,
                lastLap: 89.678,
                bestLap: 89.234,
                speed: 308,
            });
            setVisible(true);
        }
    }, [demo]);

    // Get battle from URL params or broadcast state
    useEffect(() => {
        if (demo) return;

        const driverAId = searchParams.get('driverA');
        const driverBId = searchParams.get('driverB');

        if (driverAId && driverBId) {
            // Initialize with IDs, data will come from frames
            setDriverA({ id: driverAId, name: driverAId, position: 0, lastLap: 0, bestLap: 0, speed: 0 });
            setDriverB({ id: driverBId, name: driverBId, position: 0, lastLap: 0, bestLap: 0, speed: 0 });
            setVisible(true);
        }
    }, [demo, searchParams]);

    // Update from telemetry
    useEffect(() => {
        if (demo || !sessionId) return;

        const broadcastClaims = {
            userId: 'overlay',
            orgId: 'broadcast',
            role: 'broadcast' as const,
            surfaces: ['racebox' as const],
            capabilities: ['racebox:overlay:view' as const],
            displayName: 'Overlay',
        };

        realtimeClient.connect(broadcastClaims, 'racebox');
        realtimeClient.subscribe(sessionId, 5);

        const unsubFrame = realtimeClient.onThinFrame((frame) => {
            if (driverA && frame.driverId === driverA.id) {
                setDriverA(prev => prev ? {
                    ...prev,
                    position: frame.position || prev.position,
                    lastLap: frame.lastLapTime || prev.lastLap,
                    speed: Math.round((frame.speed || 0) * 3.6),
                } : null);
            }
            if (driverB && frame.driverId === driverB.id) {
                setDriverB(prev => prev ? {
                    ...prev,
                    position: frame.position || prev.position,
                    lastLap: frame.lastLapTime || prev.lastLap,
                    speed: Math.round((frame.speed || 0) * 3.6),
                } : null);
            }
        });

        return () => unsubFrame();
    }, [driverA?.id, driverB?.id, sessionId, demo]);

    if (!visible || !driverA || !driverB) return null;

    const gap = driverA.lastLap && driverB.lastLap
        ? Math.abs(driverA.lastLap - driverB.lastLap)
        : 0;

    return (
        <div className={`battle-box battle-box--${theme}`} data-overlay="battle-box">
            <div className="battle-box__header">BATTLE FOR P{Math.min(driverA.position, driverB.position)}</div>
            <div className="battle-box__drivers">
                <DriverCard driver={driverA} isLeading={driverA.position < driverB.position} />
                <div className="battle-box__gap">
                    <span className="gap-value">{gap.toFixed(3)}s</span>
                    <span className="gap-label">GAP</span>
                </div>
                <DriverCard driver={driverB} isLeading={driverB.position < driverA.position} />
            </div>
        </div>
    );
}

// =====================================================================
// Driver Card
// =====================================================================

interface BattleDriver {
    id: string;
    name: string;
    position: number;
    lastLap: number;
    bestLap: number;
    speed: number;
}

function DriverCard({ driver, isLeading }: { driver: BattleDriver; isLeading: boolean }) {
    return (
        <div className={`driver-card ${isLeading ? 'driver-card--leading' : ''}`}>
            <div className="driver-card__pos">P{driver.position}</div>
            <div className="driver-card__name">{driver.name}</div>
            <div className="driver-card__stats">
                <div className="stat">
                    <label>LAST</label>
                    <value>{formatLapTime(driver.lastLap)}</value>
                </div>
                <div className="stat">
                    <label>SPEED</label>
                    <value>{driver.speed} km/h</value>
                </div>
            </div>
        </div>
    );
}

function formatLapTime(seconds: number): string {
    if (!seconds || seconds <= 0) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(3);
    return mins > 0 ? `${mins}:${secs.padStart(6, '0')}` : secs;
}
