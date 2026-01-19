const http = require('http');
const { io } = require('socket.io-client');

// CONFIG
const API_URL = 'http://localhost:3000/api';
const WS_URL = 'http://localhost:3000';
// To test authenticated tier, paste a valid Bearer token here:
const AUTH_TOKEN = '';

async function testAnonymousApiLimit() {
    console.log('\n--- 1. Testing Anonymous API Limit (expect 429 after 50 reqs) ---');
    let success = 0;
    let limited = 0;

    for (let i = 0; i < 60; i++) {
        try {
            await new Promise((resolve, reject) => {
                const req = http.get(`${API_URL}/health`, (res) => {
                    if (res.statusCode === 200) success++;
                    if (res.statusCode === 429) limited++;
                    resolve();
                });
                req.on('error', reject);
            });
        } catch (e) { console.error(e.message); }
    }
    console.log(`Result: Success=${success}, RateLimited=${limited}`);
    if (limited > 0) console.log('✅ Anonymous Rate Limit Triggered!');
    else console.log('❌ Failed to trigger limits (did you run this twice? wait 15m)');
}

async function testWebsocket() {
    console.log('\n--- 2. Testing WebSocket Limits (Standard vs Telemetry) ---');
    // Note: Anonymous sockets might be rejected if auth enforced, but let's try.
    // If strict auth is on, you need a token.
    const socket = io(WS_URL, {
        auth: { token: AUTH_TOKEN || 'test-token' }, // Might fail if invalid
        transports: ['websocket']
    });

    socket.on('connect', async () => {
        console.log('socket connected');

        // Test 1: Chat/Standard events (spam 60 times)
        // Limit is roughly 50/15m scaled? No, logic was CheckLimit consumes 1 token.
        // If Anonymous limit is 50, burst is 50.
        console.log('Spamming "chat" event...');
        for (let i = 0; i < 60; i++) {
            socket.emit('chat', { msg: 'spam' });
        }

        // Test 2: Telemetry events (spam 1000 times)
        console.log('Spamming "telemetry" event...');
        const start = Date.now();
        for (let i = 0; i < 1000; i++) {
            socket.emit('telemetry', { val: i });
        }
        console.log(`Sent 1000 telemetry packets in ${Date.now() - start}ms`);

        // Check logs on server side for "Rate limit exceeded" vs "Event received"
        setTimeout(() => {
            socket.disconnect();
            console.log('Test complete. Check server logs.');
        }, 2000);
    });

    socket.on('connect_error', (err) => {
        console.log('Socket connect error:', err.message);
        console.log('(If "Authentication error", provide a valid token in AUTH_TOKEN const)');
    });

    socket.on('error', (err) => {
        console.log('Socket error:', err);
    });
}

// Run
(async () => {
    await testAnonymousApiLimit();
    // await testWebsocket(); // Uncomment to test socket
})();
