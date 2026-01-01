// Incremental test to find blocking import
// Uncomment each import section one by one to find the culprit

import express from 'express';
import { createServer } from 'node:http';

// === STEP 1: Basic imports (should work) ===
// import { Server as SocketIOServer } from 'socket.io';
// import { WebSocketServer } from 'ws';

// === STEP 2: Database ===
// import { pool, ping } from './db.js';

// === STEP 3: Auth ===
// import { authenticateToken, requireRole } from './auth.js';

// === STEP 4: Routes ===
// import authRoutes from './auth-routes.js';
// import exportRoutes from './export-routes.js';
// import aiRoutes from './ai-routes.js';

// === STEP 5: Config ===
// import { config, isProduction } from './config/environment.js';

console.log('[TEST] All imports loaded successfully');

const app = express();

app.get('/ping', (req, res) => {
    console.log('[TEST] /ping hit');
    res.json({ status: 'ok', timestamp: Date.now() });
});

const server = createServer(app);
server.listen(3002, () => {
    console.log('[TEST] Server running on http://localhost:3002/ping');
});
