# Dashboard Inventory & Cleanup Plan

## 1) Inventory Findings

| Path | Run Command | What it is used for | Status |
|------|------------|---------------------|--------|
| `apps/app` | `npm run app` | Canonical application UI | **CANONICAL** |
| `apps/website` | `npm run website` | Marketing site only | **CANONICAL** |
| `apps/desktop` | `npm run relay` | Canonical desktop relay app | **CANONICAL** |
| `apps/relay` | `npm run relay:legacy` | Legacy relay desktop app | **LEGACY-REFERENCE** |
| `packages/server` | `npm run api` | API server | **CANONICAL** |
| `legacy/ProjectBlackBox/dashboard` | `npm run legacy:dashboard` | Legacy Live Race Ops Console (LROC) UI | **LEGACY-REFERENCE** |
| `legacy/ProjectBlackBox/blackbox-web` | `npm run legacy:website` | Legacy Next.js web UI | **DELETE-CANDIDATE** |
| `apps/blackbox` | N/A | Empty directory | **DELETE-CANDIDATE** |
| `apps/racebox` | N/A | Empty directory | **DELETE-CANDIDATE** |
| `apps/launcher` | N/A | Empty directory | **DELETE-CANDIDATE** |

## 2) Legacy LROC Plan

Legacy LROC location: `legacy/ProjectBlackBox/dashboard`

- **Decision:** **LEGACY-REFERENCE (read-only)**
- **Rule:** Do not “half migrate” this UI. Only port features into the canonical app.
- **Canonical replacement surface:** `apps/app` route `/team/pitwall`
- **Status:** Implemented minimal skeleton in canonical app.

## 3) Duplicate Dashboard Prevention

- `npm run app` is the canonical dashboard.
- Legacy UIs require explicit `legacy:*` scripts.

## 4) Website Entry Rule

- `apps/website` is marketing only and is the public entry point.
- Website `/login` must redirect to `app.okboxbox.com/login`.
- No shared layouts/components between `apps/website` and `apps/app`.

## 5) Cleanup Plan

- Leave legacy code in `legacy/` as read-only reference.
- Remove empty ghost directories only after verification they are unused.
