# Ok, Box Box - Deployment Script for Windows
# Run with: .\scripts\deploy.ps1

Write-Host "🏎️ Ok, Box Box - Deployment Script" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

# Check if doctl is installed
$doctlPath = Get-Command doctl -ErrorAction SilentlyContinue
if (-not $doctlPath) {
    Write-Host "Error: doctl (Digital Ocean CLI) is not installed" -ForegroundColor Red
    Write-Host "Install it from: https://docs.digitalocean.com/reference/doctl/how-to/install/"
    exit 1
}

# Check if authenticated
try {
    doctl account get | Out-Null
    Write-Host "✓ Digital Ocean CLI authenticated" -ForegroundColor Green
} catch {
    Write-Host "Error: Not authenticated with Digital Ocean" -ForegroundColor Red
    Write-Host "Run: doctl auth init"
    exit 1
}

Write-Host ""
Write-Host "📦 Building applications..." -ForegroundColor Yellow

# Build API
Write-Host "Building API..."
Push-Location services/api
npm run build
if ($LASTEXITCODE -ne 0) { exit 1 }
Pop-Location
Write-Host "✓ API built" -ForegroundColor Green

# Build BlackBox
Write-Host "Building BlackBox..."
Push-Location apps/blackbox
npm run build
if ($LASTEXITCODE -ne 0) { exit 1 }
Pop-Location
Write-Host "✓ BlackBox built" -ForegroundColor Green

Write-Host ""
Write-Host "🚀 Deploying to Digital Ocean App Platform..." -ForegroundColor Yellow

# Check if app exists
$appList = doctl apps list --format ID,Spec.Name --no-header 2>$null
$appId = ($appList | Select-String "okboxbox" | ForEach-Object { $_.Line.Split()[0] })

if (-not $appId) {
    Write-Host "Creating new app..."
    doctl apps create --spec .do/app.yaml
} else {
    Write-Host "Updating existing app: $appId"
    doctl apps update $appId --spec .do/app.yaml
}

Write-Host ""
Write-Host "✓ Deployment initiated!" -ForegroundColor Green
Write-Host ""
Write-Host "Monitor deployment at: https://cloud.digitalocean.com/apps" -ForegroundColor Cyan
