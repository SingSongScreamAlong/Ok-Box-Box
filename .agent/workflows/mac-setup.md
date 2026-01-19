---
description: Set up Mac development environment
---

# Mac Setup Workflow

This workflow sets up the Mac for primary development. Run this once after cloning the repo.

## Steps

// turbo
1. Configure Git author for Mac tracking:
```bash
git config user.name "Conrad (Mac)"
```

// turbo
2. Install Node.js dependencies:
```bash
npm install
```

// turbo
3. Copy environment example (if .env doesn't exist):
```bash
cp .env.example .env 2>/dev/null || echo ".env already exists or no example"
```

4. Run database migrations (requires PostgreSQL):
```bash
npm run db:migrate
```

5. Verify the build:
```bash
npm run build
```

## Start Development

```bash
npm run dev
```

This starts:
- Server on http://localhost:3001
- Dashboard on http://localhost:5173

## Commit Convention

When committing from Mac, use this format:
```bash
git add .
git commit -m "[MAC] Your change description"
git push origin main
```
