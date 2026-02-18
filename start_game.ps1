# ============================================================
# FUMORIVE - Start All Services
# ============================================================
# Script ini menjalankan SEMUA komponen Fumorive:
#   1. Docker containers (PostgreSQL + Redis)
#   2. Backend (FastAPI + Uvicorn)
#   3. Frontend (Vite + React + Babylon.js)
#   4. EEG Processing (Opsional - ditanyakan di akhir)
#
# Usage:
#   .\start_game.ps1                 # Normal (EEG ditanyakan di akhir)
#   .\start_game.ps1 -SkipDocker     # Skip Docker (jika sudah running)
#   .\start_game.ps1 -SkipEEG        # Skip pertanyaan EEG
# ============================================================

param(
    [switch]$SkipDocker,
    [switch]$SkipEEG,
    [switch]$NoBrowser
)

# ===========================
# CONFIGURATION
# ===========================
$ROOT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$BACKEND_DIR = Join-Path $ROOT_DIR "backend"
$FRONTEND_DIR = Join-Path $ROOT_DIR "frontend"
$EEG_DIR = Join-Path $ROOT_DIR "eeg-processing"

$BACKEND_VENV_PYTHON = Join-Path $BACKEND_DIR "venv\Scripts\python.exe"
$EEG_VENV_PYTHON = Join-Path $EEG_DIR "venv310\Scripts\python.exe"

$DB_CONTAINER = "fumorive-db"
$REDIS_CONTAINER = "fumorive-redis"

$BACKEND_PORT = 8000
$FRONTEND_PORT = 3000
$PID_FILE = Join-Path $ROOT_DIR ".fumorive_pids"

# Colors
function Write-Header($text) {
    Write-Host ""
    Write-Host "===========================================================" -ForegroundColor Cyan
    Write-Host "  $text" -ForegroundColor Cyan
    Write-Host "===========================================================" -ForegroundColor Cyan
}

function Write-Step($step, $text) {
    Write-Host "  [$step] " -ForegroundColor Yellow -NoNewline
    Write-Host $text
}

function Write-OK($text) {
    Write-Host "  [OK] " -ForegroundColor Green -NoNewline
    Write-Host $text
}

function Write-Fail($text) {
    Write-Host "  [FAIL] " -ForegroundColor Red -NoNewline
    Write-Host $text
}

function Write-Warn($text) {
    Write-Host "  [WARN] " -ForegroundColor DarkYellow -NoNewline
    Write-Host $text
}

function Write-Info($text) {
    Write-Host "  [INFO] " -ForegroundColor DarkCyan -NoNewline
    Write-Host $text
}

# ===========================
# BANNER
# ===========================
Clear-Host
Write-Host ""
Write-Host "  ================================================================" -ForegroundColor Magenta
Write-Host "     FUMORIVE - Driving Simulator with EEG Monitoring" -ForegroundColor White
Write-Host "     Starting all services..." -ForegroundColor Gray
Write-Host "  ================================================================" -ForegroundColor Magenta
Write-Host ""

# ===========================
# STEP 0: PREREQUISITE CHECK
# ===========================
Write-Header "STEP 0: Checking Prerequisites"

$allGood = $true

# Check Docker
Write-Step "0.1" "Checking Docker..."
$dockerVersion = docker --version 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-OK "Docker found: $dockerVersion"
} else {
    Write-Fail "Docker not found! Install Docker Desktop."
    $allGood = $false
}

# Check Node.js
Write-Step "0.2" "Checking Node.js..."
$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-OK "Node.js found: $nodeVersion"
} else {
    Write-Fail "Node.js not found! Install from https://nodejs.org/"
    $allGood = $false
}

# Check Backend venv
Write-Step "0.3" "Checking Backend Python venv..."
if (Test-Path $BACKEND_VENV_PYTHON) {
    $pyVer = & $BACKEND_VENV_PYTHON --version 2>$null
    Write-OK "Backend venv found: $pyVer"
} else {
    Write-Fail "Backend venv not found at: $BACKEND_VENV_PYTHON"
    Write-Info "Run: cd backend && python -m venv venv && venv\Scripts\pip install -r requirements.txt"
    $allGood = $false
}

# Check Frontend node_modules
Write-Step "0.4" "Checking Frontend dependencies..."
$nodeModules = Join-Path $FRONTEND_DIR "node_modules"
if (Test-Path $nodeModules) {
    Write-OK "Frontend node_modules found"
} else {
    Write-Warn "node_modules not found, will run 'npm install' automatically"
}

# Check EEG venv
Write-Step "0.5" "Checking EEG Python venv..."
if (Test-Path $EEG_VENV_PYTHON) {
    $eegPyVer = & $EEG_VENV_PYTHON --version 2>$null
    Write-OK "EEG venv found: $eegPyVer"
    $eegAvailable = $true
} else {
    Write-Warn "EEG venv not found (EEG fitur tidak tersedia)"
    Write-Info "Untuk EEG: cd eeg-processing && python -m venv venv310 && venv310\Scripts\pip install -r requirements.txt"
    $eegAvailable = $false
}

# Check .env files
Write-Step "0.6" "Checking config files..."
$backendEnv = Join-Path $BACKEND_DIR ".env"
$frontendEnv = Join-Path $FRONTEND_DIR ".env.local"
if (Test-Path $backendEnv) {
    Write-OK "backend/.env found"
} else {
    Write-Warn "backend/.env not found! Copy from .env.example and configure."
}
if (Test-Path $frontendEnv) {
    Write-OK "frontend/.env.local found"
} else {
    Write-Warn "frontend/.env.local not found! Copy from .env.example and configure Firebase."
}

if (-not $allGood) {
    Write-Host ""
    Write-Fail "Some prerequisites are missing. Fix them and try again."
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Initialize PID tracking file (before launching any processes)
@() | Out-File -FilePath $PID_FILE -Encoding ascii -Force

# ===========================
# STEP 1: DOCKER CONTAINERS
# ===========================
if (-not $SkipDocker) {
    Write-Header "STEP 1: Starting Docker Containers (PostgreSQL + Redis)"

    # Check if Docker daemon is running
    Write-Step "1.0" "Checking Docker daemon..."
    docker info *>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Docker daemon is not running!"
        Write-Info "Start Docker Desktop first, then run this script again."
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-OK "Docker daemon is running"

    # Start PostgreSQL (TimescaleDB)
    Write-Step "1.1" "Starting PostgreSQL (TimescaleDB)..."
    $dbStatus = docker inspect -f '{{.State.Running}}' $DB_CONTAINER 2>$null
    if ($dbStatus -eq "true") {
        Write-OK "$DB_CONTAINER already running"
    } else {
        # Try starting existing container
        docker start $DB_CONTAINER *>$null
        if ($LASTEXITCODE -eq 0) {
            Write-OK "$DB_CONTAINER started"
        } else {
            # Create new container
            Write-Info "Creating new $DB_CONTAINER container..."
            docker run -d `
                --name $DB_CONTAINER `
                -e POSTGRES_USER=postgres `
                -e POSTGRES_PASSWORD=12345 `
                -e POSTGRES_DB=fumorive `
                -p 5432:5432 `
                timescale/timescaledb:latest-pg16 *>$null
            if ($LASTEXITCODE -eq 0) {
                Write-OK "$DB_CONTAINER created and started"
            } else {
                Write-Fail "Failed to start $DB_CONTAINER"
            }
        }
    }

    # Start Redis
    Write-Step "1.2" "Starting Redis..."
    $redisStatus = docker inspect -f '{{.State.Running}}' $REDIS_CONTAINER 2>$null
    if ($redisStatus -eq "true") {
        Write-OK "$REDIS_CONTAINER already running"
    } else {
        docker start $REDIS_CONTAINER *>$null
        if ($LASTEXITCODE -eq 0) {
            Write-OK "$REDIS_CONTAINER started"
        } else {
            Write-Info "Creating new $REDIS_CONTAINER container..."
            docker run -d `
                --name $REDIS_CONTAINER `
                -p 6379:6379 `
                redis:7.2-alpine *>$null
            if ($LASTEXITCODE -eq 0) {
                Write-OK "$REDIS_CONTAINER created and started"
            } else {
                Write-Fail "Failed to start $REDIS_CONTAINER"
            }
        }
    }

    # Wait for containers to be ready
    Write-Step "1.3" "Waiting for services to be ready..."
    Start-Sleep -Seconds 3

    # Test PostgreSQL
    $pgReady = docker exec $DB_CONTAINER pg_isready -U postgres 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-OK "PostgreSQL is ready"
    } else {
        Write-Warn "PostgreSQL may not be ready yet, continuing anyway..."
    }

    # Test Redis
    $redisReady = docker exec $REDIS_CONTAINER redis-cli ping 2>$null
    if ($redisReady -match "PONG") {
        Write-OK "Redis is ready"
    } else {
        Write-Warn "Redis may not be ready yet, continuing anyway..."
    }
} else {
    Write-Header "STEP 1: Skipping Docker (--SkipDocker)"
    Write-Info "Assuming PostgreSQL and Redis are already running"
}

# ===========================
# STEP 2: BACKEND (FastAPI)
# ===========================
Write-Header "STEP 2: Starting Backend (FastAPI on port $BACKEND_PORT)"

Write-Step "2.1" "Checking if port $BACKEND_PORT is available..."
$portInUse = Get-NetTCPConnection -LocalPort $BACKEND_PORT -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Warn "Port $BACKEND_PORT is already in use. Backend may already be running."
    Write-Info "Skipping backend startup. Kill existing process if needed."
} else {
    Write-Step "2.2" "Launching Backend server..."
    
    $backendCmd = @"
title FUMORIVE - Backend (FastAPI :$BACKEND_PORT)
cd /d "$BACKEND_DIR"
echo.
echo ============================================
echo   FUMORIVE BACKEND - FastAPI Server
echo   Port: $BACKEND_PORT
echo   Docs: http://localhost:$BACKEND_PORT/api/docs
echo ============================================
echo.
"$BACKEND_VENV_PYTHON" -m uvicorn main:app --reload --host 0.0.0.0 --port $BACKEND_PORT
echo.
echo Backend stopped. Press any key to close...
pause >nul
"@
    $backendScriptPath = Join-Path $ROOT_DIR ".tmp_backend.cmd"
    $backendCmd | Out-File -FilePath $backendScriptPath -Encoding ascii
    $backendProc = Start-Process cmd.exe -ArgumentList "/c `"$backendScriptPath`"" -PassThru
    Add-Content -Path $PID_FILE -Value "BACKEND_CMD=$($backendProc.Id)"
    
    Write-OK "Backend launched in new window"
    Write-Info "API Docs: http://localhost:$BACKEND_PORT/api/docs"

    # Wait for backend to be up
    Write-Step "2.3" "Waiting for Backend to initialize..."
    $backendReady = $false
    for ($i = 0; $i -lt 20; $i++) {
        Start-Sleep -Seconds 1
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:$BACKEND_PORT/" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                $backendReady = $true
                break
            }
        } catch {
            # Still starting up
            Write-Host "." -NoNewline -ForegroundColor DarkGray
        }
    }
    Write-Host ""
    if ($backendReady) {
        Write-OK "Backend is ready!"
    } else {
        Write-Warn "Backend may still be starting up. Check the backend window."
    }
}

# ===========================
# STEP 3: FRONTEND (Vite)
# ===========================
Write-Header "STEP 3: Starting Frontend (Vite on port $FRONTEND_PORT)"

Write-Step "3.1" "Checking if port $FRONTEND_PORT is available..."
$frontendPortInUse = Get-NetTCPConnection -LocalPort $FRONTEND_PORT -ErrorAction SilentlyContinue
if ($frontendPortInUse) {
    Write-Warn "Port $FRONTEND_PORT is already in use. Frontend may already be running."
    Write-Info "Skipping frontend startup."
} else {
    # Install npm dependencies if needed
    if (-not (Test-Path $nodeModules)) {
        Write-Step "3.2" "Installing npm dependencies (first time)..."
        Push-Location $FRONTEND_DIR
        npm install 2>$null
        Pop-Location
        Write-OK "npm install completed"
    }

    Write-Step "3.3" "Launching Frontend dev server..."

    $frontendCmd = @"
title FUMORIVE - Frontend (Vite :$FRONTEND_PORT)
cd /d "$FRONTEND_DIR"
echo.
echo ============================================
echo   FUMORIVE FRONTEND - Vite Dev Server
echo   URL: http://localhost:$FRONTEND_PORT
echo ============================================
echo.
npm run dev
echo.
echo Frontend stopped. Press any key to close...
pause >nul
"@
    $frontendScriptPath = Join-Path $ROOT_DIR ".tmp_frontend.cmd"
    $frontendCmd | Out-File -FilePath $frontendScriptPath -Encoding ascii
    $frontendProc = Start-Process cmd.exe -ArgumentList "/c `"$frontendScriptPath`"" -PassThru
    Add-Content -Path $PID_FILE -Value "FRONTEND_CMD=$($frontendProc.Id)"
    
    Write-OK "Frontend launched in new window"
    Write-Info "Game URL: http://localhost:$FRONTEND_PORT"
}

# ===========================
# STEP 4: OPEN BROWSER
# ===========================
Write-Header "STEP 4: Opening Game"

if (-not $NoBrowser) {
    Write-Step "4.1" "Waiting for frontend to be ready..."
    Start-Sleep -Seconds 5
    
    Write-Step "4.2" "Opening browser..."
    Start-Process "http://localhost:$FRONTEND_PORT"
    Write-OK "Browser opened!"
}

# ===========================
# SUMMARY
# ===========================
Write-Host ""
Write-Host "  ================================================================" -ForegroundColor Green
Write-Host "     GAME SERVICES STARTED!" -ForegroundColor Green
Write-Host "  ================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Services running:" -ForegroundColor White
Write-Host "    PostgreSQL (Docker) .... localhost:5432" -ForegroundColor Gray
Write-Host "    Redis (Docker) ......... localhost:6379" -ForegroundColor Gray
Write-Host "    Backend (FastAPI) ...... http://localhost:$BACKEND_PORT" -ForegroundColor Gray
Write-Host "    Frontend (Vite) ........ http://localhost:$FRONTEND_PORT" -ForegroundColor Gray
Write-Host ""
Write-Host "  Quick links:" -ForegroundColor White
Write-Host "    Game:     http://localhost:$FRONTEND_PORT" -ForegroundColor Cyan
Write-Host "    API Docs: http://localhost:$BACKEND_PORT/api/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "  To stop all services: .\stop_game.ps1 or double-click stop_game.bat" -ForegroundColor Yellow
Write-Host ""

# ===========================
# STEP 5: EEG (Interactive)
# ===========================
if (-not $SkipEEG -and $eegAvailable) {
    Write-Header "STEP 5: EEG Processing (Muse 2)"
    Write-Host ""
    Write-Host "  Apakah kamu ingin menghubungkan EEG (Muse 2)?" -ForegroundColor White
    Write-Host "  Pastikan Muse 2 sudah nyala dan Bluetooth aktif." -ForegroundColor Gray
    Write-Host ""
    $eegChoice = Read-Host "  Connect EEG? (y/n)"

    if ($eegChoice -eq "y" -or $eegChoice -eq "Y") {
        # Launch muselsl stream
        Write-Step "5.1" "Launching Muse LSL Stream..."
        
        $eegStreamCmd = @"
@echo off
title FUMORIVE - EEG Muse LSL Stream
cd /d "$EEG_DIR"
echo.
echo ============================================
echo   FUMORIVE EEG - Muse 2 LSL Stream
echo   Searching for Muse 2 headband...
echo ============================================
echo.
"$EEG_DIR\venv310\Scripts\muselsl.exe" stream
echo.
echo Muse stream stopped. Press any key to close...
pause >nul
"@
        $eegStreamScriptPath = Join-Path $ROOT_DIR ".tmp_eeg_stream.cmd"
        $eegStreamCmd | Out-File -FilePath $eegStreamScriptPath -Encoding ascii
        $eegStreamProc = Start-Process cmd.exe -ArgumentList "/c `"$eegStreamScriptPath`"" -PassThru
        Add-Content -Path $PID_FILE -Value "EEG_STREAM_CMD=$($eegStreamProc.Id)"
        
        Write-OK "Muse LSL stream launched in new window"
        Write-Info "Tunggu sampai muncul 'Connected to Muse' di terminal tersebut"
        Write-Host ""

        # Manual session UUID input
        Write-Step "5.2" "Input Session UUID..."
        Write-Host ""
        Write-Host "  ================================================================" -ForegroundColor Cyan
        Write-Host "     CARA MENDAPATKAN SESSION ID:" -ForegroundColor White
        Write-Host "  ================================================================" -ForegroundColor Cyan
        Write-Host "  1. Buka browser -> Login ke game" -ForegroundColor Gray
        Write-Host "  2. Klik 'Mulai Game' di Dashboard atau masuk ke /session" -ForegroundColor Gray
        Write-Host "  3. Session ID akan muncul di:" -ForegroundColor Gray
        Write-Host "     - Banner biru di bagian ATAS layar game" -ForegroundColor Yellow
        Write-Host "     - Widget EEG Monitor (kanan atas)" -ForegroundColor Yellow
        Write-Host "     - Dashboard (card biru gelap di Overview)" -ForegroundColor Yellow
        Write-Host "  4. Klik tombol 'Copy' lalu paste di sini" -ForegroundColor Gray
        Write-Host "  ================================================================" -ForegroundColor Cyan
        Write-Host ""
        
        $sessionUUID = Read-Host "  Paste Session ID"
        $sessionUUID = $sessionUUID.Trim()

        if ($sessionUUID -and $sessionUUID.Length -ge 10) {
            Write-OK "Session UUID: $sessionUUID"
            Write-Step "5.3" "Launching EEG Streaming Server..."

            $eegServerCmd = @"
@echo off
title FUMORIVE - EEG Streaming Server
cd /d "$EEG_DIR"
echo.
echo ============================================
echo   FUMORIVE EEG - Streaming Server
echo   Session: $sessionUUID
echo   Backend: http://localhost:$BACKEND_PORT
echo ============================================
echo.
"$EEG_VENV_PYTHON" server.py --session-id $sessionUUID --backend-url http://localhost:$BACKEND_PORT
echo.
echo EEG Server stopped. Press any key to close...
pause >nul
"@
            $eegServerScriptPath = Join-Path $ROOT_DIR ".tmp_eeg_server.cmd"
            $eegServerCmd | Out-File -FilePath $eegServerScriptPath -Encoding ascii
            $eegServerProc = Start-Process cmd.exe -ArgumentList "/c `"$eegServerScriptPath`"" -PassThru
            Add-Content -Path $PID_FILE -Value "EEG_SERVER_CMD=$($eegServerProc.Id)"

            Write-OK "EEG Server launched!"
            Write-Host ""
            Write-Host "  ================================================================" -ForegroundColor Green
            Write-Host "     ALL SERVICES + EEG RUNNING!" -ForegroundColor Green
            Write-Host "  ================================================================" -ForegroundColor Green
            Write-Host "    EEG Stream (Muse LSL) .. running" -ForegroundColor Gray
            Write-Host "    EEG Server ............. session: $sessionUUID" -ForegroundColor Gray
        } else {
            Write-Warn "Session ID kosong atau tidak valid."
            Write-Info "Kamu bisa jalankan EEG manual nanti:"
            Write-Host "    cd eeg-processing" -ForegroundColor White
            Write-Host "    .\venv310\Scripts\python.exe server.py --session-id <UUID> --backend-url http://localhost:$BACKEND_PORT" -ForegroundColor White
        }
    } else {
        Write-Info "EEG dilewati."
    }
}

Write-Host ""

# Note: temp .cmd files are NOT cleaned up here.
# stop_game.ps1 will clean them up after stopping all processes.

Read-Host "Press Enter to close this window (services will keep running)"
