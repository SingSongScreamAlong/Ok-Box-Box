@echo off
REM BlackBox Windows Setup Script
REM This script sets up the BlackBox system on Windows

echo ========================================
echo   BlackBox Windows Setup
echo ========================================
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not installed!
    echo.
    echo 🔄 Attempting to install Docker Desktop via winget...
    winget install Docker.DockerDesktop
    if %errorlevel% neq 0 (
        echo.
        echo ❌ Automatic installation failed.
        echo Please install Docker Desktop manually from: https://www.docker.com/products/docker-desktop
        echo.
        echo After installation, restart this script.
        pause
        exit /b 1
    )
    echo.
    echo ✅ Docker Desktop installed!
    echo ⚠️  You may need to restart your computer to complete the installation.
    echo After restart, run this script again.
    pause
    exit /b 0
)

REM Check if Docker Compose is available
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    docker compose version >nul 2>&1
    if %errorlevel% neq 0 (
        echo ❌ Docker Compose is not available!
        echo Please ensure Docker Desktop includes Docker Compose.
        pause
        exit /b 1
    )
)

echo ✅ Docker is installed and ready
echo.

REM Check if .env file exists
if not exist ".env" (
    echo ⚠️  Environment file not found. Creating from template...
    if exist ".env.example" (
        copy ".env.example" ".env"
        echo ✅ Created .env file from template
        echo.
        echo 🔧 IMPORTANT: Please edit the .env file with your actual API keys:
        echo    - OPENAI_API_KEY
        echo    - ELEVENLABS_API_KEY
        echo    - JWT_SECRET (can keep default for testing)
        echo    - POSTGRES_PASSWORD (can keep default for testing)
        echo.
        echo Press any key after editing .env file...
        pause
    ) else (
        echo ❌ Neither .env nor .env.example found!
        echo Please ensure you have the complete BlackBox package.
        pause
        exit /b 1
    )
)

echo ✅ Environment configuration ready
echo.

REM Create necessary directories
if not exist "postgres_data" mkdir postgres_data
if not exist "redis_data" mkdir redis_data
if not exist "server\logs" mkdir server\logs
if not exist "relay_agent\logs" mkdir relay_agent\logs

echo ✅ Directory structure ready
echo.

REM Ask user what they want to do
echo What would you like to do?
echo [1] Start BlackBox system
echo [2] Stop BlackBox system
echo [3] View system status
echo [4] View logs
echo [5] Reset system (WARNING: This will delete all data)
echo [6] Create Desktop Shortcut
echo.

set /p choice="Enter your choice (1-6): "

if "%choice%"=="1" goto start_system
if "%choice%"=="2" goto stop_system
if "%choice%"=="3" goto system_status
if "%choice%"=="4" goto view_logs
if "%choice%"=="5" goto reset_system
if "%choice%"=="6" goto create_shortcut

echo ❌ Invalid choice. Please run the script again.
pause
exit /b 1

:start_system
echo.
echo 🚀 Starting BlackBox system...
echo This may take a few minutes for the first run...
echo.

REM Build and start the system
if exist "docker-compose.yml" (
    docker-compose up -d --build
    if %errorlevel% neq 0 (
        echo ❌ Failed to start system with docker-compose
        echo Trying with 'docker compose'...
        docker compose up -d --build
        if %errorlevel% neq 0 (
            echo ❌ Failed to start system!
            pause
            exit /b 1
        )
    )
) else (
    echo ❌ docker-compose.yml not found!
    pause
    exit /b 1
)

echo.
echo ✅ BlackBox system started successfully!
echo.
echo 🌐 Access URLs:
echo    Dashboard: http://localhost
echo    API: http://localhost/api
echo    Health Check: http://localhost/health
echo.
echo 🔧 Services:
echo    - BlackBox Server (API)
echo    - PostgreSQL Database
echo    - Redis Cache
echo    - Relay Agent (telemetry collection)
echo    - React Dashboard
echo.
echo 💡 To test telemetry collection, run the relay agent:
echo    cd relay_agent
echo    python agent_main.py
echo.
pause
goto end

:stop_system
echo.
echo 🛑 Stopping BlackBox system...
if exist "docker-compose.yml" (
    docker-compose down
    if %errorlevel% neq 0 (
        docker compose down
    )
)
echo ✅ BlackBox system stopped
echo.
pause
goto end

:system_status
echo.
echo 📊 BlackBox System Status:
echo.
if exist "docker-compose.yml" (
    docker-compose ps
    if %errorlevel% neq 0 (
        docker compose ps
    )
) else (
    echo ❌ docker-compose.yml not found!
)
echo.
pause
goto end

:view_logs
echo.
echo 📋 BlackBox System Logs:
echo [1] All logs
echo [2] Server logs
echo [3] Database logs
echo [4] Relay Agent logs
echo.

set /p log_choice="Enter log choice (1-4): "

if "%log_choice%"=="1" (
    if exist "docker-compose.yml" (
        docker-compose logs -f --tail=50
        if %errorlevel% neq 0 (
            docker compose logs -f --tail=50
        )
    )
) else if "%log_choice%"=="2" (
    if exist "docker-compose.yml" (
        docker-compose logs -f server --tail=50
        if %errorlevel% neq 0 (
            docker compose logs -f server --tail=50
        )
    )
) else if "%log_choice%"=="3" (
    if exist "docker-compose.yml" (
        docker-compose logs -f postgres --tail=50
        if %errorlevel% neq 0 (
            docker compose logs -f postgres --tail=50
        )
    )
) else if "%log_choice%"=="4" (
    if exist "docker-compose.yml" (
        docker-compose logs -f relay-agent --tail=50
        if %errorlevel% neq 0 (
            docker compose logs -f relay-agent --tail=50
        )
    )
) else (
    echo ❌ Invalid choice
)
echo.
pause
goto end

:reset_system
echo.
echo ⚠️  WARNING: This will delete ALL data and reset the system!
echo This includes: database data, logs, cached files
echo.
set /p confirm="Are you sure? Type 'YES' to confirm: "
if not "%confirm%"=="YES" (
    echo ❌ Reset cancelled
    pause
    goto end
)

echo 🗑️  Resetting BlackBox system...

REM Stop system
if exist "docker-compose.yml" (
    docker-compose down -v
    if %errorlevel% neq 0 (
        docker compose down -v
    )
)

REM Remove data directories
if exist "postgres_data" rmdir /s /q postgres_data
if exist "redis_data" rmdir /s /q redis_data
if exist "server\logs" rmdir /s /q server\logs
if exist "relay_agent\logs" rmdir /s /q relay_agent\logs

REM Remove Docker volumes
docker volume rm blackbox_postgres_data blackbox_redis_data 2>nul

echo ✅ System reset complete
echo.
pause
goto end

:create_shortcut
echo.
echo 🔗 Creating Desktop Shortcut...
set SCRIPT="%TEMP%\CreateShortcut.vbs"
echo Set oWS = WScript.CreateObject("WScript.Shell") > %SCRIPT%
echo sLinkFile = "%USERPROFILE%\Desktop\ProjectBlackBox.lnk" >> %SCRIPT%
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> %SCRIPT%
echo oLink.TargetPath = "%~dp0setup_windows.bat" >> %SCRIPT%
echo oLink.WorkingDirectory = "%~dp0" >> %SCRIPT%
echo oLink.Description = "Start ProjectBlackBox" >> %SCRIPT%
echo oLink.IconLocation = "%~dp0dashboard\public\favicon.ico" >> %SCRIPT%
echo oLink.Save >> %SCRIPT%
cscript /nologo %SCRIPT%
del %SCRIPT%
echo ✅ Shortcut created on Desktop!
echo.
pause
goto end

:end
echo.
echo ========================================
echo   BlackBox Setup Complete
echo ========================================
echo.
echo For help or issues, check the README.md file
echo or visit: https://github.com/your-repo/blackbox
echo.
