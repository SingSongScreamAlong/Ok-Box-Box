# Archived Code

This folder stores legacy/experimental modules retained for reference. These files are not used by the current application and should not be imported into active code.

## Why archived?
- `TacviewDataService.ts` has been superseded by `BackendClient` and the new Socket.IO live mode wiring.

## How to restore a file
- Option A (move back):
  mv dashboard/archived/services/TacviewDataService.ts dashboard/src/services/TacviewDataService.ts

- Option B (checkout from history):
  git log -- dashboard/archived/services/TacviewDataService.ts
  git checkout <commit_sha> -- dashboard/archived/services/TacviewDataService.ts

## Notes
- Avoid importing from `dashboard/archived/**` in production code.
- If you need to reference an archived API, prefer porting it into a new module inside `src/` with updated types and tests.
