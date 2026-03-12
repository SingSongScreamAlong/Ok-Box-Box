# FP1 Ops Setup Guide

Quick-reference for setting up Sentry, uptime monitoring, and log forwarding before FP1 testing.

---

## 1. Sentry Error Tracking

Both server (`@sentry/node`) and frontend (`@sentry/react`) code is already integrated. You just need to create projects and add DSNs.

### Create Sentry Projects

1. Go to [sentry.io](https://sentry.io) → Sign up / Log in
2. Create an **Organization** (e.g. `okboxbox`)
3. Create **two projects**:

#### Project A: `controlbox-server` (Node.js)
- Platform: **Node.js**
- Copy the **DSN** (looks like `https://abc123@o456.ingest.us.sentry.io/789`)
- Add to DO server component env vars: `SENTRY_DSN=<your-dsn>`

#### Project B: `controlbox-app` (React)
- Platform: **React**
- Copy the **DSN**
- Add to DO static site build env vars: `VITE_SENTRY_DSN=<your-dsn>`

### What's Already Configured in Code

**Server** (`packages/server/src/index.ts`):
- Release tracking via `BUILD_VERSION` env var
- Express + HTTP integrations
- Performance tracing (10% sample rate in production)
- 4xx errors filtered out (only 5xx sent to Sentry)
- User context attached (id, email) on errors

**Frontend** (`apps/app/src/main.tsx`):
- Browser tracing integration
- Session replay (10% normal, 100% on error)
- Performance tracing (10% in production)

### Sentry Alert Rules (Recommended)

After creating projects, set up these alert rules in Sentry UI:

| Alert | Condition | Action |
|-------|-----------|--------|
| **New Issue** | First occurrence of any new error | Email immediately |
| **High Volume** | >10 events of same error in 1 hour | Email immediately |
| **Unhandled** | `handled: false` | Email immediately |

---

## 2. External Uptime Monitoring

Use **BetterStack** (free tier: 10 monitors, 3-min checks) or **UptimeRobot** (free: 50 monitors, 5-min checks).

### BetterStack Setup

1. Go to [betterstack.com/uptime](https://betterstack.com/uptime) → Sign up
2. Create a **Monitor**:
   - **URL**: `https://app.okboxbox.com/api/health`
   - **Check interval**: 3 minutes
   - **Request method**: GET
   - **Expected status**: 200
   - **Keyword check** (optional): `"success":true`
3. Create a second monitor for the frontend:
   - **URL**: `https://app.okboxbox.com`
   - **Expected status**: 200
4. Set up **notification channels**:
   - Email: `conrad@okboxbox.com`
   - (Optional) Slack webhook or SMS

### UptimeRobot Alternative

1. Go to [uptimerobot.com](https://uptimerobot.com) → Sign up
2. Add Monitor → HTTP(s)
3. **URL**: `https://app.okboxbox.com/api/health`
4. **Interval**: 5 minutes
5. **Alert Contact**: your email

### Public Status Page (Optional)

Both BetterStack and UptimeRobot offer free public status pages. You could publish one at `status.okboxbox.com` by adding a CNAME DNS record.

---

## 3. DigitalOcean Log Forwarding

DO runtime logs are ephemeral — they disappear when containers restart. Set up log forwarding to persist them.

### Option A: BetterStack Logs (Recommended — pairs with uptime)

1. In BetterStack → **Logs** → Create a **Source**
2. Platform: choose **HTTP / JSON**
3. Copy the **Source Token**
4. In DO App Platform → Your App → **Settings** → **Log Forwarding**
5. Click **Add Destination**:
   - **Destination**: Custom (HTTPS)
   - **Endpoint**: `https://in.logs.betterstack.com`
   - **Header name**: `Authorization`
   - **Header value**: `Bearer <your-source-token>`
   - **TLS**: enabled
6. Select **All components** (api + dashboard)
7. Save

### Option B: Papertrail (Free tier: 50MB/month)

1. Sign up at [papertrailapp.com](https://papertrailapp.com)
2. Create a **Log Destination** → get the host + port (e.g. `logsN.papertrailapp.com:12345`)
3. In DO → **Log Forwarding** → Add Destination:
   - **Destination**: Papertrail
   - **Host**: `logsN.papertrailapp.com`
   - **Port**: `12345`

### Option C: Datadog (Free tier: 1 day retention)

1. In DO → **Log Forwarding** → Add Destination → **Datadog**
2. Enter your Datadog API key
3. Select region

### What You Get

With log forwarding enabled:
- **Searchable logs** — find specific errors, requests, or relay connections
- **Log retention** — survive container restarts and redeployments
- **Alerting** — set up log-based alerts (e.g. "alert if 'FATAL' appears")
- **Correlation** — match Sentry errors with request logs via correlation IDs

---

## Summary Checklist

| Step | Service | Cost | Time |
|------|---------|------|------|
| Sentry server project | sentry.io | Free (5K errors/mo) | 5 min |
| Sentry frontend project | sentry.io | Free (included) | 2 min |
| Uptime monitor (API) | BetterStack or UptimeRobot | Free | 3 min |
| Uptime monitor (Frontend) | Same | Free | 1 min |
| Log forwarding | BetterStack Logs or Papertrail | Free tier | 5 min |

**Total estimated setup time: ~15 minutes**

All free tiers are sufficient for FP1 testing. Upgrade when you hit production scale.
