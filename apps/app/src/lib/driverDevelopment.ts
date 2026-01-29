import { supabase } from './supabase';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Types for Driver Development System
export interface Skill {
  name: string;
  level: number;
  maxLevel: number;
  progress: number;
  status: 'mastered' | 'learning' | 'next' | 'locked';
  description: string;
}

export interface FocusArea {
  id: string;
  title: string;
  description: string;
  insight: string;
  evidence: string;
  progress: number;
  drills: { name: string; completed: boolean }[];
  recentImprovement?: string;
}

export interface LearningMoment {
  session: string;
  date: string;
  insight: string;
  improvement: string;
  metric?: { label: string; before: string; after: string };
}

export interface Goal {
  id: string;
  title: string;
  target: string;
  current: number;
  max: number;
  deadline?: string;
}

export interface DevelopmentData {
  currentPhase: string;
  phaseProgress: number;
  weeklyFocus: string;
  focusAreas: FocusArea[];
  skillTree: {
    category: string;
    skills: Skill[];
  }[];
  learningMoments: LearningMoment[];
  goals: Goal[];
  coachingNotes: string[];
  nextSession: {
    focus: string;
    drills: string[];
    reminder: string;
  };
}

export interface DriverMemory {
  id: string;
  driverId: string;
  category: 'tendency' | 'preference' | 'strength' | 'weakness' | 'insight';
  content: string;
  confidence: number;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface DriverTarget {
  id: string;
  driverId: string;
  metric: string;
  currentValue: number;
  targetValue: number;
  deadline?: string;
  status: 'active' | 'achieved' | 'missed';
  progress: number;
}

export interface SessionBehavior {
  sessionId: string;
  driverId: string;
  consistency: number;
  aggression: number;
  riskTaking: number;
  racecraft: number;
  tireManagement: number;
  fuelManagement: number;
  incidentRate: number;
  positionsGained: number;
}

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    return { 'Authorization': `Bearer ${session.access_token}` };
  }
  return {};
}

// Demo data removed - all data comes from API

// Fetch development data
export async function fetchDevelopmentData(): Promise<DevelopmentData> {
  try {
    const auth = await getAuthHeader();
    if (!auth.Authorization) {
      console.log('[Dev] No auth token, returning null (demo disabled)');
      return null as unknown as DevelopmentData;
    }

    const response = await fetch(`${API_BASE}/api/v1/drivers/me/development`, {
      headers: { ...auth, 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      console.log('[Dev] API error, returning null (demo disabled)');
      return null as unknown as DevelopmentData;
    }

    const data = await response.json();
    return data as DevelopmentData;
  } catch (error) {
    console.error('[Dev] Error fetching development data:', error);
    return null as unknown as DevelopmentData;
  }
}

// Fetch driver memories
export async function fetchDriverMemories(): Promise<DriverMemory[]> {
  try {
    const auth = await getAuthHeader();
    if (!auth.Authorization) {
      return []; // Demo disabled
    }

    const response = await fetch(`${API_BASE}/api/v1/drivers/me/memories`, {
      headers: { ...auth, 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      return []; // Demo disabled
    }

    const data = await response.json();
    return data.memories || [];
  } catch (error) {
    console.error('[Dev] Error fetching memories:', error);
    return []; // Demo disabled
  }
}

// Fetch driver targets
export async function fetchDriverTargets(): Promise<DriverTarget[]> {
  try {
    const auth = await getAuthHeader();
    if (!auth.Authorization) {
      return []; // Demo disabled
    }

    const response = await fetch(`${API_BASE}/api/v1/drivers/me/targets`, {
      headers: { ...auth, 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      return []; // Demo disabled
    }

    const data = await response.json();
    return data.targets || [];
  } catch (error) {
    console.error('[Dev] Error fetching targets:', error);
    return []; // Demo disabled
  }
}

// Create a new target
export async function createTarget(target: Omit<DriverTarget, 'id' | 'driverId' | 'progress'>): Promise<DriverTarget | null> {
  try {
    const auth = await getAuthHeader();
    if (!auth.Authorization) {
      return null;
    }

    const response = await fetch(`${API_BASE}/api/v1/drivers/me/targets`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify(target),
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[Dev] Error creating target:', error);
    return null;
  }
}

// Update drill completion
export async function updateDrillCompletion(focusAreaId: string, drillName: string, completed: boolean): Promise<boolean> {
  try {
    const auth = await getAuthHeader();
    if (!auth.Authorization) {
      return false;
    }

    const response = await fetch(`${API_BASE}/api/v1/drivers/me/development/drills`, {
      method: 'PATCH',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ focusAreaId, drillName, completed }),
    });

    return response.ok;
  } catch (error) {
    console.error('[Dev] Error updating drill:', error);
    return false;
  }
}

// Fetch session behavior analysis
export async function fetchSessionBehavior(sessionId: string): Promise<SessionBehavior | null> {
  try {
    const auth = await getAuthHeader();
    if (!auth.Authorization) {
      return null;
    }

    const response = await fetch(`${API_BASE}/api/v1/sessions/${sessionId}/behavior`, {
      headers: { ...auth, 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[Dev] Error fetching session behavior:', error);
    return null;
  }
}

// Request AI coaching insight
export async function requestCoachingInsight(context: string): Promise<string | null> {
  try {
    const auth = await getAuthHeader();
    if (!auth.Authorization) {
      return 'Focus on smooth inputs and patience. Your recent sessions show improvement in consistency.';
    }

    const response = await fetch(`${API_BASE}/api/v1/drivers/me/coaching`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ context }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.insight;
  } catch (error) {
    console.error('[Dev] Error requesting coaching insight:', error);
    return null;
  }
}

// Get skill recommendations based on current performance
export async function getSkillRecommendations(): Promise<string[]> {
  try {
    const auth = await getAuthHeader();
    if (!auth.Authorization) {
      return [
        'Focus on trail braking to improve corner entry speed',
        'Practice race starts in test sessions',
        'Work on tire management for longer stints',
      ];
    }

    const response = await fetch(`${API_BASE}/api/v1/drivers/me/recommendations`, {
      headers: { ...auth, 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.recommendations || [];
  } catch (error) {
    console.error('[Dev] Error fetching recommendations:', error);
    return [];
  }
}
