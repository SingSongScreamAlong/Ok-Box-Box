# BlackBox Windows Quick Start
# Run this script to quickly set up and start BlackBox on Windows

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "   BlackBox Windows Quick Start" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as administrator
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "⚠️  For best results, run this script as Administrator" -ForegroundColor Yellow
    Write-Host ""
}

# Check Docker
Write-Host "🔍 Checking Docker..." -ForegroundColor Green
try {
    $dockerVersion = docker --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Docker found: $dockerVersion" -ForegroundColor Green
    } else {
        throw "Docker not found"
    }
} catch {
    Write-Host "❌ Docker is not installed or not running!" -ForegroundColor Red
    Write-Host "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    Write-Host "Then restart this script." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check Docker Compose
Write-Host "🔍 Checking Docker Compose..." -ForegroundColor Green
try {
    $composeVersion = docker-compose --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Docker Compose found: $composeVersion" -ForegroundColor Green
    } else {
        # Try newer Docker Compose syntax
        $composeVersion = docker compose version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Docker Compose (new syntax) found: $composeVersion" -ForegroundColor Green
        } else {
            throw "Docker Compose not found"
        }
    }
} catch {
    Write-Host "❌ Docker Compose is not available!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check for .env file
Write-Host "🔍 Checking environment configuration..." -ForegroundColor Green
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  .env file not found. Creating from template..." -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "✅ Created .env file from template" -ForegroundColor Green
        Write-Host ""
        Write-Host "🔧 IMPORTANT: Please edit the .env file with your actual API keys:" -ForegroundColor Yellow
        Write-Host "   - OPENAI_API_KEY" -ForegroundColor White
        Write-Host "   - ELEVENLABS_API_KEY" -ForegroundColor White
        Write-Host "   - JWT_SECRET (can keep default for testing)" -ForegroundColor White
        Write-Host "   - POSTGRES_PASSWORD (can keep default for testing)" -ForegroundColor White
        Write-Host ""
        Write-Host "Opening .env file for editing..." -ForegroundColor Cyan
        notepad.exe ".env"
        Write-Host ""
        Write-Host "Press Enter after editing the .env file..." -ForegroundColor Yellow
        Read-Host
    } else {
        Write-Host "❌ Neither .env nor .env.example found!" -ForegroundColor Red
        Write-Host "Please ensure you have the complete BlackBox package." -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
} else {
    Write-Host "✅ Environment configuration found" -ForegroundColor Green
}

# Create necessary directories
Write-Host "🔧 Creating necessary directories..." -ForegroundColor Green
$dirs = @(
    "postgres_data",
    "redis_data",
    "server\logs",
    "relay_agent\logs"
)

foreach ($dir in $dirs) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}
Write-Host "✅ Directory structure ready" -ForegroundColor Green

# Main menu
Write-Host ""
Write-Host "What would you like to do?" -ForegroundColor Cyan
Write-Host "[1] Start BlackBox system" -ForegroundColor White
Write-Host "[2] Stop BlackBox system" -ForegroundColor White
Write-Host "[3] View system status" -ForegroundColor White
Write-Host "[4] View logs" -ForegroundColor White
Write-Host "[5] Reset system (WARNING: Deletes all data)" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter your choice (1-5)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "🚀 Starting BlackBox system..." -ForegroundColor Green
        Write-Host "This may take a few minutes for the first run..." -ForegroundColor Yellow
        Write-Host ""

        # Determine which docker compose command to use
        $composeCommand = "docker-compose"
        try {
            & $composeCommand --version 2>$null | Out-Null
        } catch {
            $composeCommand = "docker compose"
        }

        # Build and start the system
        & $composeCommand up -d --build

        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "✅ BlackBox system started successfully!" -ForegroundColor Green
            Write-Host ""
            Write-Host "🌐 Access URLs:" -ForegroundColor Cyan
            Write-Host "   Dashboard: http://localhost" -ForegroundColor White
            Write-Host "   API: http://localhost/api" -ForegroundColor White
            Write-Host "   Health Check: http://localhost/health" -ForegroundColor White
            Write-Host ""
            Write-Host "🔧 Services running:" -ForegroundColor Cyan
            Write-Host "   - BlackBox Server (API)" -ForegroundColor White
            Write-Host "   - PostgreSQL Database" -ForegroundColor White
            Write-Host "   - Redis Cache" -ForegroundColor White
            Write-Host "   - Relay Agent (telemetry collection)" -ForegroundColor White
            Write-Host "   - React Dashboard" -ForegroundColor White
            Write-Host ""
            Write-Host "💡 To test telemetry collection, open a new PowerShell and run:" -ForegroundColor Cyan
            Write-Host "   cd relay_agent" -ForegroundColor White
            Write-Host "   python agent_main.py" -ForegroundColor White
            Write-Host ""
        } else {
            Write-Host "❌ Failed to start BlackBox system!" -ForegroundColor Red
            Write-Host "Check the Docker logs for more details." -ForegroundColor Yellow
        }
    }
    "2" {
        Write-Host ""
        Write-Host "🛑 Stopping BlackBox system..." -ForegroundColor Yellow

        $composeCommand = "docker-compose"
        try {
            & $composeCommand --version 2>$null | Out-Null
        } catch {
            $composeCommand = "docker compose"
        }

        & $composeCommand down
        Write-Host "✅ BlackBox system stopped" -ForegroundColor Green
    }
    "3" {
        Write-Host ""
        Write-Host "📊 BlackBox System Status:" -ForegroundColor Cyan
        Write-Host ""

        $composeCommand = "docker-compose"
        try {
            & $composeCommand --version 2>$null | Out-Null
        } catch {
            $composeCommand = "docker compose"
        }

        & $composeCommand ps
    }
    "4" {
        Write-Host ""
        Write-Host "📋 BlackBox System Logs:" -ForegroundColor Cyan
        Write-Host "[1] All logs" -ForegroundColor White
        Write-Host "[2] Server logs" -ForegroundColor White
        Write-Host "[3] Database logs" -ForegroundColor White
        Write-Host "[4] Relay Agent logs" -ForegroundColor White
        Write-Host ""

        $logChoice = Read-Host "Enter log choice (1-4)"

        $composeCommand = "docker-compose"
        try {
            & $composeCommand --version 2>$null | Out-Null
        } catch {
            $composeCommand = "docker compose"
        }

        switch ($logChoice) {
            "1" { & $composeCommand logs -f --tail=50 }
            "2" { & $composeCommand logs -f server --tail=50 }
            "3" { & $composeCommand logs -f postgres --tail=50 }
            "4" { & $composeCommand logs -f relay-agent --tail=50 }
            default { Write-Host "❌ Invalid choice" -ForegroundColor Red }
        }
    }
    "5" {
        Write-Host ""
        Write-Host "⚠️  WARNING: This will delete ALL data and reset the system!" -ForegroundColor Red
        Write-Host "This includes: database data, logs, cached files" -ForegroundColor Red
        Write-Host ""
        $confirm = Read-Host "Are you sure? Type 'YES' to confirm"
        if ($confirm -eq "YES") {
            Write-Host ""
            Write-Host "🗑️  Resetting BlackBox system..." -ForegroundColor Yellow

            $composeCommand = "docker-compose"
            try {
                & $composeCommand --version 2>$null | Out-Null
            } catch {
                $composeCommand = "docker compose"
            }

            # Stop and remove containers/volumes
            & $composeCommand down -v

            # Remove data directories
            $dirsToRemove = @("postgres_data", "redis_data", "server\logs", "relay_agent\logs")
            foreach ($dir in $dirsToRemove) {
                if (Test-Path $dir) {
                    Remove-Item -Recurse -Force $dir
                }
            }

            # Remove Docker volumes
            docker volume rm blackbox_postgres_data blackbox_redis_data 2>$null

            Write-Host "✅ System reset complete" -ForegroundColor Green
        } else {
            Write-Host "❌ Reset cancelled" -ForegroundColor Yellow
        }
    }
    default {
        Write-Host "❌ Invalid choice. Please run the script again." -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "   BlackBox Setup Complete" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "For help or issues, check the README_Windows.md file" -ForegroundColor White
Write-Host "or visit: https://github.com/your-repo/blackbox" -ForegroundColor White
Write-Host ""

if ($choice -eq "1" -and $LASTEXITCODE -eq 0) {
    Write-Host "🎉 BlackBox is now running! Visit http://localhost to get started." -ForegroundColor Green
}

Read-Host "Press Enter to exit"
