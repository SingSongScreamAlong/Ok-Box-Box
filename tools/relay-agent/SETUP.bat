@echo off
title Ok Box Box - Relay Agent Setup
echo.
echo  ============================================
echo   Ok, Box Box - Relay Agent Setup
echo  ============================================
echo.

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Python not found. Install Python 3.10+ from:
    echo          https://www.python.org/downloads/
    echo.
    echo  Make sure to check "Add Python to PATH" during install.
    pause
    exit /b 1
)

echo  [OK] Python found:
python --version
echo.

:: Check pip
pip --version >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] pip not found. Reinstall Python with pip enabled.
    pause
    exit /b 1
)

:: Install dependencies
echo  Installing dependencies...
pip install -r requirements.txt --quiet
if errorlevel 1 (
    echo  [ERROR] Failed to install dependencies.
    pause
    exit /b 1
)
echo  [OK] Dependencies installed.
echo.

:: Check for .env
if not exist ".env" (
    echo  Creating .env from template...
    copy .env.example .env >nul
    echo.
    echo  ============================================
    echo   IMPORTANT: Edit .env with your auth token!
    echo  ============================================
    echo.
    echo  1. Open .env in a text editor
    echo  2. Set AUTH_TOKEN to your token from:
    echo     Ok Box Box App ^> Settings ^> Relay Token
    echo  3. Then run START-RELAY.bat
    echo.
    notepad .env
) else (
    echo  [OK] .env already exists.
    echo.
    echo  Setup complete! Run START-RELAY.bat to start.
)

echo.
pause
