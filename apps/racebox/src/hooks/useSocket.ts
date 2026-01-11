import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

interface RelayStatus {
  connected: boolean;
  iRacingConnected: boolean;
}

export function useSocket() {
  const [connected, setConnected] = useState(false);
  const [relayStatus, setRelayStatus] = useState<RelayStatus>({
    connected: false,
    iRacingConnected: false,
  });
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Get token from localStorage or use demo mode
    const token = localStorage.getItem('okboxbox_token') || 'demo-token';

    const socket = io(`${API_URL}/app`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to backend');
      setConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from backend');
      setConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('Connection error:', err.message);
    });

    socket.on('connected', (data) => {
      console.log('Authenticated:', data);
      // The server automatically joins us to user room on connect
    });

    // Listen for session start from relay
    socket.on('session:start', (data) => {
      console.log('Session started (from useSocket):', data);
    });

    socket.on('relay:status', (status: RelayStatus) => {
      console.log('Relay status:', status);
      setRelayStatus(status);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return {
    socket: socketRef.current,
    connected,
    relayStatus,
  };
}
