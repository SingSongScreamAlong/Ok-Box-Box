// Hook for accessing live telemetry data during sessions
// Uses MockTelemetryService in dev, would use real relay in production

import { useState, useEffect, useCallback } from 'react';
import { mockTelemetryService, type LiveTelemetry, type SessionState } from '../services/mockData';

interface UseLiveTelemetryReturn {
  // Session state
  session: SessionState;
  isConnected: boolean;
  isInSession: boolean;
  
  // Telemetry data
  telemetry: Map<string, LiveTelemetry>;
  getDriverTelemetry: (driverId: string) => LiveTelemetry | undefined;
  getAllTelemetry: () => LiveTelemetry[];
  
  // Controls
  startSession: (trackId: string, trackName: string, sessionType: 'practice' | 'qualifying' | 'race') => void;
  stopSession: () => void;
}

export function useLiveTelemetry(): UseLiveTelemetryReturn {
  const [session, setSession] = useState<SessionState>(mockTelemetryService.getSessionState());
  const [telemetry, setTelemetry] = useState<Map<string, LiveTelemetry>>(new Map());

  useEffect(() => {
    // Subscribe to session updates
    const unsubSession = mockTelemetryService.subscribeSession(setSession);
    
    // Subscribe to telemetry updates
    const unsubTelemetry = mockTelemetryService.subscribeTelemetry((data) => {
      setTelemetry(new Map(data)); // Create new Map to trigger re-render
    });

    return () => {
      unsubSession();
      unsubTelemetry();
    };
  }, []);

  const isConnected = session.status === 'connected' || session.status === 'in_session';
  const isInSession = session.status === 'in_session';

  const getDriverTelemetry = useCallback((driverId: string) => {
    return telemetry.get(driverId);
  }, [telemetry]);

  const getAllTelemetry = useCallback(() => {
    return Array.from(telemetry.values());
  }, [telemetry]);

  const startSession = useCallback((trackId: string, trackName: string, sessionType: 'practice' | 'qualifying' | 'race') => {
    mockTelemetryService.startSession(trackId, trackName, sessionType);
  }, []);

  const stopSession = useCallback(() => {
    mockTelemetryService.stopSession();
  }, []);

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
