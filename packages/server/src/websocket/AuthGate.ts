import { Server } from 'socket.io';
import { getAuthService } from '../services/auth/auth-service.js';
import { getEntitlementRepository } from '../services/billing/entitlement-service.js';
import { socketRateLimiter } from './rate-limit.js';

export class AuthGate {
    constructor(private io: Server) { }

    public setup() {
        // Authentication Middleware
        this.io.use(async (socket, next) => {
            const token = socket.handshake.auth.token || socket.handshake.headers['authorization']?.split(' ')[1];

            if (!token) {
                return next(new Error('Authentication required'));
            }

            const authService = getAuthService();
            let user: any = null;

            // 1. Try internal JWT first
            const payload = authService.verifyAccessToken(token);
            if (payload) {
                user = await authService.getUserById(payload.sub);
            }

            // 2. Fallback: Try Supabase JWT (from apps/app frontend)
            if (!user) {
                const supabasePayload = await authService.verifySupabaseToken(token);
                if (supabasePayload) {
                    user = await authService.findOrCreateSupabaseUser(
                        supabasePayload.sub,
                        supabasePayload.email,
                        supabasePayload.displayName || supabasePayload.email.split('@')[0]
                    );
                }
            }

            if (!user || !user.isActive) {
                return next(new Error('Authentication error: Invalid token'));
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
