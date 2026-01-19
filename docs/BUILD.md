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
- **Root Build**: Running `npm run build` at the root will now attempt to build the Relay app (`apps/relay`) alongside packages.
- **Dependencies**: `npm install` at the root will hoist dependencies for the Relay app.
- **CI/CD**: Ensure the CI environment has necessary system dependencies for Electron (or skip `apps/relay` build in CI if headless/docker only).

## Verification
To verify the build integration:
```bash
npm install
npm run build --workspaces
```
