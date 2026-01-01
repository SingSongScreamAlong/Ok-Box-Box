'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Session {
    id: string;
    name: string;
    track: string;
    relayConnected: boolean;
    webClients: number;
    createdAt: string;
}

const CLOUD_URL = process.env.NEXT_PUBLIC_CLOUD_URL || 'http://localhost:3000';

export default function HomePage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSessions();
        const interval = setInterval(fetchSessions, 5000);
        return () => clearInterval(interval);
    }, []);

    async function fetchSessions() {
        try {
            const res = await fetch(`${CLOUD_URL}/api/sessions`);
            const data = await res.json();
            setSessions(data.sessions || []);
        } catch (error) {
            console.error('Error fetching sessions:', error);
        } finally {
            setLoading(false);
        }
    }

    async function createSession() {
        try {
            const res = await fetch(`${CLOUD_URL}/api/sessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'New Session' })
            });
            const data = await res.json();
            if (data.session) {
                setSessions(prev => [data.session, ...prev]);
            }
        } catch (error) {
            console.error('Error creating session:', error);
        }
    }

    return (
        <div>
            <header className="header">
                <div className="logo">⚫ BlackBox</div>
                <div className="status">
                    <span className={`status-dot ${sessions.some(s => s.relayConnected) ? 'live' : 'offline'}`}></span>
                    <span>{sessions.some(s => s.relayConnected) ? 'Live' : 'No Active Sessions'}</span>
                </div>
            </header>

            <div className="container" style={{ paddingTop: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h1>Sessions</h1>
                    <button className="btn" onClick={createSession}>+ New Session</button>
                </div>

                {loading ? (
                    <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                        Loading sessions...
                    </div>
                ) : sessions.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                        <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                            No sessions found. Start the Relay app on your iRacing PC to create a session.
                        </p>
                        <button className="btn" onClick={createSession}>Create Test Session</button>
                    </div>
                ) : (
                    <div className="session-list">
                        {sessions.map(session => (
                            <Link key={session.id} href={`/session?id=${session.id}`}>
                                <div className="session-item">
                                    <div>
                                        <div className="session-name">{session.name}</div>
                                        <div className="session-meta">
                                            {session.track || 'Unknown Track'} •
                                            {session.webClients} viewer{session.webClients !== 1 ? 's' : ''}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span className={`status-dot ${session.relayConnected ? 'live' : 'offline'}`}></span>
                                        <span style={{ fontSize: '0.875rem' }}>
                                            {session.relayConnected ? 'LIVE' : 'Offline'}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
