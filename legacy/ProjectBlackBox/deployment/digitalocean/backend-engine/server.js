/**
 * BlackBox Backend Engine
 * Core server for the BlackBox hybrid cloud architecture
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Load configuration
const config = {
  port: process.env.PORT || 8080,
  jwtSecret: process.env.JWT_SECRET || 'development_secret_key',
  corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['*'],
  logLevel: process.env.LOG_LEVEL || 'info',
  databaseUrl: process.env.DATABASE_URL,
  aiAgentUrl: process.env.AI_AGENT_URL || 'http://ai-agent:3000',
  dataDir: process.env.DATA_DIR || './data',
  gradientApiKey: process.env.GRADIENT_AI_API_KEY,
  elevenLabsApiKey: process.env.ELEVENLABS_API_KEY
};

// Ensure data directory exists
if (!fs.existsSync(config.dataDir)) {
  fs.mkdirSync(config.dataDir, { recursive: true });
}

// Configure database connection
const db = new Pool({
  connectionString: config.databaseUrl,
  ssl: {
    rejectUnauthorized: false
  }
});

// Initialize WebSocket server
const wss = new WebSocket.Server({ server });

// Set up middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || config.corsOrigins.includes('*') || config.corsOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Authentication middleware
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// WebSocket authentication middleware
const authenticateWs = (info, callback) => {
  try {
    const token = info.req.url.split('?token=')[1];
    if (!token) {
      return callback(false, 401, 'Unauthorized');
    }

    jwt.verify(token, config.jwtSecret, (err, decoded) => {
      if (err) {
        return callback(false, 401, 'Unauthorized');
      }

      info.req.user = decoded;
      return callback(true);
    });
  } catch (error) {
    console.error('WebSocket authentication error:', error);
    return callback(false, 401, 'Unauthorized');
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.get('/api/status', authenticate, (req, res) => {
  res.json({
    status: 'online',
    user: req.user.username,
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Telemetry data endpoint
app.post('/api/telemetry', authenticate, async (req, res) => {
  try {
    const { driverId, sessionId, data } = req.body;
    
    if (!driverId || !sessionId || !data) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Store telemetry data in database
    const result = await db.query(
      'INSERT INTO telemetry (driver_id, session_id, data, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id',
      [driverId, sessionId, JSON.stringify(data)]
    );
    
    // Broadcast to connected clients
    broadcastTelemetry(driverId, sessionId, data);
    
    res.status(201).json({ 
      id: result.rows[0].id,
      message: 'Telemetry data received'
    });
  } catch (error) {
    console.error('Error processing telemetry data:', error);
    res.status(500).json({ error: 'Failed to process telemetry data' });
  }
});

// Video frame endpoint
app.post('/api/video', authenticate, async (req, res) => {
  try {
    const { driverId, sessionId, frameData, timestamp } = req.body;
    
    if (!driverId || !sessionId || !frameData) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Store video frame metadata in database
    const result = await db.query(
      'INSERT INTO video_frames (driver_id, session_id, timestamp, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id',
      [driverId, sessionId, timestamp]
    );
    
    // Store frame data in file system
    const frameId = result.rows[0].id;
    const framePath = path.join(config.dataDir, `frame_${frameId}.jpg`);
    
    // Convert base64 to binary
    const frameBuffer = Buffer.from(frameData.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    fs.writeFileSync(framePath, frameBuffer);
    
    // Broadcast to connected clients
    broadcastVideoFrame(driverId, sessionId, frameId, timestamp);
    
    res.status(201).json({ 
      id: frameId,
      message: 'Video frame received'
    });
  } catch (error) {
    console.error('Error processing video frame:', error);
    res.status(500).json({ error: 'Failed to process video frame' });
  }
});

// AI feedback endpoint
app.post('/api/ai/feedback', authenticate, async (req, res) => {
  try {
    const { driverId, sessionId, telemetryData } = req.body;
    
    if (!driverId || !sessionId || !telemetryData) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Forward to AI agent service
    const aiResponse = await fetch(`${config.aiAgentUrl}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.gradientApiKey}`
      },
      body: JSON.stringify({
        driver_id: driverId,
        session_id: sessionId,
        telemetry: telemetryData
      })
    });
    
    if (!aiResponse.ok) {
      throw new Error(`AI agent responded with status: ${aiResponse.status}`);
    }
    
    const feedback = await aiResponse.json();
    
    // Store AI feedback in database
    await db.query(
      'INSERT INTO ai_feedback (driver_id, session_id, feedback, created_at) VALUES ($1, $2, $3, NOW())',
      [driverId, sessionId, JSON.stringify(feedback)]
    );
    
    // Broadcast to connected clients
    broadcastAiFeedback(driverId, sessionId, feedback);
    
    res.status(200).json(feedback);
  } catch (error) {
    console.error('Error getting AI feedback:', error);
    res.status(500).json({ error: 'Failed to get AI feedback' });
  }
});

// Voice synthesis endpoint
app.post('/api/voice/synthesize', authenticate, async (req, res) => {
  try {
    const { text, voiceId } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Forward to AI agent service (which handles voice synthesis)
    const voiceResponse = await fetch(`${config.aiAgentUrl}/voice/synthesize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.elevenLabsApiKey}`
      },
      body: JSON.stringify({
        text,
        voice_id: voiceId || 'default'
      })
    });
    
    if (!voiceResponse.ok) {
      throw new Error(`Voice service responded with status: ${voiceResponse.status}`);
    }
    
    // Stream audio back to client
    voiceResponse.body.pipe(res);
  } catch (error) {
    console.error('Error synthesizing voice:', error);
    res.status(500).json({ error: 'Failed to synthesize voice' });
  }
});

// Session management endpoints
app.post('/api/sessions', authenticate, async (req, res) => {
  try {
    const { driverId, name, trackId } = req.body;
    
    if (!driverId || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Create new session
    const result = await db.query(
      'INSERT INTO sessions (driver_id, name, track_id, start_time, created_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id',
      [driverId, name, trackId]
    );
    
    const sessionId = result.rows[0].id;
    
    res.status(201).json({ 
      id: sessionId,
      message: 'Session created'
    });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

app.get('/api/sessions/:driverId', authenticate, async (req, res) => {
  try {
    const { driverId } = req.params;
    
    // Get all sessions for driver
    const result = await db.query(
      'SELECT * FROM sessions WHERE driver_id = $1 ORDER BY start_time DESC',
      [driverId]
    );
    
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error getting sessions:', error);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  const userId = req.user?.id || 'anonymous';
  console.log(`WebSocket connection established for user: ${userId}`);
  
  ws.isAlive = true;
  ws.userId = userId;
  
  ws.on('pong', () => {
    ws.isAlive = true;
  });
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      // Handle different message types
      switch (data.type) {
        case 'subscribe':
          ws.subscriptions = ws.subscriptions || [];
          ws.subscriptions.push(data.channel);
          break;
          
        case 'unsubscribe':
          if (ws.subscriptions) {
            ws.subscriptions = ws.subscriptions.filter(sub => sub !== data.channel);
          }
          break;
          
        default:
          console.warn(`Unknown message type: ${data.type}`);
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  });
  
  ws.on('close', () => {
    console.log(`WebSocket connection closed for user: ${userId}`);
  });
});

// WebSocket broadcast functions
function broadcastTelemetry(driverId, sessionId, data) {
  const message = JSON.stringify({
    type: 'telemetry',
    driverId,
    sessionId,
    data,
    timestamp: new Date().toISOString()
  });
  
  broadcastToChannel(`telemetry:${driverId}`, message);
  broadcastToChannel(`session:${sessionId}`, message);
}

function broadcastVideoFrame(driverId, sessionId, frameId, timestamp) {
  const message = JSON.stringify({
    type: 'video_frame',
    driverId,
    sessionId,
    frameId,
    timestamp,
    url: `/api/video/${frameId}`,
    serverTimestamp: new Date().toISOString()
  });
  
  broadcastToChannel(`video:${driverId}`, message);
  broadcastToChannel(`session:${sessionId}`, message);
}

function broadcastAiFeedback(driverId, sessionId, feedback) {
  const message = JSON.stringify({
    type: 'ai_feedback',
    driverId,
    sessionId,
    feedback,
    timestamp: new Date().toISOString()
  });
  
  broadcastToChannel(`ai:${driverId}`, message);
  broadcastToChannel(`session:${sessionId}`, message);
}

function broadcastToChannel(channel, message) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && 
        client.subscriptions && 
        client.subscriptions.includes(channel)) {
      client.send(message);
    }
  });
}

// WebSocket heartbeat
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(interval);
});

// Start server
server.listen(config.port, () => {
  console.log(`BlackBox Backend Engine running on port ${config.port}`);
});

// Handle graceful shutdown
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

function shutdown() {
  console.log('Shutting down gracefully...');
  
  // Close HTTP server
  server.close(() => {
    console.log('HTTP server closed');
    
    // Close database connection
    db.end(() => {
      console.log('Database connection closed');
      process.exit(0);
    });
  });
  
  // Force close after timeout
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}
