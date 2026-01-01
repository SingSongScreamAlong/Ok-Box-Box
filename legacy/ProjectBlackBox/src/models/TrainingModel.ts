/**
 * Training system models for driver skill development and tracking
 */

// Training goal types
export enum TrainingGoalType {
  BRAKING = 'braking',
  THROTTLE = 'throttle',
  RACING_LINE = 'racing_line',
  CONSISTENCY = 'consistency',
  FUEL_EFFICIENCY = 'fuel_efficiency',
  TIRE_MANAGEMENT = 'tire_management',
  RACE_CRAFT = 'race_craft',
  ADAPTABILITY = 'adaptability',
  ENDURANCE = 'endurance',
  QUALIFYING = 'qualifying'
}

// Training goal difficulty
export enum TrainingDifficulty {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
  PROFESSIONAL = 'professional'
}

// Training goal model
export interface TrainingGoal {
  id: string;
  driverId: string;
  title: string;
  description: string;
  type: TrainingGoalType;
  difficulty: TrainingDifficulty;
  trackId: string;
  carId?: string;
  cornerIds?: string[];
  targetValue: number;
  currentValue: number;
  progress: number; // 0.0 - 1.0
  created: number; // timestamp
  updated: number; // timestamp
  completed?: number; // timestamp
  metrics: {
    baselineValue: number;
    bestValue: number;
    recentValues: number[];
    trend: number; // positive = improving, negative = declining
  };
  recommendations?: string[];
}

// Badge types
export enum BadgeType {
  ACHIEVEMENT = 'achievement',
  MILESTONE = 'milestone',
  SKILL = 'skill',
  SPECIAL = 'special'
}

// Badge rarity
export enum BadgeRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary'
}

// Badge model
export interface Badge {
  id: string;
  name: string;
  description: string;
  type: BadgeType;
  rarity: BadgeRarity;
  icon: string;
  requirements: {
    type: string;
    value: number;
    comparison: 'greater' | 'less' | 'equal' | 'not_equal';
  }[];
  earnedBy: {
    driverId: string;
    earnedAt: number; // timestamp
  }[];
  created: number; // timestamp
}

// Training session model
export interface TrainingSession {
  id: string;
  driverId: string;
  title: string;
  description?: string;
  goals: string[]; // TrainingGoal IDs
  trackId: string;
  carId: string;
  duration: number; // minutes
  completed: boolean;
  scheduledFor?: number; // timestamp
  completedAt?: number; // timestamp
  results?: {
    goalProgress: Record<string, number>; // goalId -> progress (0.0 - 1.0)
    lapTimes: number[];
    bestLapTime: number;
    consistency: number; // 0.0 - 1.0
    notes: string;
    badgesEarned: string[]; // Badge IDs
  };
}

// Skill progression model
export interface SkillProgression {
  driverId: string;
  skills: {
    [key in TrainingGoalType]: {
      level: number; // 1-100
      experience: number;
      nextLevelThreshold: number;
      history: Array<{
        timestamp: number;
        level: number;
      }>;
    };
  };
  overall: {
    level: number; // 1-100
    experience: number;
    nextLevelThreshold: number;
    history: Array<{
      timestamp: number;
      level: number;
    }>;
  };
  updated: number; // timestamp
}
