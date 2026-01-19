# Stripe Configuration

This document describes the environment variables required for Stripe billing integration.

## Required Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `STRIPE_SECRET_KEY` | Stripe secret API key (starts with `sk_test_` or `sk_live_`) | ✅ Yes |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret (starts with `whsec_`) | ✅ Yes |
| `STRIPE_PRICE_DRIVER` | Price ID for Driver tier (BlackBox individual) | ✅ Yes |
| `STRIPE_PRICE_TEAM` | Price ID for Team tier (BlackBox + Team features) | ✅ Yes |
| `STRIPE_PRICE_LEAGUE` | Price ID for League tier (ControlBox + League features) | ✅ Yes |

## Optional Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DASHBOARD_URL` | Base URL for dashboard redirects | `http://localhost:5173` |

## Tier Mapping

| Tier Name | Stripe Price Environment Variable | Internal Product |
|-----------|----------------------------------|------------------|
| `driver` | `STRIPE_PRICE_DRIVER` | `blackbox` |
| `team` | `STRIPE_PRICE_TEAM` | `controlbox` |
| `league` | `STRIPE_PRICE_LEAGUE` | `bundle` |

## Setting Up Stripe

### 1. Create Products in Stripe Dashboard

1. Go to **Products** > **Add Product**
2. Create three products:
   - **ControlBox Driver** - For individual drivers
   - **ControlBox Team** - For team operators
   - **ControlBox League** - For league administrators
3. For each product, create a recurring price

### 2. Configure Webhook Endpoint

1. Go to **Developers** > **Webhooks**
2. Add endpoint: `https://your-domain.com/api/webhooks/stripe`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copy the **Signing secret** to `STRIPE_WEBHOOK_SECRET`

### 3. Get Your Keys

1. **Secret Key**: Dashboard > Developers > API Keys > Secret key
2. **Price IDs**: Dashboard > Products > Select product > Copy Price ID (starts with `price_`)

## Example .env

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
STRIPE_PRICE_DRIVER=price_1Qxxxxxxxxxxxxxx
STRIPE_PRICE_TEAM=price_1Qyyyyyyyyyyyyyy
STRIPE_PRICE_LEAGUE=price_1Qzzzzzzzzzzzzzz

# Dashboard URL for redirects
DASHBOARD_URL=https://your-dashboard.com
```

## Entitlement Flow

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   Dashboard     │──1──▶│   Server API    │──2──▶│     Stripe      │
│  (Frontend)     │      │   POST /checkout│      │   Checkout      │
└─────────────────┘      └─────────────────┘      └────────┬────────┘
                                                           │
                                         3. User completes │
                                            subscription   │
                                                           ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   Entitlements  │◀─5───│   Webhook       │◀─4───│     Stripe      │
│   Database      │      │   Handler       │      │   Webhook       │
└────────┬────────┘      └─────────────────┘      └─────────────────┘
         │
    6. API requests
       check entitlements
         │
         ▼
┌─────────────────┐
│   Protected     │
│   Features      │
└─────────────────┘
```

1. Dashboard calls `POST /api/billing/stripe/checkout` with tier
2. Server resolves tier → Price ID, creates Stripe Checkout session
3. User completes payment on Stripe's hosted checkout
4. Stripe sends webhook event (`customer.subscription.created`)
5. Server updates entitlements database
6. Subsequent API requests check entitlements for capability gating

## Fail-Fast Behavior

In **production** (`NODE_ENV=production`), the server will fail to start if any required Stripe configuration is missing. This prevents silent failures.

In **development**, missing configuration will log warnings but allow the server to start.

## Security Considerations

- **Never** expose `STRIPE_SECRET_KEY` to the frontend
- **Never** accept raw Price IDs from the frontend - always use tier names
- **Always** verify webhook signatures using `STRIPE_WEBHOOK_SECRET`
- **Always** verify that users can only manage their own billing
