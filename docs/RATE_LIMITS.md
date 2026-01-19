# Rate Limits

Ok, Box Box implements **Tiered Rate Limiting** to protect platform stability while ensuring Entitled Users (paying customers) have sufficient throughput for high-performance features.

## Tier Definitions

Limits are applied on a per-user basis (or per-IP for anonymous users).

| Tier | Window (15m) | Entitlement | Description |
| :--- | :--- | :--- | :--- |
| **Anonymous** | 50 req | None / Unauth | General public, unknown users. |
| **BlackBox** | 200 req | `blackbox` | Drivers. Sufficient for race management but not high-freq polling. |
| **ControlBox** | 500 req | `controlbox` | Race Control / Stewards. Higher throughput for multi-car monitoring. |
| **Bundle** | 1000 req | `bundle` | Power users. |
| **Admin** | 2000 req | *Super Admin* | System administrators. |

## Enforcement Mechanisms

### 1. REST API
*   **Method**: `express-rate-limit` middleware.
*   **Logic**: 
    1.  User authenticity is checked via JWT (`optionalAuth`).
    2.  If authenticated, user entitlements are fetched.
    3.  Tier is assigned based on highest active product entitlement.
    4.  Limit is applied to the request.
*   **Header**: `X-RateLimit-Tier` indicates your current tier.

### 2. WebSocket (Socket.IO)
*   **Method**: Custom `SocketRateLimiter`.
*   **Logic**:
    1.  Entitlements fetched during connection handshake.
    2.  Token Bucket algorithm enforces limits on incoming **control messages** (e.g. `room:join`, `voice:generate`).
    3.  **Exemption**: High-frequency telemetry streams (`telemetry`, `telemetry_binary`, `video_frame`) are **NOT** rate-limited by this layer (they have separate internal throttling).
*   **Limit**: Scaled relative to API tier (approx. equivalent throughput).

## Troubleshooting
If you receive `429 Too Many Requests`:
1.  **Check Auth**: Ensure you are sending a valid Bearer token.
2.  **Check Entitlements**: Ensure your subscription is active.
3.  **Backoff**: Wait for the `Retry-After` duration specified in the response.
