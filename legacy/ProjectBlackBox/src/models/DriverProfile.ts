/**
 * Driver Profile model for driver identification and preferences
 */
export interface DriverProfile {
  // Core identification
  id: string;
  name: string;
  team?: string;
  avatar?: string;
  
  // Driver preferences and settings
  preferences?: {
    uiTheme?: 'dark' | 'light' | 'auto';
    telemetryUpdateFrequency?: number; // Hz
    dataTransmissionQuality?: 'low' | 'medium' | 'high'; // Affects compression level
    notifications?: {
      enabled: boolean;
      types: Array<'connection' | 'performance' | 'system' | 'strategy'>;
    };
    autoStartTelemetry?: boolean;
    autoConnectToServer?: boolean;
  };
  
  // Driver statistics and metadata
  stats?: {
    totalSessions: number;
    totalLaps: number;
    totalDistance: number; // km
    favoriteTracks: string[]; // Track IDs
    favoriteCars: string[]; // Car IDs
    averageLapTimes: Record<string, number>; // trackId -> time in seconds
    personalBests: Record<string, number>; // trackId -> time in seconds
    lastActive: number; // timestamp
  };
  
  // Training goals and progress
  trainingGoals?: Array<{
    id: string;
    description: string;
    trackId: string;
    cornerIds?: string[];
    metricType: 'braking' | 'throttle' | 'line' | 'consistency';
    targetValue: number;
    currentValue: number;
    progress: number; // 0.0 - 1.0
    created: number; // timestamp
    completed?: number; // timestamp
  }>;
  
  // System metadata
  system?: {
    lastLogin: number; // timestamp
    lastActive: number; // timestamp
    deviceId?: string;
    appVersion?: string;
  };
}
