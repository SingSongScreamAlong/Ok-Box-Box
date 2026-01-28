/**
 * Goals Service
 * 
 * Frontend service for driver development goals.
 * Connects to the /api/v1/goals endpoints.
 */

import { supabase } from './supabase';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// =====================================================================
// Types
// =====================================================================

export interface Goal {
  id: string;
  title: string;
  description: string | null;
  category: 'irating' | 'safety_rating' | 'lap_time' | 'consistency' | 'wins' | 'podiums' | 'clean_races' | 'license' | 'custom';
  metricKey: string | null;
  targetValue: number;
  currentValue: number;
  startingValue: number;
  unit: string | null;
  trackName: string | null;
  carName: string | null;
  discipline: string | null;
  seriesName: string | null;
  status: 'suggested' | 'active' | 'achieved' | 'failed' | 'dismissed' | 'paused';
  priority: number;
  deadline: string | null;
  source: 'self_set' | 'ai_recommended' | 'team_assigned' | 'system_milestone';
  aiRationale: string | null;
  aiConfidence: number | null;
  progressPct: number;
  lastProgressUpdate: string | null;
  createdAt: string;
  updatedAt: string;
  achievedAt: string | null;
}

export interface GoalSuggestion {
  title: string;
  description: string;
  category: string;
  metricKey: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  rationale: string;
  aiConfidence: number;
  priority: number;
  discipline: string | null;
  estimatedTimelineDays: number | null;
}

export interface GoalProgressEntry {
  value: number;
  progressPct: number;
  triggerType: string;
  triggerNotes: string | null;
  recordedAt: string;
}

export interface Achievement {
  id: string;
  goalTitle: string;
  category: string;
  targetValue: number;
  achievedValue: number;
  celebrationMessage: string | null;
  achievedAt: string;
}

export interface CreateGoalInput {
  title: string;
  description?: string;
  category: Goal['category'];
  metricKey?: string;
  targetValue: number;
  currentValue?: number;
  unit?: string;
  trackName?: string;
  carName?: string;
  discipline?: string;
  seriesName?: string;
  deadline?: string;
  priority?: number;
}

// =====================================================================
// Demo Data (fallback when not authenticated)
// =====================================================================

const DEMO_GOALS: Goal[] = [
  {
    id: 'demo-1',
    title: 'Reach 1500 iRating (Road)',
    description: 'Push your Road iRating to the next milestone',
    category: 'irating',
    metricKey: 'irating_road',
    targetValue: 1500,
    currentValue: 1247,
    startingValue: 1100,
    unit: 'iR',
    trackName: null,
    carName: null,
    discipline: 'road',
    seriesName: null,
    status: 'active',
    priority: 8,
    deadline: null,
    source: 'ai_recommended',
    aiRationale: 'Based on your current iRating of 1247, reaching 1500 is an achievable next milestone. Focus on consistent top-half finishes.',
    aiConfidence: 0.9,
    progressPct: 37,
    lastProgressUpdate: new Date().toISOString(),
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    achievedAt: null,
  },
  {
    id: 'demo-2',
    title: 'Reach 3.50 Safety Rating (Road)',
    description: 'Improve your Road safety rating through clean racing',
    category: 'safety_rating',
    metricKey: 'sr_road',
    targetValue: 3.5,
    currentValue: 3.22,
    startingValue: 2.8,
    unit: 'SR',
    trackName: null,
    carName: null,
    discipline: 'road',
    seriesName: null,
    status: 'active',
    priority: 7,
    deadline: '2026-02-15',
    source: 'ai_recommended',
    aiRationale: 'Your SR of 3.22 is solid. Reaching 3.50 will unlock more series and improve your race quality.',
    aiConfidence: 0.85,
    progressPct: 60,
    lastProgressUpdate: new Date().toISOString(),
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    achievedAt: null,
  },
  {
    id: 'demo-3',
    title: 'Complete 5 Clean Races',
    description: 'Finish 5 races with 0x incidents to build consistency',
    category: 'clean_races',
    metricKey: 'clean_race_streak',
    targetValue: 5,
    currentValue: 2,
    startingValue: 0,
    unit: 'races',
    trackName: null,
    carName: null,
    discipline: 'road',
    seriesName: null,
    status: 'active',
    priority: 6,
    deadline: null,
    source: 'self_set',
    aiRationale: null,
    aiConfidence: null,
    progressPct: 40,
    lastProgressUpdate: new Date().toISOString(),
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    achievedAt: null,
  },
];

const DEMO_SUGGESTIONS: GoalSuggestion[] = [
  {
    title: 'Earn C License (Road)',
    description: 'Advance to C class license in Road',
    category: 'license',
    metricKey: 'license_road',
    targetValue: 3,
    currentValue: 2,
    unit: 'class',
    rationale: "You're currently D class. Reaching C class will unlock GT3 and other competitive series.",
    aiConfidence: 0.8,
    priority: 7,
    discipline: 'road',
    estimatedTimelineDays: 30,
  },
  {
    title: 'Win a Race',
    description: 'Take the checkered flag first',
    category: 'wins',
    metricKey: 'race_wins',
    targetValue: 1,
    currentValue: 0,
    unit: 'wins',
    rationale: 'You have strong pace. Focus on qualifying well and managing the first lap to get that first win.',
    aiConfidence: 0.7,
    priority: 5,
    discipline: null,
    estimatedTimelineDays: null,
  },
];

// =====================================================================
// Auth Helper
// =====================================================================

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    return { 'Authorization': `Bearer ${session.access_token}` };
  }
  return {};
}

// =====================================================================
// API Functions
// =====================================================================

/**
 * Fetch all goals for the current driver
 */
export async function fetchGoals(status?: string, category?: string): Promise<Goal[]> {
  try {
    const auth = await getAuthHeader();
    if (!auth.Authorization) {
      console.log('[Goals] No auth token, using demo data');
      return DEMO_GOALS;
    }

    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (category) params.append('category', category);

    const url = `${API_BASE}/api/v1/goals${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url, {
      headers: { ...auth, 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      console.log('[Goals] API error, using demo data');
      return DEMO_GOALS;
    }

    const data = await response.json();
    return data.goals || DEMO_GOALS;
  } catch (error) {
    console.error('[Goals] Error fetching goals:', error);
    return DEMO_GOALS;
  }
}

/**
 * Fetch AI-generated goal suggestions
 */
export async function fetchGoalSuggestions(): Promise<GoalSuggestion[]> {
  try {
    const auth = await getAuthHeader();
    if (!auth.Authorization) {
      return DEMO_SUGGESTIONS;
    }

    const response = await fetch(`${API_BASE}/api/v1/goals/suggestions`, {
      headers: { ...auth, 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      return DEMO_SUGGESTIONS;
    }

    const data = await response.json();
    return data.suggestions || DEMO_SUGGESTIONS;
  } catch (error) {
    console.error('[Goals] Error fetching suggestions:', error);
    return DEMO_SUGGESTIONS;
  }
}

/**
 * Create a new goal
 */
export async function createGoal(input: CreateGoalInput): Promise<Goal | null> {
  try {
    const auth = await getAuthHeader();
    if (!auth.Authorization) {
      console.warn('[Goals] Cannot create goal without authentication');
      return null;
    }

    const response = await fetch(`${API_BASE}/api/v1/goals`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      console.error('[Goals] Failed to create goal:', response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[Goals] Error creating goal:', error);
    return null;
  }
}

/**
 * Accept an AI suggestion and create it as an active goal
 */
export async function acceptSuggestion(suggestion: GoalSuggestion): Promise<Goal | null> {
  try {
    const auth = await getAuthHeader();
    if (!auth.Authorization) {
      console.warn('[Goals] Cannot accept suggestion without authentication');
      return null;
    }

    const response = await fetch(`${API_BASE}/api/v1/goals/accept-suggestion`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify(suggestion),
    });

    if (!response.ok) {
      console.error('[Goals] Failed to accept suggestion:', response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[Goals] Error accepting suggestion:', error);
    return null;
  }
}

/**
 * Update a goal
 */
export async function updateGoal(goalId: string, updates: Partial<Goal>): Promise<boolean> {
  try {
    const auth = await getAuthHeader();
    if (!auth.Authorization) {
      return false;
    }

    const response = await fetch(`${API_BASE}/api/v1/goals/${goalId}`, {
      method: 'PATCH',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    return response.ok;
  } catch (error) {
    console.error('[Goals] Error updating goal:', error);
    return false;
  }
}

/**
 * Delete a goal
 */
export async function deleteGoal(goalId: string): Promise<boolean> {
  try {
    const auth = await getAuthHeader();
    if (!auth.Authorization) {
      return false;
    }

    const response = await fetch(`${API_BASE}/api/v1/goals/${goalId}`, {
      method: 'DELETE',
      headers: auth,
    });

    return response.ok;
  } catch (error) {
    console.error('[Goals] Error deleting goal:', error);
    return false;
  }
}

/**
 * Fetch progress history for a goal
 */
export async function fetchGoalHistory(goalId: string): Promise<GoalProgressEntry[]> {
  try {
    const auth = await getAuthHeader();
    if (!auth.Authorization) {
      return [];
    }

    const response = await fetch(`${API_BASE}/api/v1/goals/${goalId}/history`, {
      headers: { ...auth, 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.history || [];
  } catch (error) {
    console.error('[Goals] Error fetching history:', error);
    return [];
  }
}

/**
 * Fetch recent achievements
 */
export async function fetchAchievements(): Promise<Achievement[]> {
  try {
    const auth = await getAuthHeader();
    if (!auth.Authorization) {
      return [];
    }

    const response = await fetch(`${API_BASE}/api/v1/goals/achievements`, {
      headers: { ...auth, 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.achievements || [];
  } catch (error) {
    console.error('[Goals] Error fetching achievements:', error);
    return [];
  }
}

/**
 * Mark a goal as achieved manually
 */
export async function markGoalAchieved(goalId: string): Promise<boolean> {
  return updateGoal(goalId, { status: 'achieved' });
}

/**
 * Dismiss a goal
 */
export async function dismissGoal(goalId: string): Promise<boolean> {
  return updateGoal(goalId, { status: 'dismissed' });
}

/**
 * Pause a goal
 */
export async function pauseGoal(goalId: string): Promise<boolean> {
  return updateGoal(goalId, { status: 'paused' });
}

/**
 * Resume a paused goal
 */
export async function resumeGoal(goalId: string): Promise<boolean> {
  return updateGoal(goalId, { status: 'active' });
}
