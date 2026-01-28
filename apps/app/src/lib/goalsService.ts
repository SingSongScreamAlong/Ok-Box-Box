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

// NO DEMO DATA - Real racing system only shows real data

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
      console.log('[Goals] No auth token');
      return [];
    }

    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (category) params.append('category', category);

    const url = `${API_BASE}/api/v1/goals${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url, {
      headers: { ...auth, 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      console.log('[Goals] API error:', response.status);
      return [];
    }

    const data = await response.json();
    return data.goals || [];
  } catch (error) {
    console.error('[Goals] Error fetching goals:', error);
    return [];
  }
}

/**
 * Fetch AI-generated goal suggestions
 */
export async function fetchGoalSuggestions(): Promise<GoalSuggestion[]> {
  try {
    const auth = await getAuthHeader();
    if (!auth.Authorization) {
      console.log('[Goals] No auth token');
      return [];
    }

    const response = await fetch(`${API_BASE}/api/v1/goals/suggestions`, {
      headers: { ...auth, 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      console.log('[Goals] Suggestions API error:', response.status);
      return [];
    }

    const data = await response.json();
    return data.suggestions || [];
  } catch (error) {
    console.error('[Goals] Error fetching suggestions:', error);
    return [];
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
