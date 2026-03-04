/**
 * DriverHUDOverlay — Minimal, fade-aware race HUD for the driver.
 *
 * Behaviour:
 *   • Fades to ~12% opacity when nothing is happening.
 *   • Snaps bright on activity, then slowly fades back (4s).
 *   • Radio messages slide in and auto-expire:
 *       critical → 12 s, important → 8 s, normal → 6 s, low → 4 s
 *   • Caution / critical alerts pulse bright and stay until cleared.
 *   • PTT voice state and transcript shown inline.
 *   • Track minimap shows ALL car positions so you can see WHERE things happen.
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Loader2, Radio, AlertTriangle } from 'lucide-react';
import { useRelay } from '../hooks/useRelay';
import { useEngineer } from '../hooks/useEngineer';
import { TrackMinimap } from './TrackMinimap';
import type { VoiceQueryStatus } from '../hooks/useVoiceQuery';
import type { MessageUrgency } from '../services/EngineerCore';

// ─── Constants ────────────────────────────────────────────────────────────────

const MSG_LIFETIME: Record<MessageUrgency, number> = {
  critical:  12_000,
  important:  8_000,
  normal:     6_000,
  low:        4_000,
};

const MAX_VISIBLE = 4; // max radio lines shown at once

// ─── Types ────────────────────────────────────────────────────────────────────

interface HUDMsg {
  id: string;
  content: string;
  urgency: MessageUrgency;
  addedAt: number;
}

export interface DriverHUDOverlayProps {
  /** Current voice-query state from useVoiceQuery */
  voiceStatus?: VoiceQueryStatus;
  /** Driver's spoken words (shown while processing / responding) */
  voiceTranscript?: string | null;
  /** Engineer's text response (shown while responding / briefly after) */
  voiceResponse?: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtLap(s: number | null): string {
  if (!s || s <= 0) return '—';
  const m = Math.floor(s / 60);
  const sec = (s % 60).toFixed(3);
  return m > 0 ? `${m}:${sec.padStart(6, '0')}` : sec;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DriverHUDOverlay({
  voiceStatus = 'idle',
  voiceTranscript = null,
  voiceResponse = null,
}: DriverHUDOverlayProps) {
  const { status, telemetry, session } = useRelay();
  const { messages, criticalMessages } = useEngineer();

  // ── Message queue with auto-expiry ────────────────────────────────────────
  const [hudMsgs, setHudMsgs] = useState<HUDMsg[]>([]);
  const seenIds = useRef<Set<string>>(new Set());

  // Ingest new engineer messages
  useEffect(() => {
    const fresh = messages.filter(m => !seenIds.current.has(m.id));
    if (!fresh.length) return;
    fresh.forEach(m => seenIds.current.add(m.id));
    setHudMsgs(prev =>
      [...prev, ...fresh.map(m => ({
        id: m.id,
        content: m.content,
        urgency: m.urgency,
        addedAt: m.timestamp,
      }))].slice(-20)
    );
  }, [messages]);

  // Tick: remove expired messages
  useEffect(() => {
    if (!hudMsgs.length) return;
    const earliest = hudMsgs.reduce((t, m) => {
      const exp = m.addedAt + MSG_LIFETIME[m.urgency];
      return exp < t ? exp : t;
    }, Infinity);
    const delay = Math.max(100, earliest - Date.now());
    const id = setTimeout(() => {
      const now = Date.now();
      setHudMsgs(prev => prev.filter(m => m.addedAt + MSG_LIFETIME[m.urgency] > now));
    }, delay);
    return () => clearTimeout(id);
  }, [hudMsgs]);

  // ── Voice overlay state ───────────────────────────────────────────────────
  // Keep transcript/response visible briefly after voice finishes
  const [voiceDisplay, setVoiceDisplay] = useState<{
    transcript: string | null;
    response: string | null;
  }>({ transcript: null, response: null });
  const voiceFadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (voiceStatus !== 'idle') {
      if (voiceFadeTimer.current) clearTimeout(voiceFadeTimer.current);
      setVoiceDisplay({ transcript: voiceTranscript ?? null, response: voiceResponse ?? null });
    } else if (voiceDisplay.transcript || voiceDisplay.response) {
      // Was active, now idle → linger 5 s then clear
      voiceFadeTimer.current = setTimeout(() => {
        setVoiceDisplay({ transcript: null, response: null });
      }, 5000);
    }
    return () => {
      if (voiceFadeTimer.current) clearTimeout(voiceFadeTimer.current);
    };
  }, [voiceStatus, voiceTranscript, voiceResponse]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived state ─────────────────────────────────────────────────────────
  const hasCritical = criticalMessages.length > 0;
  const voiceActive = voiceStatus !== 'idle';
  const isActive =
    hudMsgs.length > 0 ||
    voiceActive ||
    hasCritical ||
    !!(voiceDisplay.transcript || voiceDisplay.response);

  const connStatus: 'live' | 'ready' | 'offline' =
    status === 'in_session' ? 'live'
    : status === 'connected' || status === 'connecting' || status === 'reconnecting' ? 'ready'
    : 'offline';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed bottom-4 left-4 z-40 pointer-events-none select-none"
      style={{ width: 300 }}
    >
      <motion.div
        animate={{ opacity: isActive ? 1 : 0.12 }}
        transition={{ duration: isActive ? 0.15 : 4, ease: 'easeOut' }}
        className="flex flex-col gap-1.5"
      >

        {/* ── Radio message log ───────────────────────────────────────────── */}
        <div className="flex flex-col gap-1">
          <AnimatePresence mode="sync" initial={false}>
            {hudMsgs.slice(-MAX_VISIBLE).map((msg, idx, arr) => {
              const isNewest = idx === arr.length - 1;
              const isCritical = msg.urgency === 'critical';
              const isImportant = msg.urgency === 'important';
              return (
                <motion.div
                  key={msg.id}
                  layout
                  initial={{ opacity: 0, y: 6, filter: 'blur(3px)' }}
                  animate={{
                    opacity: isNewest ? 1 : 0.45,
                    y: 0,
                    filter: 'blur(0px)',
                  }}
                  exit={{ opacity: 0, y: -4, filter: 'blur(2px)', transition: { duration: 0.4 } }}
                  transition={{ duration: 0.2 }}
                  className={[
                    'flex items-start gap-2 px-2.5 py-1.5 rounded text-[11px] leading-snug',
                    'backdrop-blur-sm border',
                    isCritical
                      ? 'bg-red-950/60 border-red-500/70 text-red-100'
                      : isImportant
                      ? 'bg-yellow-950/50 border-yellow-500/50 text-yellow-100'
                      : 'bg-black/50 border-white/10 text-gray-200',
                  ].join(' ')}
                >
                  <Radio
                    className={[
                      'w-3 h-3 mt-0.5 shrink-0',
                      isCritical ? 'text-red-400 animate-pulse' : isImportant ? 'text-yellow-400' : 'text-gray-500',
                    ].join(' ')}
                  />
                  <span className="flex-1">{msg.content}</span>
                  {isCritical && (
                    <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0 text-red-400 animate-pulse" />
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* ── Voice transcript / response ─────────────────────────────────── */}
        <AnimatePresence>
          {(voiceActive || voiceDisplay.transcript || voiceDisplay.response) && (
            <motion.div
              key="voice-display"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -2 }}
              transition={{ duration: 0.2 }}
              className="px-2.5 py-2 rounded bg-cyan-950/60 border border-cyan-500/30 backdrop-blur-sm text-[11px]"
            >
              {voiceStatus === 'listening' && (
                <div className="flex items-center gap-1.5 text-cyan-300 animate-pulse">
                  <Mic className="w-3 h-3 shrink-0" />
                  <span>Listening…</span>
                </div>
              )}

              {voiceStatus === 'processing' && (
                <div className="flex items-center gap-1.5 text-gray-400">
                  <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                  {voiceDisplay.transcript && (
                    <span className="italic">"{voiceDisplay.transcript}"</span>
                  )}
                </div>
              )}

              {(voiceStatus === 'responding' || voiceStatus === 'idle') && voiceDisplay.response && (
                <div className="flex flex-col gap-0.5">
                  {voiceDisplay.transcript && (
                    <div className="text-gray-500 italic text-[10px]">
                      "{voiceDisplay.transcript}"
                    </div>
                  )}
                  <div className="flex items-start gap-1.5 text-cyan-100">
                    <Radio className="w-3 h-3 mt-0.5 shrink-0 text-cyan-400" />
                    <span>{voiceDisplay.response}</span>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Status bar ──────────────────────────────────────────────────── */}
        <div className="flex items-stretch gap-2 px-2 py-1.5 rounded bg-black/55 border border-white/8 backdrop-blur-sm">

          {/* Track minimap */}
          <TrackMinimap
            trackName={session.trackName}
            trackPosition={telemetry.trackPosition}
            otherCars={telemetry.otherCars}
            className="w-[64px] h-[64px] shrink-0"
          />

          {/* Info column */}
          <div className="flex flex-col justify-between py-0.5 min-w-0 flex-1">

            {/* Connection row */}
            <div className="flex items-center gap-1.5">
              <span
                className={[
                  'w-1.5 h-1.5 rounded-full shrink-0',
                  connStatus === 'live'    ? 'bg-green-400 animate-pulse'
                  : connStatus === 'ready' ? 'bg-yellow-400'
                  : 'bg-gray-600',
                ].join(' ')}
              />
              <span
                className={[
                  'text-[9px] font-bold tracking-widest uppercase',
                  connStatus === 'live'    ? 'text-green-400'
                  : connStatus === 'ready' ? 'text-yellow-400'
                  : 'text-gray-500',
                ].join(' ')}
              >
                {connStatus === 'live' ? 'LIVE' : connStatus === 'ready' ? 'READY' : 'OFFLINE'}
              </span>
              {hasCritical && (
                <AlertTriangle className="w-3 h-3 ml-auto text-red-400 animate-pulse" />
              )}
            </div>

            {/* Race state */}
            {connStatus === 'live' && (
              <div className="font-mono text-[10px] text-gray-400">
                {telemetry.position != null && (
                  <span className="text-white font-semibold">P{telemetry.position}</span>
                )}
                {telemetry.position != null && telemetry.lap != null && (
                  <span className="mx-1 text-gray-600">·</span>
                )}
                {telemetry.lap != null && (
                  <span>L{telemetry.lap}</span>
                )}
                {telemetry.lastLap != null && (
                  <>
                    <span className="mx-1 text-gray-600">·</span>
                    <span>{fmtLap(telemetry.lastLap)}</span>
                  </>
                )}
              </div>
            )}

            {/* PTT / voice indicator */}
            <AnimatePresence>
              {voiceActive && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1 text-[10px]"
                >
                  {voiceStatus === 'listening' ? (
                    <span className="flex items-center gap-1 text-cyan-400 animate-pulse">
                      <Mic className="w-2.5 h-2.5" /> PTT
                    </span>
                  ) : voiceStatus === 'processing' ? (
                    <span className="flex items-center gap-1 text-gray-400">
                      <Loader2 className="w-2.5 h-2.5 animate-spin" /> Processing
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-cyan-300">
                      <Radio className="w-2.5 h-2.5" /> Engineer
                    </span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </motion.div>
    </div>
  );
}
