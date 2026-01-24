# Canonical Product + Route Map

## 1) Domains (Single Source of Truth)

| Service | Domain | Codebase Location | Run Command |
|---------|--------|-------------------|-------------|
| **Marketing Website** | `okboxbox.com` | `apps/website` | `npm run website` |
| **Application UI** | `app.okboxbox.com` | `packages/dashboard` | `npm run app` |
| **API** | `api.okboxbox.com` | `packages/server` | `npm run api` |

> **THIS IS THE ONLY DASHBOARD:** `packages/dashboard` (run: `npm run app`).

## 2) Canonical Apps

Exactly one canonical location for each app:

- **Website (marketing):** `apps/website`
- **App (dashboard):** `packages/dashboard`
- **Relay (electron):** `apps/relay`

## 3) Canonical User Flow (Linear)

- **Website (okboxbox.com)**
  - explains product
  - routes users to the app
- **App (app.okboxbox.com)**
  - authentication and all product UI
  - driver/team/league/broadcast surfaces
- **Relay (desktop app)**
  - connects simulator telemetry to the platform
- **API (api.okboxbox.com)**
  - product backend

## 4) Canonical UI Entrypoints (Application UI)

All application UI routes must exist within this hierarchy.

### App shell
- **Home:** `/`

### Driver (`/driver/*`)
- IDP, HUD, sessions

### Team (`/team/*`)
- roster, planning, setups, pitwall

### League (`/league/*`)
- race control, incidents, penalties, rulebook

### Broadcast (`/broadcast/*`)
- broadcast surfaces

## 5) Marketing Website Route Map (Marketing Only)

- **Home:** `/`
- **Pricing:** `/pricing`
- **Download Relay:** `/download-relay`
- **Login:** `/login` (redirects to `app.okboxbox.com/login`)
- **Docs / FAQ:** `/docs`

## 6) About & Build Info

- **Build Info:** `/about/build` (prevents “which build is this?” confusion)
