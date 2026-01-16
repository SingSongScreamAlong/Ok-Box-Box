# Setup Embedded Python for Ok Box Box Relay
# This script downloads Python embeddable and installs required packages

$ErrorActionPreference = "Stop"

$PYTHON_VERSION = "3.11.7"
$PYTHON_URL = "https://www.python.org/ftp/python/$PYTHON_VERSION/python-$PYTHON_VERSION-embed-amd64.zip"
$TARGET_DIR = "$PSScriptRoot\..\python-embed"
$PIP_URL = "https://bootstrap.pypa.io/get-pip.py"

Write-Host "Setting up embedded Python for Ok Box Box Relay..." -ForegroundColor Cyan

# Create target directory
if (Test-Path $TARGET_DIR) {
    Remove-Item -Recurse -Force $TARGET_DIR
}
New-Item -ItemType Directory -Path $TARGET_DIR | Out-Null

# Download Python embeddable
Write-Host "Downloading Python $PYTHON_VERSION embeddable..." -ForegroundColor Yellow
$zipPath = "$TARGET_DIR\python.zip"
Invoke-WebRequest -Uri $PYTHON_URL -OutFile $zipPath

# Extract
Write-Host "Extracting..." -ForegroundColor Yellow
Expand-Archive -Path $zipPath -DestinationPath $TARGET_DIR
Remove-Item $zipPath

# Enable pip by modifying python311._pth
$pthFile = Get-ChildItem -Path $TARGET_DIR -Filter "python*._pth" | Select-Object -First 1
if ($pthFile) {
    $content = Get-Content $pthFile.FullName
    $content = $content -replace "#import site", "import site"
    Set-Content -Path $pthFile.FullName -Value $content
    Write-Host "Enabled site-packages in $($pthFile.Name)" -ForegroundColor Green
}

# Download and install pip
Write-Host "Installing pip..." -ForegroundColor Yellow
$getPipPath = "$TARGET_DIR\get-pip.py"
Invoke-WebRequest -Uri $PIP_URL -OutFile $getPipPath

$pythonExe = "$TARGET_DIR\python.exe"
& $pythonExe $getPipPath --no-warn-script-location
Remove-Item $getPipPath

# Install required packages
Write-Host "Installing pyirsdk, python-socketio, aiohttp..." -ForegroundColor Yellow
& $pythonExe -m pip install pyirsdk python-socketio aiohttp --no-warn-script-location

Write-Host ""
Write-Host "Embedded Python setup complete!" -ForegroundColor Green
Write-Host "Location: $TARGET_DIR" -ForegroundColor Cyan
