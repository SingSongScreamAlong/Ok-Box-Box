import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from 'jsonwebtoken';
import { config } from '../config/index.js';
import { getEntitlementRepository } from '../services/billing/entitlement-service.js';
import { socketRateLimiter } from './rate-limit.js';

export class AuthGate {
    constructor(private io: Server) { }

    public setup() {
        // Authentication Middleware
        this.io.use(async (socket, next) => {
            const token = socket.handshake.auth.token || socket.handshake.headers['authorization']?.split(' ')[1];

            // ALPHA TESTING: Allow unauthenticated connections
            if (!token) {
                console.log(`🔌 Allowing unauthenticated connection for alpha testing (${socket.id})`);
                socket.data.user = { sub: 'anonymous', entitlements: [] };
                return next();
            }

            try {
                const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;

                // Fetch entitlements for rate limiting
                // (We attach this to socket.data.user so rate limiter can see it)
                let entitlements: any[] = [];
                try {
                    // Determine userId from sub (subject)
                    const userId = decoded.sub;

                    if (userId) {
                        entitlements = await getEntitlementRepository().getForUser(userId);
                    }
                } catch (err) {
                    // Ignore entitlement fetch error, proceed with basics
                }

                socket.data.user = { ...decoded, entitlements };
                next();
            } catch (err) {
                console.log(`🔌 Connection rejected: Invalid token (${socket.id})`);
                return next(new Error('Authentication error: Invalid token'));
            }
        });

        // Rate Limiter Middleware for Incoming Events
        // Applied on connection to each socket
        this.io.on('connection', (socket) => {
            socket.use((packet, next) => {
                const eventName = packet[0];

                // Skip rate limiting for high-freq telemetry to avoid overhead/blocking
                // Telemetry implements its own internal throttling/processing usually
                if (eventName === 'telemetry' || eventName === 'telemetry_binary' || eventName === 'video_frame') {
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
