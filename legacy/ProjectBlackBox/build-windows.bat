@echo off
REM ============================================================================
REM BlackBox Racing - Windows Build Script
REM ============================================================================
REM This script builds all components and creates a Windows installer
REM Run this on a Windows machine with Node.js, Python, and npm installed
REM ============================================================================

echo ============================================
echo   BlackBox Racing - Windows Build
echo ============================================
echo.

REM Check prerequisites
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: Node.js not found. Please install Node.js first.
    exit /b 1
)

where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: Python not found. Please install Python first.
    exit /b 1
)

REM Step 1: Install dependencies
echo [1/6] Installing dependencies...
cd server
call npm install
cd ..

cd dashboard
call npm install
cd ..

cd desktop
call npm install
cd ..

cd relay_agent
pip install -r requirements.txt
pip install pyinstaller
cd ..

REM Step 2: Build server
echo.
echo [2/6] Building server...
cd server
call npm run build
cd ..

REM Step 3: Build dashboard
echo.
echo [3/6] Building dashboard...
cd dashboard
call npm run build
cd ..

REM Step 4: Build relay agent exe
echo.
echo [4/6] Building relay agent...
cd relay_agent
pyinstaller --clean blackbox_relay.spec
if exist dist\blackbox_relay.exe (
    echo Relay agent built successfully
) else (
    echo WARNING: Relay agent build may have failed
)
cd ..

REM Step 5: Create assets folder if needed
echo.
echo [5/6] Preparing assets...
if not exist desktop\assets mkdir desktop\assets

REM Create a simple icon if none exists
if not exist desktop\assets\icon.ico (
    echo Creating placeholder icon...
    REM You should replace this with your actual icon
)

REM Step 6: Build Electron app
echo.
echo [6/6] Building Windows installer...
cd desktop
call npm run build
cd ..

echo.
echo ============================================
echo   Build Complete!
echo ============================================
echo.
echo Installer location: desktop\dist\
echo.
pause
