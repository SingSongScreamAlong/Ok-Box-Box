# Build System & Workspaces

## Workspace Configuration
We have updated the root `package.json` to include `apps/*` in the `workspaces` array.

```json
"workspaces": [
    "packages/*",
    "tools/*",
    "apps/*"
]
```

## Implications
- **Root Build**: Running `npm run build` at the root builds the canonical workspaces only: `@controlbox/common`, `@okboxbox/contracts`, `@controlbox/protocol`, `@controlbox/server`, `@okboxbox/app`, `@okboxbox/website`, and `okboxbox-desktop`.
- **CI Build**: Running `npm run build:ci` builds the same canonical workspaces but uses the desktop app's non-packaging renderer build so CI can verify the desktop workspace without invoking `electron-builder`.
- **Dependencies**: `npm install` at the root will hoist dependencies for all workspace apps, including the Electron-based relay apps.
- **Legacy Relay**: `apps/relay` remains available via `npm run build:legacy-relay` and `npm run relay:legacy`, but it is no longer part of the default root build path.
- **CI/CD**: Ensure the CI environment has the system dependencies needed for canonical Electron desktop builds; the legacy relay is now opt-in.

## Verification
To verify the build integration:
```bash
npm install
npm run build:ci
npm run build
```
