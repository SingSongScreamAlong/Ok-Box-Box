/**
 * Socket.IO event types for Ok, Box Box
 * These define the realtime contract between Backend and Apps
 */

import type { TelemetryPacket, TimingUpdate } from './telemetry.js';
import type { SessionInfo, SessionMetadata, RelayHeartbeat } from './session.js';

/**
 * Events emitted by Relay -> Backend
 */
export interface RelayToBackendEvents {
  'relay:heartbeat': (data: RelayHeartbeat) => void;
  'relay:session:start': (data: SessionMetadata) => void;
  'relay:session:end': (data: { sessionId: string; timestamp: number }) => void;
  'relay:telemetry': (data: TelemetryPacket) => void;
  'relay:telemetry:bulk': (data: TelemetryPacket[]) => void;
}

/**
 * Events emitted by Backend -> Apps (via Socket.IO rooms)
 */
export interface BackendToAppEvents {
  // Connection
  'connected': (data: { userId: string; modules: string[] }) => void;
  'error': (data: { code: string; message: string }) => void;
  
  // Session lifecycle
  'session:start': (data: SessionMetadata) => void;
  'session:update': (data: Partial<SessionInfo>) => void;
  'session:end': (data: { sessionId: string; reason: string }) => void;
  
  // Realtime data
  'timing:update': (data: TimingUpdate) => void;
  'telemetry:update': (data: TelemetryPacket) => void;
  
  // System
  'relay:status': (data: { connected: boolean; iRacingConnected: boolean }) => void;
}

/**
 * Events emitted by Apps -> Backend
 */
export interface AppToBackendEvents {
  // Room management
  'join:session': (sessionId: string) => void;
  'leave:session': (sessionId: string) => void;
  
  // Subscriptions
  'subscribe:timing': () => void;
  'subscribe:telemetry': (driverId?: string) => void;
  'unsubscribe:telemetry': () => void;
}

/**
 * Socket.IO room naming conventions
 */
export const SOCKET_ROOMS = {
  session: (sessionId: string) => `session:${sessionId}`,
  timing: (sessionId: string) => `timing:${sessionId}`,
  telemetry: (sessionId: string, driverId?: string) => 
    driverId ? `telemetry:${sessionId}:${driverId}` : `telemetry:${sessionId}`,
  user: (userId: string) => `user:${userId}`,
} as const;
