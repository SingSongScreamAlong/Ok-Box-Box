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

// Demo data for development system
const DEMO_DEVELOPMENT_DATA: DevelopmentData = {
  currentPhase: 'Consistency Building',
  phaseProgress: 68,
  weeklyFocus: 'Corner Exit Optimization',
  focusAreas: [
    {
      id: '1',
      title: 'Corner Exit Patience',
      description: 'Waiting for the car to rotate before applying throttle',
      insight: 'You\'re losing 0.2s per lap by getting on throttle too early in slow corners. The rear is stepping out, forcing corrections.',
      evidence: 'Avg throttle application: 15m before apex vs 8m optimal',
      progress: 45,
      drills: [
        { name: 'Lift-coast-rotate drill at T3', completed: true },
        { name: '50% throttle exit practice', completed: true },
        { name: 'Full speed corner exit runs', completed: false },
      ],
      recentImprovement: '+0.08s avg corner exit speed this week'
    },
    {
      id: '2', 
      title: 'Trail Braking Depth',
      description: 'Carrying brake pressure deeper into corners',
      insight: 'Your brake release is too abrupt. Trailing off smoothly will help rotate the car and set up better exits.',
      evidence: 'Brake release point: 22m before apex vs 12m for top drivers',
      progress: 30,
      drills: [
        { name: 'Progressive brake release drill', completed: true },
        { name: 'Trail brake to apex practice', completed: false },
        { name: 'Combined trail + rotation', completed: false },
      ],
    },
    {
      id: '3',
      title: 'Qualifying Pace',
      description: 'Finding the extra tenth when it matters',
      insight: 'Your qualifying laps are 0.3s slower than your best practice laps. Mental pressure is affecting your braking points.',
      evidence: 'Practice best: 1:32.4 vs Qualifying best: 1:32.7',
      progress: 20,
      drills: [
        { name: 'Simulated qualifying runs', completed: false },
        { name: 'Pressure management exercises', completed: false },
        { name: 'Single-lap focus sessions', completed: false },
      ],
    },
  ],
  skillTree: [
    {
      category: 'Car Control',
      skills: [
        { name: 'Throttle Control', level: 3, maxLevel: 5, progress: 75, status: 'learning', description: 'Smooth, progressive throttle application' },
        { name: 'Brake Modulation', level: 2, maxLevel: 5, progress: 40, status: 'learning', description: 'Trail braking and brake release' },
        { name: 'Weight Transfer', level: 2, maxLevel: 5, progress: 60, status: 'learning', description: 'Using weight to rotate the car' },
        { name: 'Oversteer Recovery', level: 3, maxLevel: 5, progress: 80, status: 'mastered', description: 'Catching and correcting slides' },
      ]
    },
    {
      category: 'Racecraft',
      skills: [
        { name: 'Defensive Positioning', level: 2, maxLevel: 5, progress: 55, status: 'learning', description: 'Protecting your position legally' },
        { name: 'Overtaking', level: 2, maxLevel: 5, progress: 45, status: 'learning', description: 'Clean, decisive passes' },
        { name: 'Race Starts', level: 1, maxLevel: 5, progress: 30, status: 'next', description: 'Consistent, safe race starts' },
        { name: 'Tire Management', level: 1, maxLevel: 5, progress: 20, status: 'locked', description: 'Preserving tires over a stint' },
      ]
    },
    {
      category: 'Mental',
      skills: [
        { name: 'Focus', level: 2, maxLevel: 5, progress: 50, status: 'learning', description: 'Maintaining concentration' },
        { name: 'Pressure Management', level: 1, maxLevel: 5, progress: 25, status: 'next', description: 'Performing under pressure' },
        { name: 'Adaptability', level: 2, maxLevel: 5, progress: 60, status: 'learning', description: 'Adjusting to changing conditions' },
        { name: 'Race Awareness', level: 2, maxLevel: 5, progress: 55, status: 'learning', description: 'Understanding the bigger picture' },
      ]
    },
  ],
  learningMoments: [
    {
      session: 'Daytona Practice',
      date: 'Today',
      insight: 'Discovered that lifting slightly before the bus stop chicane allows for a much better exit onto the banking.',
      improvement: 'Sector 3 time improved by 0.15s',
      metric: { label: 'Bus Stop Exit Speed', before: '142 mph', after: '148 mph' }
    },
    {
      session: 'Spa Qualifying',
      date: 'Yesterday',
      insight: 'Taking Eau Rouge flat requires commitment - hesitation causes more instability than full throttle.',
      improvement: 'Eau Rouge now consistently flat',
    },
    {
      session: 'Road America Race',
      date: '3 days ago',
      insight: 'Patience in traffic pays off. Waiting for a clean pass at the Kink instead of forcing it at Canada Corner.',
      improvement: 'Zero incidents in traffic',
      metric: { label: 'Incident Rate', before: '2.1x/race', after: '0.8x/race' }
    },
  ],
  goals: [
    { id: 'g1', title: 'Reach A License', target: 'A 1.0', current: 78, max: 100, deadline: 'Feb 15' },
    { id: 'g2', title: 'Break 1:32 at Daytona', target: '1:31.9', current: 65, max: 100 },
    { id: 'g3', title: 'Win a Race', target: '1 Win', current: 0, max: 1 },
    { id: 'g4', title: 'Complete 10 Clean Races', target: '10 races', current: 7, max: 10 },
  ],
  coachingNotes: [
    'Your corner entry speed has improved 3% this week - keep focusing on trail braking.',
    'Consider practicing at Spa to work on high-speed corner confidence.',
    'Your incident rate in the first 3 laps is 2x higher than mid-race - focus on survival mode at the start.',
  ],
  nextSession: {
    focus: 'Trail Braking at Slow Corners',
    drills: [
      'T3 entry: brake 5m later, trail to apex',
      'T7 hairpin: 50% brake at apex, full release on exit',
      'Full lap: focus on brake release, not speed',
    ],
    reminder: 'Remember: smooth brake release = faster corner exit'
  }
};

const DEMO_MEMORIES: DriverMemory[] = [
  { id: 'm1', driverId: 'me', category: 'tendency', content: 'Tends to brake too early under pressure', confidence: 0.85, source: 'session_analysis', createdAt: '2026-01-20', updatedAt: '2026-01-25' },
  { id: 'm2', driverId: 'me', category: 'strength', content: 'Excellent throttle control in wet conditions', confidence: 0.92, source: 'session_analysis', createdAt: '2026-01-15', updatedAt: '2026-01-22' },
  { id: 'm3', driverId: 'me', category: 'weakness', content: 'Struggles with high-speed corner commitment', confidence: 0.78, source: 'telemetry', createdAt: '2026-01-18', updatedAt: '2026-01-24' },
  { id: 'm4', driverId: 'me', category: 'preference', content: 'Prefers understeer setup over oversteer', confidence: 0.88, source: 'user_input', createdAt: '2026-01-10', updatedAt: '2026-01-10' },
  { id: 'm5', driverId: 'me', category: 'insight', content: 'Performs better in afternoon sessions', confidence: 0.72, source: 'pattern_detection', createdAt: '2026-01-22', updatedAt: '2026-01-26' },
];

const DEMO_TARGETS: DriverTarget[] = [
  { id: 't1', driverId: 'me', metric: 'safety_rating', currentValue: 3.22, targetValue: 4.0, deadline: '2026-02-15', status: 'active', progress: 40 },
  { id: 't2', driverId: 'me', metric: 'irating', currentValue: 1040, targetValue: 1500, deadline: '2026-03-01', status: 'active', progress: 22 },
  { id: 't3', driverId: 'me', metric: 'incident_rate', currentValue: 2.1, targetValue: 1.0, status: 'active', progress: 52 },
  { id: 't4', driverId: 'me', metric: 'avg_finish', currentValue: 10.2, targetValue: 8.0, status: 'active', progress: 45 },
];

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
