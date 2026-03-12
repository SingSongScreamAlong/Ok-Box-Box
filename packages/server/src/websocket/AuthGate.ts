import { Server } from 'socket.io';
import { getAuthService } from '../services/auth/auth-service.js';
import { getEntitlementRepository } from '../services/billing/entitlement-service.js';
import { socketRateLimiter } from './rate-limit.js';
import { config } from '../config/index.js';

export class AuthGate {
    constructor(private io: Server) { }

    public setup() {
        // Authentication Middleware
        this.io.use(async (socket, next) => {
            const token = socket.handshake.auth.token || socket.handshake.headers['authorization']?.split(' ')[1];
            const relayId = socket.handshake.auth.relayId || socket.handshake.query.relayId;
            const authService = getAuthService();

            if (relayId && token) {
                const user = await authService.resolveUserFromToken(token);
                if (user && user.isActive) {
                    let entitlements: any[] = [];
                    try {
                        entitlements = await getEntitlementRepository().getForUser(user.id);
                    } catch {
                    }

                    socket.data.user = { ...user, entitlements };
                    socket.data.isRelay = true;
                    socket.data.relayId = relayId;
                    console.log(`🔌 Linked relay connected: ${relayId} (${user.email})`);
                    return next();
                }
            }

            // Allow relay connections with relayId
            // In development: any relayId works
            // In production: relayId must match RELAY_SECRET env var exactly
            if (relayId) {
                const isDevMode = config.nodeEnv === 'development';
                const relaySecret = process.env.RELAY_SECRET;
                const isAuthorizedRelay = isDevMode || (relaySecret && relayId === relaySecret);
                
                if (isAuthorizedRelay) {
                    socket.data.user = { id: 'relay', email: 'relay@local', isActive: true, roles: ['relay'], entitlements: [] };
                    socket.data.isRelay = true;
                    console.log(`🔌 Relay connected: ${relayId.substring(0, 8)}...`);
                    return next();
                } else if (!isDevMode) {
                    console.warn(`🔌 Connection rejected: Invalid relay secret (${socket.id})`);
                    return next(new Error('Invalid relay credentials'));
                }
            }

            // Allow dashboard/viewer connections - they only receive telemetry, don't send
            // If no token provided, allow as anonymous viewer (rate-limited)
            if (!token) {
                if (!config.allowAnonymousSocketViewers) {
                    return next(new Error('Authentication required for websocket connection'));
                }
                socket.data.user = { id: 'anonymous', email: 'viewer@anonymous', isActive: true, roles: ['viewer'], entitlements: [] };
                socket.data.isViewer = true;
                return next();
            }

            const user = await authService.resolveUserFromToken(token);

            // If token verification failed, allow as anonymous viewer instead of rejecting
            // This enables dashboard connections even if Supabase JWT verification fails
            if (!user || !user.isActive) {
                if (!config.allowAnonymousSocketViewers) {
                    return next(new Error('Invalid or expired websocket token'));
                }
                socket.data.user = { id: 'anonymous', email: 'viewer@anonymous', isActive: true, roles: ['viewer'], entitlements: [] };
                socket.data.isViewer = true;
                return next();
            }

            // Fetch entitlements for rate limiting
            let entitlements: any[] = [];
            try {
                entitlements = await getEntitlementRepository().getForUser(user.id);
            } catch (err) {
                // Ignore entitlement fetch error, proceed with basics
            }

            socket.data.user = { ...user, entitlements };
            next();
        });

        // Rate Limiter Middleware for Incoming Events
        // Applied on connection to each socket
        this.io.on('connection', (socket) => {
            socket.use((packet, next) => {
                const eventName = packet[0];

                // Skip rate limiting for high-freq telemetry to avoid overhead/blocking
                // and for relay feed events that must not be dropped.
                // Guard against oversized payloads to prevent abuse via this bypass.
                const relayBypassEvents = new Set([
                    'telemetry',
                    'telemetry_binary',
                    'video_frame',
                    'standings',
                    'strategy_raw',
                    'session_metadata',
                    'session_info',
                    'incident',
                    'race_event',
                    'telemetry:baseline',
                    'telemetry:controls',
                ]);
                if (relayBypassEvents.has(eventName)) {
                    if (!socket.data.isRelay) {
                        return next(new Error('Relay authentication required for telemetry event'));
                    }
                    // Size check for high-volume events to prevent flooding
                    const MAX_TELEMETRY_BYTES = 512 * 1024; // 512 KB
                    const payload = packet[1];
                    const payloadSize = payload instanceof Buffer
                        ? payload.byteLength
                        : Buffer.byteLength(typeof payload === 'string' ? payload : JSON.stringify(payload), 'utf8');
                    if (payloadSize > MAX_TELEMETRY_BYTES) {
                        return next(new Error('Telemetry payload too large'));
                    }
                    return next();
                }

                if (!socketRateLimiter.checkLimit(socket)) {
                    // console.log(`⛔ Rate limit exceeded for socket ${socket.id} (${eventName})`);
                    // Block event
                    return next(new Error('Rate limit exceeded'));
                }
                next();
            });
        });
    }
}
