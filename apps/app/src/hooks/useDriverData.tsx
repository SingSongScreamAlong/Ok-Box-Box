import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  fetchDriverProfile,
  fetchDriverSessions,
  fetchDriverStats,
  DriverIdentityProfile,
  DriverSessionSummary,
  DriverStatsSnapshot,
  DriverDiscipline,
} from '../lib/driverService';

// Re-export types for convenience
export type { DriverIdentityProfile, DriverSessionSummary, DriverStatsSnapshot, DriverDiscipline };

// Telemetry data structure for live/simulated data
export interface TelemetryData {
  speed: number;
  rpm: number;
  gear: number;
  throttle: number;
  brake: number;
  fuel: number;
  fuelPerLap: number;
  lapsRemaining: number;
  lap: number;
  position: number;
  delta: number;
  lastLap: string;
  bestLap: string;
  gap: string;
  trackPercentage: number;
  incidents: number;
}

// Race progress data
export interface RaceProgress {
  currentLap: number;
  totalLaps: number;
  position: number;
  classPosition: number;
  gapToLeader: string;
  gapAhead: string;
  gapBehind: string;
  pitStops: number;
  lastPitLap: number | null;
  estimatedFinish: string;
}

// Context value interface
interface DriverDataContextValue {
  // Loading state
  loading: boolean;
  
  // Profile data
  profile: DriverIdentityProfile | null;
  
  // Session history
  sessions: DriverSessionSummary[];
  
  // Stats by discipline
  stats: DriverStatsSnapshot[];
  
  // Live/simulated telemetry
  telemetry: TelemetryData;
  
  // Race progress
  raceProgress: RaceProgress | null;
  
  // Helpers
  refreshProfile: () => Promise<void>;
  refreshSessions: () => Promise<void>;
  refreshStats: () => Promise<void>;
  getStatsByDiscipline: (discipline: DriverDiscipline) => DriverStatsSnapshot | undefined;
  
  // Telemetry simulation control
  isSimulating: boolean;
  setIsSimulating: (value: boolean) => void;
}

// Default telemetry for demo mode
const DEFAULT_TELEMETRY: TelemetryData = {
  speed: 0,
  rpm: 0,
  gear: 0,
  throttle: 0,
  brake: 0,
  fuel: 0,
  fuelPerLap: 0,
  lapsRemaining: 0,
  lap: 0,
  position: 0,
  delta: 0,
  lastLap: '--:--.---',
  bestLap: '--:--.---',
  gap: '--',
  trackPercentage: 0,
  incidents: 0,
};

// Create context
const DriverDataContext = createContext<DriverDataContextValue | null>(null);

// Provider component
export function DriverDataProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<DriverIdentityProfile | null>(null);
  const [sessions, setSessions] = useState<DriverSessionSummary[]>([]);
  const [stats, setStats] = useState<DriverStatsSnapshot[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetryData>(DEFAULT_TELEMETRY);
  const [raceProgress, setRaceProgress] = useState<RaceProgress | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Initial data load
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [profileData, sessionsData, statsData] = await Promise.all([
          fetchDriverProfile(),
          fetchDriverSessions(),
          fetchDriverStats(),
        ]);
        setProfile(profileData);
        setSessions(sessionsData);
        setStats(statsData);
      } catch (error) {
        console.error('[DriverData] Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Telemetry simulation
  useEffect(() => {
    if (!isSimulating) {
      setTelemetry(DEFAULT_TELEMETRY);
      setRaceProgress(null);
      return;
    }

    // Initialize simulated race
    setRaceProgress({
      currentLap: 1,
      totalLaps: 25,
      position: 8,
      classPosition: 3,
      gapToLeader: '+12.456',
      gapAhead: '-2.341',
      gapBehind: '+1.892',
      pitStops: 0,
      lastPitLap: null,
      estimatedFinish: '45:32',
    });

    let trackPos = 0;
    let lap = 1;
    let fuel = 45;
    
    const interval = setInterval(() => {
      trackPos = (trackPos + 0.008) % 1;
      
      // Lap completion
      if (trackPos < 0.01 && lap < 25) {
        lap++;
        fuel -= 1.8;
      }

      // Simulate speed based on track position (corners vs straights)
      const baseSpeed = 180;
      const speedVariation = Math.sin(trackPos * Math.PI * 8) * 40;
      const speed = Math.max(60, baseSpeed + speedVariation + (Math.random() - 0.5) * 10);

      setTelemetry({
        speed: Math.round(speed),
        rpm: Math.round(6000 + (speed / 200) * 2500 + Math.random() * 500),
        gear: speed < 80 ? 2 : speed < 120 ? 3 : speed < 160 ? 4 : speed < 200 ? 5 : 6,
        throttle: speed > 150 ? 100 : Math.round((speed / 150) * 100),
        brake: speed < 100 ? Math.round((100 - speed) / 100 * 80) : 0,
        fuel: Math.max(0, fuel),
        fuelPerLap: 1.8,
        lapsRemaining: Math.ceil(fuel / 1.8),
        lap,
        position: 8 - Math.floor(lap / 8), // Slowly gaining positions
        delta: -0.42 + (Math.random() - 0.5) * 0.3,
        lastLap: `1:${48 + Math.floor(Math.random() * 3)}.${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
        bestLap: '1:47.891',
        gap: `+${(12.456 - lap * 0.3).toFixed(1)}s`,
        trackPercentage: trackPos,
        incidents: lap > 10 ? 2 : 0,
      });

      setRaceProgress(prev => prev ? {
        ...prev,
        currentLap: lap,
        position: 8 - Math.floor(lap / 8),
        gapToLeader: `+${(12.456 - lap * 0.3).toFixed(3)}`,
      } : null);
    }, 50);

    return () => clearInterval(interval);
  }, [isSimulating]);

  // Refresh functions
  const refreshProfile = async () => {
    const data = await fetchDriverProfile();
    setProfile(data);
  };

  const refreshSessions = async () => {
    const data = await fetchDriverSessions();
    setSessions(data);
  };

  const refreshStats = async () => {
    const data = await fetchDriverStats();
    setStats(data);
  };

  const getStatsByDiscipline = (discipline: DriverDiscipline) => {
    return stats.find(s => s.discipline === discipline);
  };

  const value: DriverDataContextValue = {
    loading,
    profile,
    sessions,
    stats,
    telemetry,
    raceProgress,
    refreshProfile,
    refreshSessions,
    refreshStats,
    getStatsByDiscipline,
    isSimulating,
    setIsSimulating,
  };

  return (
    <DriverDataContext.Provider value={value}>
      {children}
    </DriverDataContext.Provider>
  );
}

// Hook to use driver data
export function useDriverData(): DriverDataContextValue {
  const context = useContext(DriverDataContext);
  if (!context) {
    throw new Error('useDriverData must be used within a DriverDataProvider');
  }
  return context;
}
