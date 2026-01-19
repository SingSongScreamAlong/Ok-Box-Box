# Code Reference Export Tool

This tool generates a single Markdown file containing the source code of the entire repository (excluding build artifacts and secrets) for review purposes.

## Usage

### 1. Manual Export
Run the following command to generate a one-time export:

```bash
npm run export:reference
```

By default, this saves to `~/okboxbox_exports/okboxbox_code_reference.md`.

### 2. Watch Mode
To keep the reference file updated as you code (debounced by 2 seconds):

```bash
npm run export:reference:watch
```

### Configuration
You can override the output path using an environment variable:

```bash
REFERENCE_EXPORT_PATH=./my_export.md npm run export:reference
```

## Output Location
We recommend keeping exports **outside** the repository to avoid Git noise.
*   **Default**: `~/okboxbox_exports/` (macOS/Linux) or `%USERPROFILE%\okboxbox_exports\` (Windows).
*   **In-Repo (Gitignored)**: `okboxbox_exports/` is added to `.gitignore`.
