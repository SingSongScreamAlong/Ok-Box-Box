# Server Logging Policy

## Rule
**No `console.log` or `console.debug` in `packages/server/src`.**

Use the structured logger instead:
```typescript
import { apiLogger, wsLogger, dbLogger } from '../observability/logger.js';
```

## Allowed Exceptions

1. **Early boot / fatal crash** — Before the logger is initialized, `console.error` or `console.warn` is acceptable.
2. **Explicit override** — Add `// eslint-disable-next-line no-console` with a reason:
   ```typescript
   // eslint-disable-next-line no-console -- Startup banner before logger init
   console.log('🏎️  Server starting...');
   ```

## High-Frequency Paths

For telemetry, WebSocket, or loop-based logging, use the throttle utility:
```typescript
import { logOncePerInterval } from '../observability/logger.js';

logOncePerInterval('telemetry-batch', 5000, () => {
    wsLogger.debug({ count }, 'Processing batch');
});
```

## Enforcement

- ESLint `no-console` rule is **error** in `packages/server`
- CI runs `lint:changed` to block new violations without failing on legacy code
- TODO: Remove legacy violations by 2026-Q2
