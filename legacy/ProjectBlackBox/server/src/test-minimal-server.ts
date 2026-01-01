// Minimal test server to verify Express works without imports
import express from 'express';
import { createServer } from 'node:http';

const app = express();

app.get('/ping', (req, res) => {
    console.log('[TEST] /ping hit');
    res.json({ status: 'ok', timestamp: Date.now() });
});

const server = createServer(app);
server.listen(3001, () => {
    console.log('Test server running on http://localhost:3001');
});
