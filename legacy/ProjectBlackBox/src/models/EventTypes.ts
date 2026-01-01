/**
 * Event types for WebSocket communication between Driver App and PitBox Core
 */
export enum EventType {
  // Connection events
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  RECONNECT = 'reconnect',
  RECONNECT_ATTEMPT = 'reconnect_attempt',
  RECONNECT_ERROR = 'reconnect_error',
  RECONNECT_FAILED = 'reconnect_failed',
  
  // Telemetry events
  TELEMETRY_DATA = 'telemetry_data',
  TELEMETRY_BATCH = 'telemetry_batch',
  TELEMETRY_START = 'telemetry_start',
  TELEMETRY_STOP = 'telemetry_stop',
  
  // Driver events
  DRIVER_CHANGE = 'driver_change',
  DRIVER_IDENTIFIED = 'driver_identified',
  DRIVER_PROFILE_UPDATE = 'driver_profile_update',
  DRIVER_FATIGUE_UPDATE = 'driver_fatigue_update',
  
  // Session events
  SESSION_START = 'session_start',
  SESSION_END = 'session_end',
  LAP_COMPLETED = 'lap_completed',
  SECTOR_COMPLETED = 'sector_completed',
  
  // Incident events
  INCIDENT_DETECTED = 'incident_detected',
  
  // Strategy events
  STRATEGY_RECOMMENDATION = 'strategy_recommendation',
  PIT_WINDOW_OPEN = 'pit_window_open',
  PIT_WINDOW_CLOSE = 'pit_window_close',
  PIT_STOP_SCHEDULED = 'pit_stop_scheduled',
  PIT_STOP_COMPLETED = 'pit_stop_completed',
  
  // Performance events
  DRAFTING_OPPORTUNITY = 'drafting_opportunity',
  DAMAGE_ALERT = 'damage_alert',
  
  // Training events
  TRAINING_GOAL_PROGRESS = 'training_goal_progress',
  BADGE_EARNED = 'badge_earned',
  
  // Analysis events
  SESSION_REPORT_READY = 'session_report_ready',
  SETUP_IMPACT_ANALYSIS = 'setup_impact_analysis',
  
  // System events
  SYSTEM_STATUS = 'system_status',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
  DEBUG = 'debug'
}
