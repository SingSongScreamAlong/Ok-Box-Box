@echo off
REM Ok, Box Box Relay - Create Release Package
REM Creates a portable zip for distribution

echo ========================================
echo Creating Ok, Box Box Relay Release...
echo ========================================

REM Set version
set VERSION=1.0.0

REM Create release folder
set RELEASE_DIR=release\okboxbox-relay-%VERSION%
rmdir /s /q release 2>nul
mkdir %RELEASE_DIR%

REM Copy core files
echo Copying core files...
copy main.py %RELEASE_DIR%\
copy config.py %RELEASE_DIR%\
copy iracing_reader.py %RELEASE_DIR%\
copy data_mapper.py %RELEASE_DIR%\
copy backend_manager.py %RELEASE_DIR%\
copy settings_manager.py %RELEASE_DIR%\
copy auto_updater.py %RELEASE_DIR%\
copy race_logger.py %RELEASE_DIR%\
copy requirements.txt %RELEASE_DIR%\
copy README.md %RELEASE_DIR%\

REM Copy protocol folder
echo Copying protocol...
mkdir %RELEASE_DIR%\protocol
copy protocol\*.py %RELEASE_DIR%\protocol\

REM Copy exporters folder
echo Copying exporters...
mkdir %RELEASE_DIR%\exporters
copy exporters\*.py %RELEASE_DIR%\exporters\

REM Create run script
echo Creating run script...
(
echo @echo off
echo echo ========================================
echo echo Ok, Box Box Relay Agent
echo echo ========================================
echo echo.
echo if not exist venv (
echo     echo Creating virtual environment...
echo     python -m venv venv
echo     call venv\Scripts\activate.bat
echo     pip install -r requirements.txt
echo ^) else (
echo     call venv\Scripts\activate.bat
echo ^)
echo echo.
echo echo Starting relay...
echo python main.py
echo pause
) > %RELEASE_DIR%\START-RELAY.bat

REM Create .env template
echo Creating config template...
(
echo # Ok, Box Box Relay Configuration
echo # Copy this to .env and fill in your values
echo.
echo # Server URL ^(production^)
echo SERVER_URL=https://octopus-app-qsi3i.ondigitalocean.app
echo.
echo # Your authentication token ^(get from app settings^)
echo AUTH_TOKEN=
echo.
echo # Optional: Enable race logging
echo ENABLE_RACE_LOGGING=true
) > %RELEASE_DIR%\.env.example

REM Create zip
echo.
echo Creating zip archive...
cd release
powershell -Command "Compress-Archive -Path 'okboxbox-relay-%VERSION%' -DestinationPath 'okboxbox-relay-%VERSION%-win.zip' -Force"
cd ..

echo.
echo ========================================
echo [OK] Release package created!
echo.
echo Output: release\okboxbox-relay-%VERSION%-win.zip
echo ========================================
pause
