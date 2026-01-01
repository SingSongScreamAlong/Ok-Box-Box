require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

// Initialize express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  }
});

// Environment variables
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const DATA_STORE = process.env.DATA_STORE || 'memory'; // Options: memory, file, postgres (future)

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' })); // For parsing application/json
app.use(morgan('combined')); // Logging

// In-memory data store
const telemetryStore = {
  sessions: {},
  drivers: {},
  latestTelemetry: null
};

// File-based data store setup
const dataDir = path.join(__dirname, 'data');
if (DATA_STORE === 'file') {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Health check endpoint
app.get('/status', (req, res) => {
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    dataStore: DATA_STORE
  });
});

// Telemetry POST endpoint
app.post('/telemetry', (req, res) => {
  const telemetryData = req.body;

  if (!telemetryData) {
    return res.status(400).json({ error: 'No telemetry data provided' });
  }

  // Store telemetry data
  telemetryStore.latestTelemetry = telemetryData;

  // If session ID is provided, store by session
  if (telemetryData.sessionId) {
    if (!telemetryStore.sessions[telemetryData.sessionId]) {
      telemetryStore.sessions[telemetryData.sessionId] = [];
    }
    telemetryStore.sessions[telemetryData.sessionId].push({
      timestamp: new Date().toISOString(),
      data: telemetryData
    });
  }

  // If driver ID is provided, store by driver
  if (telemetryData.driverId) {
    if (!telemetryStore.drivers[telemetryData.driverId]) {
      telemetryStore.drivers[telemetryData.driverId] = [];
    }
    telemetryStore.drivers[telemetryData.driverId].push({
      timestamp: new Date().toISOString(),
      data: telemetryData
    });
  }

  // If using file storage, write to file
  if (DATA_STORE === 'file') {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const fileName = `telemetry_${timestamp}.json`;
    fs.writeFileSync(
      path.join(dataDir, fileName),
      JSON.stringify(telemetryData, null, 2)
    );
  }

  // Broadcast to all connected clients
  io.emit('telemetry_update', telemetryData);

  res.status(200).json({
    success: true,
    timestamp: new Date().toISOString()
  });
});

// Get latest telemetry
app.get('/telemetry/latest', (req, res) => {
  if (!telemetryStore.latestTelemetry) {
    return res.status(404).json({ error: 'No telemetry data available' });
  }
  res.json(telemetryStore.latestTelemetry);
});

// Get telemetry by session
app.get('/telemetry/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  if (!telemetryStore.sessions[sessionId]) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json(telemetryStore.sessions[sessionId]);
});

// Get telemetry by driver
app.get('/telemetry/driver/:driverId', (req, res) => {
  const { driverId } = req.params;
  if (!telemetryStore.drivers[driverId]) {
    return res.status(404).json({ error: 'Driver not found' });
  }
  res.json(telemetryStore.drivers[driverId]);
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Send latest telemetry on connection
  if (telemetryStore.latestTelemetry) {
    socket.emit('telemetry_update', telemetryStore.latestTelemetry);
  }

  // ========================
  // Session Room Management
  // ========================

  socket.on('join_session', (sessionId) => {
    socket.join(`session:${sessionId}`);
    console.log(`Client ${socket.id} joined session:${sessionId}`);
  });

  socket.on('leave_session', (sessionId) => {
    socket.leave(`session:${sessionId}`);
    console.log(`Client ${socket.id} left session:${sessionId}`);
  });

  // ========================
  // Relay Agent Event Handlers
  // These receive data from relay agents and broadcast to all dashboards
  // ========================

  // Handle session metadata from relay agent
  socket.on('session_metadata', (data) => {
    console.log(`[Relay] Session metadata: ${data?.trackName || data?.sessionId || 'unknown'}`);
    // Store in memory
    if (data?.sessionId) {
      telemetryStore.sessions[data.sessionId] = telemetryStore.sessions[data.sessionId] || [];
    }
    // Broadcast to all clients
    socket.broadcast.emit('session_metadata', data);
    // Also send to session-specific room
    if (data?.sessionId) {
      socket.join(`session:${data.sessionId}`);
      io.to(`session:${data.sessionId}`).emit('session_metadata', data);
    }
  });

  // Handle telemetry from relay agent
  socket.on('telemetry', (data) => {
    // Store latest telemetry
    telemetryStore.latestTelemetry = data;
    if (data?.sessionId) {
      if (!telemetryStore.sessions[data.sessionId]) {
        telemetryStore.sessions[data.sessionId] = [];
      }
      telemetryStore.sessions[data.sessionId].push({
        timestamp: new Date().toISOString(),
        data: data
      });
    }
    // Broadcast to all clients
    socket.broadcast.emit('telemetry', data);
    io.emit('telemetry_update', data);
    if (data?.sessionId) {
      io.to(`session:${data.sessionId}`).emit('telemetry_update', data);
    }
  });

  // Handle race events (flag changes, cautions, etc)
  socket.on('race_event', (data) => {
    console.log(`[Relay] Race event: ${data?.flag || data?.eventType || 'unknown'}`);
    socket.broadcast.emit('race_event', data);
    if (data?.sessionId) {
      io.to(`session:${data.sessionId}`).emit('race_event', data);
    }
  });

  // Handle incidents
  socket.on('incident', (data) => {
    console.log(`[Relay] Incident: ${data?.driverName || 'unknown'}`);
    socket.broadcast.emit('incident', data);
    if (data?.sessionId) {
      io.to(`session:${data.sessionId}`).emit('incident', data);
    }
  });

  // Handle driver updates (join/leave)
  socket.on('driver_update', (data) => {
    console.log(`[Relay] Driver update: ${data?.driverName || 'unknown'} - ${data?.action || ''}`);
    socket.broadcast.emit('driver_update', data);
    if (data?.sessionId) {
      io.to(`session:${data.sessionId}`).emit('driver_update', data);
    }
  });

  // Handle video frames from relay agent
  socket.on('video_frame', (data) => {
    if (data && data.sessionId && data.image) {
      // Bridge to 'video_data' event which Dashboard expects
      socket.to(`session:${data.sessionId}`).emit('video_data', data.image);
      socket.broadcast.emit('video_data', data.image);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Serve static files from the frontend build directory in production
if (NODE_ENV === 'production') {
  const staticDir = path.join(__dirname, '../frontend/build');
  if (fs.existsSync(staticDir)) {
    app.use(express.static(staticDir));

    // Handle React routing, return all requests to React app
    app.get('*', (req, res) => {
      res.sendFile(path.join(staticDir, 'index.html'));
    });
  }
}

// Start server
server.listen(PORT, () => {
  console.log(`BlackBox API Server running on port ${PORT}`);
  console.log(`Environment: ${NODE_ENV}`);
  console.log(`Data store: ${DATA_STORE}`);
  console.log(`Socket.IO server available at ws://localhost:${PORT}`);
});
