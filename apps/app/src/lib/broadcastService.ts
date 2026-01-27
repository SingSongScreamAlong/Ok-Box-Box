import { supabase } from './supabase';

// Types
export interface BroadcastDriver {
  position: number;
  number: string;
  name: string;
  team: string;
  gap: string;
  interval: string;
  lastLap: string;
  bestLap: string;
  pits: number;
  status: 'racing' | 'pit' | 'out';
  isBattling?: boolean;
  color?: string;
}

export interface Battle {
  id: string;
  position: number;
  drivers: string[];
  gap: number;
  intensity: 'low' | 'medium' | 'high';
  forPosition: string;
}

export interface BroadcastConfig {
  id: string;
  leagueId: string;
  name: string;
  timingTower: boolean;
  battleGraphic: boolean;
  leaderboard: boolean;
  raceInfo: boolean;
  flagStatus: boolean;
  pitLane: boolean;
  driverCard: boolean;
  customColors: Record<string, string>;
  overlayUrl: string;
  streamKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface RaceState {
  sessionId: string;
  leagueId: string;
  eventName: string;
  trackName: string;
  seriesName: string;
  currentLap: number;
  totalLaps: number;
  flagStatus: 'green' | 'yellow' | 'red' | 'white' | 'checkered';
  timeRemaining?: number;
  drivers: BroadcastDriver[];
  battles: Battle[];
  isLive: boolean;
  startedAt?: string;
}

// Demo data generators
function generateDemoDrivers(): BroadcastDriver[] {
  return [
    { position: 1, number: '42', name: 'A. Thompson', team: 'Velocity Racing', gap: 'LEADER', interval: '-', lastLap: '1:47.234', bestLap: '1:46.891', pits: 2, status: 'racing' },
    { position: 2, number: '17', name: 'J. Mitchell', team: 'Apex Motorsport', gap: '+2.341', interval: '+2.341', lastLap: '1:47.456', bestLap: '1:47.012', pits: 2, status: 'racing', isBattling: true },
    { position: 3, number: '88', name: 'S. Rodriguez', team: 'Storm Racing', gap: '+2.892', interval: '+0.551', lastLap: '1:47.123', bestLap: '1:46.998', pits: 2, status: 'racing', isBattling: true },
    { position: 4, number: '23', name: 'C. Williams', team: 'Thunder GT', gap: '+8.234', interval: '+5.342', lastLap: '1:47.891', bestLap: '1:47.234', pits: 2, status: 'racing' },
    { position: 5, number: '7', name: 'M. Chen', team: 'Dragon Racing', gap: '+12.456', interval: '+4.222', lastLap: '1:48.012', bestLap: '1:47.456', pits: 3, status: 'racing' },
    { position: 6, number: '55', name: 'L. Petrov', team: 'Blitz Motorsport', gap: '+15.789', interval: '+3.333', lastLap: '1:47.678', bestLap: '1:47.123', pits: 2, status: 'pit' },
    { position: 7, number: '31', name: 'K. Tanaka', team: 'Rising Sun', gap: '+18.234', interval: '+2.445', lastLap: '1:48.234', bestLap: '1:47.567', pits: 2, status: 'racing' },
    { position: 8, number: '99', name: 'R. Santos', team: 'Velocity Racing', gap: '+22.567', interval: '+4.333', lastLap: '1:48.456', bestLap: '1:47.891', pits: 2, status: 'racing' },
  ];
}

function detectBattles(drivers: BroadcastDriver[]): Battle[] {
  const battles: Battle[] = [];
  
  for (let i = 1; i < drivers.length; i++) {
    const interval = parseFloat(drivers[i].interval.replace('+', ''));
    if (!isNaN(interval) && interval < 1.0) {
      const intensity: Battle['intensity'] = interval < 0.3 ? 'high' : interval < 0.6 ? 'medium' : 'low';
      battles.push({
        id: `battle_${i}`,
        position: drivers[i].position,
        drivers: [drivers[i - 1].name, drivers[i].name],
        gap: interval,
        intensity,
        forPosition: `P${drivers[i - 1].position}`
      });
    }
  }
  
  return battles;
}

function generateDemoConfig(leagueId: string): BroadcastConfig {
  const streamKey = `obb_live_${Math.random().toString(36).substring(7)}`;
  return {
    id: `config_${leagueId}`,
    leagueId,
    name: 'Default Broadcast',
    timingTower: true,
    battleGraphic: true,
    leaderboard: false,
    raceInfo: true,
    flagStatus: true,
    pitLane: true,
    driverCard: false,
    customColors: {},
    overlayUrl: `https://app.okboxbox.com/overlay/${streamKey}`,
    streamKey,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

// API Functions
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export async function fetchBroadcastConfig(leagueId: string): Promise<BroadcastConfig> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE}/api/v1/leagues/${leagueId}/broadcast/config`, {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    });

    if (!response.ok) throw new Error('Failed to fetch config');
    return await response.json();
  } catch (error) {
    console.warn('Using demo broadcast config:', error);
    return generateDemoConfig(leagueId);
  }
}

export async function updateBroadcastConfig(
  leagueId: string,
  updates: Partial<BroadcastConfig>
): Promise<{ data: BroadcastConfig | null; error: string | null }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE}/api/v1/leagues/${leagueId}/broadcast/config`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) throw new Error('Failed to update config');
    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    // Demo mode
    const current = generateDemoConfig(leagueId);
    return { data: { ...current, ...updates, updatedAt: new Date().toISOString() }, error: null };
  }
}

export async function fetchRaceState(leagueId: string, sessionId?: string): Promise<RaceState | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Not authenticated');

    const url = sessionId 
      ? `${API_BASE}/api/v1/leagues/${leagueId}/broadcast/state?session=${sessionId}`
      : `${API_BASE}/api/v1/leagues/${leagueId}/broadcast/state`;
      
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    });

    if (!response.ok) throw new Error('Failed to fetch race state');
    return await response.json();
  } catch (error) {
    console.warn('Using demo race state:', error);
    const drivers = generateDemoDrivers();
    return {
      sessionId: sessionId || 'demo_session',
      leagueId,
      eventName: 'Round 5 - Daytona',
      trackName: 'Daytona International Speedway',
      seriesName: 'IMSA GTD',
      currentLap: 42,
      totalLaps: 65,
      flagStatus: 'green',
      drivers,
      battles: detectBattles(drivers),
      isLive: false
    };
  }
}

export async function startBroadcast(leagueId: string, sessionId: string): Promise<{ error: string | null }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE}/api/v1/leagues/${leagueId}/broadcast/start`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sessionId })
    });

    if (!response.ok) throw new Error('Failed to start broadcast');
    return { error: null };
  } catch (error) {
    return { error: null }; // Demo mode
  }
}

export async function stopBroadcast(leagueId: string): Promise<{ error: string | null }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE}/api/v1/leagues/${leagueId}/broadcast/stop`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    });

    if (!response.ok) throw new Error('Failed to stop broadcast');
    return { error: null };
  } catch (error) {
    return { error: null }; // Demo mode
  }
}

// Real-time subscription for live race data
export function subscribeToRaceState(
  leagueId: string,
  callback: (state: RaceState) => void
): () => void {
  // In production, this would connect to a WebSocket
  // For demo, simulate updates every 3 seconds
  let currentLap = 42;
  const drivers = generateDemoDrivers();
  
  const interval = setInterval(() => {
    // Simulate lap progression
    currentLap = Math.min(currentLap + 0.1, 65);
    
    // Simulate gap changes
    const updatedDrivers = drivers.map((d, idx) => ({
      ...d,
      interval: idx === 0 ? '-' : `+${(parseFloat(d.interval.replace('+', '') || '0') + (Math.random() - 0.5) * 0.2).toFixed(3)}`,
      lastLap: `1:${47 + Math.floor(Math.random() * 2)}.${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`
    }));
    
    callback({
      sessionId: 'demo_session',
      leagueId,
      eventName: 'Round 5 - Daytona',
      trackName: 'Daytona International Speedway',
      seriesName: 'IMSA GTD',
      currentLap: Math.floor(currentLap),
      totalLaps: 65,
      flagStatus: 'green',
      drivers: updatedDrivers,
      battles: detectBattles(updatedDrivers),
      isLive: true
    });
  }, 3000);
  
  // Initial call
  callback({
    sessionId: 'demo_session',
    leagueId,
    eventName: 'Round 5 - Daytona',
    trackName: 'Daytona International Speedway',
    seriesName: 'IMSA GTD',
    currentLap,
    totalLaps: 65,
    flagStatus: 'green',
    drivers,
    battles: detectBattles(drivers),
    isLive: true
  });
  
  return () => clearInterval(interval);
}

// Utility functions
export function formatGap(gap: number): string {
  if (gap === 0) return 'LEADER';
  return `+${gap.toFixed(3)}`;
}

export function formatLapTime(ms: number): string {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  const millis = Math.floor(ms % 1000);
  return `${mins}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
}

export function getFlagColor(flag: RaceState['flagStatus']): string {
  const colors: Record<RaceState['flagStatus'], string> = {
    'green': '#22c55e',
    'yellow': '#fbbf24',
    'red': '#ef4444',
    'white': '#ffffff',
    'checkered': '#000000'
  };
  return colors[flag];
}

export function generateStreamKey(): string {
  return `obb_live_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
}
