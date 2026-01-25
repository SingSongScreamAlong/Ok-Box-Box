import { useState, useEffect, useCallback } from 'react';
import { useRelay } from './useRelay';

/**
 * Driver States - The five phases of a driver's racing lifecycle
 * 
 * PRE_SESSION: 0-60 min before scheduled race/practice
 * IN_CAR: iRacing session detected and active
 * POST_RUN: Session just ended (within 30 min)
 * BETWEEN_SESSIONS: No upcoming session in 2+ hours
 * SEASON_LEVEL: Weekly/monthly review cadence
 */
export type DriverState = 
  | 'PRE_SESSION'
  | 'IN_CAR'
  | 'POST_RUN'
  | 'BETWEEN_SESSIONS'
  | 'SEASON_LEVEL';

interface SessionMemory {
  lastSessionEnd: number | null;
  lastSessionType: string | null;
  lastTrackName: string | null;
  lastPosition: number | null;
  sessionCount: number;
}

interface DriverStateContext {
  state: DriverState;
  sessionMemory: SessionMemory;
  timeSinceLastSession: number | null;
  isLive: boolean;
  confidence: number;
}

const STORAGE_KEY = 'okbb_session_memory';

function loadSessionMemory(): SessionMemory {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('Failed to load session memory:', e);
  }
  return {
    lastSessionEnd: null,
    lastSessionType: null,
    lastTrackName: null,
    lastPosition: null,
    sessionCount: 0,
  };
}

function saveSessionMemory(memory: SessionMemory) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
  } catch (e) {
    console.warn('Failed to save session memory:', e);
  }
}

export function useDriverState(): DriverStateContext {
  const { status, session, telemetry } = useRelay();
  const [sessionMemory, setSessionMemory] = useState<SessionMemory>(loadSessionMemory);
  const [wasInSession, setWasInSession] = useState(false);

  // Detect session end and save memory
  useEffect(() => {
    const isInSession = status === 'in_session' || status === 'connected';
    if (isInSession) {
      setWasInSession(true);
    } else if (wasInSession && !isInSession && status !== 'connecting') {
      // Session just ended
      const memory: SessionMemory = {
        lastSessionEnd: Date.now(),
        lastSessionType: session.sessionType || null,
        lastTrackName: session.trackName || null,
        lastPosition: telemetry.position,
        sessionCount: sessionMemory.sessionCount + 1,
      };
      setSessionMemory(memory);
      saveSessionMemory(memory);
      setWasInSession(false);
    }
  }, [status, wasInSession, session, telemetry.position, sessionMemory.sessionCount]);

  // Calculate time since last session
  const timeSinceLastSession = sessionMemory.lastSessionEnd
    ? Date.now() - sessionMemory.lastSessionEnd
    : null;

  // Determine current driver state
  const determineState = useCallback((): DriverState => {
    // IN_CAR: Active session
    if (status === 'in_session' || status === 'connected') {
      return 'IN_CAR';
    }

    // Connecting is transitional - treat as approaching IN_CAR
    if (status === 'connecting') {
      return 'PRE_SESSION';
    }

    // No active connection - determine based on time
    if (timeSinceLastSession !== null) {
      const minutes = timeSinceLastSession / (1000 * 60);
      const hours = minutes / 60;
      const days = hours / 24;

      // POST_RUN: Within 30 minutes of session end
      if (minutes < 30) {
        return 'POST_RUN';
      }

      // BETWEEN_SESSIONS: Within 24 hours
      if (hours < 24) {
        return 'BETWEEN_SESSIONS';
      }

      // SEASON_LEVEL: More than 24 hours since last session
      if (days >= 1) {
        return 'SEASON_LEVEL';
      }
    }

    // Default: No session history, show between-sessions view
    return 'BETWEEN_SESSIONS';
  }, [status, timeSinceLastSession]);

  const state = determineState();

  // Confidence score (0-1) based on data quality
  const confidence = (() => {
    if (status === 'in_session') return 1.0;
    if (status === 'connected') return 0.9;
    if (sessionMemory.lastSessionEnd) return 0.7;
    return 0.5; // No session history
  })();

  return {
    state,
    sessionMemory,
    timeSinceLastSession,
    isLive: status === 'in_session' || status === 'connected',
    confidence,
  };
}
