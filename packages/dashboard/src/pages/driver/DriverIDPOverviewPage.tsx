import { useEffect, useState } from 'react';
import { fetchMyDriverProfile, type DriverIdentityProfile } from '../../services/driver/driver.service';
import { socketClient } from '../../lib/socket-client';

type RelayStatus = 'connected' | 'connecting' | 'disconnected';
type VoiceStatus = 'ready' | 'listening' | 'processing' | 'muted';
type AIStatus = 'ready' | 'busy' | 'unavailable';
type SessionType = 'practice' | 'qualifying' | 'race' | 'offline';

interface DriverStatusSnapshot {
    relay: RelayStatus;
    voice: VoiceStatus;
    ai: AIStatus;
    session: SessionType;
}

export function DriverIDPOverviewPage() {
    const [profile, setProfile] = useState<DriverIdentityProfile | null>(null);
    const [status, setStatus] = useState<DriverStatusSnapshot>({
        relay: 'disconnected',
        voice: 'ready',
        ai: 'ready',
        session: 'offline',
    });

    useEffect(() => {
        let active = true;
        fetchMyDriverProfile().then((p) => {
            if (active) setProfile(p);
        });
        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        socketClient.on('onConnect', () => {
            setStatus((prev) => ({ ...prev, relay: 'connected' }));
        });

        socketClient.on('onDisconnect', () => {
            setStatus((prev) => ({ ...prev, relay: 'disconnected' }));
        });

        socketClient.on('onSessionActive', (data) => {
            const sessionType = data.sessionType?.toLowerCase() || 'practice';
            let mapped: SessionType = 'practice';
            if (sessionType.includes('qual')) mapped = 'qualifying';
            else if (sessionType.includes('race')) mapped = 'race';
            else if (sessionType.includes('practice')) mapped = 'practice';

            setStatus((prev) => ({ ...prev, session: mapped, relay: 'connected' }));
        });

        socketClient.on('voice:response', () => {
            setStatus((prev) => ({ ...prev, voice: 'ready', ai: 'ready' }));
        });

        if (socketClient.getStatus() === 'connected') {
            setStatus((prev) => ({ ...prev, relay: 'connected' }));
        }

        socketClient.connect();

        return () => {
            socketClient.off('onConnect');
            socketClient.off('onDisconnect');
            socketClient.off('onSessionActive');
            socketClient.off('voice:response');
        };
    }, []);

    const statusDot = (s: string) => {
        const base = 'inline-block w-2 h-2 rounded-full';
        if (s === 'connected' || s === 'ready' || s === 'race' || s === 'practice') return `${base} bg-[--state-success]`;
        if (s === 'connecting' || s === 'listening' || s === 'processing' || s === 'qualifying') return `${base} bg-[--state-warning]`;
        if (s === 'disconnected' || s === 'unavailable' || s === 'muted' || s === 'offline') return `${base} bg-[--danger]`;
        return `${base} bg-[--muted]`;
    };

    if (!profile) {
        return (
            <div className="panel p-6">
                <div className="text-xs uppercase tracking-[0.12em] text-[--muted]">Driver</div>
                <div className="mt-2 text-sm">Loading IDP…</div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="panel p-6 lg:col-span-3">
                <div className="text-xs uppercase tracking-[0.12em] text-[--muted]">Status</div>
                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="panel p-4 bg-[--panel2]">
                        <div className="flex items-center justify-between">
                            <div className="text-[10px] uppercase tracking-[0.12em] text-[--muted]">Relay</div>
                            <span className={statusDot(status.relay)} />
                        </div>
                        <div className="mt-2 text-sm font-mono uppercase">{status.relay}</div>
                    </div>
                    <div className="panel p-4 bg-[--panel2]">
                        <div className="flex items-center justify-between">
                            <div className="text-[10px] uppercase tracking-[0.12em] text-[--muted]">Voice</div>
                            <span className={statusDot(status.voice)} />
                        </div>
                        <div className="mt-2 text-sm font-mono uppercase">{status.voice}</div>
                    </div>
                    <div className="panel p-4 bg-[--panel2]">
                        <div className="flex items-center justify-between">
                            <div className="text-[10px] uppercase tracking-[0.12em] text-[--muted]">AI</div>
                            <span className={statusDot(status.ai)} />
                        </div>
                        <div className="mt-2 text-sm font-mono uppercase">{status.ai}</div>
                    </div>
                    <div className="panel p-4 bg-[--panel2]">
                        <div className="flex items-center justify-between">
                            <div className="text-[10px] uppercase tracking-[0.12em] text-[--muted]">Session</div>
                            <span className={statusDot(status.session)} />
                        </div>
                        <div className="mt-2 text-sm font-mono uppercase">{status.session}</div>
                    </div>
                </div>
            </div>

            <div className="panel p-6 lg:col-span-2">
                <div className="text-xs uppercase tracking-[0.12em] text-[--muted]">Identity</div>
                <div className="mt-2 flex items-baseline justify-between">
                    <div className="text-xl font-bold">{profile.displayName}</div>
                    <div className="text-xs font-mono text-[--muted]">#{profile.custId ?? '—'}</div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="panel p-4 bg-[--panel2]">
                        <div className="text-[10px] uppercase tracking-[0.12em] text-[--muted]">Primary</div>
                        <div className="mt-1 text-sm font-semibold">{profile.primaryDiscipline ?? '—'}</div>
                    </div>
                    <div className="panel p-4 bg-[--panel2]">
                        <div className="text-[10px] uppercase tracking-[0.12em] text-[--muted]">Timezone</div>
                        <div className="mt-1 text-sm font-semibold">{profile.timezone ?? '—'}</div>
                    </div>
                    <div className="panel p-4 bg-[--panel2]">
                        <div className="text-[10px] uppercase tracking-[0.12em] text-[--muted]">Safety</div>
                        <div className="mt-1 text-sm font-semibold">{profile.safetyRatingOverall?.toFixed(2) ?? '—'}</div>
                    </div>
                    <div className="panel p-4 bg-[--panel2]">
                        <div className="text-[10px] uppercase tracking-[0.12em] text-[--muted]">iRating</div>
                        <div className="mt-1 text-sm font-semibold">{profile.iRatingOverall ?? '—'}</div>
                    </div>
                </div>
            </div>

            <div className="panel p-6">
                <div className="text-xs uppercase tracking-[0.12em] text-[--muted]">Licensing</div>
                <div className="mt-3 grid gap-2">
                    {profile.licenses.map((l) => (
                        <div key={l.discipline} className="panel p-3 bg-[--panel2] flex items-center justify-between">
                            <div>
                                <div className="text-[10px] uppercase tracking-[0.12em] text-[--muted]">{l.discipline}</div>
                                <div className="mt-1 text-sm font-semibold">{l.licenseClass}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs font-mono">SR {l.safetyRating.toFixed(2)}</div>
                                <div className="text-xs font-mono text-[--muted]">iR {l.iRating ?? '—'}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
