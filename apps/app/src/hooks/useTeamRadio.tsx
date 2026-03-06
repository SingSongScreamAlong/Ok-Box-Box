/**
 * useTeamRadio
 *
 * Connects this client to a team's radio room on the server via Socket.IO.
 * When a driver on the team fires a voice:query, the server processes it
 * (Whisper STT → AI engineer → ElevenLabs TTS) and broadcasts a team:radio
 * event to all sockets in `team:{teamId}`.
 *
 * This hook:
 *  - Joins the team room when teamId is known
 *  - Listens for `team:radio` events
 *  - Plays the engineer's TTS audio response on the pitwall
 *  - Maintains a message log for the radio panel UI
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { supabase } from '../lib/supabase';

export interface TeamRadioMessage {
  id: string;
  driverId: string;
  driverName: string;
  /** What the driver said (Whisper transcription) */
  query: string;
  /** Engineer's response text */
  response: string;
  /** Base64-encoded ElevenLabs TTS audio for the engineer response */
  audioBase64?: string;
  timestamp: number;
  /** true while audio is playing on this client */
  isPlaying?: boolean;
}

export interface TeamPlanUpdateEvent {
  type: 'plan_created' | 'plan_activated' | 'stint_created' | 'stint_updated' | 'stint_deleted';
  teamId: string;
  planId?: string;
  stintId?: string;
  plan?: Record<string, unknown>;
  stint?: Record<string, unknown>;
}

interface UseTeamRadioOptions {
  /** Auto-play engineer audio responses when they arrive */
  autoPlay?: boolean;
  /** Master volume 0-1 */
  volume?: number;
  /** Called when the server broadcasts a race plan or stint mutation to the team room */
  onPlanUpdate?: (event: TeamPlanUpdateEvent) => void;
}

interface UseTeamRadioReturn {
  messages: TeamRadioMessage[];
  isConnected: boolean;
  isJoined: boolean;
  latestMessage: TeamRadioMessage | null;
  playMessage: (messageId: string) => void;
  clearMessages: () => void;
}

export function useTeamRadio(
  teamId: string | undefined,
  options: UseTeamRadioOptions = {}
): UseTeamRadioReturn {
  const { autoPlay = true, volume = 0.9, onPlanUpdate } = options;
  const onPlanUpdateRef = useRef(onPlanUpdate);
  onPlanUpdateRef.current = onPlanUpdate;

  const [messages, setMessages] = useState<TeamRadioMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isJoined, setIsJoined] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  const playAudioBase64 = useCallback((base64: string, messageId: string) => {
    try {
      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const audio = new Audio(`data:audio/mpeg;base64,${base64}`);
      audio.volume = volumeRef.current;
      audioRef.current = audio;

      setMessages(prev =>
        prev.map(m => ({ ...m, isPlaying: m.id === messageId }))
      );

      audio.onended = () => {
        setMessages(prev => prev.map(m => ({ ...m, isPlaying: false })));
        audioRef.current = null;
      };

      audio.onerror = () => {
        setMessages(prev => prev.map(m => ({ ...m, isPlaying: false })));
        audioRef.current = null;
      };

      audio.play().catch(err => {
        console.warn('[TeamRadio] Audio play blocked:', err);
        setMessages(prev => prev.map(m => ({ ...m, isPlaying: false })));
      });
    } catch (err) {
      console.error('[TeamRadio] Failed to play audio:', err);
    }
  }, []);

  const playMessage = useCallback((messageId: string) => {
    const msg = messages.find(m => m.id === messageId);
    if (msg?.audioBase64) {
      playAudioBase64(msg.audioBase64, messageId);
    }
  }, [messages, playAudioBase64]);

  const clearMessages = useCallback(() => setMessages([]), []);

  useEffect(() => {
    if (!teamId) return;

    let mounted = true;

    async function connect() {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const wsUrl = import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL || 'https://octopus-app-qsi3i.ondigitalocean.app';

      const socket = io(wsUrl, {
        transports: ['websocket', 'polling'],
        auth: token ? { token } : {},
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 30000,
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        if (!mounted) return;
        setIsConnected(true);
        console.log('[TeamRadio] Connected, joining team:', teamId);
        socket.emit('team:join', { teamId });
      });

      socket.on('team:joined', (data: { teamId: string }) => {
        if (!mounted) return;
        console.log('[TeamRadio] Joined team room:', data.teamId);
        setIsJoined(true);
      });

      socket.on('team:error', (data: { error: string }) => {
        console.warn('[TeamRadio] Team room error:', data.error);
      });

      socket.on('team:radio', (data: Omit<TeamRadioMessage, 'id' | 'isPlaying'>) => {
        if (!mounted) return;

        const message: TeamRadioMessage = {
          ...data,
          id: `${data.timestamp}-${data.driverId}`,
          isPlaying: false,
        };

        setMessages(prev => {
          // Keep last 50 messages
          const updated = [message, ...prev].slice(0, 50);
          return updated;
        });

        if (autoPlay && data.audioBase64) {
          playAudioBase64(data.audioBase64, message.id);
        }
      });

      socket.on('team:plan_update', (data: TeamPlanUpdateEvent) => {
        if (!mounted) return;
        onPlanUpdateRef.current?.(data);
      });

      socket.on('disconnect', () => {
        if (!mounted) return;
        setIsConnected(false);
        setIsJoined(false);
      });

      socket.io.on('reconnect', () => {
        if (!mounted) return;
        setIsConnected(true);
        socket.emit('team:join', { teamId });
      });
    }

    connect();

    return () => {
      mounted = false;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.emit('team:leave', { teamId });
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
      setIsJoined(false);
    };
  }, [teamId, autoPlay, playAudioBase64]);

  const latestMessage = messages.length > 0 ? messages[0] : null;

  return { messages, isConnected, isJoined, latestMessage, playMessage, clearMessages };
}
