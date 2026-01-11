import { Namespace, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { logger } from '../logger.js';

const SOCKET_ROOMS = {
  user: (userId: string) => `user:${userId}`,
  session: (sessionId: string) => `session:${sessionId}`,
  timing: (sessionId: string) => `timing:${sessionId}`,
  telemetry: (sessionId: string, driverId?: string) => 
    driverId ? `telemetry:${sessionId}:${driverId}` : `telemetry:${sessionId}`,
};

interface AppSocket extends Socket {
  userId?: string;
  modules?: string[];
}

/**
 * Setup Socket.IO namespace for App connections
 * Backend -> Apps communication
 */
export function setupAppSocket(appNs: Namespace): void {
  // Authentication middleware
  appNs.use((socket: AppSocket, next) => {
    const token = socket.handshake.auth.token;
    
    // Allow demo token for development/testing
    if ((!token || token === 'demo-token') && config.nodeEnv === 'development') {
      socket.userId = 'demo-user';
      socket.modules = ['RACEBOX'];
      logger.info('Demo app connected (development mode)');
      return next();
    }

    if (!token) {
      return next(new Error('No token provided'));
    }

    try {
      const decoded = jwt.verify(token, config.jwtSecret) as {
        userId: string;
        modules: string[];
        type: string;
      };

      socket.userId = decoded.userId;
      socket.modules = decoded.modules;
      next();
    } catch (err) {
      logger.warn('App auth failed:', err);
      next(new Error('Invalid token'));
    }
  });

  appNs.on('connection', (socket: AppSocket) => {
    const userId = socket.userId!;
    const modules = socket.modules!;
    
    logger.info(`App connected: user=${userId}, modules=${modules.join(',')}`);
    
    // Join user's personal room
    socket.join(SOCKET_ROOMS.user(userId));
    
    // Send connection confirmation
    socket.emit('connected', { userId, modules });

    // Join session room
    socket.on('join:session', (sessionId: string) => {
      logger.debug(`User ${userId} joining session ${sessionId}`);
      socket.join(SOCKET_ROOMS.session(sessionId));
      socket.join(SOCKET_ROOMS.timing(sessionId));
    });

    // Leave session room
    socket.on('leave:session', (sessionId: string) => {
      logger.debug(`User ${userId} leaving session ${sessionId}`);
      socket.leave(SOCKET_ROOMS.session(sessionId));
      socket.leave(SOCKET_ROOMS.timing(sessionId));
      socket.leave(SOCKET_ROOMS.telemetry(sessionId));
    });

    // Subscribe to telemetry (optional driver filter)
    socket.on('subscribe:telemetry', (driverId?: string) => {
      const sessionRooms = Array.from(socket.rooms).filter(r => r.startsWith('session:'));
      for (const room of sessionRooms) {
        const sessionId = room.replace('session:', '');
        socket.join(SOCKET_ROOMS.telemetry(sessionId, driverId));
      }
    });

    // Unsubscribe from telemetry
    socket.on('unsubscribe:telemetry', () => {
      const telemetryRooms = Array.from(socket.rooms).filter(r => r.startsWith('telemetry:'));
      for (const room of telemetryRooms) {
        socket.leave(room);
      }
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      logger.debug(`App disconnected: user=${userId}`);
    });
  });
}
