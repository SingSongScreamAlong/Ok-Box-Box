import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export type RelayStatus = 'disconnected' | 'connecting' | 'connected' | 'in_session';

export interface TelemetryData {
  lapTime: number | null;
  lastLap: number | null;
  bestLap: number | null;
  delta: number | null;
  fuel: number | null;
  fuelPerLap: number | null;
  lapsRemaining: number | null;
  position: number | null;
  lap: number | null;
  speed: number | null;
  gear: number | null;
  rpm: number | null;
  throttle: number | null;
  brake: number | null;
}

export interface SessionInfo {
  trackName: string | null;
  sessionType: 'practice' | 'qualifying' | 'race' | null;
  timeRemaining: number | null;
  lapsRemaining: number | null;
}

interface RelayContextValue {
  status: RelayStatus;
  telemetry: TelemetryData;
  session: SessionInfo;
  connect: () => void;
  disconnect: () => void;
}

const defaultTelemetry: TelemetryData = {
  lapTime: null,
  lastLap: null,
  bestLap: null,
  delta: null,
  fuel: null,
  fuelPerLap: null,
  lapsRemaining: null,
  position: null,
  lap: null,
  speed: null,
  gear: null,
  rpm: null,
  throttle: null,
  brake: null,
};

const defaultSession: SessionInfo = {
  trackName: null,
  sessionType: null,
  timeRemaining: null,
  lapsRemaining: null,
};

const RelayContext = createContext<RelayContextValue | null>(null);

const MOCK_ENABLED = import.meta.env.VITE_RELAY_MOCK === 'true';

export function RelayProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<RelayStatus>('disconnected');
  const [telemetry, setTelemetry] = useState<TelemetryData>(defaultTelemetry);
  const [session, setSession] = useState<SessionInfo>(defaultSession);
  const [mockInterval, setMockInterval] = useState<NodeJS.Timeout | null>(null);

  const startMockSimulation = useCallback(() => {
    if (!MOCK_ENABLED) return;

    // Simulate connection sequence
    setStatus('connecting');
    
    setTimeout(() => {
      setStatus('connected');
      
      // After 2 seconds, simulate entering a session
      setTimeout(() => {
        setStatus('in_session');
        setSession({
          trackName: 'Daytona International Speedway',
          sessionType: 'practice',
          timeRemaining: 3600,
          lapsRemaining: null,
        });

        // Start telemetry simulation
        let lap = 1;
        let bestLap = 999;
        
        const interval = setInterval(() => {
          const lapTime = 45 + Math.random() * 2; // ~45-47 second laps
          if (lapTime < bestLap) bestLap = lapTime;
          
          setTelemetry({
            lapTime: lapTime - Math.floor(lapTime / 45) * 45, // Current lap progress
            lastLap: lapTime,
            bestLap: bestLap,
            delta: (Math.random() - 0.5) * 2, // -1 to +1 seconds
            fuel: 18 - (lap * 0.5), // Decreasing fuel
            fuelPerLap: 0.5,
            lapsRemaining: Math.floor((18 - (lap * 0.5)) / 0.5),
            position: Math.floor(Math.random() * 20) + 1,
            lap: lap,
            speed: 180 + Math.random() * 20,
            gear: Math.floor(Math.random() * 4) + 3,
            rpm: 6000 + Math.random() * 2000,
            throttle: Math.random() * 100,
            brake: Math.random() * 30,
          });
          
          lap++;
        }, 3000); // Update every 3 seconds

        setMockInterval(interval);
      }, 2000);
    }, 1500);
  }, []);

  const stopMockSimulation = useCallback(() => {
    if (mockInterval) {
      clearInterval(mockInterval);
      setMockInterval(null);
    }
    setStatus('disconnected');
    setTelemetry(defaultTelemetry);
    setSession(defaultSession);
  }, [mockInterval]);

  const connect = useCallback(() => {
    if (MOCK_ENABLED) {
      startMockSimulation();
    } else {
      // Real WebSocket connection would go here
      setStatus('connecting');
      // TODO: Implement real relay connection
    }
  }, [startMockSimulation]);

  const disconnect = useCallback(() => {
    if (MOCK_ENABLED) {
      stopMockSimulation();
    } else {
      // Real WebSocket disconnection would go here
      setStatus('disconnected');
    }
  }, [stopMockSimulation]);

  // Auto-connect in mock mode on mount
  useEffect(() => {
    if (MOCK_ENABLED) {
      const timer = setTimeout(() => {
        connect();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [connect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mockInterval) {
        clearInterval(mockInterval);
      }
    };
  }, [mockInterval]);

  return (
    <RelayContext.Provider value={{ status, telemetry, session, connect, disconnect }}>
      {children}
    </RelayContext.Provider>
  );
}

export function useRelay() {
  const context = useContext(RelayContext);
  if (!context) {
    // Return disconnected state if outside provider
    return {
      status: 'disconnected' as RelayStatus,
      telemetry: defaultTelemetry,
      session: defaultSession,
      connect: () => {},
      disconnect: () => {},
    };
  }
  return context;
}
