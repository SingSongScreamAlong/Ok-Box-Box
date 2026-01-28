// Hook for accessing live telemetry data during sessions
// LIVE DATA ONLY - Uses useRelay hook for real telemetry

import { useCallback } from 'react';
import { useRelay } from './useRelay';

// Re-export types for compatibility
export interface LiveTelemetry {
  driverId: string;
  position: number;
  gap: string;
  interval: string;
  speed: number;
  fuel: number;
  lapsRemaining: number;
  tireWear: { fl: number; fr: number; rl: number; rr: number };
  trackPosition: number;
  sector: number;
  delta: string;
}

export interface SessionState {
  status: 'offline' | 'connecting' | 'connected' | 'in_session';
  trackId: string;
  trackName: string;
  sessionType: 'practice' | 'qualifying' | 'race';
  timeRemaining: number | null;
  lapsRemaining: number | null;
}

interface UseLiveTelemetryReturn {
  // Session state
  session: SessionState;
  isConnected: boolean;
  isInSession: boolean;
  
  // Telemetry data
  telemetry: Map<string, LiveTelemetry>;
  getDriverTelemetry: (driverId: string) => LiveTelemetry | undefined;
  getAllTelemetry: () => LiveTelemetry[];
  
  // Controls (no-op for live mode - relay handles connection)
  startSession: (trackId: string, trackName: string, sessionType: 'practice' | 'qualifying' | 'race') => void;
  stopSession: () => void;
}

export function useLiveTelemetry(): UseLiveTelemetryReturn {
  const { status, telemetry: relayTelemetry, session: relaySession, connect, disconnect } = useRelay();

  // Map relay status to session state
  const session: SessionState = {
    status: status === 'disconnected' ? 'offline' : status,
    trackId: relaySession.trackName?.toLowerCase().replace(/\s+/g, '-') || '',
    trackName: relaySession.trackName || 'Unknown Track',
    sessionType: relaySession.sessionType || 'practice',
    timeRemaining: relaySession.timeRemaining,
    lapsRemaining: relaySession.lapsRemaining,
  };

  const isConnected = status === 'connected' || status === 'in_session';
  const isInSession = status === 'in_session';

  // Convert relay telemetry to LiveTelemetry map
  const telemetry = new Map<string, LiveTelemetry>();
  
  // Add player telemetry
  if (relayTelemetry) {
    telemetry.set('player', {
      driverId: 'player',
      position: relayTelemetry.position || 0,
      gap: '--',
      interval: '--',
      speed: relayTelemetry.speed || 0,
      fuel: relayTelemetry.fuel || 0,
      lapsRemaining: relayTelemetry.lapsRemaining || 0,
      tireWear: { fl: 1, fr: 1, rl: 1, rr: 1 },
      trackPosition: relayTelemetry.trackPosition || 0,
      sector: relayTelemetry.sector || 1,
      delta: relayTelemetry.delta ? `${relayTelemetry.delta > 0 ? '+' : ''}${relayTelemetry.delta.toFixed(3)}` : '--',
    });
  }

  // Add other cars from standings
  relayTelemetry.otherCars?.forEach((car, idx) => {
    telemetry.set(car.carNumber || `car-${idx}`, {
      driverId: car.carNumber || `car-${idx}`,
      position: car.position || idx + 1,
      gap: car.gap || '--',
      interval: '--',
      speed: 0,
      fuel: 0,
      lapsRemaining: 0,
      tireWear: { fl: 1, fr: 1, rl: 1, rr: 1 },
      trackPosition: car.trackPercentage || 0,
      sector: 1,
      delta: '--',
    });
  });

  const getDriverTelemetry = useCallback((driverId: string) => {
    return telemetry.get(driverId);
  }, [telemetry]);

  const getAllTelemetry = useCallback(() => {
    return Array.from(telemetry.values());
  }, [telemetry]);

  // These are no-ops for live mode - relay auto-connects
  const startSession = useCallback((_trackId: string, _trackName: string, _sessionType: 'practice' | 'qualifying' | 'race') => {
    connect();
  }, [connect]);

  const stopSession = useCallback(() => {
    disconnect();
  }, [disconnect]);

  return {
    session,
    isConnected,
    isInSession,
    telemetry,
    getDriverTelemetry,
    getAllTelemetry,
    startSession,
    stopSession,
  };
}
