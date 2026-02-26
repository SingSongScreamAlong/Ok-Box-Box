// =====================================================================
// ControlBox Server Entry Point
// =====================================================================

import 'dotenv/config';
import * as Sentry from '@sentry/node';
import { createServer } from 'http';
import { app } from './app.js';
import { initializeWebSocket } from './websocket/index.js';
import { initializeDatabase } from './db/client.js';
import { runMigrations, seedAdminUser } from './db/migrations.js';
import { config } from './config/index.js';
import { startSyncScheduler, stopSyncScheduler } from './services/iracing-oauth/index.js';

// Initialize Sentry for error tracking (production only)
if (process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: config.nodeEnv,
        tracesSampleRate: config.nodeEnv === 'production' ? 0.1 : 1.0,
        integrations: [
            Sentry.httpIntegration(),
            Sentry.expressIntegration(),
        ],
    });
    console.log('✅ Sentry error tracking initialized');
}

async function main() {
    console.log('🏎️  ControlBox Server Starting...');
    console.log(`   Environment: ${config.nodeEnv}`);
    console.log(`   Port: ${config.port}`);

    // Initialize database connection
    try {
        await initializeDatabase();
        console.log('✅ Database connected');

        // Run migrations
        console.log('📦 Running migrations...');
        await runMigrations();
        console.log('✅ Migrations complete');

        // Seed default admin if needed
        await seedAdminUser();

        // Start iRacing background sync scheduler
        startSyncScheduler();
    } catch (error) {
        console.error('❌ Database setup failed:', error);
        process.exit(1);
    }

    // Create HTTP server
    const httpServer = createServer(app);

    // Initialize WebSocket server
    initializeWebSocket(httpServer);
    console.log('✅ WebSocket server initialized');

    // Start listening
    httpServer.listen(config.port, config.host, () => {
        console.log(`🚀 ControlBox server running at http://${config.host}:${config.port}`);
        console.log(`   Build: 2026-02-23-v2`);
        console.log(`   Health check: http://${config.host}:${config.port}/api/health`);
    });

    // Graceful shutdown
    const shutdown = async () => {
        console.log('\n🛑 Shutting down gracefully...');

        // Stop background jobs
        stopSyncScheduler();

        httpServer.close(() => {
            console.log('   HTTP server closed');
            process.exit(0);
        });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
}

main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
