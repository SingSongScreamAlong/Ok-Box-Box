---
description: Set up Windows PC development environment for iRacing testing
---

# Windows PC Setup Workflow

This workflow sets up the Windows PC for iRacing relay testing. Run this once after cloning/pulling the repo.

## Steps

1. Configure Git author for PC tracking:
```bash
git config user.name "Conrad (PC)"
```

2. Install Python dependencies for the relay agent:
```bash
cd tools/relay-agent
pip install -r requirements.txt
```

3. Verify Python installation:
```bash
python --version
```

4. Check iRacing SDK access (must have iRacing installed):
```bash
python -c "import irsdk; print('iRacing SDK available')"
```

5. Set environment variables (create .env in tools/relay-agent if needed):
```
CONTROLBOX_SERVER_URL=http://YOUR_MAC_IP:3001
# OR for production:
# CONTROLBOX_SERVER_URL=https://your-deployed-server.com
```

## Verification

After setup, test connectivity:
```bash
cd tools/relay-agent
python main.py --dry-run
```

## Commit Convention

When committing from Windows PC, use this format:
```bash
git add .
git commit -m "[PC] Your change description"
git push origin main
```
