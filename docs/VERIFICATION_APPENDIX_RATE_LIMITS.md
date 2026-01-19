# Verification Appendix: Tiered Rate Limiting

## Test Execution Result
Command: `npm run test src/api/middleware/__tests__/rate-limit-enforcement.test.ts`
Date: 2026-01-19

```
> @controlbox/server@1.0.0-rc1 test
> vitest run src/api/middleware/__tests__/rate-limit-enforcement.test.ts

stderr | src/api/middleware/__tests__/rate-limit-enforcement.test.ts > Rate Limit Enforcement Integration > optionalAuth should NOT crash if entitlement service fails
Failed to fetch entitlements (optional auth) for user user-789 Error: DB connection failed
    ... (stack trace expected) ...

 ✓ src/api/middleware/__tests__/rate-limit-enforcement.test.ts (4 tests) 6ms
   ✓ Rate Limit Enforcement Integration (4)
     ✓ getTierFromRequest should failsafe to anonymous if no user attached
     ✓ optionalAuth should attach entitlements to valid user
     ✓ optionalAuth should attach entitlements for controlbox/bundle too
     ✓ optionalAuth should NOT crash if entitlement service fails

 Test Files  1 passed (1)
      Tests  4 passed (4)
```

## Verification Scenarios Covered

1.  **Anonymous Fallback**: Verified that requests without valid credentials default to the `anonymous` tier limit.
2.  **Entitlement Injection**: Verified that `optionalAuth` middleware correctly fetches and injects entitlements into the request object.
3.  **Tier Upgrading**: Verified that `getTierFromRequest` correctly identifies higher tiers (`blackbox`, `bundle`) when entitlements are present.
4.  **Resilience**: Verified that database failures during entitlement fetch do not crash the request but degrade gracefully to anonymous limits.

## Manual Socket.IO Verification Logic (Code Review)
- **File**: `packages/server/src/websocket/index.ts`
- **Handshake**: `io.use` now fetches entitlements for the connecting user.
- **Middleware**: `socket.use` checks `socketRateLimiter.checkLimit(socket)` for every incoming packet.
- **Exemptions**: `telemetry`, `telemetry_binary`, and `video_frame` events bypass the rate limiter to ensure stream quality.
