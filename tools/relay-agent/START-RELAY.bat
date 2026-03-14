@echo off
title Ok Box Box - Relay Agent
echo.
echo  ============================================
echo   Ok, Box Box - Relay Agent
echo  ============================================
echo.

:: Check .env exists
if not exist ".env" (
    echo  [ERROR] No .env file found. Run SETUP.bat first.
    pause
    exit /b 1
)

:: Start relay
echo  Starting relay agent...
echo  Press Ctrl+C to stop.
echo.
python main.py
pause
