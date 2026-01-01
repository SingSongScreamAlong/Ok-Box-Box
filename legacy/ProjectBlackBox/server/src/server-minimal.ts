// Working server with minimal imports - testing which import blocks
import 'dotenv/config';
import express from 'express';
import { createServer } from 'node:http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { pool } from './db.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-in-production';

const app = express();

// Simple ping before anything else
app.get('/ping', (req, res) => {
    console.log('[PING] Request received');
    res.json({ status: 'ok', timestamp: Date.now() });
});

// Middleware
app.use(express.json());
app.use(cors({ origin: true, credentials: true }));

// Auth middleware
const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

// Login endpoint
app.post('/auth/login', async (req, res) => {
    console.log('[LOGIN] Request received');
    try {
        const { email, password } = req.body;
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const user = result.rows[0];
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ message: 'Login successful', user: { id: user.id, email: user.email, name: user.name, role: user.role }, token });
    } catch (err) {
        console.error('[LOGIN] Error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Register endpoint
app.post('/auth/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        const hash = await bcrypt.hash(password, 12);
        const id = uuidv4();
        await pool.query('INSERT INTO users (id, email, password_hash, name, role) VALUES ($1, $2, $3, $4, $5)', [id, email, hash, name, 'user']);
        const token = jwt.sign({ userId: id, email, role: 'user' }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ message: 'User created successfully', user: { id, email, name, role: 'user' }, token });
    } catch (err: any) {
        if (err.code === '23505') return res.status(400).json({ error: 'Email already exists' });
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Sessions endpoints
app.get('/sessions', authenticateToken, async (req, res) => {
    const result = await pool.query('SELECT id, name, track, created_at FROM sessions ORDER BY created_at DESC LIMIT 50');
    res.json({ sessions: result.rows });
});

app.post('/sessions', async (req, res) => {
    const { id, name, track } = req.body;
    await pool.query('INSERT INTO sessions (id, name, track) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING', [id, name, track]);
    res.json({ ok: true, id });
});

// Telemetry ingestion
app.post('/sessions/:sessionId/telemetry', async (req, res) => {
    const { sessionId } = req.params;
    const data = req.body;
    console.log('[TELEMETRY] Received data for session:', sessionId);

    // Normalize data format from relay agent (capitalized) to dashboard (lowercase)
    const normalizedData = {
        speed: data.Speed || data.speed || 0,
        rpm: data.RPM || data.rpm || 0,
        gear: data.Gear || data.gear || 0,
        throttle: data.Throttle || data.throttle || 0,
        brake: data.Brake || data.brake || 0,
        clutch: data.Clutch || data.clutch || 0,
        steering: data.SteeringWheelAngle || data.steering || 0,
        fuel: { level: data.FuelLevel || 0, consumption: 0, lapsRemaining: 0 },
        tires: {
            frontLeft: { temp: data.LFtempCL || 80, wear: data.LFwearL || 0.9, pressure: data.LFpressure || 175 },
            frontRight: { temp: data.RFtempCL || 80, wear: data.RFwearL || 0.9, pressure: data.RFpressure || 175 },
            rearLeft: { temp: data.LRtempCL || 78, wear: data.LRwearL || 0.9, pressure: data.LRpressure || 165 },
            rearRight: { temp: data.RRtempCL || 78, wear: data.RRwearL || 0.9, pressure: data.RRpressure || 165 },
        },
        lap: data.Lap || 1,
        sector: data.Sector || 1,
        gForce: { lateral: data.LatAccel || 0, longitudinal: data.LongAccel || 0, vertical: 0 },
        timestamp: Date.now(),
    };

    // Emit normalized data to connected clients via Socket.IO
    io.to(sessionId).emit('telemetry', normalizedData);
    console.log('[TELEMETRY] Broadcasted to room:', sessionId);

    // Store in DB (simplified)
    try {
        await pool.query(
            `INSERT INTO telemetry (session_id, ts_ms, speed, rpm, gear, throttle, brake, steering) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [sessionId, Date.now(), normalizedData.speed, normalizedData.rpm, normalizedData.gear, normalizedData.throttle, normalizedData.brake, normalizedData.steering]
        );
    } catch (e) {
        // Ignore DB errors for now
    }

    res.json({ ok: true });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
});

const server = createServer(app);
const io = new SocketIOServer(server, {
    cors: { origin: true, credentials: true }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('[SOCKET] Client connected:', socket.id);

    socket.on('join_session', (sessionId) => {
        console.log('[SOCKET] Client joining session:', sessionId);
        socket.join(sessionId);
    });

    socket.on('disconnect', () => {
        console.log('[SOCKET] Client disconnected:', socket.id);
    });
});

const PORT = 3000;

// ============================================
// SIMULATION MODE - Generate mock telemetry
// ============================================
let simulationRunning = false;
let simulationInterval: NodeJS.Timeout | null = null;
let simulationState = {
    lap: 1,
    sector: 1,
    speed: 0,
    rpm: 3000,
    gear: 1,
    fuel: 95,
    trackPosition: 0,
    lapTime: 0,
    bestLapTime: 0,
    lapStartTime: Date.now(),
};

function generateMockTelemetry() {
    const t = Date.now() / 1000;
    
    // Simulate speed variations (racing around a track)
    const baseSpeed = 180 + Math.sin(t * 0.5) * 80;
    simulationState.speed = Math.max(60, Math.min(320, baseSpeed + (Math.random() - 0.5) * 20));
    
    // Throttle/brake based on speed changes
    const speedDelta = Math.sin(t * 0.5) * 0.5;
    const throttle = speedDelta > 0 ? 0.7 + speedDelta * 0.3 : Math.max(0, 0.3 + speedDelta);
    const brake = speedDelta < -0.2 ? Math.abs(speedDelta) * 0.8 : 0;
    
    // Gear based on speed
    const gear = Math.max(1, Math.min(8, Math.floor(simulationState.speed / 40) + 1));
    simulationState.gear = gear;
    
    // RPM based on speed and gear
    const gearRatios = [3.5, 2.5, 1.9, 1.5, 1.2, 1.0, 0.85, 0.75];
    simulationState.rpm = Math.min(12000, 3000 + (simulationState.speed / 320) * 9000 * gearRatios[gear - 1] / gearRatios[5]);
    
    // Track position and lap/sector updates
    simulationState.trackPosition += simulationState.speed / 3600 / 5.5 * 0.1; // ~5.5km track
    if (simulationState.trackPosition >= 1) {
        simulationState.trackPosition = 0;
        simulationState.lap++;
        const lapTime = (Date.now() - simulationState.lapStartTime) / 1000;
        if (simulationState.bestLapTime === 0 || lapTime < simulationState.bestLapTime) {
            simulationState.bestLapTime = lapTime;
        }
        simulationState.lapStartTime = Date.now();
        simulationState.fuel = Math.max(0, simulationState.fuel - 2.3);
    }
    
    // Sector based on track position
    simulationState.sector = Math.floor(simulationState.trackPosition * 3) + 1;
    simulationState.lapTime = (Date.now() - simulationState.lapStartTime) / 1000;
    
    // Steering based on track section
    const steering = Math.sin(t * 0.3) * 0.4;
    
    // Tire temps and wear
    const baseTireTemp = 85 + simulationState.lap * 0.5;
    const tireWear = Math.max(0, 100 - simulationState.lap * 1.5);
    
    return {
        speed: simulationState.speed,
        rpm: simulationState.rpm,
        gear: simulationState.gear,
        throttle: throttle,
        brake: brake,
        clutch: 0,
        steering: steering,
        fuel: {
            level: simulationState.fuel,
            usagePerHour: 45,
        },
        tires: {
            frontLeft: { temp: baseTireTemp + Math.random() * 5, wear: tireWear, pressure: 175 + Math.random() * 5 },
            frontRight: { temp: baseTireTemp + 2 + Math.random() * 5, wear: tireWear - 2, pressure: 175 + Math.random() * 5 },
            rearLeft: { temp: baseTireTemp - 3 + Math.random() * 5, wear: tireWear + 3, pressure: 165 + Math.random() * 5 },
            rearRight: { temp: baseTireTemp - 1 + Math.random() * 5, wear: tireWear + 1, pressure: 165 + Math.random() * 5 },
        },
        position: { x: Math.cos(simulationState.trackPosition * Math.PI * 2) * 500, y: 0, z: Math.sin(simulationState.trackPosition * Math.PI * 2) * 500 },
        lap: simulationState.lap,
        sector: simulationState.sector,
        lapTime: simulationState.lapTime,
        sectorTime: simulationState.lapTime % 30,
        bestLapTime: simulationState.bestLapTime,
        deltaToBestLap: simulationState.bestLapTime > 0 ? simulationState.lapTime - (simulationState.bestLapTime * simulationState.trackPosition) : 0,
        bestSectorTimes: [28, 32, 25],
        gForce: { 
            lateral: Math.sin(t * 0.3) * 2, 
            longitudinal: speedDelta * 3, 
            vertical: 0 
        },
        trackPosition: simulationState.trackPosition,
        racePosition: 5,
        gapAhead: 2.1 + Math.sin(t * 0.1) * 0.5,
        gapBehind: 1.4 + Math.sin(t * 0.15) * 0.3,
        flags: 0, // Green flag
        drsStatus: 0,
        carSettings: {
            brakeBias: 56.5,
            abs: 3,
            tractionControl: 4,
            tractionControl2: 0,
            fuelMixture: 2,
        },
        energy: {
            batteryPct: 0.75 + Math.sin(t * 0.2) * 0.1,
            deployPct: 0.5,
            deployMode: 2,
        },
        weather: {
            windSpeed: 8 + Math.random() * 2,
            windDirection: 180,
        },
        timestamp: Date.now(),
    };
}

function startSimulation() {
    if (simulationRunning) return { status: 'already_running' };
    
    simulationRunning = true;
    simulationState = {
        lap: 1,
        sector: 1,
        speed: 0,
        rpm: 3000,
        gear: 1,
        fuel: 95,
        trackPosition: 0,
        lapTime: 0,
        bestLapTime: 0,
        lapStartTime: Date.now(),
    };
    
    console.log('[SIMULATION] Starting telemetry simulation...');
    
    simulationInterval = setInterval(() => {
        const telemetry = generateMockTelemetry();
        // Broadcast to all connected clients (both 'telemetry' and 'telemetry_update' for compatibility)
        io.emit('telemetry', telemetry);
        io.emit('telemetry_update', telemetry);
    }, 100); // 10 Hz update rate
    
    return { status: 'started', lap: simulationState.lap };
}

function stopSimulation() {
    if (!simulationRunning) return { status: 'not_running' };
    
    simulationRunning = false;
    if (simulationInterval) {
        clearInterval(simulationInterval);
        simulationInterval = null;
    }
    
    console.log('[SIMULATION] Stopped telemetry simulation');
    return { status: 'stopped', finalLap: simulationState.lap };
}

// Simulation control endpoints
app.post('/simulation/start', (req, res) => {
    const result = startSimulation();
    res.json(result);
});

app.post('/simulation/stop', (req, res) => {
    const result = stopSimulation();
    res.json(result);
});

app.get('/simulation/status', (req, res) => {
    res.json({
        running: simulationRunning,
        lap: simulationState.lap,
        sector: simulationState.sector,
        speed: simulationState.speed,
        fuel: simulationState.fuel,
    });
});

server.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log(`🚀 Minimal Server Started on port ${PORT}`);
    console.log('='.repeat(50));
    console.log('');
    console.log('📡 Simulation endpoints:');
    console.log('   POST /simulation/start  - Start mock telemetry');
    console.log('   POST /simulation/stop   - Stop mock telemetry');
    console.log('   GET  /simulation/status - Get simulation status');
    console.log('');
});
