import express from 'express';
import { createServer } from 'node:http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config.js';
import { logger } from './logger.js';
import { ping as pgPing, pool } from './db/index.js';
import { ping as mockPing } from './db/mock.js';
import { licenseRoutes } from './routes/license.js';
import { sessionRoutes } from './routes/sessions.js';
import { setupRelaySocket } from './sockets/relay.js';
import { setupAppSocket } from './sockets/app.js';
import { setupVoiceHandlers } from './sockets/voice.js';

// Use mock DB if Postgres connection fails
let useMockDb = false;
async function ping(): Promise<boolean> {
  if (useMockDb) return mockPing();
  try {
    return await pgPing();
  } catch {
    logger.warn('Postgres unavailable, using mock database');
    useMockDb = true;
    return mockPing();
  }
}

const app = express();
const server = createServer(app);

// Socket.IO with namespaces
const io = new SocketIOServer(server, {
  cors: {
    origin: config.corsOrigin,
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '1mb' }));

// Request logging
app.use((req, _res, next) => {
  logger.debug(`${req.method} ${req.path}`);
  next();
});

// Health check (public)
app.get('/health', async (_req, res) => {
  const dbOk = await ping();
  res.json({ 
    status: 'ok', 
    time: Date.now(), 
    db: dbOk ? 'up' : 'down',
    version: '0.1.0'
  });
});

// API Routes
app.use('/api/license', licenseRoutes);
app.use('/api/sessions', sessionRoutes);

// Socket namespaces
const relayNamespace = io.of('/relay');
const appNamespace = io.of('/app');

setupRelaySocket(relayNamespace, appNamespace);
setupAppSocket(appNamespace);
setupVoiceHandlers(appNamespace, relayNamespace);

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
server.listen(config.port, () => {
  logger.info(`Ok, Box Box API server listening on http://localhost:${config.port}`);
  logger.info(`Environment: ${config.nodeEnv}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down...');
  server.close();
  await pool.end();
  process.exit(0);
});
