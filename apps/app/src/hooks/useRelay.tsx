import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

export type RelayStatus = 'disconnected' | 'connecting' | 'connected' | 'in_session';

export interface CarMapPosition {
  trackPercentage: number;
  carNumber?: string;
  driverName?: string;
  position?: number;
  color?: string;
  isPlayer?: boolean;
  gap?: string;
  lastLap?: string;
}

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
  // Other cars on track
  otherCars: CarMapPosition[];
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
  otherCars: [],
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

// MOCK DISABLED - Always use real mode
const getInitialMockState = (): boolean => {
  // Mock mode disabled - always return false to use real data
  // const envValue = import.meta.env.VITE_RELAY_MOCK;
  // return envValue === 'true';
  return false;
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
    console.log('[Relay] Starting mock simulation...');
    
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
          
          // Generate mock other cars spread around track
          const mockOtherCars: CarMapPosition[] = [
            { trackPercentage: (trackPos + 0.05) % 1, carNumber: '44', position: position - 1, color: '#ef4444' },
            { trackPercentage: (trackPos + 0.12) % 1, carNumber: '77', position: position - 2, color: '#22c55e' },
            { trackPercentage: (trackPos + 0.25) % 1, carNumber: '33', position: position - 3, color: '#3b82f6' },
            { trackPercentage: (trackPos - 0.08 + 1) % 1, carNumber: '11', position: position + 1, color: '#f97316' },
            { trackPercentage: (trackPos - 0.15 + 1) % 1, carNumber: '55', position: position + 2, color: '#a855f7' },
          ];

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
            otherCars: mockOtherCars,
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

  // Socket.IO reference for real connection
  const socketRef = useRef<Socket | null>(null);

  const connectReal = useCallback(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL || 'http://localhost:3001';
    console.log('[Relay] Connecting to real server:', wsUrl);
    setStatus('connecting');

    const socket = io(wsUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Relay] Connected to server');
      setStatus('connected');
      // Register as dashboard client
      socket.emit('dashboard:join', { type: 'driver' });
    });

    socket.on('disconnect', () => {
      console.log('[Relay] Disconnected from server');
      setStatus('disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('[Relay] Connection error:', error);
      setStatus('disconnected');
    });

    // Session info from server (matches server's session_info event)
    socket.on('session_info', (data: any) => {
      console.log('[Relay] Session info:', data);
      setStatus('in_session');
      setSession({
        trackName: data.track || data.trackName || 'Unknown Track',
        sessionType: (data.session || data.sessionType || 'practice').toLowerCase() as 'practice' | 'qualifying' | 'race',
        timeRemaining: data.remainingTime || null,
        lapsRemaining: data.totalLaps || null,
      });
    });

    // Session active event (sent when client connects to active session)
    socket.on('session:active', (data: any) => {
      console.log('[Relay] Session active:', data);
      setStatus('in_session');
      setSession(prev => ({
        ...prev,
        trackName: data.trackName || prev.trackName || 'Unknown Track',
        sessionType: (data.sessionType || prev.sessionType || 'practice').toLowerCase() as 'practice' | 'qualifying' | 'race',
      }));
    });

    // Session metadata event (from relay via server)
    socket.on('session:metadata', (data: any) => {
      console.log('[Relay] Session metadata:', data);
      setStatus('in_session');
      setSession(prev => ({
        ...prev,
        trackName: data.trackName || prev.trackName || 'Unknown Track',
        sessionType: (data.sessionType || prev.sessionType || 'practice').toLowerCase() as 'practice' | 'qualifying' | 'race',
      }));
    });

    // Handler for processing telemetry data from any event
    const handleTelemetryData = (data: any) => {
      // Handle nested data structure from production server
      // Production sends: { type: 'telemetry', cars: [...], drivers: [...] }
      const car = data?.cars?.[0];
      const driver = data?.drivers?.[0];
      const driverData = car || driver || data;
      
      setStatus('in_session');
      setTelemetry(prev => ({
        ...prev,
        lapTime: driverData.lapTime ?? prev.lapTime,
        lastLap: driver?.lastLapTime ?? driverData.lastLap ?? prev.lastLap,
        bestLap: driver?.bestLapTime ?? driverData.bestLap ?? prev.bestLap,
        delta: driverData.deltaToBestLap ?? driverData.delta ?? prev.delta,
        fuel: driverData.fuel?.level ?? driverData.fuelLevel ?? driverData.fuel ?? prev.fuel,
        fuelPerLap: driverData.fuel?.usagePerHour ? driverData.fuel.usagePerHour / 60 : prev.fuelPerLap,
        lapsRemaining: prev.lapsRemaining,
        position: driver?.position ?? car?.position ?? driverData.position ?? prev.position,
        lap: driver?.lapNumber ?? car?.lap ?? driverData.lap ?? prev.lap,
        speed: car?.speed != null ? Math.round(car.speed * 2.237) : prev.speed, // m/s to mph
        gear: car?.gear ?? driverData.gear ?? prev.gear,
        rpm: car?.rpm ?? driverData.rpm ?? prev.rpm,
        throttle: car?.throttle != null ? car.throttle * 100 : prev.throttle,
        brake: car?.brake != null ? car.brake * 100 : prev.brake,
        trackPosition: driver?.lapDistPct ?? car?.pos?.s ?? driverData.trackPosition ?? prev.trackPosition,
        sector: driverData.sector ?? prev.sector,
        inPit: car?.inPit ?? driverData.onPitRoad ?? prev.inPit,
        otherCars: prev.otherCars,
      }));
    };

    // Telemetry updates - listen to multiple event names for compatibility
    socket.on('telemetry_update', (data: any) => {
      console.log('[Relay] telemetry_update received');
      handleTelemetryData(data);
    });

    // Production server sends telemetry:driver event
    socket.on('telemetry:driver', (data: any) => {
      console.log('[Relay] telemetry:driver received');
      handleTelemetryData(data);
      
      // Extract leaderboard from drivers array
      const drivers = data?.drivers;
      const playerDriverId = data?.cars?.[0]?.driverId; // First car is the player
      
      if (drivers && Array.isArray(drivers) && drivers.length > 0) {
        const sortedDrivers = [...drivers].sort((a, b) => (a.position || 999) - (b.position || 999));
        setTelemetry(prev => ({
          ...prev,
          otherCars: sortedDrivers.map((driver, idx) => {
            const isPlayer = driver.driverId === playerDriverId;
            return {
              trackPercentage: driver.lapDistPct || 0,
              carNumber: driver.carNumber || String(driver.position || idx + 1),
              driverName: driver.driverName || `Car ${idx + 1}`,
              position: driver.position || idx + 1,
              gap: isPlayer ? '—' : (driver.gapToLeader ? `+${driver.gapToLeader.toFixed(1)}s` : '--'),
              lastLap: driver.lastLapTime > 0 ? formatLapTime(driver.lastLapTime) : '—',
              color: isPlayer ? '#10b981' : '#374151', // Green for player
              isPlayer,
            };
          }),
        }));
      }
    });
    
    // Helper to format lap time
    function formatLapTime(seconds: number): string {
      if (!seconds || seconds <= 0) return '—';
      const mins = Math.floor(seconds / 60);
      const secs = (seconds % 60).toFixed(3);
      return mins > 0 ? `${mins}:${secs.padStart(6, '0')}` : secs;
    }

    // Competitor data for leaderboard
    socket.on('competitor_data', (data: any[]) => {
      console.log('[Relay] Competitor data:', data?.length, 'cars');
      if (data && Array.isArray(data)) {
        setTelemetry(prev => ({
          ...prev,
          otherCars: data.map((car, idx) => ({
            trackPercentage: 0,
            carNumber: String(car.position || idx + 1),
            driverName: car.driver || `Car ${idx + 1}`,
            position: car.position || idx + 1,
            gap: car.gap,
            lastLap: car.lastLap,
            color: '#374151',
            isPlayer: car.gap === '—',
          })),
        }));
      }
    });

    // Session ended
    socket.on('session:end', () => {
      console.log('[Relay] Session ended');
      setStatus('connected');
      setSession(defaultSession);
      setTelemetry(defaultTelemetry);
    });
  }, []);

  const disconnectReal = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setStatus('disconnected');
    setTelemetry(defaultTelemetry);
    setSession(defaultSession);
  }, []);

  const connect = useCallback(() => {
    if (mockEnabled) {
      startMockSimulation();
    } else {
      connectReal();
    }
  }, [mockEnabled, startMockSimulation, connectReal]);

  const disconnect = useCallback(() => {
    if (mockEnabled) {
      stopMockSimulation();
    } else {
      disconnectReal();
    }
  }, [mockEnabled, stopMockSimulation, disconnectReal]);

  // Auto-connect on mount (both mock and real mode)
  useEffect(() => {
    if (!initialized) {
      setInitialized(true);
      console.log('[Relay] Initializing, mockEnabled:', mockEnabled);
      
      if (!mockEnabled) {
        // Auto-connect to real server
        console.log('[Relay] Auto-connecting to real server...');
        connectReal();
        return;
      }
      
      if (mockEnabled) {
        console.log('[Relay] Auto-connecting mock in 1 second...');
        const timer = setTimeout(() => {
          console.log('[Relay] Triggering mock simulation now');
          // Inline the mock start to avoid closure issues
          setStatus('connecting');
          
          setTimeout(() => {
            setStatus('connected');
            
            setTimeout(() => {
              setStatus('in_session');
              setSession({
                trackName: 'Daytona International Speedway',
                sessionType: 'practice',
                timeRemaining: 3600,
                lapsRemaining: null,
              });

              let lap = 1;
              let bestLap = 95.234;
              let lastLap = 96.892;
              let trackPos = 0;
              let position = 8;
              let fuel = 18;
              let currentSpeed = 180;
              let currentDelta = 0.15;
              
              const interval = setInterval(() => {
                trackPos += 0.01;
                if (trackPos >= 1) {
                  trackPos = 0;
                  lap++;
                  lastLap = 94 + Math.random() * 4;
                  if (lastLap < bestLap) bestLap = lastLap;
                  fuel = Math.max(0, fuel - 0.5);
                  position = Math.max(1, Math.min(20, position + Math.floor(Math.random() * 3) - 1));
                }
                
                const sector = trackPos < 0.33 ? 1 : trackPos < 0.66 ? 2 : 3;
                const cornerFactor = Math.sin(trackPos * Math.PI * 6) * 0.15;
                const targetSpeed = 180 + (cornerFactor * 180);
                currentSpeed = currentSpeed + (targetSpeed - currentSpeed) * 0.3;
                currentDelta = currentDelta + (Math.random() - 0.5) * 0.1;
                currentDelta = Math.max(-2, Math.min(2, currentDelta));
                const throttle = cornerFactor > 0 ? 85 : 50;
                const brake = cornerFactor < -0.05 ? 70 : 0;
                
                // Generate mock other cars spread around track
                const mockOtherCars: CarMapPosition[] = [
                  { trackPercentage: (trackPos + 0.05) % 1, carNumber: '44', position: position - 1, color: '#ef4444' },
                  { trackPercentage: (trackPos + 0.12) % 1, carNumber: '77', position: position - 2, color: '#22c55e' },
                  { trackPercentage: (trackPos + 0.25) % 1, carNumber: '33', position: position - 3, color: '#3b82f6' },
                  { trackPercentage: (trackPos - 0.08 + 1) % 1, carNumber: '11', position: position + 1, color: '#f97316' },
                  { trackPercentage: (trackPos - 0.15 + 1) % 1, carNumber: '55', position: position + 2, color: '#a855f7' },
                ];

                setTelemetry({
                  lapTime: trackPos * 95,
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
                  otherCars: mockOtherCars,
                });
              }, 1000);

              setMockInterval(interval);
            }, 2000);
          }, 1500);
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [initialized, mockEnabled, connectReal]);  // Include connectReal for real mode auto-connect

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
