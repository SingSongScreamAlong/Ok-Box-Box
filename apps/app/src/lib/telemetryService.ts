import { supabase } from './supabase';

// Types
export interface TelemetryData {
  timestamp: number;
  speed: number;
  throttle: number;
  brake: number;
  steering: number;
  gear: number;
  rpm: number;
  fuel: number;
  fuelPerLap: number;
  tireTemp: { fl: number; fr: number; rl: number; rr: number };
  tireWear: { fl: number; fr: number; rl: number; rr: number };
  lapTime?: number;
  lapNumber?: number;
  sector?: number;
  position?: number;
  gap?: number;
  interval?: number;
}

export interface SessionData {
  id: string;
  userId: string;
  trackId: string;
  trackName: string;
  seriesId: string;
  seriesName: string;
  sessionType: 'practice' | 'qualify' | 'race' | 'time_trial';
  startTime: string;
  endTime?: string;
  laps: number;
  bestLap?: string;
  avgLap?: string;
  position?: { start: number; finish: number };
  incidents: number;
  iRatingChange?: number;
  srChange?: number;
}

export interface LapData {
  lapNumber: number;
  lapTime: number;
  lapTimeFormatted: string;
  sector1: number;
  sector2: number;
  sector3: number;
  fuelUsed: number;
  tireWearDelta: number;
  incidents: number;
  position: number;
  gap: number;
  isPersonalBest: boolean;
  isSessionBest: boolean;
}

export interface ReplayMarker {
  id: string;
  sessionId: string;
  timestamp: number;
  type: 'incident' | 'coaching' | 'highlight' | 'note';
  title: string;
  description: string;
  author: string;
  telemetrySnapshot?: TelemetryData;
  createdAt: string;
}

// Demo data removed - all data comes from API

// API Functions
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export async function fetchSessionHistory(userId: string, limit = 20): Promise<SessionData[]> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE}/api/v1/drivers/${userId}/sessions?limit=${limit}`, {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    });

    if (!response.ok) throw new Error('Failed to fetch sessions');
    return await response.json();
  } catch (error) {
    console.error('[Telemetry] Error fetching sessions:', error);
    return [];
  }
}

export async function fetchSessionDetail(sessionId: string): Promise<{ session: SessionData; laps: LapData[]; markers: ReplayMarker[] } | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE}/api/v1/sessions/${sessionId}`, {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    });

    if (!response.ok) throw new Error('Failed to fetch session');
    return await response.json();
  } catch (error) {
    console.error('[Telemetry] Error fetching session detail:', error);
    return null;
  }
}

export async function fetchLiveTelemetry(): Promise<TelemetryData | null> {
  // Live telemetry comes from the relay WebSocket via useRelay hook
  // This function is deprecated - use useRelay instead
  console.warn('[Telemetry] fetchLiveTelemetry is deprecated - use useRelay hook');
  return null;
}

export async function createReplayMarker(
  sessionId: string,
  marker: Omit<ReplayMarker, 'id' | 'createdAt'>
): Promise<{ data: ReplayMarker | null; error: string | null }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE}/api/v1/sessions/${sessionId}/markers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(marker)
    });

    if (!response.ok) throw new Error('Failed to create marker');
    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    console.error('[Telemetry] Marker creation failed:', error);
    return { data: null, error: 'Failed to create marker' };
  }
}

export async function deleteReplayMarker(sessionId: string, markerId: string): Promise<{ error: string | null }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE}/api/v1/sessions/${sessionId}/markers/${markerId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    });

    if (!response.ok) throw new Error('Failed to delete marker');
    return { error: null };
  } catch (error) {
    console.error('[Telemetry] Marker deletion failed:', error);
    return { error: 'Failed to delete marker' };
  }
}


// Comparison functions
export interface DriverComparisonData {
  driverId: string;
  driverName: string;
  laps: LapData[];
  bestLap: LapData | null;
  avgLapTime: number;
  consistency: number;
  telemetryTrace: { distance: number; speed: number; throttle: number; brake: number }[];
}

export async function fetchDriverComparison(
  sessionId: string,
  driverIds: string[]
): Promise<DriverComparisonData[]> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE}/api/v1/sessions/${sessionId}/compare?drivers=${driverIds.join(',')}`, {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    });

    if (!response.ok) throw new Error('Failed to fetch comparison');
    return await response.json();
  } catch (error) {
    console.error('[Telemetry] Error fetching comparison:', error);
    return [];
  }
}

