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

// Demo data generators
function generateDemoTelemetry(lapProgress: number): TelemetryData {
  const inCorner = (lapProgress > 0.15 && lapProgress < 0.25) || 
                   (lapProgress > 0.45 && lapProgress < 0.55) ||
                   (lapProgress > 0.75 && lapProgress < 0.85);
  const onStraight = lapProgress > 0.85 || lapProgress < 0.1;
  
  return {
    timestamp: Date.now(),
    speed: onStraight ? 175 + Math.random() * 10 : inCorner ? 75 + Math.random() * 20 : 120 + Math.random() * 30,
    throttle: onStraight ? 100 : inCorner ? 30 + Math.random() * 40 : 70 + Math.random() * 30,
    brake: inCorner ? 50 + Math.random() * 40 : 0,
    steering: inCorner ? -20 + Math.random() * 40 : Math.random() * 5 - 2.5,
    gear: onStraight ? 6 : inCorner ? 2 : 4,
    rpm: onStraight ? 7800 : inCorner ? 5500 : 6500,
    fuel: 45 - (lapProgress * 3),
    fuelPerLap: 2.8 + Math.random() * 0.2,
    tireTemp: {
      fl: 88 + Math.random() * 10,
      fr: 89 + Math.random() * 10,
      rl: 85 + Math.random() * 8,
      rr: 86 + Math.random() * 8
    },
    tireWear: {
      fl: 5 + lapProgress * 2,
      fr: 6 + lapProgress * 2,
      rl: 4 + lapProgress * 1.5,
      rr: 5 + lapProgress * 1.5
    }
  };
}

function generateDemoLaps(count: number): LapData[] {
  const laps: LapData[] = [];
  const baseLapTime = 87000 + Math.random() * 2000;
  let bestTime = Infinity;
  
  for (let i = 1; i <= count; i++) {
    const variation = (Math.random() - 0.5) * 2000;
    const tireDeg = i > 15 ? (i - 15) * 50 : 0;
    const lapTime = baseLapTime + variation + tireDeg;
    
    if (lapTime < bestTime) bestTime = lapTime;
    
    const s1 = lapTime * 0.32 + (Math.random() - 0.5) * 300;
    const s2 = lapTime * 0.38 + (Math.random() - 0.5) * 400;
    const s3 = lapTime - s1 - s2;
    
    laps.push({
      lapNumber: i,
      lapTime,
      lapTimeFormatted: formatLapTime(lapTime),
      sector1: s1,
      sector2: s2,
      sector3: s3,
      fuelUsed: 2.8 + Math.random() * 0.3,
      tireWearDelta: 0.3 + Math.random() * 0.2,
      incidents: Math.random() > 0.95 ? 1 : 0,
      position: Math.max(1, Math.min(20, 5 + Math.floor((Math.random() - 0.5) * 6))),
      gap: i === 1 ? 0 : Math.random() * 5,
      isPersonalBest: lapTime === bestTime,
      isSessionBest: false
    });
  }
  
  // Mark session best
  const sessionBestIdx = laps.findIndex(l => l.lapTime === bestTime);
  if (sessionBestIdx >= 0) laps[sessionBestIdx].isSessionBest = true;
  
  return laps;
}

function formatLapTime(ms: number): string {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  const millis = Math.floor(ms % 1000);
  return `${mins}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
}

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
    console.warn('Using demo session data:', error);
    return generateDemoSessions(limit);
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
    console.warn('Using demo session detail:', error);
    return {
      session: generateDemoSessions(1)[0],
      laps: generateDemoLaps(25),
      markers: generateDemoMarkers(sessionId)
    };
  }
}

export async function fetchLiveTelemetry(): Promise<TelemetryData> {
  // In production, this would connect to the relay agent WebSocket
  // For now, return simulated data
  const lapProgress = (Date.now() % 107000) / 107000;
  return generateDemoTelemetry(lapProgress);
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
    console.warn('Marker creation failed:', error);
    // Return mock success for demo
    return {
      data: {
        ...marker,
        id: `marker_${Date.now()}`,
        sessionId,
        createdAt: new Date().toISOString()
      },
      error: null
    };
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
    return { error: null }; // Demo mode - pretend success
  }
}

// Demo data generators
function generateDemoSessions(count: number): SessionData[] {
  const tracks = [
    { id: 't1', name: 'Daytona International Speedway' },
    { id: 't2', name: 'Spa-Francorchamps' },
    { id: 't3', name: 'Nürburgring GP' },
    { id: 't4', name: 'Laguna Seca' },
    { id: 't5', name: 'Suzuka Circuit' }
  ];
  
  const series = [
    { id: 's1', name: 'IMSA Pilot Challenge' },
    { id: 's2', name: 'GT3 Sprint' },
    { id: 's3', name: 'Porsche Cup' }
  ];
  
  const sessions: SessionData[] = [];
  
  for (let i = 0; i < count; i++) {
    const track = tracks[Math.floor(Math.random() * tracks.length)];
    const ser = series[Math.floor(Math.random() * series.length)];
    const sessionTypes: SessionData['sessionType'][] = ['practice', 'qualify', 'race'];
    const type = sessionTypes[Math.floor(Math.random() * sessionTypes.length)];
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - i);
    
    sessions.push({
      id: `session_${i}`,
      userId: 'demo',
      trackId: track.id,
      trackName: track.name,
      seriesId: ser.id,
      seriesName: ser.name,
      sessionType: type,
      startTime: startDate.toISOString(),
      endTime: new Date(startDate.getTime() + 3600000).toISOString(),
      laps: 15 + Math.floor(Math.random() * 20),
      bestLap: formatLapTime(85000 + Math.random() * 5000),
      avgLap: formatLapTime(87000 + Math.random() * 3000),
      position: type === 'race' ? { start: 8 + Math.floor(Math.random() * 8), finish: 5 + Math.floor(Math.random() * 10) } : undefined,
      incidents: Math.floor(Math.random() * 4),
      iRatingChange: type === 'race' ? Math.floor((Math.random() - 0.3) * 100) : undefined,
      srChange: type === 'race' ? (Math.random() - 0.3) * 0.5 : undefined
    });
  }
  
  return sessions;
}

function generateDemoMarkers(sessionId: string): ReplayMarker[] {
  return [
    {
      id: 'm1',
      sessionId,
      timestamp: 245,
      type: 'incident',
      title: 'Contact at Bus Stop',
      description: 'Light contact with #42 entering the bus stop chicane.',
      author: 'AI Coach',
      createdAt: new Date().toISOString()
    },
    {
      id: 'm2',
      sessionId,
      timestamp: 512,
      type: 'coaching',
      title: 'Trail Brake Opportunity',
      description: 'You released the brake 15m before the apex. Try trailing deeper.',
      author: 'AI Coach',
      createdAt: new Date().toISOString()
    },
    {
      id: 'm3',
      sessionId,
      timestamp: 890,
      type: 'highlight',
      title: 'Great Overtake!',
      description: 'Clean pass on the outside of Turn 1.',
      author: 'AI Coach',
      createdAt: new Date().toISOString()
    }
  ];
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
    console.warn('Using demo comparison data:', error);
    return driverIds.map((id, idx) => generateDemoComparisonData(id, `Driver ${idx + 1}`));
  }
}

function generateDemoComparisonData(driverId: string, driverName: string): DriverComparisonData {
  const laps = generateDemoLaps(25);
  const validLaps = laps.filter(l => l.lapTime > 0);
  const bestLap = validLaps.reduce((best, lap) => 
    !best || lap.lapTime < best.lapTime ? lap : best, null as LapData | null);
  const avgLapTime = validLaps.reduce((sum, l) => sum + l.lapTime, 0) / validLaps.length;
  const variance = validLaps.reduce((sum, l) => sum + Math.pow(l.lapTime - avgLapTime, 2), 0) / validLaps.length;
  
  // Generate telemetry trace
  const trace: DriverComparisonData['telemetryTrace'] = [];
  for (let d = 0; d <= 100; d += 1) {
    const inCorner = (d > 15 && d < 25) || (d > 45 && d < 55) || (d > 75 && d < 85);
    const onStraight = d > 85 || d < 10;
    trace.push({
      distance: d,
      speed: onStraight ? 170 + Math.random() * 10 : inCorner ? 80 + Math.random() * 15 : 125 + Math.random() * 20,
      throttle: onStraight ? 100 : inCorner ? 35 + Math.random() * 30 : 75,
      brake: inCorner ? 70 + Math.random() * 20 : 0
    });
  }
  
  return {
    driverId,
    driverName,
    laps,
    bestLap,
    avgLapTime,
    consistency: Math.max(0, 100 - Math.sqrt(variance) / 10),
    telemetryTrace: trace
  };
}
