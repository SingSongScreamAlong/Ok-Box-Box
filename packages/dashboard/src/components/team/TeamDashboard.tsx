/**
 * Team Dashboard
 * 
 * Main layout for pit wall / strategist view.
 * "Trust First, Verify on Demand" — decisions visible, evidence on click.
 * 
 * Layout:
 * ┌───────────────┬───────────────────────────────┐
 * │ RACE STATE    │ STRATEGY TIMELINE              │
 * ├───────────────┼───────────────────────────────┤
 * │ CAR STATUS    │ OPPONENT INTELLIGENCE          │
 * ├───────────────┴───────────────────────────────┤
 * │ EVENT LOG                                      │
 * └───────────────────────────────────────────────┘
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionSocket } from '../../hooks/useSessionSocket';
import { RaceStatePane } from './RaceStatePane';
import { CarStatusPane } from './CarStatusPane';
import { OpponentIntelPane } from './OpponentIntelPane';
import { EventLog } from './EventLog';
import type {
    RaceStateData,
    CarStatusData,
    OpponentIntelCard,
    EventLogEntry
} from '../../types/evidence';
import './TeamDashboard.css';

interface TeamDashboardProps {
    sessionId: string;
}

export const TeamDashboard: React.FC<TeamDashboardProps> = ({ sessionId }) => {
    const { socket, isConnected } = useSessionSocket(sessionId);
    const navigate = useNavigate();

    // State for all panes
    const [raceState, setRaceState] = useState<RaceStateData | null>(null);
    const [carStatus, setCarStatus] = useState<CarStatusData | null>(null);
    const [opponents, setOpponents] = useState<OpponentIntelCard[]>([]);
    const [events, setEvents] = useState<EventLogEntry[]>([]);

    useEffect(() => {
        if (!socket) return;

        // Race state updates
        socket.on('race:state', (data: RaceStateData) => {
            setRaceState(data);
        });

        // Timing updates from relay telemetry
        socket.on('timing:update', (data: any) => {
            console.log('[TeamDashboard] timing:update received', data);
            // Map timing data to race state format
            if (data.timing?.entries?.length > 0) {
                const entry = data.timing.entries[0];
                setRaceState(prev => ({
                    ...prev,
                    sessionTime: data.sessionTimeMs ? `${Math.floor(data.sessionTimeMs / 60000)}:${String(Math.floor((data.sessionTimeMs % 60000) / 1000)).padStart(2, '0')}` : prev?.sessionTime || '0:00',
                    position: entry.position || prev?.position || 0,
                    lap: entry.lapNumber || prev?.lap || 0,
                    gap: prev?.gap || '+0.0s',
                    status: 'green',
                }));
            }
        });

        // Auto-redirect if we are on "live" and receive an active session ID
        socket.on('session:active', (data: { sessionId: string }) => {
            if (sessionId === 'live' && data.sessionId) {
                console.log('Redirecting to active session:', data.sessionId);
                navigate(`/team/${data.sessionId}`, { replace: true });
            }
        });

        // Car status updates (from strategy service)
        socket.on('car:status', (data: CarStatusData) => {
            setCarStatus(data);
        });

        // Opponent intelligence updates
        socket.on('opponent:intel', (data: { opponents: OpponentIntelCard[] }) => {
            setOpponents(data.opponents);
        });

        // Event log updates
        socket.on('event:log', (data: EventLogEntry) => {
            setEvents(prev => [data, ...prev].slice(0, 50)); // Keep last 50
        });

        // Strategy updates (map to car status)
        socket.on('strategy:update', (data: any) => {
            if (data.strategy && data.strategy[0]) {
                const s = data.strategy[0];
                setCarStatus(prevStatus => ({
                    ...prevStatus,
                    fuel: {
                        level: s.fuel?.level || 0,
                        percentage: s.fuel?.pct || 0,
                        lapsRemaining: null, // Calculate from service
                        status: getFuelStatus(s.fuel?.pct || 0),
                    },
                    tires: {
                        wear: s.tires || { fl: 1, fr: 1, rl: 1, rr: 1 },
                        temps: s.tireTemps ? {
                            fl: (s.tireTemps.fl.l + s.tireTemps.fl.m + s.tireTemps.fl.r) / 3,
                            fr: (s.tireTemps.fr.l + s.tireTemps.fr.m + s.tireTemps.fr.r) / 3,
                            rl: (s.tireTemps.rl.l + s.tireTemps.rl.m + s.tireTemps.rl.r) / 3,
                            rr: (s.tireTemps.rr.l + s.tireTemps.rr.m + s.tireTemps.rr.r) / 3,
                        } : { fl: 0, fr: 0, rl: 0, rr: 0 },
                        status: getTireStatus(s.tires),
                    },
                    damage: {
                        aero: s.damage?.aero || 0,
                        engine: s.damage?.engine || 0,
                        status: getDamageStatus(s.damage),
                    },
                    stint: prevStatus?.stint || {
                        currentLap: 0,
                        avgPace: null,
                        degradationSlope: null,
                    }
                } as CarStatusData));
            }
        });

        return () => {
            socket.off('race:state');
            socket.off('car:status');
            socket.off('opponent:intel');
            socket.off('event:log');
            socket.off('strategy:update');
        };
    }, [socket]);

    if (!isConnected) {
        return (
            <div className="team-dashboard disconnected">
                <div className="disconnect-message">
                    <span className="disconnect-icon">⚠️</span>
                    <span>Connecting to session...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="team-dashboard">
            {/* Top Row */}
            <div className="dashboard-row top-row">
                <div className="pane race-state-container">
                    <RaceStatePane data={raceState} />
                </div>
                <div className="pane timeline-container">
                    {/* Strategy Timeline placeholder */}
                    <div className="timeline-placeholder">
                        <span>Strategy Timeline</span>
                        <span className="placeholder-hint">Pit windows • Fuel • Tire cliffs</span>
                    </div>
                </div>
            </div>

            {/* Middle Row */}
            <div className="dashboard-row middle-row">
                <div className="pane car-status-container">
                    <CarStatusPane data={carStatus} />
                </div>
                <div className="pane opponent-container">
                    <OpponentIntelPane opponents={opponents} />
                </div>
            </div>

            {/* Bottom Row */}
            <div className="dashboard-row bottom-row">
                <div className="pane event-log-container">
                    <EventLog events={events} />
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// HELPERS
// ============================================================================

function getFuelStatus(pct: number): 'green' | 'yellow' | 'red' | 'gray' {
    if (pct > 0.3) return 'green';
    if (pct > 0.15) return 'yellow';
    if (pct > 0) return 'red';
    return 'gray';
}

function getTireStatus(tires?: { fl: number; fr: number; rl: number; rr: number }): 'green' | 'yellow' | 'red' | 'gray' {
    if (!tires) return 'gray';
    const min = Math.min(tires.fl, tires.fr, tires.rl, tires.rr);
    if (min > 0.5) return 'green';
    if (min > 0.25) return 'yellow';
    return 'red';
}

function getDamageStatus(damage?: { aero: number; engine: number }): 'green' | 'yellow' | 'red' | 'gray' {
    if (!damage) return 'gray';
    const max = Math.max(damage.aero, damage.engine);
    if (max === 0) return 'green';
    if (max < 0.3) return 'yellow';
    return 'red';
}

export default TeamDashboard;
