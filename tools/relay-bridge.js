#!/usr/bin/env node
/**
 * Relay Bridge for Production
 * Connects to Python relay (9999) and forwards to Digital Ocean server
 */

const { io } = require('socket.io-client');

const PYTHON_URL = 'http://127.0.0.1:9999';
const SERVER_URL = 'https://octopus-app-qsi3i.ondigitalocean.app';

console.log('🔌 Relay Bridge Starting...');
console.log(`   Python relay: ${PYTHON_URL}`);
console.log(`   Server: ${SERVER_URL}`);

// Connect to Python relay
const pythonSocket = io(PYTHON_URL, {
    reconnection: true,
    reconnectionDelay: 1000,
    timeout: 5000
});

// Connect to DO server
const serverSocket = io(SERVER_URL, {
    reconnection: true,
    reconnectionDelay: 1000,
    timeout: 10000,
    transports: ['websocket', 'polling']
});

let telemetryCount = 0;

pythonSocket.on('connect', () => {
    console.log('✅ Connected to Python relay');
});

pythonSocket.on('disconnect', () => {
    console.log('⚠️ Disconnected from Python relay');
});

pythonSocket.on('connect_error', (err) => {
    console.log('❌ Python relay error:', err.message);
});

serverSocket.on('connect', () => {
    console.log('✅ Connected to Digital Ocean server');
    serverSocket.emit('relay:connect', {
        version: '1.0.0-bridge',
        machineId: require('os').hostname(),
        platform: process.platform
    });
});

serverSocket.on('disconnect', () => {
    console.log('⚠️ Disconnected from DO server');
});

serverSocket.on('connect_error', (err) => {
    console.log('❌ DO server error:', err.message);
});

// Forward: iRacing status
pythonSocket.on('iracing_status', (data) => {
    console.log('📡 iRacing:', data.connected ? 'connected' : 'disconnected');
    serverSocket.emit('iracing_status', data);
});

// Forward: Session metadata
pythonSocket.on('session_metadata', (data) => {
    console.log('📋 Session:', data?.trackName || 'unknown');
    serverSocket.emit('session_metadata', data);
});

// Forward: Telemetry (60Hz)
pythonSocket.on('telemetry', (data) => {
    telemetryCount++;
    if (telemetryCount % 60 === 1) {
        const car = data?.cars?.[0];
        const speedMph = car?.speed ? Math.round(car.speed * 2.237) : 0;
        console.log(`📊 Telemetry: ${telemetryCount} | P${car?.position ?? '?'} L${car?.lap ?? '?'} ${speedMph}mph pit:${car?.inPit}`);
    }
    serverSocket.emit('telemetry', data);
});

// Forward: Strategy raw (1Hz)
pythonSocket.on('strategy_raw', (data) => {
    serverSocket.emit('strategy_raw', data);
});

// Forward: Incidents
pythonSocket.on('incident', (data) => {
    console.log('⚠️ Incident:', data?.type);
    serverSocket.emit('incident', data);
});

// Forward: Standings (1Hz) - CRITICAL for leaderboard
let standingsLogged = false;
pythonSocket.on('standings', (data) => {
    const player = data?.standings?.find(s => s.isPlayer);
    if (!standingsLogged && player) {
        standingsLogged = true;
        console.log(`🏁 Player: ${JSON.stringify(player)}`);
    }
    // Show actual position value (0 means not racing yet)
    const pos = player?.position ?? 'N/A';
    const lap = player?.lap ?? 'N/A';
    console.log(`🏁 Standings: ${data?.standings?.length || 0} cars | Player: P${pos} L${lap} pit:${player?.onPitRoad}`);
    serverSocket.emit('standings', data);
});

console.log('🏎️ Bridge running. Press Ctrl+C to stop.');
