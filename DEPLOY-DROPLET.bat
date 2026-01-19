@echo off
REM =====================================================================
REM ControlBox - Deploy to Digital Ocean Droplet (Windows)
REM =====================================================================

echo.
echo ========================================
echo   ControlBox Deployment to Digital Ocean
echo ========================================
echo.

set DROPLET_IP=137.184.151.3
set DROPLET_USER=root

echo Target: %DROPLET_USER%@%DROPLET_IP%
echo.

REM First, commit and push any changes
echo [1/4] Pushing latest code to GitHub...
cd /d "%~dp0"
git add -A
git commit -m "Deploy: Session viewer with live telemetry" 2>nul || echo No changes to commit
git push origin main

echo.
echo [2/4] Connecting to droplet and deploying...
echo.

REM SSH into droplet and run deployment
ssh %DROPLET_USER%@%DROPLET_IP% "bash -s" < "%~dp0deploy-remote.sh"

echo.
echo ========================================
echo   Deployment Complete!
echo ========================================
echo.
echo Dashboard: http://%DROPLET_IP%
echo API:       http://%DROPLET_IP%:8080
echo Health:    http://%DROPLET_IP%:8080/api/health
echo.
pause
