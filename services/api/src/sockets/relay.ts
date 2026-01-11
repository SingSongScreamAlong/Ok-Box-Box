import { Namespace, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { query } from '../db/index.js';
import { analyzeTelemetry, generateStrategyData } from '../services/coaching.js';
import type { 
  RelayHeartbeat, 
  SessionMetadata, 
  TelemetryPacket,
  TimingEntry,
  TimingUpdate 
} from '@okboxbox/shared';

interface RelaySocket extends Socket {
  userId?: string;
  relayId?: string;
  currentSessionId?: string;
}

// In-memory state for active relays
const activeRelays = new Map<string, { userId: string; lastHeartbeat: number; iRacingConnected: boolean }>();

/**
 * Setup Socket.IO namespace for Relay connections
 * Relay -> Backend communication
 */
export function setupRelaySocket(relayNs: Namespace, appNs: Namespace): void {
  // Authentication middleware
  relayNs.use((socket: RelaySocket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('No token provided'));
    }

    // Allow demo token for development/testing
    if (token === 'demo-token' && config.nodeEnv === 'development') {
      socket.userId = 'demo-user';
      socket.relayId = 'relay_demo';
      logger.info('Demo relay connected (development mode)');
      return next();
    }

    try {
      const decoded = jwt.verify(token, config.jwtSecret) as {
        userId: string;
        machineId: string;
        type: string;
      };

      if (decoded.type !== 'relay') {
        return next(new Error('Invalid token type'));
      }

      socket.userId = decoded.userId;
      socket.relayId = `relay_${decoded.machineId}`;
      next();
    } catch (err) {
      logger.warn('Relay auth failed:', err);
      next(new Error('Invalid token'));
    }
  });

  relayNs.on('connection', (socket: RelaySocket) => {
    const relayId = socket.relayId!;
    const userId = socket.userId!;
    
    logger.info(`Relay connected: ${relayId} (user: ${userId})`);
    
    activeRelays.set(relayId, {
      userId,
      lastHeartbeat: Date.now(),
      iRacingConnected: false,
    });

    // Heartbeat handler
    socket.on('relay:heartbeat', async (data: RelayHeartbeat) => {
      logger.debug(`Heartbeat from ${relayId}: iRacing=${data.iRacingConnected}`);
      
      activeRelays.set(relayId, {
        userId,
        lastHeartbeat: Date.now(),
        iRacingConnected: data.iRacingConnected,
      });

      // Broadcast relay status to user's apps
      appNs.to(`user:${userId}`).emit('relay:status', {
        connected: true,
        iRacingConnected: data.iRacingConnected,
      });
    });

    // Session start handler
    socket.on('relay:session:start', async (data: SessionMetadata) => {
      logger.info(`Session started: ${data.sessionId} (${data.type} at ${data.track.name})`);
      
      socket.currentSessionId = data.sessionId;

      // Store session in database
      try {
        await query(
          `INSERT INTO sessions (id, user_id, subsession_id, type, track_id, track_name, track_config, total_laps, is_race_session)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (id) DO UPDATE SET
             type = EXCLUDED.type,
             track_name = EXCLUDED.track_name,
             track_config = EXCLUDED.track_config`,
          [
            data.sessionId,
            userId,
            data.subsessionId,
            data.type,
            data.track.id,
            data.track.name,
            data.track.configName,
            data.totalLaps,
            data.isRaceSession,
          ]
        );
      } catch (err) {
        logger.error('Failed to store session:', err);
      }

      // Broadcast to user's apps
      appNs.to(`user:${userId}`).emit('session:start', data);
    });

    // Session end handler
    socket.on('relay:session:end', async (data: { sessionId: string; timestamp: number }) => {
      logger.info(`Session ended: ${data.sessionId}`);
      
      socket.currentSessionId = undefined;

      // Update session in database
      try {
        await query(
          'UPDATE sessions SET ended_at = NOW() WHERE id = $1',
          [data.sessionId]
        );
      } catch (err) {
        logger.error('Failed to update session end:', err);
      }

      // Broadcast to apps
      appNs.to(`user:${userId}`).emit('session:end', { sessionId: data.sessionId, reason: 'ended' });
    });

    // Telemetry handler (single packet)
    socket.on('relay:telemetry', async (data: TelemetryPacket) => {
      const sessionId = data.sessionId;
      
      // Store telemetry (async, don't block)
      storeTelemetry(sessionId, data).catch(err => {
        logger.error('Failed to store telemetry:', err);
      });

      // Broadcast to session room
      appNs.to(`session:${sessionId}`).emit('telemetry:update', data);
    });

    // Bulk telemetry handler (all drivers)
    socket.on('relay:telemetry:bulk', async (data: TelemetryPacket[] | { sessionId: string; timestamp: number; packets: unknown[] }) => {
      // Handle both array format and object format
      const packets = Array.isArray(data) ? data : (data.packets as TelemetryPacket[]);
      const sessionId = Array.isArray(data) ? packets[0]?.sessionId : data.sessionId;
      
      if (!packets || packets.length === 0 || !sessionId) return;
      
      // Broadcast telemetry to session room and user room
      appNs.to(`session:${sessionId}`).emit('telemetry:bulk', { sessionId, packets });
      appNs.to(`user:${userId}`).emit('telemetry:bulk', { sessionId, packets });
      
      // Also emit individual telemetry update for the first packet (player)
      if (packets[0]) {
        appNs.to(`user:${userId}`).emit('telemetry:update', packets[0]);
      }
      
      // Generate AI coaching insights (throttled - every ~30 packets)
      if (Math.random() < 0.03) {
        try {
          const { insights, skillAnalysis } = analyzeTelemetry(sessionId, packets as any[]);
          
          if (insights.length > 0) {
            appNs.to(`user:${userId}`).emit('coaching:insights', insights);
          }
          
          if (skillAnalysis) {
            appNs.to(`user:${userId}`).emit('coaching:skill_analysis', skillAnalysis);
          }
          
          // Generate strategy data
          const playerPacket = packets[0] as any;
          if (playerPacket) {
            const strategy = generateStrategyData(
              sessionId,
              playerPacket.lap || 1,
              50, // total laps
              playerPacket.tires?.frontLeft?.wear || 0,
              100, // fuel level
              playerPacket.racePosition || 1
            );
            appNs.to(`user:${userId}`).emit('strategy:update', strategy);
          }
        } catch (err) {
          logger.debug('Coaching analysis error:', err);
        }
      }
    });

    // Direct timing update handler
    socket.on('relay:timing:update', async (data: { sessionId: string; timestamp: number; entries: TimingEntry[] }) => {
      const { sessionId, entries } = data;
      
      // Broadcast timing to session room and user room
      appNs.to(`session:${sessionId}`).emit('timing:update', { sessionId, entries });
      appNs.to(`user:${userId}`).emit('timing:update', { sessionId, entries });
      
      // Log every 100th update to avoid spam
      if (Math.random() < 0.01) {
        logger.info(`Timing update: ${entries.length} entries for session ${sessionId} -> user:${userId}`);
      }
    });

    // =========================================================================
    // VIDEO STREAMING HANDLERS (iRacing window capture)
    // =========================================================================

    // Video stream started from relay
    socket.on('relay:video:start', (data: { width: number; height: number; fps: number; timestamp: number }) => {
      logger.info(`Video stream started from relay: ${data.width}x${data.height} @ ${data.fps}fps`);
      
      // Notify team dashboard that video is available
      appNs.to(`user:${userId}`).emit('video:available', {
        relayId,
        width: data.width,
        height: data.height,
        fps: data.fps,
        timestamp: data.timestamp,
      });
    });

    // Video frame from relay - forward to team dashboard
    socket.on('relay:video:frame', (data: { 
      data: string; 
      width: number; 
      height: number; 
      timestamp: number; 
      format: string;
      frameNumber: number;
    }) => {
      // Forward frame directly to user's apps (no processing, minimal latency)
      appNs.to(`user:${userId}`).emit('video:frame', data);
    });

    // Video stream stopped
    socket.on('relay:video:stop', () => {
      logger.info(`Video stream stopped from relay: ${relayId}`);
      appNs.to(`user:${userId}`).emit('video:stopped', { relayId });
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      logger.info(`Relay disconnected: ${relayId}`);
      activeRelays.delete(relayId);
      
      // Notify apps
      appNs.to(`user:${userId}`).emit('relay:status', {
        connected: false,
        iRacingConnected: false,
      });
    });
  });
}

/**
 * Store telemetry packet to database
 */
async function storeTelemetry(sessionId: string, data: TelemetryPacket): Promise<void> {
  await query(
    `INSERT INTO telemetry (session_id, driver_id, ts, lap, sector, position, speed, throttle, brake, gear, rpm, fuel_level, track_position, gap_ahead, gap_behind, on_pit_road, raw_data)
     VALUES ($1, $2, to_timestamp($3 / 1000.0), $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
    [
      sessionId,
      data.driverId,
      data.timestamp,
      data.lap,
      data.sector,
      data.racePosition,
      data.speed,
      data.throttle,
      data.brake,
      data.gear,
      data.rpm,
      data.fuelLevel,
      data.trackPosition,
      data.gapAhead,
      data.gapBehind,
      data.onPitRoad,
      JSON.stringify(data),
    ]
  );
}

/**
 * Store timing snapshot to database
 */
async function storeTimingSnapshot(sessionId: string, timing: TimingUpdate): Promise<void> {
  await query(
    `INSERT INTO timing_snapshots (session_id, ts, entries)
     VALUES ($1, to_timestamp($2 / 1000.0), $3)`,
    [sessionId, timing.timestamp, JSON.stringify(timing.entries)]
  );
}

/**
 * Build timing update from bulk telemetry
 */
function buildTimingUpdate(sessionId: string, packets: TelemetryPacket[]): TimingUpdate {
  const entries: TimingEntry[] = packets
    .sort((a, b) => a.racePosition - b.racePosition)
    .map((p, idx) => ({
      driverId: p.driverId,
      driverName: p.driverName,
      carNumber: p.carNumber,
      position: p.racePosition,
      classPosition: p.classPosition,
      gap: idx === 0 ? 'LEADER' : formatGap(p.gapAhead),
      interval: idx === 0 ? '-' : formatGap(p.gapAhead),
      lastLap: formatLapTime(p.lastLapTime),
      bestLap: formatLapTime(p.bestLapTime),
      sector1: p.sectorTimes[0] ? formatSectorTime(p.sectorTimes[0]) : '-',
      sector2: p.sectorTimes[1] ? formatSectorTime(p.sectorTimes[1]) : '-',
      sector3: p.sectorTimes[2] ? formatSectorTime(p.sectorTimes[2]) : '-',
      onPitRoad: p.onPitRoad,
      inPit: p.inPitStall,
      lastSeen: p.timestamp,
    }));

  return {
    sessionId,
    timestamp: Date.now(),
    entries,
  };
}

function formatGap(seconds: number): string {
  if (seconds <= 0) return '-';
  if (seconds > 60) return `+${Math.floor(seconds / 60)}LAP`;
  return `+${seconds.toFixed(3)}`;
}

function formatLapTime(ms: number): string {
  if (ms <= 0) return '-';
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toFixed(3).padStart(6, '0')}`;
}

function formatSectorTime(ms: number): string {
  if (ms <= 0) return '-';
  return (ms / 1000).toFixed(3);
}
