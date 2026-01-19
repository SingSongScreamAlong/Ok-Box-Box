import { Socket } from 'socket.io';
import { RATE_LIMIT_TIERS, RateLimitTier } from '../api/middleware/rate-limit-tiers.js';

interface TokenBucket {
    tokens: number;
    lastRefill: number;
}

export class SocketRateLimiter {
    // Map of socketId -> bucket
    private buckets: Map<string, TokenBucket> = new Map();

    // Cleanup interval for buckets of disconnected sockets (if not handled on disconnect)
    // Actually simpler: we can delete bucket on disconnect

    /**
     * Determine tier from socket user data
     */
    private getTier(socket: Socket): RateLimitTier {
        const user = socket.data.user;

        if (!user) {
            return RATE_LIMIT_TIERS.anonymous;
        }

        if (user.isSuperAdmin) {
            return RATE_LIMIT_TIERS.admin;
        }

        const entitlements = user.entitlements || [];
        const activeProducts = entitlements
            .filter((e: any) => e.status === 'active' || e.status === 'trial')
            .map((e: any) => e.product);

        if (activeProducts.includes('bundle')) return RATE_LIMIT_TIERS.bundle;
        if (activeProducts.includes('controlbox')) return RATE_LIMIT_TIERS.controlbox;
        if (activeProducts.includes('blackbox')) return RATE_LIMIT_TIERS.blackbox;

        return RATE_LIMIT_TIERS.anonymous;
    }

    /**
     * Check if socket is allowed to send a message
     * Consumes 1 token if allowed.
     */
    public checkLimit(socket: Socket): boolean {
        const tier = this.getTier(socket);
        const now = Date.now();
        const bucket = this.buckets.get(socket.id);

        // Convert window/limit to refill rate
        // We will use the same values but scaled to seconds for token bucket
        // API Limits are per 15 mins.
        // e.g. 50 / 15min = 3.33 / min = 0.05 / sec
        // This is too slow for realtime socket events (telemetry is 60Hz or 1Hz?)
        // Telemetry is high frequency. "anonymous" shouldn't be sending telemetry?
        // Wait, "blackbox" (Driver HUD) sends telemetry.
        // If limit is 200 req / 15 min for API, that's wildly insufficient for 60Hz telemetry.

        // **CRITICAL DISTINCTION**: API Limits vs Socket Limits.
        // API limits (rate-limit-tiers.ts) are designed for REST calls.
        // Socket telemetry is streaming.
        // We need DIFFERENT limits for Request/Response vs Streaming.

        // Scope Check: "Apply on API + Socket.IO where applicable"
        // "Preserve existing behavior for entitled users"

        // Proposal:
        // 1. Command messages (room:join, voice:generate, steward:action) -> Use API-like limits (strict).
        // 2. High-freq telemetry (telemetry, telemetry_binary) -> Use much higher limits or separate bucket.

        // Let's implement EVENT-BASED limits.
        // "Standard" events: strict limit (tier based)
        // "HighFreq" events: generous limit (tier based or just high)

        // For simplicity in Phase 1: Only limit "Standard" control events.
        // Telemetry flooding is a DoS risk, but legit users send 60Hz.
        // 60Hz = 3600/min.
        // I will apply limits to non-telemetry events for now to match API constraints.

        // Rate: Use the RateLimitTier values but treat them as "messages per minute" instead of 15m?
        // No, that changes the definition.
        // Let's just define a scaler. 
        // Or better, define Socket-specific limits. 
        // But constraint: "No new frameworks" implies reusing existing config logic if possible.
        // I will reuse the tier *names* but scale the limits for sockets.
        // Let's say Socket Command Limit = API Limit / 5 (per minute).

        if (!bucket) {
            // Initialize full bucket
            this.buckets.set(socket.id, {
                tokens: tier.limit,
                lastRefill: now
            });
            return true;
        }

        // Refill
        // Refill rate: limit / windowMs (tokens per ms)
        const refillRate = tier.limit / tier.windowMs;
        const elapsed = now - bucket.lastRefill;
        const tokensToAdd = elapsed * refillRate;

        bucket.tokens = Math.min(tier.limit, bucket.tokens + tokensToAdd);
        bucket.lastRefill = now;

        if (bucket.tokens >= 1) {
            bucket.tokens -= 1;
            return true;
        }

        return false;
    }

    public cleanup(socketId: string) {
        this.buckets.delete(socketId);
    }
}

export const socketRateLimiter = new SocketRateLimiter();
