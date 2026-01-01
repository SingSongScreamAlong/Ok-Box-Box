# Alpha Access Admin Guide

**Internal Documentation — Pre-Billing Mode**

This document explains how to grant/revoke access during the alpha testing phase before Squarespace billing goes live.

---

## Overview

All access is controlled through **entitlements** in the database.
- Manual grants use `source = 'manual_admin'`
- Squarespace grants use `source = 'squarespace'`
- Both work identically for capability derivation

---

## API Endpoints

All endpoints require **super admin** authentication.

### List All Manual Entitlements
```bash
GET /api/admin/entitlements
Authorization: Bearer <admin_token>
```

### Grant Access

```bash
POST /api/admin/entitlements/grant
Authorization: Bearer <admin_token>
Content-Type: application/json

{
    "userEmail": "tester@example.com",
    "product": "blackbox",
    "notes": "Alpha tester - league partner"
}
```

**Products:**
- `blackbox` — Driver HUD, Team Pit Wall
- `controlbox` — Race Control, Incidents, Protests
- `bundle` — All of the above

### Revoke Access

```bash
POST /api/admin/entitlements/revoke
Authorization: Bearer <admin_token>
Content-Type: application/json

{
    "entitlementId": "<uuid>",
    "reason": "Alpha period ended"
}
```

### View User's Entitlements

```bash
GET /api/admin/entitlements/user/<userId>
Authorization: Bearer <admin_token>
```

### View Audit Log

```bash
GET /api/admin/audit-log?limit=50
Authorization: Bearer <admin_token>
```

---

## How Alpha Access Differs from Paid Access

| Attribute | Alpha (Manual) | Paid (Squarespace) |
| :--- | :--- | :--- |
| **Source** | `manual_admin` | `squarespace` |
| **Tracking** | Audit log only | Webhook + order ID |
| **Duration** | Indefinite until revoked | Subscription cycle |
| **Capabilities** | Identical | Identical |

---

## Quick Reference

### Grant BlackBox to a Tester

```bash
curl -X POST https://API_URL/api/admin/entitlements/grant \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userEmail":"tester@league.com","product":"blackbox","notes":"Alpha participant"}'
```

### Grant Full Bundle to a League

```bash
curl -X POST https://API_URL/api/admin/entitlements/grant \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"orgId":"<league-uuid>","product":"bundle","notes":"Launch partner league"}'
```

### Revoke Access

```bash
curl -X POST https://API_URL/api/admin/entitlements/revoke \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entitlementId":"<entitlement-uuid>","reason":"End of testing period"}'
```

---

## Transition to Squarespace

When billing goes live:
1. Keep existing manual entitlements (they remain valid)
2. Squarespace webhooks create new entitlements with `source = 'squarespace'`
3. Manual grants continue to work for special cases (e.g., partners, staff)
4. No code changes required

---

## Troubleshooting

**User can't access features after grant:**
1. Check entitlement exists: `GET /api/admin/entitlements/user/<userId>`
2. Check status is `active` (not `canceled` or `expired`)
3. Have user refresh `/me/bootstrap` (logout/login or hard refresh)

**Need to check audit trail:**
```bash
GET /api/admin/audit-log?limit=100
```

---

*Last updated: December 2024*
