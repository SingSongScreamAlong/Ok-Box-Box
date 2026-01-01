/**
 * API endpoints for communication between Driver App and PitBox Core
 */
export const ApiEndpoints = {
  // Authentication endpoints
  AUTH: {
    LOGIN: '/api/v1/auth/login',
    LOGOUT: '/api/v1/auth/logout',
    REFRESH: '/api/v1/auth/refresh',
    STATUS: '/api/v1/auth/status',
  },
  
  // Telemetry endpoints
  TELEMETRY: {
    UPLOAD: '/api/v1/telemetry/upload',
    BATCH_UPLOAD: '/api/v1/telemetry/batch',
    STATUS: '/api/v1/telemetry/status',
    CONFIG: '/api/v1/telemetry/config',
  },
  
  // Driver endpoints
  DRIVER: {
    PROFILE: '/api/v1/driver/profile',
    PROFILES: '/api/v1/driver/profiles',
    CURRENT: '/api/v1/driver/current',
    UPDATE: '/api/v1/driver/update',
    FATIGUE: '/api/v1/driver/fatigue',
  },
  
  // Session endpoints
  SESSION: {
    START: '/api/v1/session/start',
    END: '/api/v1/session/end',
    STATUS: '/api/v1/session/status',
    HISTORY: '/api/v1/session/history',
    ANALYTICS: '/api/v1/session/analytics',
  },
  
  // Lap and timing endpoints
  LAP: {
    CURRENT: '/api/v1/lap/current',
    HISTORY: '/api/v1/lap/history',
    BEST: '/api/v1/lap/best',
    COMPARISON: '/api/v1/lap/comparison',
  },
  
  // Strategy endpoints
  STRATEGY: {
    CURRENT: '/api/v1/strategy/current',
    RECOMMENDATIONS: '/api/v1/strategy/recommendations',
    PIT_WINDOWS: '/api/v1/strategy/pit-windows',
    FUEL: '/api/v1/strategy/fuel',
    TIRES: '/api/v1/strategy/tires',
  },
  
  // Training endpoints
  TRAINING: {
    GOALS: '/api/v1/training/goals',
    PROGRESS: '/api/v1/training/progress',
    BADGES: '/api/v1/training/badges',
    RECOMMENDATIONS: '/api/v1/training/recommendations',
  },
  
  // Team endpoints
  TEAM: {
    INFO: '/api/v1/team/info',
    MEMBERS: '/api/v1/team/members',
    STINTS: '/api/v1/team/stints',
    HANDOFF: '/api/v1/team/handoff',
    COMMUNICATION: '/api/v1/team/communication',
  },
  
  // System endpoints
  SYSTEM: {
    STATUS: '/api/v1/system/status',
    CONFIG: '/api/v1/system/config',
    LOGS: '/api/v1/system/logs',
    VERSION: '/api/v1/system/version',
    HEALTH: '/api/v1/system/health',
  },
  
  // WebSocket endpoints
  WS: {
    TELEMETRY: '/ws/telemetry',
    EVENTS: '/ws/events',
    STRATEGY: '/ws/strategy',
    SYSTEM: '/ws/system',
  }
};
