import React, { useEffect, useMemo, useState } from 'react';
import { socketClient } from '../../lib/socket-client';

const TeamPitwall: React.FC = () => {
    const driver = useMemo(() => {
        return {
            driverId: 'me',
            displayName: 'Demo Driver',
            custId: 1185150,
            primaryDiscipline: 'oval',
        };
    }, []);

    const team = useMemo(() => {
        return {
            teamId: 'demo',
            name: 'Demo Team',
        };
    }, []);

    const [isConnected, setIsConnected] = useState(false);
    const [sessionState, setSessionState] = useState<'practice' | 'qual' | 'race' | 'offline'>('offline');
    const [lastUpdateAt, setLastUpdateAt] = useState<number | null>(null);

    useEffect(() => {
        const touch = () => setLastUpdateAt(Date.now());

        socketClient.on('onConnect', () => {
            setIsConnected(true);
            touch();
        });

        socketClient.on('onDisconnect', () => {
            setIsConnected(false);
            setSessionState('offline');
            touch();
        });

        socketClient.on('onSessionActive', (data) => {
            const raw = String(data?.sessionType ?? '').toLowerCase();
            if (raw.includes('qual')) setSessionState('qual');
            else if (raw.includes('race')) setSessionState('race');
            else if (raw.includes('practice')) setSessionState('practice');
            else setSessionState('practice');
            setIsConnected(true);
            touch();
        });

        if (socketClient.getStatus() === 'connected') {
            setIsConnected(true);
            touch();
        }

        socketClient.connect();

        return () => {
            socketClient.off('onConnect');
            socketClient.off('onDisconnect');
            socketClient.off('onSessionActive');
        };
    }, []);

    const statusBadgeClass = isConnected ? 'badge badge-state-active' : 'badge badge-state-warning';
    const sessionBadgeClass = sessionState === 'race'
        ? 'badge badge-state-active'
        : sessionState === 'qual'
            ? 'badge badge-state-warning'
            : sessionState === 'practice'
                ? 'badge badge-state-neutral'
                : 'badge badge-state-warning';

    const lastUpdateLabel = lastUpdateAt ? new Date(lastUpdateAt).toLocaleTimeString() : '—';

    return (
        <div className="min-h-screen bg-[--bg] text-[--text] p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <div className="text-xs uppercase tracking-[0.12em] font-semibold text-[--muted]">Team</div>
                    <h1 className="text-xl font-bold tracking-wide">Pit Wall</h1>
                    <div className="mt-1 text-sm text-[--muted]">{team.name}</div>
                    <div className="text-[10px] uppercase tracking-[0.12em] text-[--muted]" data-preflight-marker="pitwall-skeleton">
                        MVP MINIMAL
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className={statusBadgeClass}>{isConnected ? 'Connected' : 'Disconnected'}</span>
                    <span className={sessionBadgeClass}>{sessionState.toUpperCase()}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="panel p-6 lg:col-span-2">
                    <div className="text-xs uppercase tracking-[0.12em] text-[--muted]">Driver</div>
                    <div className="mt-3 flex items-baseline justify-between">
                        <div className="text-xl font-bold tracking-wide">{driver.displayName}</div>
                        <div className="text-xs font-mono text-[--muted]">#{driver.custId}</div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="panel p-4 bg-[--panel2]">
                            <div className="text-[10px] uppercase tracking-[0.12em] text-[--muted]">Team</div>
                            <div className="mt-1 text-sm font-semibold">{team.name}</div>
                        </div>
                        <div className="panel p-4 bg-[--panel2]">
                            <div className="text-[10px] uppercase tracking-[0.12em] text-[--muted]">Primary</div>
                            <div className="mt-1 text-sm font-semibold">{driver.primaryDiscipline.toUpperCase()}</div>
                        </div>
                    </div>
                </div>

                <div className="panel p-6">
                    <div className="text-xs uppercase tracking-[0.12em] text-[--muted]">Trust Indicators</div>
                    <div className="mt-4 grid gap-3">
                        <div className="panel p-4 bg-[--panel2]">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-[10px] uppercase tracking-[0.12em] text-[--muted]">Connection</div>
                                    <div className="mt-1 text-sm font-semibold">{isConnected ? 'Connected' : 'Disconnected'}</div>
                                </div>
                                <span className={statusBadgeClass}>{isConnected ? 'Active' : 'Offline'}</span>
                            </div>
                        </div>
                        <div className="panel p-4 bg-[--panel2]">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-[10px] uppercase tracking-[0.12em] text-[--muted]">Session</div>
                                    <div className="mt-1 text-sm font-semibold">{sessionState.toUpperCase()}</div>
                                </div>
                                <span className={sessionBadgeClass}>State</span>
                            </div>
                        </div>
                        <div className="panel p-4 bg-[--panel2]">
                            <div className="text-[10px] uppercase tracking-[0.12em] text-[--muted]">Last update</div>
                            <div className="mt-1 font-mono text-sm">{lastUpdateLabel}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeamPitwall;
