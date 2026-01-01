/**
 * Team and multi-driver support models
 */

// Driver role types
export enum DriverRole {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  RESERVE = 'reserve',
  COACH = 'coach',
  ANALYST = 'analyst'
}

// Team member model
export interface TeamMember {
  id: string;
  driverId: string;
  teamId: string;
  role: DriverRole;
  joinDate: number; // timestamp
  active: boolean;
  permissions: {
    canModifyStrategy: boolean;
    canModifySetup: boolean;
    canViewAllData: boolean;
    canManageTeam: boolean;
    canInviteMembers: boolean;
  };
}

// Team model
export interface Team {
  id: string;
  name: string;
  logo?: string;
  description?: string;
  members: string[]; // TeamMember IDs
  created: number; // timestamp
  updated: number; // timestamp
  preferences: {
    defaultStrategy?: string; // Strategy ID
    defaultSetup?: string; // Setup ID
    communicationChannel?: string;
    notificationSettings: {
      strategyAlerts: boolean;
      performanceAlerts: boolean;
      driverChangeAlerts: boolean;
      systemAlerts: boolean;
    };
  };
  sponsors?: Array<{
    id: string;
    name: string;
    logo?: string;
    exposureRequirements?: {
      minScreenTime: number; // seconds
      targetPositions: number[]; // e.g., [1, 2, 3]
      trackPreferences: string[]; // Track IDs
    };
  }>;
}

// Driver stint model
export interface DriverStint {
  id: string;
  sessionId: string;
  driverId: string;
  startTime: number; // timestamp
  endTime?: number; // timestamp
  laps: number;
  distance: number; // km
  averageLapTime: number; // seconds
  bestLapTime: number; // seconds
  consistency: number; // 0.0 - 1.0
  fuelUsed: number; // liters
  tireWear: {
    frontLeft: number; // 0.0 - 1.0
    frontRight: number;
    rearLeft: number;
    rearRight: number;
  };
  incidents: number;
  fatigue: {
    startLevel: number; // 0.0 - 1.0
    endLevel: number; // 0.0 - 1.0
    impactOnPerformance: number; // seconds per lap
  };
  notes?: string;
  tags?: string[];
}

// Driver handoff model
export interface DriverHandoff {
  id: string;
  sessionId: string;
  outDriverId: string;
  inDriverId: string;
  scheduledTime?: number; // timestamp
  actualTime?: number; // timestamp
  lap?: number;
  pitStopId?: string; // PitStop ID
  preparationStatus: {
    inDriverReady: boolean;
    outDriverNotified: boolean;
    teamNotified: boolean;
    setupPrepared: boolean;
    strategyUpdated: boolean;
  };
  handoffNotes: string;
  completed: boolean;
  duration?: number; // seconds
}

// Team communication model
export interface TeamCommunication {
  id: string;
  sessionId: string;
  senderId: string;
  recipientId?: string; // If null, broadcast to team
  timestamp: number;
  type: 'message' | 'alert' | 'instruction' | 'feedback' | 'question';
  priority: 'low' | 'medium' | 'high' | 'critical';
  content: string;
  attachments?: Array<{
    type: 'image' | 'telemetry' | 'strategy' | 'setup';
    url: string;
    description?: string;
  }>;
  read: boolean;
  readBy: string[]; // User IDs
  readAt?: number; // timestamp
  acknowledged: boolean;
  acknowledgedBy?: string; // User ID
  acknowledgedAt?: number; // timestamp
}

// Sponsor tracking model
export interface SponsorTracking {
  id: string;
  sponsorId: string;
  teamId: string;
  sessionId: string;
  exposure: {
    screenTime: number; // seconds
    positions: number[]; // Positions achieved
    mentions: number; // Number of mentions
    visibility: number; // 0.0 - 1.0
  };
  requirements: {
    screenTime: number; // seconds
    positions: number[]; // Target positions
    mentions: number; // Target mentions
  };
  compliance: number; // 0.0 - 1.0
  value: number; // Estimated monetary value
  notes?: string;
  updated: number; // timestamp
}
