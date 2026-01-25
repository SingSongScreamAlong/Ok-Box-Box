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

        // Start telemetry simulation with realistic update rate
        let lap = 1;
        let bestLap = 95.234; // ~1:35.234
        let lastLap = 96.892;
        let trackPos = 0; // 0-1 position around track
        let position = 8; // Start in P8
        let fuel = 18;
        let currentSpeed = 180;
        let currentDelta = 0.15;
        
        // Slower, more realistic update rate (1 second)
        const positionInterval = setInterval(() => {
          // Move around track more slowly (~1% per second = ~100 second lap)
          trackPos += 0.01;
          if (trackPos >= 1) {
            trackPos = 0;
            lap++;
            // Generate new lap time when crossing line
            lastLap = 94 + Math.random() * 4; // 1:34 to 1:38
            if (lastLap < bestLap) bestLap = lastLap;
            fuel = Math.max(0, fuel - 0.5); // Use fuel each lap
            // Position can change slightly each lap
            position = Math.max(1, Math.min(20, position + Math.floor(Math.random() * 3) - 1));
          }
          
          // Calculate sector (1, 2, or 3) based on track position
          const sector = trackPos < 0.33 ? 1 : trackPos < 0.66 ? 2 : 3;
          
          // Smooth speed changes based on track position
          const cornerFactor = Math.sin(trackPos * Math.PI * 6) * 0.15;
          const targetSpeed = 180 + (cornerFactor * 180);
          // Smooth interpolation toward target speed
          currentSpeed = currentSpeed + (targetSpeed - currentSpeed) * 0.3;
          
          // Delta drifts slowly
          currentDelta = currentDelta + (Math.random() - 0.5) * 0.1;
          currentDelta = Math.max(-2, Math.min(2, currentDelta)); // Clamp to +/- 2 seconds
          
          // Throttle/brake based on speed change
          const throttle = cornerFactor > 0 ? 85 : 50;
          const brake = cornerFactor < -0.05 ? 70 : 0;
          
          setTelemetry({
            lapTime: trackPos * 95, // Approximate lap time based on position
            lastLap: lastLap,
            bestLap: bestLap,
            delta: currentDelta,
            fuel: fuel,
            fuelPerLap: 0.5,
            lapsRemaining: Math.floor(fuel / 0.5),
            position: position,
            lap: lap,
            speed: currentSpeed,
            gear: currentSpeed < 100 ? 3 : currentSpeed < 150 ? 4 : currentSpeed < 180 ? 5 : 6,
            rpm: 4000 + (currentSpeed / 200) * 4000,
            throttle: throttle,
            brake: brake,
            trackPosition: trackPos,
            sector: sector,
            inPit: false,
          });
        }, 1000); // Update every 1 second - much calmer

        const interval = positionInterval; // Keep reference for cleanup

        setMockInterval(interval);
      }, 2000);
    }, 1500);
  }, [mockEnabled]);

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
