@echo off
REM Ok, Box Box Relay Agent - Build Script
REM Builds executable via PyInstaller and Installer via NSIS

echo ========================================
echo Building Ok, Box Box Relay Agent...
echo ========================================

REM 1. Clean previous builds
echo Cleaning up...
rmdir /s /q build 2>nul
rmdir /s /q dist 2>nul

REM 2. Activate virtual environment if exists, or create one
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)
call venv\Scripts\activate.bat

REM 3. Install dependencies
echo Installing dependencies...
pip install -r requirements.txt -q
pip install pyinstaller -q

REM 4. Build Executable
echo.
echo Running PyInstaller...
pyinstaller --noconfirm --clean build_dist.spec
if %errorlevel% neq 0 (
    echo [ERROR] PyInstaller failed!
    pause
    exit /b %errorlevel%
)
echo [OK] PyInstaller build complete.

REM 5. Copy to installer folder
echo Copying files to installer folder...
if not exist "installer" mkdir installer
copy /Y "dist\OkBoxBox-Relay.exe" "installer\" 2>nul
copy /Y "README.md" "installer\"

REM 6. Check file size
for %%A in (dist\OkBoxBox-Relay.exe) do set SIZE=%%~zA
set /a SIZE_MB=%SIZE%/1048576
echo [INFO] EXE size: %SIZE_MB% MB

REM 7. Build Installer (if NSIS available)
echo.
echo Building Installer...
where makensis >nul 2>&1
if %errorlevel% equ 0 (
    makensis installer\OkBoxBox-Relay.nsi
    if %errorlevel% neq 0 (
        echo [ERROR] NSIS build failed!
    ) else (
        echo [OK] Installer created: installer\OkBoxBox-Relay-Setup.exe
    )
) else if exist "C:\Program Files (x86)\NSIS\makensis.exe" (
    "C:\Program Files (x86)\NSIS\makensis.exe" installer\OkBoxBox-Relay.nsi
    if %errorlevel% neq 0 (
        echo [ERROR] NSIS build failed!
    ) else (
        echo [OK] Installer created: installer\OkBoxBox-Relay-Setup.exe
    )
) else (
    echo [WARN] NSIS not found. Skipping installer build.
    echo        Install NSIS from: https://nsis.sourceforge.io/Download
    echo        Or use the standalone EXE: dist\OkBoxBox-Relay.exe
)

echo.
echo ========================================
echo [OK] Build Process Complete!
echo.
echo Output:
echo   - dist\OkBoxBox-Relay.exe  (standalone, %SIZE_MB% MB)
if exist "installer\OkBoxBox-Relay-Setup.exe" (
    echo   - installer\OkBoxBox-Relay-Setup.exe  (installer)
)
echo ========================================
pause
