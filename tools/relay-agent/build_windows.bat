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

REM 2. Activate virtual environment if exists
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
)

REM 3. Build Executable
echo.
echo Running PyInstaller...
pyinstaller --noconfirm --clean build_dist.spec
if %errorlevel% neq 0 (
    echo [ERROR] PyInstaller failed!
    exit /b %errorlevel%
)
echo [OK] PyInstaller build complete.

REM 4. Rename output to branded name
if exist "dist\BlackBox-Relay.exe" (
    move "dist\BlackBox-Relay.exe" "dist\OkBoxBox-Relay.exe"
)

REM 4b. Code Signing (Requires Certificate)
REM Uncomment the following lines if you have a code signing certificate
REM set SIGN_CERT_FILE=C:\path\to\cert.pfx
REM set SIGN_CERT_PASS=your_password
REM if defined SIGN_CERT_FILE (
REM     echo Signing executable...
REM     "C:\Program Files (x86)\Windows Kits\10\bin\10.0.19041.0\x64\signtool.exe" sign /f "%SIGN_CERT_FILE%" /p "%SIGN_CERT_PASS%" /tr http://timestamp.digicert.com /td sha256 /fd sha256 "dist\OkBoxBox-Relay.exe"
REM )

REM 5. Copy to installer folder
copy /Y "dist\OkBoxBox-Relay.exe" "installer\"
copy /Y "README.md" "installer\"

REM 6. Build Installer
echo.
echo Building Installer (requires NSIS)...
if exist "C:\Program Files (x86)\NSIS\makensis.exe" (
    "C:\Program Files (x86)\NSIS\makensis.exe" installer\OkBoxBox-Relay.nsi
    if %errorlevel% neq 0 (
        echo [ERROR] NSIS build failed!
        exit /b %errorlevel%
    )
    echo [OK] Installer created: installer\OkBoxBox-Relay-Setup.exe
) else (
    echo [WARN] NSIS not found. Skipping installer build.
    echo Please compile 'installer\OkBoxBox-Relay.nsi' manually.
)

echo.
echo ========================================
echo [OK] Build Process Complete!
echo.
echo Output:
echo   - dist\OkBoxBox-Relay.exe  (standalone)
echo   - installer\OkBoxBox-Relay-Setup.exe  (installer)
echo ========================================
pause
