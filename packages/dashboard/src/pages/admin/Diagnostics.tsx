// =====================================================================
// DEV Diagnostics Page
// Admin-only diagnostics console for debugging and support
// =====================================================================

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../stores/auth.store';
import {
    diagnosticsClient,
    type RelayHealthResponse,
    type SessionsResponse,
    type ErrorsResponse,
    type SessionFlowResponse
} from '../../lib/diagnostics-client';

export default function DiagnosticsPage() {
    const { accessToken } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Data state
    const [relayHealth, setRelayHealth] = useState<RelayHealthResponse | null>(null);
    const [sessions, setSessions] = useState<SessionsResponse | null>(null);
    const [errors, setErrors] = useState<ErrorsResponse | null>(null);
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [sessionFlow, setSessionFlow] = useState<SessionFlowResponse | null>(null);

    // Filters
    const [subsystemFilter, setSubsystemFilter] = useState<string>('');

    // Auto-refresh
    const [autoRefresh, setAutoRefresh] = useState(true);

    // Set token on mount
    useEffect(() => {
        if (accessToken) {
            diagnosticsClient.setToken(accessToken);
        }
    }, [accessToken]);

    // Fetch data
    const fetchData = useCallback(async () => {
        try {
            const [healthData, sessionsData, errorsData] = await Promise.all([
                diagnosticsClient.getRelayHealth(),
                diagnosticsClient.getActiveSessions(),
                diagnosticsClient.getRecentErrors(100, subsystemFilter || undefined)
            ]);

            setRelayHealth(healthData);
            setSessions(sessionsData);
            setErrors(errorsData);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch diagnostics');
        } finally {
            setLoading(false);
        }
    }, [subsystemFilter]);

    // Initial fetch
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Auto-refresh every 2 seconds
    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(fetchData, 2000);
        return () => clearInterval(interval);
    }, [autoRefresh, fetchData]);

    // Fetch session flow when session selected
    useEffect(() => {
        if (!selectedSessionId) {
            setSessionFlow(null);
            return;
        }

        diagnosticsClient.getSessionFlow(selectedSessionId)
            .then(setSessionFlow)
            .catch(() => setSessionFlow(null));
    }, [selectedSessionId]);

    // Download support bundle
    const handleDownloadBundle = async () => {
        try {
            const bundle = await diagnosticsClient.generateSupportBundle({
                sessionId: selectedSessionId || undefined,
                includeDbSample: true
            });

            const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `support-bundle-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate bundle');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-slate-400">Loading diagnostics...</div>
            </div>
        );
    }

    if (error && !relayHealth) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <div className="text-red-400">⚠️ {error}</div>
                <p className="text-slate-500 text-sm">
                    Ensure DIAGNOSTICS_ENABLED=true and you have admin:diagnostics capability
                </p>
            </div>
        );
    }

    const dropTotal = errors?.countsBySubsystem['gateway'] || 0;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">🔧 Diagnostics Console</h1>
                    <p className="text-slate-400 mt-1">DEV-only monitoring and support tools</p>
                </div>
                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-slate-400">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                            className="rounded"
                        />
                        Auto-refresh (2s)
                    </label>
                    <button
                        onClick={fetchData}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm"
                    >
                        Refresh
                    </button>
                    <button
                        onClick={handleDownloadBundle}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm"
                    >
                        📦 Download Support Bundle
                    </button>
                </div>
            </div>

            {/* Backpressure Warning */}
            {dropTotal > 0 && (
                <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-4 flex items-center gap-3">
                    <span className="text-yellow-400 text-xl">⚠️</span>
                    <div>
                        <p className="text-yellow-200 font-medium">Telemetry Drops Detected</p>
                        <p className="text-yellow-400 text-sm">
                            {dropTotal} gateway errors recorded. Check relay connections and network.
                        </p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 gap-6">
                {/* Live Connections Panel */}
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                    <h2 className="text-lg font-semibold text-white mb-4">📡 Live Connections</h2>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-400">Total Sockets</span>
                            <span className="text-white font-mono">{relayHealth?.totalConnections ?? 0}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-400">Active Relays</span>
                            <span className="text-green-400 font-mono">{sessions?.runtime.activeRelays ?? 0}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-400">Dashboard Clients</span>
                            <span className="text-blue-400 font-mono">{sessions?.runtime.activeDashboards ?? 0}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-400">Uptime</span>
                            <span className="text-slate-300 font-mono">
                                {sessions ? Math.floor(sessions.runtime.uptimeMs / 60000) : 0}m
                            </span>
                        </div>

                        {relayHealth && relayHealth.relays.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-700">
                                <h3 className="text-sm font-medium text-slate-300 mb-2">Socket Details</h3>
                                <div className="space-y-2 max-h-32 overflow-y-auto">
                                    {relayHealth.relays.map((relay, i) => (
                                        <div key={i} className="text-xs bg-slate-900 rounded p-2">
                                            <code className="text-slate-400">{relay.socketId}</code>
                                            <span className={`ml-2 ${relay.connected ? 'text-green-400' : 'text-red-400'}`}>
                                                {relay.connected ? '●' : '○'}
                                            </span>
                                            {relay.rooms.length > 0 && (
                                                <span className="ml-2 text-slate-500">
                                                    [{relay.rooms.join(', ')}]
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Active Session Flow Panel */}
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                    <h2 className="text-lg font-semibold text-white mb-4">🏎️ Active Session Flow</h2>

                    <select
                        value={selectedSessionId || ''}
                        onChange={(e) => setSelectedSessionId(e.target.value || null)}
                        className="w-full mb-4 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm"
                    >
                        <option value="">Select a session...</option>
                        {sessions?.sessions.map(s => (
                            <option key={s.sessionId} value={s.sessionId}>
                                {s.trackName} ({s.driverCount} drivers) - {s.sessionType}
                            </option>
                        ))}
                    </select>

                    {selectedSessionId && sessionFlow ? (
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-slate-400 block">Track</span>
                                    <span className="text-white">{sessionFlow.session.trackName}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block">Drivers</span>
                                    <span className="text-white">{sessionFlow.session.driverCount}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block">Last Update</span>
                                    <span className="text-slate-300">
                                        {new Date(sessionFlow.session.lastUpdate).toLocaleTimeString()}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block">DB Status</span>
                                    <span className={sessionFlow.flow.dbHealth.status === 'ok' ? 'text-green-400' : 'text-red-400'}>
                                        {sessionFlow.flow.dbHealth.status}
                                    </span>
                                </div>
                            </div>

                            {sessionFlow.errors.length > 0 && (
                                <div className="bg-red-900/20 border border-red-800 rounded p-2 mt-3">
                                    <p className="text-red-400 text-xs">{sessionFlow.errors.length} session errors</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-slate-500 text-sm">
                            {sessions?.sessions.length === 0
                                ? 'No active sessions'
                                : 'Select a session to view flow details'}
                        </p>
                    )}
                </div>
            </div>

            {/* Error Console */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white">🚨 Error Console</h2>
                    <div className="flex items-center gap-3">
                        <select
                            value={subsystemFilter}
                            onChange={(e) => setSubsystemFilter(e.target.value)}
                            className="px-3 py-1 bg-slate-900 border border-slate-700 rounded text-sm text-white"
                        >
                            <option value="">All Subsystems</option>
                            <option value="relay">Relay</option>
                            <option value="gateway">Gateway</option>
                            <option value="ws">WebSocket</option>
                            <option value="db">Database</option>
                            <option value="auth">Auth</option>
                            <option value="api">API</option>
                        </select>
                        <span className="text-slate-500 text-sm">
                            {errors?.count || 0} errors
                        </span>
                    </div>
                </div>

                <div className="bg-slate-900 rounded-lg overflow-hidden">
                    <div className="max-h-64 overflow-y-auto">
                        {errors?.errors.length === 0 ? (
                            <div className="p-4 text-center text-slate-500 text-sm">
                                No errors recorded ✓
                            </div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="bg-slate-800 sticky top-0">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-slate-400 font-medium">Time</th>
                                        <th className="px-3 py-2 text-left text-slate-400 font-medium">Subsystem</th>
                                        <th className="px-3 py-2 text-left text-slate-400 font-medium">Message</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {errors?.errors.map(err => (
                                        <tr key={err.id} className="hover:bg-slate-800/50">
                                            <td className="px-3 py-2 text-slate-500 whitespace-nowrap">
                                                {new Date(err.timestamp).toLocaleTimeString()}
                                            </td>
                                            <td className="px-3 py-2">
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${err.subsystem === 'auth' ? 'bg-purple-900/50 text-purple-300' :
                                                        err.subsystem === 'db' ? 'bg-blue-900/50 text-blue-300' :
                                                            err.subsystem === 'gateway' ? 'bg-yellow-900/50 text-yellow-300' :
                                                                'bg-slate-700 text-slate-300'
                                                    }`}>
                                                    {err.subsystem}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-red-300 truncate max-w-md">
                                                {err.message}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* Error counts by subsystem */}
                {errors && Object.keys(errors.countsBySubsystem).length > 0 && (
                    <div className="flex gap-4 mt-4 pt-4 border-t border-slate-700">
                        {Object.entries(errors.countsBySubsystem).map(([subsystem, count]) => (
                            <div key={subsystem} className="text-center">
                                <div className="text-lg font-mono text-white">{count}</div>
                                <div className="text-xs text-slate-500">{subsystem}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
