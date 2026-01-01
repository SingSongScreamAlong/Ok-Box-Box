# Building PitBox Racing for Windows

## Prerequisites

On your **Windows PC**, install:

1. **Node.js 18+**: https://nodejs.org/
2. **Python 3.10+**: https://python.org/
3. **Git**: https://git-scm.com/

## Quick Build

1. Clone or pull the repository:
   ```cmd
   git clone https://github.com/YourUsername/ProjectPitBox.git
   cd ProjectPitBox
   ```

2. Run the build script:
   ```cmd
   build-windows.bat
   ```

3. Find the installer in `desktop/dist/`

## Manual Build Steps

If the batch script fails, run each step manually:

### 1. Install Dependencies
```cmd
cd server && npm install && cd ..
cd dashboard && npm install && cd ..
cd desktop && npm install && cd ..
cd relay_agent && pip install -r requirements.txt && pip install pyinstaller && cd ..
```

### 2. Build Server
```cmd
cd server
npm run build
cd ..
```

### 3. Build Dashboard
```cmd
cd dashboard
npm run build
cd ..
```

### 4. Build Relay Agent (Python → EXE)
```cmd
cd relay_agent
pyinstaller --clean pitbox_relay.spec
cd ..
```

### 5. Build Electron App + Installer
```cmd
cd desktop
npm run build
cd ..
```

## Output

After building, you'll find:
- `desktop/dist/PitBox Racing Setup 1.0.0.exe` - Windows installer
- `desktop/dist/win-unpacked/` - Portable version (no install needed)

## Adding Your Icon

Replace `desktop/assets/icon.ico` with your own 256x256 icon file.

## Troubleshooting

### "Node not found"
Make sure Node.js is in your PATH. Restart your terminal after installing.

### "Python not found"
Make sure Python is in your PATH. Check "Add to PATH" during installation.

### PyInstaller fails
Try: `pip install --upgrade pyinstaller`

### Electron build fails
Try: `npm cache clean --force` then `npm install` again in the desktop folder.

## Development Mode

To run without building:
```cmd
REM Terminal 1: Server
cd server && npm run dev

REM Terminal 2: Dashboard
cd dashboard && npm start

REM Terminal 3: Relay Agent
cd relay_agent && python main.py
```

Then open http://localhost:3001
