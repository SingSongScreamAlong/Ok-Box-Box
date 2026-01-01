// =====================================================================
// Lower Third Overlay (Week 8)
// Featured driver card for OBS.
// =====================================================================

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { realtimeClient, type ThinTelemetryFrame } from '../../lib/realtime-client';
import './LowerThird.css';

// =====================================================================
// Component
// =====================================================================

export function LowerThirdOverlay() {
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get('sessionId') || '';
    const theme = (searchParams.get('theme') as 'dark' | 'light') || 'dark';
    const demo = searchParams.get('demo') === '1';

    const [driverId, setDriverId] = useState<string | null>(null);
    const [driverData, setDriverData] = useState<DriverCardData | null>(null);
    const [visible, setVisible] = useState(false);

    // Demo mode
    useEffect(() => {
        if (demo) {
            setDriverId('driver-1');
            setDriverData({
                name: 'Max Verstappen',
                position: 1,
                lapTime: '1:29.432',
                gap: 'LEADER',
                speed: 312,
            });
            setVisible(true);
        }
    }, [demo]);

    // Listen for broadcast state (which driver to feature)
    useEffect(() => {
        if (demo) return;

        // Would subscribe to broadcast:state here
        // For now, just show if driverId in URL
        const urlDriverId = searchParams.get('driverId');
        if (urlDriverId) {
            setDriverId(urlDriverId);
            setVisible(true);
        }
    }, [demo, searchParams]);

    // Get driver telemetry
    useEffect(() => {
        if (demo || !driverId || !sessionId) return;

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
            if (frame.driverId === driverId) {
                setDriverData({
                    name: driverId, // Would come from session info
                    position: frame.position || 0,
                    lapTime: formatLapTime(frame.lastLapTime),
                    gap: frame.gapToLeader !== null ? `+${frame.gapToLeader.toFixed(3)}` : '—',
                    speed: Math.round((frame.speed || 0) * 3.6),
                });
            }
        });

        return () => unsubFrame();
    }, [driverId, sessionId, demo]);

    if (!visible || !driverData) {
        return null;
    }

    return (
        <div className={`lower-third lower-third--${theme}`} data-overlay="lower-third">
            <div className="lower-third__content">
                <div className="lower-third__position">P{driverData.position}</div>
                <div className="lower-third__info">
                    <div className="lower-third__name">{driverData.name}</div>
                    <div className="lower-third__stats">
                        <span className="stat">
                            <label>LAP</label>
                            <value>{driverData.lapTime}</value>
                        </span>
                        <span className="stat">
                            <label>GAP</label>
                            <value>{driverData.gap}</value>
                        </span>
                        <span className="stat">
                            <label>SPEED</label>
                            <value>{driverData.speed} km/h</value>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// =====================================================================
// Types + Helpers
// =====================================================================

interface DriverCardData {
    name: string;
    position: number;
    lapTime: string;
    gap: string;
    speed: number;
}

function formatLapTime(seconds: number | null | undefined): string {
    if (!seconds || seconds <= 0) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(3);
    return mins > 0 ? `${mins}:${secs.padStart(6, '0')}` : secs;
}
