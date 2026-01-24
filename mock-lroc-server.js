const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3006",
    methods: ["GET", "POST"]
  }
});

// Mock data generator
const generateMockTelemetry = () => ({
  speed: Math.random() * 200 + 150,
  rpm: Math.random() * 3000 + 6000,
  gear: Math.floor(Math.random() * 6) + 1,
  throttle: Math.random() * 100,
  brake: Math.random() * 30,
  steering: (Math.random() - 0.5) * 90,
  lap: Math.floor(Math.random() * 20) + 1,
  position: Math.floor(Math.random() * 10) + 1,
  trackTemp: Math.random() * 10 + 35,
  airTemp: Math.random() * 5 + 25,
  fuel: Math.random() * 30 + 40,
  timestamp: Date.now()
});

const generateCompetitorData = () => [
  { position: 1, driver: 'VERSTAPPEN', gap: 'LEADER', lastLap: '1:27.654' },
  { position: 2, driver: 'HAMILTON', gap: '+2.576s', lastLap: '1:27.892' },
  { position: 3, driver: 'YOU', gap: '+3.821s', lastLap: '1:28.456' },
  { position: 4, driver: 'LECLERC', gap: '+6.697s', lastLap: '1:28.234' },
  { position: 5, driver: 'NORRIS', gap: '+8.455s', lastLap: '1:28.789' }
];

// Basic API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/api/sessions', (req, res) => {
  res.json({
    sessions: [{
      id: 'mock-session-1',
      name: 'Test Session',
      track: 'Silverstone',
      created_at: new Date().toISOString()
    }]
  });
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send initial data
  socket.emit('connect', { message: 'Connected to mock server' });
  socket.emit('telemetry', generateMockTelemetry());
  socket.emit('competitor_data', generateCompetitorData());
  socket.emit('session_info', {
    track: 'Silverstone',
    session: 'RACE',
    driver: 'PLAYER',
    car: 'Ferrari SF24',
    totalLaps: 52,
    sessionTime: 1800,
    remainingTime: 1800
  });

  // Send periodic updates
  const telemetryInterval = setInterval(() => {
    socket.emit('telemetry', generateMockTelemetry());
  }, 1000);

  const competitorInterval = setInterval(() => {
    socket.emit('competitor_data', generateCompetitorData());
  }, 5000);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    clearInterval(telemetryInterval);
    clearInterval(competitorInterval);
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Mock LROC server running on http://localhost:${PORT}`);
});
