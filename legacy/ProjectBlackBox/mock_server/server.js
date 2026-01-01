const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Create Socket.IO server
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Store connected clients and received telemetry data
const clients = {};
const telemetryData = [];
const driverProfiles = [
  { id: 'driver1', name: 'John Doe', team: 'Team Alpha', avatar: 'avatar1.png' },
  { id: 'driver2', name: 'Jane Smith', team: 'Team Beta', avatar: 'avatar2.png' }
];

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  clients[socket.id] = { id: socket.id, driverId: null };
  
  // Handle telemetry data
  socket.on('telemetry', (data) => {
    console.log(`Received telemetry data from ${socket.id}`);
    // Store the last 100 telemetry points
    telemetryData.push({
      timestamp: Date.now(),
      clientId: socket.id,
      driverId: clients[socket.id].driverId,
      data
    });
    
    if (telemetryData.length > 100) {
      telemetryData.shift();
    }
    
    // Echo the data back to the client for testing
    socket.emit('telemetry_received', { status: 'ok', timestamp: Date.now() });
  });
  
  // Handle driver identification
  socket.on('identify_driver', (data) => {
    console.log(`Driver identified: ${data.driverId}`);
    if (clients[socket.id]) {
      clients[socket.id].driverId = data.driverId;
      socket.emit('driver_identified', { status: 'ok', driverId: data.driverId });
    }
  });
  
  // Handle video frames
  socket.on('video_frame', (data) => {
    console.log(`Received video frame from ${socket.id}`);
    // Just acknowledge receipt for now
    socket.emit('video_received', { status: 'ok', timestamp: Date.now() });
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    delete clients[socket.id];
  });
});

// API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/api/drivers', (req, res) => {
  res.json(driverProfiles);
});

app.get('/api/telemetry/latest', (req, res) => {
  const latest = telemetryData.slice(-10);
  res.json(latest);
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Mock server running on port ${PORT}`);
  console.log(`Socket.IO server available at ws://localhost:${PORT}`);
});
