/**
 * useVoiceQuery — Full voice round-trip with AI crew
 *
 * Flow:
 *   startListening()  → MediaRecorder begins capturing mic
 *   stopListening()   → sends audio to /api/v1/drivers/me/voice-chat
 *                     → receives transcript + text response + optional ElevenLabs audio
 *                     → plays audio if available, otherwise falls back to browser TTS
 *
 * Designed to be driven by usePTT (hold = listen, release = send).
 */

import { useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getVoiceService } from '../services/VoiceService';
import type { CrewRole, ChatMessage } from '../lib/crewChatService';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : 'https://app.okboxbox.com');

// ─── Types ────────────────────────────────────────────────────────────────────

export type VoiceQueryStatus = 'idle' | 'listening' | 'processing' | 'responding' | 'error';

export interface VoiceQueryState {
  status: VoiceQueryStatus;
  transcript: string | null;
  lastResponse: string | null;
  error: string | null;
}

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : {};
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseVoiceQueryOptions {
  role?: CrewRole;
  /** Pass the current chat history for context continuity */
  getHistory?: () => ChatMessage[];
  /** Called when a new (transcript, response) pair arrives — add to chat history */
  onResponse?: (transcript: string, response: string) => void;
}

interface UseVoiceQueryReturn extends VoiceQueryState {
  startListening: () => Promise<void>;
  stopListening: () => void;
  /** True if mic permission was denied */
  micDenied: boolean;
}

export function useVoiceQuery({
  role = 'engineer',
  getHistory,
  onResponse,
}: UseVoiceQueryOptions = {}): UseVoiceQueryReturn {
  const [state, setState] = useState<VoiceQueryState>({
    status: 'idle',
    transcript: null,
    lastResponse: null,
    error: null,
  });
  const [micDenied, setMicDenied] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const setStatus = (s: VoiceQueryStatus) =>
    setState((prev: VoiceQueryState) => ({ ...prev, status: s }));

  // ── Send audio to backend ───────────────────────────────────────────────────
  const sendAudio = useCallback(async (audioBlob: Blob) => {
    setState((prev: VoiceQueryState) => ({ ...prev, status: 'processing', error: null }));

    try {
      const auth = await getAuthHeader();
      if (!auth.Authorization) {
        setState((prev: VoiceQueryState) => ({ ...prev, status: 'error', error: 'Not logged in' }));
        return;
      }

      // Convert Blob → base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
      const audioBase64 = btoa(binary);

      const history = getHistory ? getHistory() : [];

      const res = await fetch(`${API_BASE}/api/v1/drivers/me/voice-chat`, {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: audioBase64, role, history }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `API error ${res.status}`);
      }

      const data: { transcript: string; response: string; audioBase64?: string } = await res.json();

      setState((prev: VoiceQueryState) => ({
        ...prev,
        status: 'responding',
        transcript: data.transcript,
        lastResponse: data.response,
      }));

      onResponse?.(data.transcript, data.response);

      // ── Play response audio ───────────────────────────────────────────────
      if (data.audioBase64) {
        // ElevenLabs audio — play via Audio API
        const audioData = atob(data.audioBase64);
        const buffer = new Uint8Array(audioData.length);
        for (let i = 0; i < audioData.length; i++) buffer[i] = audioData.charCodeAt(i);
        const blob = new Blob([buffer], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => {
          URL.revokeObjectURL(url);
          setState((prev: VoiceQueryState) => ({ ...prev, status: 'idle' }));
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          setState((prev: VoiceQueryState) => ({ ...prev, status: 'idle' }));
        };
        setState((prev: VoiceQueryState) => ({ ...prev, status: 'responding' }));
        await audio.play();
      } else {
        // Fallback: browser TTS via VoiceService
        const voiceService = getVoiceService();
        voiceService.speakText(data.response, 'normal');
        setState((prev: VoiceQueryState) => ({ ...prev, status: 'idle' }));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Voice query failed';
      setState((prev: VoiceQueryState) => ({ ...prev, status: 'error', error: message }));
      // Auto-clear error after 4s
      setTimeout(() => setState((prev: VoiceQueryState) => ({ ...prev, status: 'idle', error: null })), 4000);
    }
  }, [role, getHistory, onResponse]);

  // ── Start listening (request mic, begin recording) ─────────────────────────
  const startListening = useCallback(async () => {
    if (state.status !== 'idle') return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setMicDenied(false);

      chunksRef.current = [];

      // Prefer webm/opus for best Whisper compatibility; fall back to whatever browser supports
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        if (blob.size > 1000) {
          // Only send if we captured something meaningful (> 1 KB)
          sendAudio(blob);
        } else {
          setState((prev: VoiceQueryState) => ({ ...prev, status: 'idle' }));
        }
      };

      recorder.start();
      setStatus('listening');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setMicDenied(true);
        setState((prev: VoiceQueryState) => ({
          ...prev,
          status: 'error',
          error: 'Microphone access denied — allow mic in browser settings',
        }));
      } else {
        setState((prev: VoiceQueryState) => ({
          ...prev,
          status: 'error',
          error: 'Could not start microphone',
        }));
      }
      setTimeout(() => setState((prev: VoiceQueryState) => ({ ...prev, status: 'idle', error: null })), 4000);
    }
  }, [state.status, sendAudio]);

  // ── Stop listening (triggers send via recorder.onstop) ─────────────────────
  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    } else if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      setStatus('idle');
    }
  }, []);

  return { ...state, startListening, stopListening, micDenied };
}
