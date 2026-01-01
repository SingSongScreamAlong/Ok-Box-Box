# PitBox Driver App - Windows Setup Guide

## 🚀 Quick Start (5 Minutes)

### Step 1: Download the Project
1. Go to: https://github.com/yourusername/ProjectPitBox
2. Click the green **"Code"** button
3. Click **"Download ZIP"**
4. Extract the ZIP file to your Desktop or Documents folder

### Step 2: Install Prerequisites (One-Time Setup)
You need Node.js to build and run the app:

1. **Download Node.js**: Go to https://nodejs.org/
2. **Download the LTS version** (recommended for most users)
3. **Run the installer** and follow the setup wizard
4. **Restart your computer** after installation

### Step 3: Build and Run the App
1. **Navigate** to the extracted ProjectPitBox folder
2. **Double-click** one of these files:
   - `build-and-run-windows.bat` (for Command Prompt)
   - `build-and-run-windows.ps1` (for PowerShell - may require execution policy change)

The script will automatically:
- ✅ Check if Node.js is installed
- ✅ Install all dependencies
- ✅ Build the TypeScript code
- ✅ Start the PitBox Driver App
- ✅ Connect to your cloud server at `64.227.28.10:8765`

## 🎮 Using with iRacing

Once the app is running:
1. **Start iRacing** on your PC
2. **Join a session** (practice, qualifying, or race)
3. **PitBox will automatically detect** iRacing and start collecting telemetry
4. **Your cloud server** will receive the data and provide AI analysis
5. **Team members** can monitor your performance via the web dashboard

## 🔧 Configuration

The app is pre-configured to connect to your cloud server, but you can modify settings:

- **Cloud Server**: `64.227.28.10:8765`
- **Cloud Mode**: Enabled by default
- **Auto-Start**: Disabled (you control when to start telemetry)
- **Local Cache**: Enabled (saves data locally as backup)

## 📁 File Structure

```
ProjectPitBox/
├── build-and-run-windows.bat    ← Double-click this (Command Prompt)
├── build-and-run-windows.ps1    ← Or this (PowerShell)
├── driver_app/                  ← Main application folder
│   ├── src/                     ← Source code
│   ├── dist/                    ← Built application (created after build)
│   └── package.json             ← Dependencies and scripts
└── WINDOWS_SETUP.md             ← This file
```

## 🛠️ Manual Build (Advanced Users)

If you prefer to build manually:

```bash
# Open Command Prompt or PowerShell in the ProjectPitBox folder
cd driver_app
npm install
npm run build
npm start
```

## 🔄 Updating the App

To get the latest version:
1. **Download** the latest ZIP from GitHub (same as Step 1 above)
2. **Extract** to a new folder
3. **Run** the build script again

Your settings and driver profiles will be preserved.

## 🆘 Troubleshooting

### "Node.js is not installed" Error
- Download and install Node.js from https://nodejs.org/
- Choose the LTS version (Long Term Support)
- Restart your computer after installation

### "Cannot find module" Errors
- Delete the `node_modules` folder in `driver_app`
- Run the build script again (it will reinstall dependencies)

### PowerShell Execution Policy Error
If you get an execution policy error with the `.ps1` file:
1. Open PowerShell as Administrator
2. Run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`
3. Type `Y` to confirm
4. Try running the script again

### App Won't Connect to iRacing
- Make sure iRacing is running and you're in a session
- Check that the app shows "Connected to iRacing" in the status
- Try restarting both iRacing and the PitBox app

### Cloud Connection Issues
- Verify your internet connection
- The app will show connection status to `64.227.28.10:8765`
- If offline, data will be cached locally and uploaded when connection is restored

## 📞 Support

If you encounter issues:
1. Check the app's console output for error messages
2. Try the manual build steps above
3. Ensure all prerequisites are installed correctly

## 🎯 What's Next?

Once the driver app is running:
- **Start iRacing** and join a session
- **Monitor the app** - it will show telemetry data flowing
- **Check your cloud dashboard** - team members can see your performance
- **AI analysis** will provide real-time coaching feedback

Your PitBox system is now complete and operational! 🏁
