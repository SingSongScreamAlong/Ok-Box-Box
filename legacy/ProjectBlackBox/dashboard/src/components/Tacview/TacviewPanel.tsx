import React, { useMemo, useRef, useState } from 'react';
import TacviewCanvas from './TacviewCanvas';
import { PlaybackState, Sample } from './types';
import './styles.css';
import BackendClient, { type Session } from '../../services/BackendClient';
import { io, Socket } from 'socket.io-client';

const TacviewPanel: React.FC = () => {
  const [playback, setPlayback] = useState<PlaybackState>({
    playing: true,
    rate: 1.0,
    t0: Date.now(),
    tMs: 0,
  });
  const [samplesByDriver, setSamplesByDriver] = useState<Record<string, Sample[]> | null>(null);
  const [sessionDurationMs, setSessionDurationMs] = useState<number>(100000);
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [pickerFocusIdx, setPickerFocusIdx] = useState<number>(0);
  const modalContentRef = useRef<HTMLDivElement | null>(null);
  const [showPicker, setShowPicker] = useState<boolean>(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [live, setLive] = useState<boolean>(false);
  const [connecting, setConnecting] = useState<boolean>(false);
  const telemetryBufferRef = useRef<any[]>([]);
  const rafIdRef = useRef<number | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [nextRetryInMs, setNextRetryInMs] = useState<number>(0);
  const retryTimerRef = useRef<number | null>(null);

  const rates = useMemo(() => [0.25, 0.5, 1, 2, 4], []);

  // Restore persisted UI prefs
  React.useEffect(() => {
    try {
      const savedLive = localStorage.getItem('tacview.live');
      if (savedLive != null) setLive(savedLive === '1');
      const savedSession = localStorage.getItem('tacview.selectedSessionId');
      if (savedSession) setSelectedSessionId(savedSession);
    } catch { }
  }, []);

  // Persist changes
  React.useEffect(() => {
    try { localStorage.setItem('tacview.live', live ? '1' : '0'); } catch { }
  }, [live]);
  React.useEffect(() => {
    try {
      if (selectedSessionId) localStorage.setItem('tacview.selectedSessionId', selectedSessionId);
    } catch { }
  }, [selectedSessionId]);

  const handleExport = () => {
    try {
      const payload = {
        exportedAt: new Date().toISOString(),
        sessionId: selectedSessionId,
        durationMs: sessionDurationMs,
        samplesByDriver,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tacview-${selectedSessionId || 'session'}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      setError('Failed to export telemetry.');
    }
  };

  const handleExportCSV = () => {
    try {
      if (!samplesByDriver) return;
      const rows: string[] = [];
      const header = [
        'driverId', 'tsMs', 'x', 'y', 'z', 'speed', 'throttle', 'brake', 'gear', 'rpm', 'lap', 'sector'
      ];
      rows.push(header.join(','));
      for (const [driverId, list] of Object.entries(samplesByDriver)) {
        for (const s of list) {
          rows.push([
            driverId,
            String(s.tsMs ?? ''),
            String(s.pos?.x ?? ''),
            String(s.pos?.y ?? ''),
            String(s.pos?.z ?? ''),
            String(s.speed ?? ''),
            String(s.throttle ?? ''),
            String(s.brake ?? ''),
            String(s.gear ?? ''),
            String(s.rpm ?? ''),
            String(s.lap ?? ''),
            String(s.sector ?? ''),
          ].join(','));
        }
      }
      // Prepend UTF-8 BOM for better Excel compatibility
      const csv = '\ufeff' + rows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tacview-${selectedSessionId || 'session'}-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      setError('Failed to export CSV.');
    }
  };

  React.useEffect(() => {
    if (showPicker && modalContentRef.current) {
      modalContentRef.current.focus();
    }
  }, [showPicker]);

  const formatMs = (ms: number) => {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Socket.IO for live updates
  const socketRef = useRef<Socket | null>(null);

  React.useEffect(() => {
    if (!live) {
      // clean up if turning off live
      try {
        socketRef.current?.disconnect();
      } catch { }
      socketRef.current = null;
      setConnecting(false);
      setRetryCount(0);
      setNextRetryInMs(0);
      if (retryTimerRef.current != null) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      return;
    }
    if (!selectedSessionId) {
      // Require a session to stream live
      return;
    }

    // Connect to backend Socket.IO
    const baseUrl = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000').replace(/\/$/, '');
    setConnecting(true);
    const sock = io(baseUrl, { transports: ['websocket'], autoConnect: true });
    socketRef.current = sock;

    const flushBufferedTelemetry = () => {
      const buf = telemetryBufferRef.current;
      telemetryBufferRef.current = [];
      if (!buf.length) return;
      // Map to Sample and append
      const mapped: Sample[] = buf.map((t) => ({
        tsMs: t.timestamp,
        driverId: t.driverId || 'unknown',
        pos: { x: t.position?.x ?? 0, y: t.position?.y ?? 0, z: t.position?.z },
        speed: t.speed,
        heading: undefined,
        throttle: t.throttle,
        brake: t.brake,
        gear: t.gear,
        rpm: t.rpm,
        lap: t.lap,
        sector: t.sector,
        flags: undefined,
        extra: undefined,
      }));
      setSamplesByDriver((prev) => {
        const next: Record<string, Sample[]> = prev ? { ...prev } : {};
        for (const s of mapped) {
          (next[s.driverId] ||= []).push(s);
        }
        return next;
      });
      const lastTs = mapped.length ? mapped[mapped.length - 1].tsMs : 0;
      if (lastTs) setSessionDurationMs((d) => Math.max(d, lastTs));
    };

    const scheduleFlush = () => {
      if (rafIdRef.current != null) return;
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        flushBufferedTelemetry();
      });
    };

    const onTelemetry = (list: any[]) => {
      telemetryBufferRef.current.push(...list);
      scheduleFlush();
    };

    sock.on('connect', () => {
      setConnecting(false);
      setRetryCount(0);
      setNextRetryInMs(0);
    });
    sock.on('disconnect', () => {
      setConnecting(false);
      // schedule retry if still in live mode
      scheduleRetry();
    });
    sock.on('telemetry_update', onTelemetry);
    sock.on('connect_error', (err: any) => {
      console.error('Live connect_error', err);
      setError('Failed to connect to live telemetry.');
      setConnecting(false);
      scheduleRetry();
    });

    return () => {
      try {
        sock.off('telemetry_update', onTelemetry);
        sock.off('connect_error');
        sock.emit('leave_session', selectedSessionId);
        sock.disconnect();
      } catch { }
      socketRef.current = null;
      setConnecting(false);
    };
  }, [live, selectedSessionId]);

  // Schedules an exponential backoff retry while live is enabled
  const scheduleRetry = React.useCallback(() => {
    if (!live) return;
    // do not schedule if a socket is already present and connecting
    if (socketRef.current && socketRef.current.connected) return;
    if (retryTimerRef.current != null) return;
    const attempt = retryCount + 1;
    const base = 1000; // 1s
    const maxDelay = 15000; // 15s
    const jitter = Math.floor(Math.random() * 300);
    const delay = Math.min(maxDelay, base * Math.pow(2, Math.min(6, attempt - 1))) + jitter;
    setRetryCount(attempt);
    setNextRetryInMs(delay);
    // simple countdown indicator
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const remain = Math.max(0, delay - elapsed);
      setNextRetryInMs(remain);
      if (remain > 0 && retryTimerRef.current != null) {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
    retryTimerRef.current = window.setTimeout(() => {
      retryTimerRef.current = null;
      // trigger a reconnect by toggling live off/on quickly if still enabled
      if (live) {
        setConnecting(true);
        try {
          socketRef.current?.connect();
        } catch {
          // fallback: full toggle
          setLive(false);
          setTimeout(() => setLive(true), 0);
        }
      }
    }, delay) as unknown as number;
  }, [live, retryCount]);

  const cancelRetry = () => {
    if (retryTimerRef.current != null) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    setRetryCount(0);
    setNextRetryInMs(0);
  };

  // Immediately attempt a reconnect (used by Retry now button)
  const handleRetryNow = () => {
    cancelRetry();
    if (!live) return;
    setConnecting(true);
    try {
      socketRef.current?.connect();
    } catch {
      // Fallback to full toggle if direct connect throws
      setLive(false);
      setTimeout(() => setLive(true), 0);
    }
  };

  // Advance virtual time when playing (for real data). Stops at end.
  React.useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = now - last;
      last = now;
      setPlayback((p: PlaybackState) => {
        if (!p.playing) return p;
        const next = p.tMs + dt * p.rate;
        if (samplesByDriver) {
          // clamp to session bounds
          const capped = Math.min(next, sessionDurationMs);
          return { ...p, tMs: capped };
        }
        return p; // demo mode handled in canvas
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [samplesByDriver, sessionDurationMs]);

  const onLoadSession = async () => {
    try {
      setError(null);
      setBusy(true);
      // Use selected session if available, otherwise default dev session id
      const sessionId = selectedSessionId || 'dev-session-1';
      const { data } = await BackendClient.fetchTelemetry(sessionId, { fromTs: 0 });

      // Map and group by driverId
      const mapped: Sample[] = data.map((t) => ({
        tsMs: t.timestamp,
        driverId: t.driverId || 'unknown',
        pos: { x: t.position?.x ?? 0, y: t.position?.y ?? 0, z: t.position?.z },
        speed: t.speed,
        heading: undefined,
        throttle: t.throttle,
        brake: t.brake,
        gear: t.gear,
        rpm: t.rpm,
        lap: t.lap,
        sector: t.sector,
        flags: undefined,
        extra: undefined,
      })).sort((a, b) => a.tsMs - b.tsMs);
      const byDriver: Record<string, Sample[]> = {};
      for (const s of mapped) {
        (byDriver[s.driverId] ||= []).push(s);
      }
      setSamplesByDriver(byDriver);
      const maxTs = mapped.length ? mapped[mapped.length - 1].tsMs : 0;
      setSessionDurationMs(Math.max(1000, maxTs));
      setPlayback((p: PlaybackState) => ({ ...p, tMs: 0, t0: Date.now(), playing: true }));
    } catch (err) {
      console.error('Failed to load session', err);
      setError('Failed to load session data. Ensure the backend is running and the session has telemetry.');
    }
    finally { setBusy(false); }
  };

  const onRefreshSessions = async () => {
    try {
      setError(null);
      setBusy(true);
      const res = await BackendClient.listSessions();
      const list = res.sessions || [];
      setSessions(list);
      setPickerFocusIdx((idx) => Math.max(0, Math.min(idx, Math.max(0, (list.length || 1) - 1))));
      setShowPicker(true);
    } catch (e: any) {
      console.error(e);
      setError('Failed to load sessions.');
    } finally {
      setBusy(false);
    }
  };

  const onCreateDevSession = async () => {
    try {
      setError(null);
      setBusy(true);
      await BackendClient.createSession({ id: 'dev-session-1', name: 'Dev Session', track: 'SampleTrack' });
    } catch (e: any) {
      console.error(e);
      setError('Could not create dev session. Check server logs.');
    } finally {
      setBusy(false);
    }
  };

  const onAppendSample = async () => {
    const now = Date.now();
    try {
      setError(null);
      setBusy(true);
      await BackendClient.appendTelemetry('dev-session-1', {
        driverId: 'driver-1',
        driverName: 'Test Driver',
        speed: 120,
        rpm: 8000,
        gear: 4,
        throttle: 0.9,
        brake: 0,
        clutch: 0,
        steering: 0.1,
        fuel: {
          level: 45,
          usagePerHour: 2.5
        },
        tires: {
          frontLeft: { temp: 85, wear: 0.1, pressure: 27 },
          frontRight: { temp: 86, wear: 0.12, pressure: 27 },
          rearLeft: { temp: 90, wear: 0.15, pressure: 26 },
          rearRight: { temp: 91, wear: 0.15, pressure: 26 },
        },
        position: { x: 100, y: 200, z: 0 },
        lap: 3,
        sector: 2,
        lapTime: 75.3,
        sectorTime: 25.1,
        bestLapTime: 74.8,
        deltaToBestLap: 0.5,
        bestSectorTimes: [24.9, 25.0, 24.9],
        gForce: { lateral: 1.1, longitudinal: 0.8, vertical: 0.2 },
        trackPosition: 0.45,
        racePosition: 5,
        gapAhead: 0.3,
        gapBehind: 0.5,
        flags: 0,
        drsStatus: 0,
        carSettings: {
          brakeBias: 54.5,
          abs: 5,
          tractionControl: 5,
          tractionControl2: 5,
          fuelMixture: 1
        },
        energy: {
          batteryPct: 0.95,
          deployPct: 0.1,
          deployMode: 1
        },
        weather: {
          windSpeed: 2.5,
          windDirection: 0.5
        },
        timestamp: now,
      });
    } catch (e: any) {
      console.error(e);
      setError('Could not append sample telemetry.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="tacview-panel">
      <div className="tacview-toolbar">
        <button
          className="tacview-btn"
          disabled={busy || connecting}
          onClick={() => setPlayback((p: PlaybackState) => ({ ...p, playing: !p.playing }))}
        >
          {playback.playing ? 'Pause' : 'Play'}
        </button>
        <div className="tacview-rate-group">
          {rates.map(r => (
            <button
              key={r}
              className={`tacview-btn ${playback.rate === r ? 'active' : ''}`}
              disabled={busy || connecting}
              onClick={() => setPlayback((p: PlaybackState) => ({ ...p, rate: r }))}
            >
              {r}x
            </button>
          ))}
        </div>
        <div className="tacview-spacer" />
        {/* Live status badge */}
        <span
          className={`tacview-live-badge ${connecting ? 'state-connecting' : (!live ? 'state-off' : (nextRetryInMs > 0 ? 'state-retrying' : 'state-connected'))}`}
          title={connecting ? 'Connecting to live telemetry' : (!live ? 'Live is off' : (nextRetryInMs > 0 ? 'Reconnecting soon' : 'Live connected'))}
        >
          {connecting ? 'Connecting' : (!live ? 'Live Off' : (nextRetryInMs > 0 ? `Retrying in ${Math.ceil(nextRetryInMs / 1000)}s` : 'Live'))}
        </span>
        <button className="tacview-btn secondary" disabled={busy} onClick={() => setLive(v => !v)}>
          {connecting ? 'Live: Connecting…' : (live ? 'Live: On' : 'Live: Off')}
        </button>
        <button className="tacview-btn secondary" onClick={onLoadSession} disabled={busy || connecting}>Load Session{selectedSessionId ? ` (${selectedSessionId})` : ''}</button>
        <button className="tacview-btn secondary" onClick={onRefreshSessions} disabled={busy || connecting}>Refresh Sessions</button>
        <button className="tacview-btn secondary" onClick={() => setShowPicker((v) => !v)} disabled={busy || connecting || !sessions || sessions.length === 0}>Pick Session</button>
        <button className="tacview-btn secondary" onClick={onCreateDevSession} disabled={busy || connecting}>Create Dev Session</button>
        <button className="tacview-btn secondary" onClick={onAppendSample} disabled={busy || connecting}>Append Sample</button>
        <button className="tacview-btn secondary" title="Exports a JSON file containing the full telemetry object grouped by driver and session metadata" onClick={handleExport} disabled={busy || connecting || !samplesByDriver}>Export JSON</button>
        <button className="tacview-btn secondary" title="Exports a CSV of flattened telemetry rows (driver, timestamp, position, speed, controls, lap/sector)" onClick={handleExportCSV} disabled={busy || connecting || !samplesByDriver}>Export CSV</button>
      </div>
      <div className="tacview-stage">
        {connecting && (
          <div className="tacview-banner" role="status" aria-live="polite">Connecting to live telemetry…</div>
        )}
        {!connecting && live && retryCount > 0 && nextRetryInMs > 0 && (
          <div className="tacview-banner warning" role="status" aria-live="polite">
            Live connection lost. Retrying in {Math.ceil(nextRetryInMs / 1000)}s (attempt {retryCount}).
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              <button className="tacview-btn secondary" onClick={() => { cancelRetry(); setConnecting(true); try { socketRef.current?.connect(); } catch { } }}>Retry Now</button>
              <button className="tacview-btn secondary" onClick={() => { cancelRetry(); setLive(false); }}>Cancel</button>
            </div>
          </div>
        )}
        {showPicker && sessions && (
          <div className="tacview-modal" role="dialog" aria-modal="true" aria-label="Pick a Session" onKeyDown={(e) => {
            if (!sessions?.length) return;
            if (e.key === 'ArrowDown') { e.preventDefault(); setPickerFocusIdx((i) => Math.min(i + 1, sessions.length - 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setPickerFocusIdx((i) => Math.max(i - 1, 0)); }
            if (e.key === 'Enter') { e.preventDefault(); const s = sessions[pickerFocusIdx]; if (s) { setSelectedSessionId(s.id); setShowPicker(false); } }
            if (e.key === 'Escape') { e.preventDefault(); setShowPicker(false); }
            if (e.key === 'Tab' && modalContentRef.current) {
              // simple focus trap inside modal
              const focusables = modalContentRef.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
              if (focusables.length) {
                const first = focusables[0];
                const last = focusables[focusables.length - 1];
                const active = document.activeElement as HTMLElement | null;
                if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
                if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
              }
            }
          }}>
            <div ref={modalContentRef} className="tacview-modal-content" tabIndex={0}>
              <h3>Pick a Session</h3>
              <div className="tacview-session-list" role="listbox" aria-activedescendant={sessions[pickerFocusIdx]?.id}>
                {sessions.map((s, idx) => (
                  <button
                    id={s.id}
                    key={s.id}
                    role="option"
                    aria-selected={pickerFocusIdx === idx}
                    className={`tacview-session-item ${pickerFocusIdx === idx ? 'selected' : ''}`}
                    onMouseEnter={() => setPickerFocusIdx(idx)}
                    onClick={() => { setSelectedSessionId(s.id); setShowPicker(false); }}
                  >
                    <div className="title">{s.name || s.id}</div>
                    <div className="meta">{new Date(s.createdAt).toLocaleString()}</div>
                  </button>
                ))}
              </div>
              <div className="tacview-modal-actions">
                <button className="tacview-btn" onClick={() => setShowPicker(false)}>Close</button>
              </div>
            </div>
          </div>
        )}
        {live && !connecting && nextRetryInMs > 0 && (
          <div className="tacview-banner warning" role="status" aria-live="polite">
            Live connection lost. Reconnecting in {Math.ceil(nextRetryInMs / 1000)}s (attempt {retryCount}).
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              <button className="tacview-btn secondary" onClick={handleRetryNow} disabled={busy}>Retry now</button>
              <button className="tacview-btn secondary" onClick={() => { setLive(false); cancelRetry(); }} disabled={busy}>Cancel</button>
            </div>
          </div>
        )}
        {live && !connecting && nextRetryInMs === 0 && (
          <div className="tacview-banner" role="status" aria-live="polite">Live mode: receiving Socket.IO updates.</div>
        )}
        {error && (
          <div className="tacview-banner error" role="alert" aria-live="assertive">
            {error}
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              <button className="tacview-btn secondary" onClick={() => { setError(null); onLoadSession(); }} disabled={busy || connecting}>Retry Load</button>
              {live && (
                <button className="tacview-btn secondary" onClick={() => { setError(null); setLive(false); setTimeout(() => setLive(true), 0); }} disabled={busy}>Reconnect Live</button>
              )}
              <button className="tacview-btn secondary" onClick={() => setError(null)} disabled={busy || connecting}>Dismiss</button>
            </div>
          </div>
        )}
        {!error && (!samplesByDriver || Object.keys(samplesByDriver).length === 0) && (
          <div className="tacview-banner" role="status" aria-live="polite">No telemetry loaded yet. Create a dev session, append a sample, then Load Session.</div>
        )}
        <TacviewCanvas playback={playback} samplesByDriver={samplesByDriver ?? undefined} />
      </div>
      <div className="tacview-timeline">
        <input
          type="range"
          min={0}
          max={sessionDurationMs}
          value={playback.tMs}
          disabled={busy || connecting}
          onChange={e => setPlayback((p: PlaybackState) => ({ ...p, tMs: Number(e.target.value) }))}
        />
        {/* timeline ticks every 15s with major at each minute */}
        <div className="tacview-timeline-ticks">
          {(() => {
            const ticks: React.ReactNode[] = [];
            const dur = Math.max(0, sessionDurationMs);
            if (dur <= 0) return ticks;
            const stepMs = 15000; // 15s minor
            const maxTicks = 400; // guardrail
            const count = Math.min(Math.floor(dur / stepMs), maxTicks);
            for (let i = 0; i <= count; i++) {
              const t = i * stepMs;
              const pct = (t / dur) * 100;
              const major = (t % 60000) === 0;
              ticks.push(
                <span key={t} className={`tick ${major ? 'major' : ''}`} style={{ left: `${pct}%` }} />
              );
            }
            return ticks;
          })()}
          {/* minute labels under major ticks */}
          {(() => {
            const labels: React.ReactNode[] = [];
            const dur = Math.max(0, sessionDurationMs);
            if (dur <= 0) return labels;
            const stepMinMs = 60000;
            const maxLabels = 120;
            const count = Math.min(Math.floor(dur / stepMinMs), maxLabels);
            for (let i = 0; i <= count; i++) {
              const t = i * stepMinMs;
              const pct = (t / dur) * 100;
              labels.push(
                <span key={`label-${t}`} className="tick-label" style={{ left: `${pct}%` }}>
                  {formatMs(t)}
                </span>
              );
            }
            return labels;
          })()}
        </div>
        <div className="tacview-timeline-labels">
          <span>{formatMs(0)}</span>
          <span>{formatMs(playback.tMs)}</span>
          <span>{formatMs(sessionDurationMs)}</span>
        </div>
      </div>
    </div>
  );
};

export default TacviewPanel;
