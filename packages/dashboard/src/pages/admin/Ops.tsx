// =====================================================================
// Admin Ops Page
// Dev-only operations monitoring dashboard
// =====================================================================

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../lib/auth-context';
import './Ops.css';

// =====================================================================
// Types
// =====================================================================

interface OpsSummary {
    build: {
        gitSha?: string;
        version: string;
        environment: string;
    };
    uptime: {
        startedAt: number;
        uptimeMs: number;
        uptimeFormatted: string;
    };
    sessions: {
        active: number;
        details: Array<{
            sessionId: string;
            trackName: string;
            driverCount: number;
            ageMs: number;
        }>;
    };
    sockets: {
        activeConnections: number;
        totalConnects: number;
        totalDisconnects: number;
        byRole: Record<string, number>;
        bySurface: Record<string, number>;
    };
    relay: {
        totalFrames: number;
        totalDrops: number;
        activeSessions: number;
        ingestRate: number;
        ingestRates: {
            total: number;
            byStream: Record<string, number>;
        };
    };
    errors: {
        last10mCount: number;
        bySubsystem: Record<string, number>;
    };
    timestamp: number;
}

interface OpsEvent {
    id: string;
    type: string;
    timestamp: number;
    sessionId?: string;
    socketId?: string;
    reason?: string;
    message?: string;
}

interface SessionDetail {
    sessionId: string;
    state: string;
    driverCount: number;
    createdAt: number;
    lastFrameAt: number;
    ageMs: number;
    lastFrameAgeMs: number;
    rates: { baseline: number; controls: number; total: number };
    drops: number;
    errors: number;
}

// =====================================================================
// Component
// =====================================================================

export function OpsPage() {
    const { claims, hasCap } = useAuth();
    const hasAccess = hasCap('admin:ops') || claims?.role === 'admin';

    const [summary, setSummary] = useState<OpsSummary | null>(null);
    const [sessions, setSessions] = useState<SessionDetail[]>([]);
    const [events, setEvents] = useState<OpsEvent[]>([]);
    const [eventType, setEventType] = useState<'socket' | 'relay' | 'session' | 'error'>('error');
    const [selectedSession, setSelectedSession] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [traceId, setTraceId] = useState<string | null>(null);

    // Check env flag
    const [opsEnabled, setOpsEnabled] = useState<boolean | null>(null);

    // Fetch summary
    const fetchSummary = useCallback(async () => {
        try {
            const res = await fetch('/api/ops/summary', {
                headers: { 'Authorization': `Bearer ${claims?.token || ''}` }
            });

            if (res.status === 404) {
                setOpsEnabled(false);
                return;
            }

            setOpsEnabled(true);

            if (!res.ok) throw new Error('Failed to fetch summary');

            const data = await res.json();
            setSummary(data.data);
            setError(null);
        } catch (err) {
            setError((err as Error).message);
        }
    }, [claims]);

    // Fetch sessions
    const fetchSessions = useCallback(async () => {
        try {
            const res = await fetch('/api/ops/sessions', {
                headers: { 'Authorization': `Bearer ${claims?.token || ''}` }
            });
            if (!res.ok) return;
            const data = await res.json();
            setSessions(data.data.sessions);
        } catch {
            // Silent fail
        }
    }, [claims]);

    // Fetch events
    const fetchEvents = useCallback(async () => {
        try {
            const url = selectedSession
                ? `/api/ops/events?type=${eventType}&sessionId=${selectedSession}&limit=100`
                : `/api/ops/events?type=${eventType}&limit=100`;

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${claims?.token || ''}` }
            });
            if (!res.ok) return;
            const data = await res.json();
            setEvents(data.data.events);
        } catch {
            // Silent fail
        }
    }, [claims, eventType, selectedSession]);

    // Start trace
    const startTrace = useCallback(async (sessionId: string) => {
        try {
            const res = await fetch('/api/ops/trace/start', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${claims?.token || ''}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ sessionId, durationSec: 30 })
            });
            if (!res.ok) throw new Error('Failed to start trace');
            const data = await res.json();
            setTraceId(data.data.traceId);
            alert(`Trace started: ${data.data.traceId}`);
        } catch (err) {
            alert(`Error: ${(err as Error).message}`);
        }
    }, [claims]);

    // Export support pack
    const exportSupportPack = useCallback(async (sessionId?: string) => {
        try {
            const res = await fetch('/api/ops/support-pack', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${claims?.token || ''}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ sessionId, traceId, includeConfig: true })
            });
            if (!res.ok) throw new Error('Failed to generate support pack');
            const data = await res.json();

            // Download as JSON
            const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `support-pack-${data.data.packId}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            alert(`Error: ${(err as Error).message}`);
        }
    }, [claims, traceId]);

    // Initial fetch and polling
    useEffect(() => {
        if (!hasAccess) return;

        fetchSummary();
        fetchSessions();
        setLoading(false);

        const interval = setInterval(() => {
            fetchSummary();
            fetchSessions();
        }, 2000);

        return () => clearInterval(interval);
    }, [hasAccess, fetchSummary, fetchSessions]);

    // Fetch events when type or session changes
    useEffect(() => {
        if (!hasAccess || !opsEnabled) return;
        fetchEvents();
        const interval = setInterval(fetchEvents, 3000);
        return () => clearInterval(interval);
    }, [hasAccess, opsEnabled, fetchEvents]);

    // =====================================================================
    // Render
    // =====================================================================

    if (!hasAccess) {
        return (
            <div className="ops-page ops-page--unauthorized">
                <h1>🔒 Access Denied</h1>
                <p>Requires admin role and admin:ops capability.</p>
            </div>
        );
    }

    if (opsEnabled === false) {
        return (
            <div className="ops-page ops-page--disabled">
                <h1>⚠️ OPS UI DISABLED</h1>
                <p>Set OPS_UI_ENABLED=1 environment variable to enable.</p>
            </div>
        );
    }

    if (loading) {
        return <div className="ops-page"><p>Loading...</p></div>;
    }

    return (
        <div className="ops-page">
            <header className="ops-header">
                <h1>🔧 Operations Dashboard</h1>
                <div className="ops-header__actions">
                    <button onClick={() => exportSupportPack()}>
                        📦 Export Support Pack
                    </button>
                </div>
            </header>

            {error && <div className="ops-error">{error}</div>}

            {/* Safety Notice */}
            <div className="ops-notice">
                ⚠️ All fields redacted. Do not paste raw tokens or PII.
            </div>

            {/* Summary Panel */}
            {summary && (
                <section className="ops-section ops-summary">
                    <h2>System Summary</h2>
                    <div className="ops-grid">
                        <div className="ops-card">
                            <h3>Build</h3>
                            <p>SHA: <code>{summary.build.gitSha || 'unknown'}</code></p>
                            <p>Version: {summary.build.version}</p>
                            <p>Env: {summary.build.environment}</p>
                        </div>
                        <div className="ops-card">
                            <h3>Uptime</h3>
                            <p className="ops-big-number">{summary.uptime.uptimeFormatted}</p>
                        </div>
                        <div className="ops-card">
                            <h3>Sessions</h3>
                            <p className="ops-big-number">{summary.sessions.active}</p>
                        </div>
                        <div className="ops-card">
                            <h3>Connections</h3>
                            <p className="ops-big-number">{summary.sockets.activeConnections}</p>
                            <p className="ops-detail">
                                {Object.entries(summary.sockets.byRole).map(([role, count]) => (
                                    <span key={role}>{role}: {count} </span>
                                ))}
                            </p>
                        </div>
                        <div className="ops-card">
                            <h3>Ingest Rate</h3>
                            <p className="ops-big-number">{summary.relay.ingestRates.total.toFixed(1)} fps</p>
                            <p className="ops-detail">
                                Drops: {summary.relay.totalDrops}
                            </p>
                        </div>
                        <div className="ops-card ops-card--errors">
                            <h3>Errors (10m)</h3>
                            <p className="ops-big-number">{summary.errors.last10mCount}</p>
                        </div>
                    </div>
                </section>
            )}

            {/* Sessions Table */}
            <section className="ops-section">
                <h2>Active Sessions ({sessions.length})</h2>
                <table className="ops-table">
                    <thead>
                        <tr>
                            <th>Session ID</th>
                            <th>State</th>
                            <th>Drivers</th>
                            <th>Last Frame</th>
                            <th>Total Frames</th>
                            <th>Drops</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sessions.map(s => (
                            <tr key={s.sessionId} className={selectedSession === s.sessionId ? 'selected' : ''}>
                                <td><code>{s.sessionId}</code></td>
                                <td>{s.state}</td>
                                <td>{s.driverCount}</td>
                                <td>{formatAge(s.lastFrameAgeMs)}</td>
                                <td>{s.rates.total}</td>
                                <td className={s.drops > 0 ? 'warning' : ''}>{s.drops}</td>
                                <td>
                                    <button onClick={() => setSelectedSession(s.sessionId)}>
                                        🔍
                                    </button>
                                    <button onClick={() => startTrace(s.sessionId)}>
                                        📍 Trace
                                    </button>
                                    <button onClick={() => exportSupportPack(s.sessionId)}>
                                        📦
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {sessions.length === 0 && (
                            <tr><td colSpan={7}>No active sessions</td></tr>
                        )}
                    </tbody>
                </table>
            </section>

            {/* Events Viewer */}
            <section className="ops-section">
                <h2>Events</h2>
                <div className="ops-tabs">
                    {(['error', 'socket', 'relay', 'session'] as const).map(type => (
                        <button
                            key={type}
                            className={eventType === type ? 'active' : ''}
                            onClick={() => setEventType(type)}
                        >
                            {type}
                        </button>
                    ))}
                    {selectedSession && (
                        <span className="ops-filter">
                            Filtering: {selectedSession}
                            <button onClick={() => setSelectedSession(null)}>✕</button>
                        </span>
                    )}
                </div>
                <div className="ops-events">
                    {events.slice(0, 50).map(e => (
                        <div key={e.id} className={`ops-event ops-event--${e.type}`}>
                            <span className="ops-event__time">
                                {new Date(e.timestamp).toLocaleTimeString()}
                            </span>
                            <span className="ops-event__type">{e.type}</span>
                            {e.sessionId && <code className="ops-event__session">{e.sessionId}</code>}
                            {e.socketId && <code className="ops-event__socket">{e.socketId}</code>}
                            {e.reason && <span className="ops-event__reason">{e.reason}</span>}
                            {e.message && <span className="ops-event__message">{e.message}</span>}
                        </div>
                    ))}
                    {events.length === 0 && <p>No events</p>}
                </div>
            </section>

            {/* Trace Info */}
            {traceId && (
                <section className="ops-section">
                    <h2>Active Trace</h2>
                    <p>Trace ID: <code>{traceId}</code></p>
                </section>
            )}
        </div>
    );
}

// =====================================================================
// Helpers
// =====================================================================

function formatAge(ms: number): string {
    if (ms < 1000) return 'just now';
    if (ms < 60000) return `${Math.floor(ms / 1000)}s ago`;
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`;
    return `${Math.floor(ms / 3600000)}h ago`;
}

export default OpsPage;
