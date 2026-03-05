import { useEffect, useState, useCallback, useRef } from 'react';
import { Activity, Wifi, Radio, AlertTriangle, RefreshCw, Play, Download } from 'lucide-react';
import {
  fetchOpsSockets, fetchOpsSessions, fetchOpsEvents, startTrace, fetchTrace, generateSupportPack,
  type OpsSocket, type OpsSession, type OpsEvent,
} from '../../lib/adminService';

type EventTab = 'all' | 'socket' | 'relay' | 'session' | 'error';
type MainTab = 'sockets' | 'sessions' | 'events' | 'trace';

const REFRESH_MS = 10_000;

export function AdminOps() {
  const [mainTab, setMainTab] = useState<MainTab>('sockets');

  // Sockets
  const [sockets, setSockets] = useState<OpsSocket[]>([]);
  const [socketsLoading, setSocketsLoading] = useState(false);

  // Sessions
  const [sessions, setSessions] = useState<OpsSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // Events
  const [eventTab, setEventTab] = useState<EventTab>('all');
  const [events, setEvents] = useState<OpsEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  // Trace
  const [traceSessionId, setTraceSessionId] = useState('');
  const [traceDuration, setTraceDuration] = useState(30);
  const [traceId, setTraceId] = useState<string | null>(null);
  const [traceData, setTraceData] = useState<any>(null);
  const [tracePolling, setTracePolling] = useState(false);
  const traceInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Support pack
  const [packLoading, setPackLoading] = useState(false);
  const [packError, setPackError] = useState<string | null>(null);

  const loadSockets = useCallback(async () => {
    setSocketsLoading(true);
    try {
      const data = await fetchOpsSockets();
      setSockets(data.sockets);
    } catch {}
    finally { setSocketsLoading(false); }
  }, []);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const data = await fetchOpsSessions();
      setSessions(data.sessions);
    } catch {}
    finally { setSessionsLoading(false); }
  }, []);

  const loadEvents = useCallback(async (type: EventTab = eventTab) => {
    setEventsLoading(true);
    try {
      const data = await fetchOpsEvents(type, 200);
      setEvents(data.events);
    } catch {}
    finally { setEventsLoading(false); }
  }, [eventTab]);

  // Load on tab switch
  useEffect(() => {
    if (mainTab === 'sockets') loadSockets();
    if (mainTab === 'sessions') loadSessions();
    if (mainTab === 'events') loadEvents(eventTab);
  }, [mainTab, eventTab]);

  // Auto-refresh sockets + sessions
  useEffect(() => {
    if (mainTab !== 'sockets' && mainTab !== 'sessions') return;
    const fn = mainTab === 'sockets' ? loadSockets : loadSessions;
    const interval = setInterval(fn, REFRESH_MS);
    return () => clearInterval(interval);
  }, [mainTab, loadSockets, loadSessions]);

  // Trace polling
  useEffect(() => {
    if (!traceId || !tracePolling) return;
    const poll = async () => {
      try {
        const data = await fetchTrace(traceId);
        setTraceData(data);
        if (data.isExpired) {
          setTracePolling(false);
          if (traceInterval.current) clearInterval(traceInterval.current);
        }
      } catch {}
    };
    traceInterval.current = setInterval(poll, 3000);
    return () => { if (traceInterval.current) clearInterval(traceInterval.current); };
  }, [traceId, tracePolling]);

  const handleStartTrace = async () => {
    if (!traceSessionId.trim()) return;
    try {
      const result = await startTrace(traceSessionId.trim(), traceDuration);
      setTraceId(result.traceId);
      setTraceData(null);
      setTracePolling(true);
    } catch (e: any) {
      alert(`Trace failed: ${e.message}`);
    }
  };

  const handleDownloadPack = async () => {
    setPackLoading(true);
    setPackError(null);
    try {
      const pack = await generateSupportPack();
      const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `support-pack-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setPackError(e.message);
    } finally {
      setPackLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold uppercase tracking-[0.2em] text-white/90" style={{ fontFamily: 'Orbitron, sans-serif' }}>
          Live Ops
        </h1>
        <button
          onClick={handleDownloadPack}
          disabled={packLoading}
          className="flex items-center gap-2 px-3 py-2 rounded border border-white/[0.08] text-white/40 hover:text-white/70 hover:bg-white/[0.04] text-xs transition-all disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" />
          {packLoading ? 'Generating...' : 'Support Pack'}
        </button>
      </div>

      {packError && <div className="text-xs text-red-400">{packError}</div>}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/[0.06]">
        {([
          { id: 'sockets', label: 'Sockets', icon: Wifi },
          { id: 'sessions', label: 'Sessions', icon: Radio },
          { id: 'events',   label: 'Event Log', icon: Activity },
          { id: 'trace',    label: 'Trace', icon: AlertTriangle },
        ] as { id: MainTab; label: string; icon: any }[]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setMainTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs uppercase tracking-wider border-b-2 -mb-px transition-colors ${
              mainTab === id ? 'text-white/80 border-white/40' : 'text-white/30 border-transparent hover:text-white/50'
            }`}
          >
            <Icon className="w-3 h-3" /> {label}
          </button>
        ))}
      </div>

      {/* Sockets tab */}
      {mainTab === 'sockets' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs text-white/40">{sockets.length} connected</div>
            <button onClick={loadSockets} className="p-1.5 text-white/30 hover:text-white/60"><RefreshCw className="w-3 h-3" /></button>
          </div>
          {socketsLoading && sockets.length === 0 ? (
            <div className="text-xs text-white/20 py-4 text-center">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {['Socket ID', 'Role', 'Surface', 'Rooms', 'Age', 'Last Seen'].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-[10px] uppercase tracking-wider text-white/30 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sockets.length === 0 ? (
                    <tr><td colSpan={6} className="py-6 text-center text-white/20">No active connections</td></tr>
                  ) : sockets.map(s => (
                    <tr key={s.socketId} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="py-2.5 px-3 font-mono text-white/50 text-[10px]">{s.socketId.slice(0, 12)}...</td>
                      <td className="py-2.5 px-3">
                        <RoleBadge role={s.role} />
                      </td>
                      <td className="py-2.5 px-3 text-white/50">{s.surface || '—'}</td>
                      <td className="py-2.5 px-3">
                        <div className="text-white/40">{s.joinedRoomsCount}</div>
                        {s.joinedRooms.length > 0 && (
                          <div className="text-[9px] text-white/20 font-mono truncate max-w-[160px]">{s.joinedRooms[0]}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-white/30">{formatAge(s.ageMs)}</td>
                      <td className="py-2.5 px-3 text-white/30">{formatAge(Date.now() - s.lastSeenMs)}  ago</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Sessions tab */}
      {mainTab === 'sessions' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs text-white/40">{sessions.length} sessions</div>
            <button onClick={loadSessions} className="p-1.5 text-white/30 hover:text-white/60"><RefreshCw className="w-3 h-3" /></button>
          </div>
          {sessionsLoading && sessions.length === 0 ? (
            <div className="text-xs text-white/20 py-4 text-center">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {['Session', 'State', 'Drivers', 'Frames', 'Drops', 'Errors', 'Age', 'Last Frame'].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-[10px] uppercase tracking-wider text-white/30 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sessions.length === 0 ? (
                    <tr><td colSpan={8} className="py-6 text-center text-white/20">No sessions</td></tr>
                  ) : sessions.map(s => (
                    <tr key={s.sessionId} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="py-2.5 px-3 font-mono text-white/50 text-[10px]">{s.sessionId}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] ${s.state === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-white/30'}`}>
                          {s.state}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-cyan-400">{s.driverCount}</td>
                      <td className="py-2.5 px-3 text-white/60">{s.rates.total.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-yellow-400">{s.drops}</td>
                      <td className="py-2.5 px-3 text-red-400">{s.errors}</td>
                      <td className="py-2.5 px-3 text-white/30">{formatAge(s.ageMs)}</td>
                      <td className="py-2.5 px-3 text-white/20">{formatAge(s.lastFrameAgeMs)} ago</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Events tab */}
      {mainTab === 'events' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {(['all', 'socket', 'relay', 'session', 'error'] as EventTab[]).map(t => (
                <button
                  key={t}
                  onClick={() => { setEventTab(t); loadEvents(t); }}
                  className={`px-3 py-1.5 text-[10px] uppercase tracking-wider rounded transition-colors ${
                    eventTab === t ? 'bg-white/[0.08] text-white/80' : 'text-white/30 hover:text-white/60'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <button onClick={() => loadEvents(eventTab)} className="ml-auto p-1.5 text-white/30 hover:text-white/60">
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
          {eventsLoading && events.length === 0 ? (
            <div className="text-xs text-white/20 py-4 text-center">Loading...</div>
          ) : (
            <div className="space-y-px max-h-[500px] overflow-y-auto">
              {events.length === 0 ? (
                <div className="text-xs text-white/20 py-6 text-center">No events</div>
              ) : events.map((ev, i) => (
                <div key={i} className="flex items-start gap-3 py-1.5 px-3 hover:bg-white/[0.02] border-b border-white/[0.03]">
                  <span className="text-[10px] text-white/20 font-mono w-24 flex-shrink-0">
                    {new Date(ev.timestamp).toLocaleTimeString()}
                  </span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded flex-shrink-0 ${
                    ev.type?.toString().includes('error') || ev.type?.toString().includes('drop') ? 'bg-red-500/10 text-red-400'
                    : ev.type?.toString().includes('drift') ? 'bg-yellow-500/10 text-yellow-400'
                    : 'bg-white/5 text-white/40'
                  }`}>{ev.type || 'unknown'}</span>
                  {ev.sessionId && <span className="text-[10px] text-white/20 font-mono">{String(ev.sessionId)}</span>}
                  {(ev as any).reason && <span className="text-[10px] text-white/30">{String((ev as any).reason)}</span>}
                  {(ev as any).driftMs != null && <span className="text-[10px] text-yellow-400/60">{(ev as any).driftMs}ms drift</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Trace tab */}
      {mainTab === 'trace' && (
        <div className="space-y-6">
          <div className="bg-white/[0.03] border border-white/[0.08] rounded p-5">
            <h2 className="text-xs uppercase tracking-wider text-white/50 mb-4 flex items-center gap-2">
              <Play className="w-3.5 h-3.5" /> Start Session Trace
            </h2>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1.5">Session ID</label>
                <input
                  type="text"
                  value={traceSessionId}
                  onChange={e => setTraceSessionId(e.target.value)}
                  className="input w-full text-sm font-mono"
                  placeholder="session-abc123..."
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1.5">Duration (seconds)</label>
                <input
                  type="number"
                  value={traceDuration}
                  onChange={e => setTraceDuration(Math.min(300, Math.max(10, Number(e.target.value))))}
                  className="input w-full text-sm"
                  min={10}
                  max={300}
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleStartTrace}
                  disabled={!traceSessionId.trim() || tracePolling}
                  className="w-full px-4 py-2 bg-white/[0.04] border border-white/[0.08] text-white/60 hover:text-white/90 hover:bg-white/[0.08] rounded text-xs uppercase tracking-wider transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  <Play className="w-3 h-3" />
                  {tracePolling ? 'Tracing...' : 'Start Trace'}
                </button>
              </div>
            </div>
          </div>

          {traceId && (
            <div className="bg-white/[0.03] border border-white/[0.07] rounded p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/50">Trace <span className="font-mono text-white/70">{traceId}</span></span>
                {tracePolling && <span className="text-[10px] text-cyan-400 animate-pulse">● Collecting</span>}
                {traceData?.isExpired && <span className="text-[10px] text-white/30">Completed</span>}
              </div>
              {traceData && (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-[10px] text-white/30 mb-1">Relay Events</div>
                    <div className="text-white/70">{traceData.events?.relay?.length ?? 0}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-white/30 mb-1">Session Events</div>
                    <div className="text-white/70">{traceData.events?.session?.length ?? 0}</div>
                  </div>
                </div>
              )}
              {traceData?.isExpired && traceData.events && (
                <details>
                  <summary className="text-[10px] text-white/30 cursor-pointer select-none py-1">View raw trace data</summary>
                  <pre className="mt-2 text-[10px] font-mono text-white/40 bg-black/30 rounded p-3 overflow-x-auto max-h-48">
                    {JSON.stringify(traceData.events, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    relay: 'bg-purple-500/10 text-purple-400',
    viewer: 'bg-cyan-500/10 text-cyan-400',
    driver: 'bg-emerald-500/10 text-emerald-400',
    admin:  'bg-red-500/10 text-red-400',
  };
  const c = colors[role?.toLowerCase()] || 'bg-white/5 text-white/40';
  return <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${c}`}>{role || '—'}</span>;
}

function formatAge(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}
