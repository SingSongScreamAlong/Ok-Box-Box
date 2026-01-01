@echo off
echo ========================================
echo BlackBox Driver App - Windows Builder
echo ========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from: https://nodejs.org/
    echo Download the LTS version and run this script again.
    pause
    exit /b 1
)

echo ✓ Node.js is installed
node --version

REM Check if Git is installed
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Git is not installed!
    echo Please install Git from: https://git-scm.com/download/win
    echo Download and install Git, then run this script again.
    pause
    exit /b 1
)

echo ✓ Git is installed
git --version

REM Navigate to driver_app directory
if not exist "driver_app" (
    echo ERROR: driver_app directory not found!
    echo Make sure you're running this script from the ProjectBlackBox root directory.
    pause
    exit /b 1
)

cd driver_app

echo.
echo ========================================
echo Installing Dependencies...
echo ========================================
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Building TypeScript...
echo ========================================
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Failed to build TypeScript!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Creating Windows Package...
echo ========================================
call npm run package
if %errorlevel% neq 0 (
    echo ERROR: Failed to package application!
    echo Trying to run directly...
    goto :run_direct
)

echo.
echo ========================================
echo SUCCESS! BlackBox Driver App Built!
echo ========================================
echo.
echo The app has been packaged and is ready to run.
echo You can find the executable in the 'out' folder.
echo.

REM Try to find and run the executable
for /r "out" %%i in (*.exe) do (
    echo Starting: %%i
    start "" "%%i"
    goto :end
)

:run_direct
echo.
echo ========================================
echo Running Development Version...
echo ========================================
call npm start
goto :end

:end
echo.
echo ========================================
echo BlackBox Driver App Setup Complete!
echo ========================================
echo.
echo The app should now be running and will connect to:
echo Cloud Server: 64.227.28.10:8765
echo.
echo If you need to restart the app later, you can:
echo 1. Run this script again, or
echo 2. Navigate to driver_app folder and run: npm start
echo.
pause
