@echo off
REM =====================================================================
REM ControlBox Relay Agent - Run Script
REM =====================================================================

echo.
echo ========================================
echo  ControlBox Relay Agent
echo ========================================
echo.
echo Starting relay... (Press Ctrl+C to stop)
echo.
echo Cloud: https://octopus-app-qsi3i.ondigitalocean.app
echo.

python main.py --url https://octopus-app-qsi3i.ondigitalocean.app

echo.
echo Relay stopped.
pause
