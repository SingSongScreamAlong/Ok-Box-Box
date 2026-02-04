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
  trackPosition: number | null;
  sector: number | null;
  inPit: boolean;
  otherCars: CarMapPosition[];
}

export interface SessionInfo {
  trackName: string | null;
  sessionType: 'practice' | 'qualifying' | 'race' | null;
  timeRemaining: number | null;
  lapsRemaining: number | null;
}

export interface LiveIncident {
  id: string;
  type: string;
  sessionId: string;
  timestamp: number;
  sessionTime: number;
  lapNumber: number;
  involvedCars: {
    carId: number;
    driverId: string;
    driverName: string;
    carNumber: string;
    teamName: string;
    role: string;
  }[];
  trackPosition: number;
  cornerName: string;
  severity: 'low' | 'medium' | 'high';
  status: 'new' | 'reviewing' | 'cleared' | 'penalized';
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
  incidents: LiveIncident[];
  connect: () => void;
  disconnect: () => void;
  getCarMapPosition: (trackPos: number) => { x: number; y: number };
}

const RelayContext = createContext<RelayContextValue | null>(null);

// Helper to format lap time
function formatLapTime(seconds: number): string {
  if (!seconds || seconds <= 0) return '—';
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(3);
  return mins > 0 ? `${mins}:${secs.padStart(6, '0')}` : secs;
}

export function RelayProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<RelayStatus>('disconnected');
  const [initialized, setInitialized] = useState(false);
  const [telemetry, setTelemetry] = useState<TelemetryData>(defaultTelemetry);
  const [session, setSession] = useState<SessionInfo>(defaultSession);
  const [incidents, setIncidents] = useState<LiveIncident[]>([]);
  const socketRef = useRef<Socket | null>(null);

  // Helper to convert track position to x,y coordinates for map
  const getCarMapPosition = useCallback((trackPos: number): { x: number; y: number } => {
    const angle = trackPos * Math.PI * 2;
    return {
      x: 0.5 + Math.cos(angle) * 0.35,
      y: 0.5 + Math.sin(angle) * 0.25,
    };
  }, []);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      console.log('[Relay] Already connected, skipping reconnect');
      return;
    }
    
    if (socketRef.current) {
      console.log('[Relay] Disconnecting existing socket before reconnect');
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    const wsUrl = import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL || 'https://octopus-app-qsi3i.ondigitalocean.app';
    console.log('[Relay] Connecting to server:', wsUrl);
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

    // Session info from server
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

    socket.on('session:active', (data: any) => {
      console.log('[Relay] Session active:', data);
      setStatus('in_session');
      setSession(prev => ({
        ...prev,
        trackName: data.trackName || prev.trackName || 'Unknown Track',
        sessionType: (data.sessionType || prev.sessionType || 'practice').toLowerCase() as 'practice' | 'qualifying' | 'race',
      }));
    });

    socket.on('session:metadata', (data: any) => {
      console.log('[Relay] Session metadata:', data);
      setStatus('in_session');
      setSession(prev => ({
        ...prev,
        trackName: data.trackName || prev.trackName || 'Unknown Track',
        sessionType: (data.sessionType || prev.sessionType || 'practice').toLowerCase() as 'practice' | 'qualifying' | 'race',
      }));
    });

    // Handler for processing telemetry data
    const handleTelemetryData = (data: any) => {
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
        speed: car?.speed != null ? Math.round(car.speed * 2.237) : prev.speed,
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

    socket.on('telemetry_update', (data: any) => {
      handleTelemetryData(data);
    });

    socket.on('telemetry:driver', (data: any) => {
      console.log('[Relay] telemetry:driver received, cars:', data?.cars?.length, 'standings:', data?.standings?.length, 'keys:', Object.keys(data || {}));
      if (data?.standings?.[0]) {
        console.log('[Relay] First standing entry:', JSON.stringify(data.standings[0]));
      }
      handleTelemetryData(data);
      
      if (data?.trackName || data?.sessionType) {
        setSession(prev => ({
          ...prev,
          trackName: data.trackName || prev.trackName,
          sessionType: data.sessionType || prev.sessionType,
        }));
      }
      
      // Extract leaderboard from standings array (relay sends standings)
      const drivers = data?.standings || data?.drivers;
      const playerCarIdx = data?.cars?.[0]?.carIdx;
      
      if (drivers && Array.isArray(drivers) && drivers.length > 0) {
        const sortedDrivers = [...drivers].sort((a, b) => (a.position || 999) - (b.position || 999));
        setTelemetry(prev => ({
          ...prev,
          otherCars: sortedDrivers.map((driver, idx) => {
            const isPlayer = driver.isPlayer || driver.carIdx === playerCarIdx;
            return {
              trackPercentage: driver.lapDistPct || 0,
              carNumber: driver.carNumber || String(driver.position || idx + 1),
              driverName: driver.driverName || `Car ${idx + 1}`,
              position: driver.position || idx + 1,
              gap: isPlayer ? '—' : (driver.gapToLeader ? `+${driver.gapToLeader.toFixed(1)}s` : '--'),
              lastLap: driver.lastLapTime > 0 ? formatLapTime(driver.lastLapTime) : '—',
              color: isPlayer ? '#10b981' : '#374151',
              isPlayer,
            };
          }),
        }));
      }
    });

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

    socket.on('session:end', () => {
      console.log('[Relay] Session ended');
      setStatus('connected');
      setSession(defaultSession);
      setTelemetry(defaultTelemetry);
      setIncidents([]);
    });

    socket.on('incident:new', (data: any) => {
      console.log('[Relay] Incident received:', data);
      const incident: LiveIncident = {
        id: data.id || `inc-${Date.now()}`,
        type: data.type || 'contact',
        sessionId: data.sessionId || '',
        timestamp: data.timestamp || Date.now(),
        sessionTime: data.sessionTime || 0,
        lapNumber: data.lapNumber || 0,
        involvedCars: data.involvedCars || [],
        trackPosition: data.trackPosition || 0,
        cornerName: data.cornerName || 'Unknown',
        severity: data.severity || 'medium',
        status: 'new',
      };
      setIncidents(prev => [incident, ...prev].slice(0, 50));
    });
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setStatus('disconnected');
    setTelemetry(defaultTelemetry);
    setSession(defaultSession);
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (!initialized) {
      setInitialized(true);
      console.log('[Relay] Auto-connecting to server...');
      connect();
    }
  }, [initialized, connect]);

  return (
    <RelayContext.Provider value={{ status, telemetry, session, incidents, connect, disconnect, getCarMapPosition }}>
      {children}
    </RelayContext.Provider>
  );
}

export function useRelay() {
  const context = useContext(RelayContext);
  if (!context) {
    return {
      status: 'disconnected' as RelayStatus,
      telemetry: defaultTelemetry,
      session: defaultSession,
      incidents: [] as LiveIncident[],
      connect: () => {},
      disconnect: () => {},
      getCarMapPosition: (trackPos: number) => ({
        x: 0.5 + Math.cos(trackPos * Math.PI * 2) * 0.35,
        y: 0.5 + Math.sin(trackPos * Math.PI * 2) * 0.25,
      }),
    };
  }
  return context;
}
