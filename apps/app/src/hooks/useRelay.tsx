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
  // Track position data for map visualization
  trackPosition: number | null; // 0-1 position around track (LapDistPct)
  sector: number | null; // Current sector 1, 2, or 3
  inPit: boolean;
}

export interface SessionInfo {
  trackName: string | null;
  sessionType: 'practice' | 'qualifying' | 'race' | null;
  timeRemaining: number | null;
  lapsRemaining: number | null;
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
  trackPosition: null,
  sector: null,
  inPit: false,
};

const defaultSession: SessionInfo = {
  trackName: null,
  sessionType: null,
  timeRemaining: null,
  lapsRemaining: null,
};

interface RelayContextValue {
  status: RelayStatus;
  telemetry: TelemetryData;
  session: SessionInfo;
  connect: () => void;
  disconnect: () => void;
  getCarMapPosition: (trackPos: number) => { x: number; y: number };
  mockEnabled: boolean;
  toggleMock: () => void;
}

const RelayContext = createContext<RelayContextValue | null>(null);

// Default to mock mode enabled for demo/development
const getInitialMockState = (): boolean => {
  const envValue = import.meta.env.VITE_RELAY_MOCK;
  if (envValue === 'false') return false;
  // Default to true for demo purposes
  return true;
};

console.log('[Relay] Initial mock mode:', getInitialMockState());

export function RelayProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<RelayStatus>('disconnected');
  const [initialized, setInitialized] = useState(false);
  const [telemetry, setTelemetry] = useState<TelemetryData>(defaultTelemetry);
  const [session, setSession] = useState<SessionInfo>(defaultSession);
  const [mockInterval, setMockInterval] = useState<NodeJS.Timeout | null>(null);
  const [mockEnabled, setMockEnabled] = useState(getInitialMockState);

  const toggleMock = useCallback(() => {
    setMockEnabled(prev => !prev);
  }, []);

  const startMockSimulation = useCallback(() => {
    if (!mockEnabled) return;

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

        // Start telemetry simulation with smooth track position updates
        let lap = 1;
        let bestLap = 999;
        let trackPos = 0; // 0-1 position around track
        
        // Fast update for smooth car movement (60fps-ish)
        const positionInterval = setInterval(() => {
          trackPos += 0.005; // Move ~0.5% of track per update
          if (trackPos >= 1) {
            trackPos = 0;
            lap++;
          }
          
          // Calculate sector (1, 2, or 3) based on track position
          const sector = trackPos < 0.33 ? 1 : trackPos < 0.66 ? 2 : 3;
          
          // Simulate speed variations based on track position
          // Slower in corners (around 0.15, 0.45, 0.75), faster on straights
          const cornerFactor = Math.sin(trackPos * Math.PI * 6) * 0.15;
          const baseSpeed = 180;
          const speed = baseSpeed + (cornerFactor * baseSpeed) + (Math.random() * 5);
          
          // Throttle/brake based on speed change
          const throttle = cornerFactor > 0 ? 80 + Math.random() * 20 : 40 + Math.random() * 30;
          const brake = cornerFactor < -0.05 ? 50 + Math.random() * 50 : Math.random() * 10;
          
          const lapTime = 45 + Math.random() * 2;
          if (lapTime < bestLap) bestLap = lapTime;
          
          setTelemetry({
            lapTime: trackPos * 45, // Approximate lap time based on position
            lastLap: lapTime,
            bestLap: bestLap,
            delta: (Math.random() - 0.5) * 2,
            fuel: Math.max(0, 18 - (lap * 0.5)),
            fuelPerLap: 0.5,
            lapsRemaining: Math.floor(Math.max(0, 18 - (lap * 0.5)) / 0.5),
            position: Math.floor(Math.random() * 20) + 1,
            lap: lap,
            speed: speed,
            gear: speed < 100 ? 3 : speed < 150 ? 4 : speed < 180 ? 5 : 6,
            rpm: 4000 + (speed / 200) * 4000,
            throttle: throttle,
            brake: brake,
            trackPosition: trackPos,
            sector: sector,
            inPit: false,
          });
        }, 50); // Update every 50ms for smooth animation

        const interval = positionInterval; // Keep reference for cleanup

        setMockInterval(interval);
      }, 2000);
    }, 1500);
  }, []);

  // Helper to convert track position to x,y coordinates for map
  // This would be track-specific in production
  const getCarMapPosition = useCallback((trackPos: number): { x: number; y: number } => {
    // Simple oval approximation - real tracks would have proper path data
    const angle = trackPos * Math.PI * 2;
    return {
      x: 0.5 + Math.cos(angle) * 0.35,
      y: 0.5 + Math.sin(angle) * 0.25,
    };
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
    if (mockEnabled) {
      startMockSimulation();
    } else {
      // Real WebSocket connection would go here
      setStatus('connecting');
      // TODO: Implement real relay connection
    }
  }, [mockEnabled, startMockSimulation]);

  const disconnect = useCallback(() => {
    if (mockEnabled) {
      stopMockSimulation();
    } else {
      // Real WebSocket disconnection would go here
      setStatus('disconnected');
    }
  }, [mockEnabled, stopMockSimulation]);

  // Auto-connect in mock mode on mount
  useEffect(() => {
    if (mockEnabled && !initialized) {
      setInitialized(true);
      console.log('[Relay] Auto-connecting mock...');
      const timer = setTimeout(() => {
        startMockSimulation();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [mockEnabled, initialized, startMockSimulation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mockInterval) {
        clearInterval(mockInterval);
      }
    };
  }, [mockInterval]);

  return (
    <RelayContext.Provider value={{ status, telemetry, session, connect, disconnect, getCarMapPosition, mockEnabled, toggleMock }}>
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
      getCarMapPosition: (trackPos: number) => ({
        x: 0.5 + Math.cos(trackPos * Math.PI * 2) * 0.35,
        y: 0.5 + Math.sin(trackPos * Math.PI * 2) * 0.25,
      }),
      mockEnabled: false,
      toggleMock: () => {},
    };
  }
  return context;
}
