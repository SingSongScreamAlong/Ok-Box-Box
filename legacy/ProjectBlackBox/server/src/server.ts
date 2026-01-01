import express from 'express';
import { createServer } from 'node:http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { pool, ping } from './db.js';
import { authenticateToken, requireRole } from './auth.js';
import authRoutes from './auth-routes.js';
import exportRoutes from './export-routes.js';
import aiRoutes from './ai-routes.js';
import trackMapRoutes from './track-map-routes.js';
import trackCalibrationRoutes from './track-calibration-routes.js';
import voiceRoutes, { setupVoiceWebSocket } from './voice-routes.js';
import strategyRoutes from './strategy-routes.js';
import trainingRoutes from './training-routes.js';
import reportRoutes from './report-routes.js';
import analysisRoutes from './analysis-routes.js';
import notificationRoutes from './notification-routes.js';
import teamRoutes from './team-routes.js';
import GamificationService from './services/GamificationService.js';
import { apiLimiter, telemetryLimiter, authLimiter } from './middleware/rate-limit.js';
import { sanitizeInputs } from './middleware/sql-injection-guard.js';
import { config, isProduction } from './config/environment.js';
import { createHealthCheckRouter } from './middleware/health-check.js';
import { corsMiddleware, logCorsConfiguration } from './middleware/cors-config.js';
import { securityHeaders, customSecurityHeaders, logSecurityConfiguration } from './middleware/security-headers.js';

// Basic types aligned with dashboard expectations
export interface TelemetryTire {
  temp: number;
  wear: number;
  pressure: number;
}

export interface TelemetryData {
  driverId?: string;
  driverName?: string;
  speed: number;
  rpm: number;
  gear: number;
  throttle: number;
  brake: number;
  steering: number;
  tires: {
    frontLeft: TelemetryTire;
    frontRight: TelemetryTire;
    rearLeft: TelemetryTire;
    rearRight: TelemetryTire;
  };
  position: { x: number; y: number; z: number };
  lap: number;
  sector: number;
  lapTime: number;
  sectorTime: number;
  bestLapTime: number;
  bestSectorTimes: number[];
  gForce: { lateral: number; longitudinal: number; vertical: number };
  trackPosition: number;
  racePosition: number;
  gapAhead: number;
  gapBehind: number;
  timestamp: number;
}

interface Session {
  id: string;
  name?: string;
  track?: string;
  createdAt: number;
}

// DB-backed; in-memory stores removed

const app = express();

// EARLY BYPASS: Simple ping endpoint before any middleware to verify server responsiveness
app.get('/ping', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: ["http://localhost:3001", "http://127.0.0.1:3001", "http://localhost:3000", "http://127.0.0.1:3000"],
    credentials: true,
  },
});



// WebSocket server for voice communication
const wss = new WebSocketServer({ noServer: true });

// Handle upgrade for WebSocket connections
server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;

  if (pathname === '/api/voice/stream') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// Setup voice WebSocket handlers
setupVoiceWebSocket(wss);

// Security middleware - apply early in the chain
app.use(securityHeaders); // Helmet.js security headers
app.use(customSecurityHeaders); // Additional custom headers
app.use(corsMiddleware); // CORS configuration
app.use(express.json({ limit: '2mb' }));
app.use(sanitizeInputs); // SQL injection protection

// Authentication routes (public) - with brute force protection
app.use('/auth', authLimiter, authRoutes);

// Export routes (authenticated) - telemetry data exports
app.use('/api/export', exportRoutes);

// AI coaching routes (authenticated) - AI analysis and coaching
app.use('/api/ai', aiRoutes);

// Track map routes (public) - Track layouts, corners, SVG visualizations
app.use('/api/tracks', trackMapRoutes);

// Track calibration routes (authenticated) - Upload telemetry to generate accurate maps
app.use('/api/calibrate', trackCalibrationRoutes);

// Voice communication routes (authenticated) - Conversational race engineer with voice I/O
app.use('/api/voice', voiceRoutes);

// Race strategy routes (authenticated) - Fuel, tire, pit stop calculations
app.use('/api/strategy', strategyRoutes);

// Training system routes (authenticated) - Goals, badges, progress
app.use('/api/training', trainingRoutes);

// Session report routes (authenticated) - Post-session analysis
app.use('/api/reports', reportRoutes);

// Analysis routes (authenticated) - Corners, laps, comparison
app.use('/api/analysis', analysisRoutes);

// Notification routes (authenticated) - In-app notifications
app.use('/api/notifications', notificationRoutes);

// Team routes (authenticated) - Multi-driver views
app.use('/api/teams', teamRoutes);

// Health check endpoints (public) - /health, /health/ready, /health/metrics
app.use(createHealthCheckRouter(pool));

// List sessions (for simple picker/testing) - requires authentication
app.get('/sessions', apiLimiter, authenticateToken, async (_req, res) => {
  const q = await pool.query('SELECT id, name, track, extract(epoch from created_at)*1000 as created_at_ms FROM sessions ORDER BY created_at DESC');
  const sessions = q.rows.map((r: any) => ({ id: r.id, name: r.name ?? undefined, track: r.track ?? undefined, createdAt: Math.round(Number(r.created_at_ms)) })) as Session[];
  res.json({ sessions });
});

// Socket.IO basic rooms per session
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  socket.on('join_session', (sessionId: string) => {
    socket.join(`session:${sessionId}`);
    console.log(`[Socket.IO] Client ${socket.id} joined session:${sessionId}`);
  });

  socket.on('leave_session', (sessionId: string) => {
    socket.leave(`session:${sessionId}`);
    console.log(`[Socket.IO] Client ${socket.id} left session:${sessionId}`);
  });

  // ========================
  // Relay Agent Event Handlers
  // These receive data from relay agents and broadcast to all dashboards
  // ========================

  // Handle session metadata from relay agent
  socket.on('session_metadata', (data: any) => {
    console.log(`[Relay] Session metadata received: ${data?.trackName || data?.sessionId || 'unknown'}`);
    // Broadcast to all clients (dashboard viewers)
    socket.broadcast.emit('session_metadata', data);
    // Also emit to any session-specific room if sessionId is present
    if (data?.sessionId) {
      socket.join(`session:${data.sessionId}`);
      io.to(`session:${data.sessionId}`).emit('session_metadata', data);
    }
  });

  // Handle telemetry from relay agent
  socket.on('telemetry', (data: any) => {
    // Broadcast to all clients for live dashboard updates
    socket.broadcast.emit('telemetry', data);
    // Also send to session room
    if (data?.sessionId) {
      io.to(`session:${data.sessionId}`).emit('telemetry_update', data);
    }
  });

  // Handle race events (flag changes, cautions, etc)
  socket.on('race_event', (data: any) => {
    console.log(`[Relay] Race event: ${data?.flag || data?.eventType || 'unknown'}`);
    socket.broadcast.emit('race_event', data);
    if (data?.sessionId) {
      io.to(`session:${data.sessionId}`).emit('race_event', data);
    }
  });

  // Handle incidents
  socket.on('incident', (data: any) => {
    console.log(`[Relay] Incident: ${data?.driverName || 'unknown'} - ${data?.description || ''}`);
    socket.broadcast.emit('incident', data);
    if (data?.sessionId) {
      io.to(`session:${data.sessionId}`).emit('incident', data);
    }
  });

  // Handle driver updates (join/leave)
  socket.on('driver_update', (data: any) => {
    console.log(`[Relay] Driver update: ${data?.driverName || 'unknown'} - ${data?.action || ''}`);
    socket.broadcast.emit('driver_update', data);
    if (data?.sessionId) {
      io.to(`session:${data.sessionId}`).emit('driver_update', data);
    }
  });

  // Relay video frames
  socket.on('video_frame', (data: { sessionId: string; image: string }) => {
    // Broadcast to the specific session room, excluding sender if needed
    // Bridge to 'video_data' event which Dashboard expects
    if (data && data.sessionId && data.image) {
      socket.to(`session:${data.sessionId}`).emit('video_data', data.image);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// Create session - requires authentication
app.post('/sessions', apiLimiter, authenticateToken, async (req, res) => {
  const id: string = req.body?.id || uuidv4();
  const name = req.body?.name as string | undefined;
  const track = req.body?.track as string | undefined;

  await pool.query('INSERT INTO sessions (id, name, track) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING', [id, name ?? null, track ?? null]);
  const session: Session = { id, name, track, createdAt: Date.now() };
  return res.status(201).json(session);
});

// Append telemetry (single or array) - requires authentication, high-frequency data
app.post('/sessions/:id/telemetry', telemetryLimiter, authenticateToken, async (req, res) => {
  const { id } = req.params;
  // verify session exists
  const exists = await pool.query('SELECT 1 FROM sessions WHERE id = $1', [id]);
  if (exists.rowCount === 0) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const payload = req.body;
  const list: TelemetryData[] = Array.isArray(payload) ? payload : [payload];

  for (const t of list) {
    if (typeof t.timestamp !== 'number') {
      return res.status(400).json({ error: 'Each telemetry item must include numeric timestamp' });
    }
  }

  // batch insert
  const values: any[] = [];
  const cols = [
    'session_id', 'driver_id', 'ts', 'pos_x', 'pos_y', 'pos_z', 'speed', 'throttle', 'brake', 'gear', 'rpm', 'lap', 'sector',
    'tire_fl_temp', 'tire_fl_wear', 'tire_fl_pressure', 'tire_fr_temp', 'tire_fr_wear', 'tire_fr_pressure', 'tire_rl_temp', 'tire_rl_wear', 'tire_rl_pressure', 'tire_rr_temp', 'tire_rr_wear', 'tire_rr_pressure',
    'g_lat', 'g_long', 'g_vert', 'track_position', 'race_position', 'gap_ahead', 'gap_behind'
  ];
  const rowsSql: string[] = [];
  let idx = 1;
  for (const t of list) {
    const fl = t.tires?.frontLeft; const fr = t.tires?.frontRight; const rl = t.tires?.rearLeft; const rr = t.tires?.rearRight;
    rowsSql.push(`($${idx++}, $${idx++}, to_timestamp($${idx++} / 1000.0), $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`);
    values.push(
      id,
      t.driverId ?? null,
      t.timestamp,
      t.position?.x ?? null,
      t.position?.y ?? null,
      t.position?.z ?? null,
      t.speed ?? null,
      t.throttle ?? null,
      t.brake ?? null,
      t.gear ?? null,
      t.rpm ?? null,
      t.lap ?? null,
      t.sector ?? null,
      fl?.temp ?? null, fl?.wear ?? null, fl?.pressure ?? null,
      fr?.temp ?? null, fr?.wear ?? null, fr?.pressure ?? null,
      rl?.temp ?? null, rl?.wear ?? null, rl?.pressure ?? null,
      rr?.temp ?? null, rr?.wear ?? null, rr?.pressure ?? null,
      t.gForce?.lateral ?? null, t.gForce?.longitudinal ?? null, t.gForce?.vertical ?? null,
      t.trackPosition ?? null, t.racePosition ?? null,
      t.gapAhead ?? null, t.gapBehind ?? null
    );
  }
  if (rowsSql.length) {
    const sql = `INSERT INTO telemetry (${cols.join(',')}) VALUES ${rowsSql.join(',')}`;
    await pool.query(sql, values);
  }

  // Broadcast latest items to session room
  io.to(`session:${id}`).emit('telemetry_update', list);

  // Process Gamification (Async, don't block response)
  GamificationService.processBatch(id, list).catch(err => {
    console.error('[Gamification] Error processing batch:', err);
  });

  return res.status(202).json({ appended: list.length });
});

// Fetch telemetry window - requires authentication
app.get('/sessions/:id/telemetry', telemetryLimiter, authenticateToken, async (req, res) => {
  const { id } = req.params;
  const fromTs = req.query.fromTs ? Number(req.query.fromTs) : undefined;
  const toTs = req.query.toTs ? Number(req.query.toTs) : undefined;
  const driverId = req.query.driverId as string | undefined;

  const exists = await pool.query('SELECT 1 FROM sessions WHERE id = $1', [id]);
  if (exists.rowCount === 0) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const where: string[] = ['session_id = $1'];
  const params: any[] = [id];
  let p = 2;
  if (fromTs !== undefined) { where.push(`ts >= to_timestamp($${p++} / 1000.0)`); params.push(fromTs); }
  if (toTs !== undefined) { where.push(`ts <= to_timestamp($${p++} / 1000.0)`); params.push(toTs); }
  if (driverId) { where.push(`driver_id = $${p++}`); params.push(driverId); }

  const sql = `SELECT driver_id, extract(epoch from ts)*1000 as ts_ms,
    pos_x, pos_y, pos_z, speed, throttle, brake, gear, rpm, lap, sector,
    tire_fl_temp, tire_fl_wear, tire_fl_pressure,
    tire_fr_temp, tire_fr_wear, tire_fr_pressure,
    tire_rl_temp, tire_rl_wear, tire_rl_pressure,
    tire_rr_temp, tire_rr_wear, tire_rr_pressure,
    g_lat, g_long, g_vert, track_position, race_position, gap_ahead, gap_behind
    FROM telemetry WHERE ${where.join(' AND ')} ORDER BY ts ASC LIMIT 20000`;

  const q = await pool.query(sql, params);
  const data = q.rows.map((r: any) => ({
    driverId: r.driver_id ?? undefined,
    speed: r.speed ?? undefined,
    rpm: r.rpm ?? undefined,
    gear: r.gear ?? undefined,
    throttle: r.throttle ?? undefined,
    brake: r.brake ?? undefined,
    tires: {
      frontLeft: { temp: r.tire_fl_temp ?? 0, wear: r.tire_fl_wear ?? 0, pressure: r.tire_fl_pressure ?? 0 },
      frontRight: { temp: r.tire_fr_temp ?? 0, wear: r.tire_fr_wear ?? 0, pressure: r.tire_fr_pressure ?? 0 },
      rearLeft: { temp: r.tire_rl_temp ?? 0, wear: r.tire_rl_wear ?? 0, pressure: r.tire_rl_pressure ?? 0 },
      rearRight: { temp: r.tire_rr_temp ?? 0, wear: r.tire_rr_wear ?? 0, pressure: r.tire_rr_pressure ?? 0 },
    },
    position: { x: r.pos_x ?? 0, y: r.pos_y ?? 0, z: r.pos_z ?? 0 },
    lap: r.lap ?? 0,
    sector: r.sector ?? 0,
    gForce: { lateral: r.g_lat ?? 0, longitudinal: r.g_long ?? 0, vertical: r.g_vert ?? 0 },
    trackPosition: r.track_position ?? 0,
    racePosition: r.race_position ?? 0,
    gapAhead: r.gap_ahead ?? 0,
    gapBehind: r.gap_behind ?? 0,
    timestamp: Math.round(Number(r.ts_ms)),
  })) as TelemetryData[];

  return res.json({ count: data.length, data });
});

// Start server
server.listen(config.PORT, () => {
  console.log('='.repeat(60));
  console.log('🚀 PitBox Server Started');
  console.log('='.repeat(60));
  console.log(`Environment: ${config.NODE_ENV}`);
  console.log(`Server URL: ${config.SERVER_URL}`);
  console.log(`Port: ${config.PORT}`);
  console.log('');

  // Log security configuration
  logCorsConfiguration();
  console.log('');
  logSecurityConfiguration();

  console.log('');
  console.log('Health Checks:');
  console.log(`  Liveness:  ${config.SERVER_URL}/health`);
  console.log(`  Readiness: ${config.SERVER_URL}/health/ready`);
  console.log(`  Metrics:   ${config.SERVER_URL}/health/metrics`);
  console.log('='.repeat(60));

  // Diagnostic: Check if event loop is alive
  let heartbeat = 0;
  setInterval(() => {
    heartbeat++;
    console.log(`[HEARTBEAT] Event loop alive, tick ${heartbeat}`);
  }, 5000);
});
