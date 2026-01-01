# BlackBox Driver App - Windows PowerShell Builder
# Run this script to automatically build and run the BlackBox Driver App

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "BlackBox Driver App - Windows Builder" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Function to check if a command exists
function Test-Command($cmdname) {
    return [bool](Get-Command -Name $cmdname -ErrorAction SilentlyContinue)
}

# Check if Node.js is installed
if (-not (Test-Command "node")) {
    Write-Host "ERROR: Node.js is not installed!" -ForegroundColor Red
    Write-Host "Please install Node.js from: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "Download the LTS version and run this script again." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "✓ Node.js is installed" -ForegroundColor Green
$nodeVersion = node --version
Write-Host "  Version: $nodeVersion" -ForegroundColor Gray

# Check if npm is available
if (-not (Test-Command "npm")) {
    Write-Host "ERROR: npm is not available!" -ForegroundColor Red
    Write-Host "npm should come with Node.js. Please reinstall Node.js." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "✓ npm is available" -ForegroundColor Green

# Check if we're in the right directory
if (-not (Test-Path "driver_app")) {
    Write-Host "ERROR: driver_app directory not found!" -ForegroundColor Red
    Write-Host "Make sure you're running this script from the ProjectBlackBox root directory." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Navigate to driver_app directory
Set-Location "driver_app"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Installing Dependencies..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

try {
    npm install
    if ($LASTEXITCODE -ne 0) {
        throw "npm install failed"
    }
    Write-Host "✓ Dependencies installed successfully" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Failed to install dependencies!" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Building TypeScript..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

try {
    npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "TypeScript build failed"
    }
    Write-Host "✓ TypeScript built successfully" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Failed to build TypeScript!" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting BlackBox Driver App..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  Cloud Server: 64.227.28.10:8765" -ForegroundColor Gray
Write-Host "  Cloud Mode: Enabled" -ForegroundColor Gray
Write-Host "  iRacing SDK: Ready" -ForegroundColor Gray
Write-Host ""

try {
    Write-Host "Starting the application..." -ForegroundColor Green
    npm start
} catch {
    Write-Host "ERROR: Failed to start the application!" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "BlackBox Driver App Setup Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "The app is now running and connected to your cloud server." -ForegroundColor Green
Write-Host ""
Write-Host "To restart the app later:" -ForegroundColor Yellow
Write-Host "1. Run this script again, or" -ForegroundColor Gray
Write-Host "2. Navigate to driver_app folder and run: npm start" -ForegroundColor Gray
Write-Host ""
Read-Host "Press Enter to close this window"
