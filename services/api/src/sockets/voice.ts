/**
 * Voice Communication Socket Handlers
 * Handles AI Engineer push-to-talk voice transmission to team and driver
 */

import { Namespace, Socket } from 'socket.io';
import { logger } from '../logger.js';

interface VoiceMessage {
  messageId: string;
  from: string;
  timestamp: number;
  duration?: number;
}

interface VoiceChunk {
  messageId: string;
  chunk: ArrayBuffer;
  timestamp: number;
}

interface AppSocket extends Socket {
  userId?: string;
  modules?: string[];
}

// Track active voice transmissions
const activeTransmissions = new Map<string, {
  userId: string;
  startTime: number;
  chunks: ArrayBuffer[];
}>();

/**
 * Setup voice event handlers for app namespace
 */
export function setupVoiceHandlers(appNs: Namespace, relayNs: Namespace): void {
  appNs.on('connection', (socket: AppSocket) => {
    const userId = socket.userId || 'unknown';

    // Engineer starts voice transmission
    socket.on('engineer:voice:start', (data: VoiceMessage) => {
      const { messageId, timestamp } = data;
      
      logger.info(`Voice transmission started: ${messageId} from user ${userId}`);
      
      // Track this transmission
      activeTransmissions.set(messageId, {
        userId,
        startTime: timestamp,
        chunks: [],
      });

      // Broadcast to team dashboard (other users in same team)
      socket.broadcast.to(`user:${userId}`).emit('engineer:voice:start', {
        messageId,
        from: userId,
        timestamp,
      });

      // Forward to relay agent for driver playback
      relayNs.to(`user:${userId}`).emit('engineer:voice:start', {
        messageId,
        from: userId,
        timestamp,
      });
    });

    // Engineer sends voice chunk (real-time streaming)
    socket.on('engineer:voice:chunk', (data: VoiceChunk) => {
      const { messageId, chunk, timestamp } = data;
      
      const transmission = activeTransmissions.get(messageId);
      if (!transmission) {
        logger.warn(`Voice chunk for unknown transmission: ${messageId}`);
        return;
      }

      // Store chunk
      transmission.chunks.push(chunk);

      // Broadcast chunk to team dashboard
      socket.broadcast.to(`user:${userId}`).emit('engineer:voice:chunk', {
        messageId,
        chunk,
        timestamp,
      });

      // Forward chunk to relay agent for driver playback
      relayNs.to(`user:${userId}`).emit('engineer:voice:chunk', {
        messageId,
        chunk,
        timestamp,
      });
    });

    // Engineer ends voice transmission
    socket.on('engineer:voice:end', (data: VoiceMessage) => {
      const { messageId, duration, timestamp } = data;
      
      const transmission = activeTransmissions.get(messageId);
      if (!transmission) {
        logger.warn(`Voice end for unknown transmission: ${messageId}`);
        return;
      }

      logger.info(`Voice transmission ended: ${messageId}, duration: ${duration}ms, chunks: ${transmission.chunks.length}`);

      // Broadcast end to team dashboard
      socket.broadcast.to(`user:${userId}`).emit('engineer:voice:end', {
        messageId,
        from: userId,
        duration,
        timestamp,
      });

      // Forward end to relay agent
      relayNs.to(`user:${userId}`).emit('engineer:voice:end', {
        messageId,
        from: userId,
        duration,
        timestamp,
      });

      // Clean up transmission
      activeTransmissions.delete(messageId);
    });

    // Handle voice playback acknowledgment from relay
    socket.on('engineer:voice:ack', (data: { messageId: string; status: string }) => {
      logger.debug(`Voice ack from relay: ${data.messageId} - ${data.status}`);
      
      // Notify engineer that driver received the message
      appNs.to(`user:${userId}`).emit('engineer:voice:delivered', {
        messageId: data.messageId,
        status: data.status,
      });
    });
  });

  // Handle relay-side voice events (for driver responses if needed)
  relayNs.on('connection', (socket) => {
    // Relay acknowledges voice message received
    socket.on('voice:ack', (data: { messageId: string; status: string }) => {
      const userId = (socket as any).userId;
      
      // Forward ack to engineer
      appNs.to(`user:${userId}`).emit('engineer:voice:delivered', {
        messageId: data.messageId,
        status: data.status,
      });
    });
  });
}

/**
 * Get active transmission count (for monitoring)
 */
export function getActiveTransmissionCount(): number {
  return activeTransmissions.size;
}
