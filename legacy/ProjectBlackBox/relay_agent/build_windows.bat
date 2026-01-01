@echo off
REM BlackBox Relay Agent - Build Script
REM Builds executable via PyInstaller and Installer via NSIS

echo ========================================
echo building BlackBox Relay Agent...
echo ========================================

REM 1. Clean previous builds
echo Cleaning up...
rmdir /s /q build
rmdir /s /q dist

REM 2. Build Executable
echo.
echo Running PyInstaller...
pyinstaller build_dist.spec
if %errorlevel% neq 0 (
    echo ❌ PyInstaller failed!
    exit /b %errorlevel%
)
echo ✅ PyInstaller build complete.

REM 3. Build Installer
echo.
echo Building Installer (requires NSIS)...
if exist "C:\Program Files (x86)\NSIS\makensis.exe" (
    "C:\Program Files (x86)\NSIS\makensis.exe" installer\BlackBox-Relay.nsi
    if %errorlevel% neq 0 (
        echo ❌ NSIS build failed!
        exit /b %errorlevel%
    )
    echo ✅ Installer created: installer\BlackBox-Relay-Setup.exe
) else (
    echo ⚠️ NSIS not found at default location. Skipping installer build.
    echo Please compile 'installer\BlackBox-Relay.nsi' manually.
)

echo.
echo ========================================
echo ✅ Build Process Complete!
echo ========================================
pause
