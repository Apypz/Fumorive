# ============================================================
# FUMORIVE - Stop All Services
# ============================================================
# Menghentikan SEMUA proses Fumorive dan menutup terminal-nya.
# Menggunakan PID file dari start_game.ps1 + fallback port/proses.
# ============================================================

$ROOT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$PID_FILE = Join-Path $ROOT_DIR ".fumorive_pids"

function Write-Step($text) {
    Write-Host "  [>] " -ForegroundColor Yellow -NoNewline
    Write-Host $text
}

function Write-OK($text) {
    Write-Host "  [OK] " -ForegroundColor Green -NoNewline
    Write-Host $text
}

function Write-Info($text) {
    Write-Host "  [INFO] " -ForegroundColor DarkCyan -NoNewline
    Write-Host $text
}

function Kill-ProcessTree($processId) {
    # taskkill /T kills the entire process tree (CMD + child python/node)
    # /F forces termination
    $result = taskkill /T /F /PID $processId 2>&1
    return ($LASTEXITCODE -eq 0)
}

function Kill-ByPort($port, $label) {
    $pids = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique |
        Where-Object { $_ -ne 0 -and $_ -ne 4 }
    if ($pids) {
        foreach ($p in $pids) {
            $proc = Get-Process -Id $p -ErrorAction SilentlyContinue
            if ($proc -and $proc.ProcessName -notin @("System", "svchost", "Idle")) {
                taskkill /T /F /PID $p 2>$null | Out-Null
            }
        }
        Write-OK "$label stopped (via port $port)"
        return $true
    }
    return $false
}

Clear-Host
Write-Host ""
Write-Host "  ================================================================" -ForegroundColor Red
Write-Host "     FUMORIVE - Stopping All Services" -ForegroundColor White
Write-Host "  ================================================================" -ForegroundColor Red
Write-Host ""

$killedSomething = $false

# ===========================
# 1. Kill processes from PID file (most reliable)
# ===========================
if (Test-Path $PID_FILE) {
    Write-Step "Reading tracked PIDs from .fumorive_pids..."
    $pidEntries = Get-Content $PID_FILE | Where-Object { $_ -match "=" }
    
    foreach ($entry in $pidEntries) {
        $parts = $entry -split "=", 2
        $label = $parts[0].Trim()
        $storedPid = $parts[1].Trim()
        
        if ($storedPid -match "^\d+$") {
            $proc = Get-Process -Id ([int]$storedPid) -ErrorAction SilentlyContinue
            if ($proc) {
                Write-Step "Stopping $label (PID: $storedPid)..."
                $killed = Kill-ProcessTree ([int]$storedPid)
                if ($killed) {
                    Write-OK "$label stopped (PID: $storedPid)"
                    $killedSomething = $true
                } else {
                    Write-Info "$label (PID: $storedPid) - already stopped or access denied"
                }
            } else {
                Write-Info "$label (PID: $storedPid) - process no longer exists"
            }
        }
    }
    
    # Remove PID file after processing
    Remove-Item $PID_FILE -Force -ErrorAction SilentlyContinue
} else {
    Write-Info "No PID file found, using fallback detection..."
}

# ===========================
# 2. Fallback: Kill by port (in case PID file was missing)
# ===========================
Write-Step "Checking ports for remaining processes..."

if (-not (Kill-ByPort 8000 "Backend")) {
    Write-Info "Port 8000 - no process found"
}

if (-not (Kill-ByPort 3000 "Frontend")) {
    Write-Info "Port 3000 - no process found"
}

# ===========================
# 3. Fallback: Kill EEG processes by name + command line (WMI)
# ===========================
Write-Step "Stopping EEG processes..."
$eegKilled = $false

# Find python/muselsl processes related to EEG using WMI
$wmiProcs = Get-CimInstance Win32_Process -Filter "Name = 'python.exe' OR Name = 'muselsl.exe'" -ErrorAction SilentlyContinue
foreach ($wp in $wmiProcs) {
    $cmdLine = $wp.CommandLine
    if ($cmdLine -and ($cmdLine -match "muselsl|server\.py|eeg-processing")) {
        Write-Step "  Killing EEG process: $($wp.Name) (PID: $($wp.ProcessId))"
        taskkill /T /F /PID $wp.ProcessId 2>$null | Out-Null
        $eegKilled = $true
    }
}

if ($eegKilled) {
    Write-OK "EEG processes stopped"
} else {
    Write-Info "No EEG processes found"
}

# ===========================
# 4. Kill any remaining CMD windows with FUMORIVE title
# ===========================
Write-Step "Closing FUMORIVE terminal windows..."
$cmdKilled = $false

# Method 1: Window title matching
$cmdProcs = Get-Process cmd -ErrorAction SilentlyContinue | Where-Object {
    $_.MainWindowTitle -like "*FUMORIVE*"
}
if ($cmdProcs) {
    foreach ($cp in $cmdProcs) {
        taskkill /T /F /PID $cp.Id 2>$null | Out-Null
        $cmdKilled = $true
    }
}

# Method 2: Find CMD processes running our .tmp scripts (WMI)
$cmdWmi = Get-CimInstance Win32_Process -Filter "Name = 'cmd.exe'" -ErrorAction SilentlyContinue
foreach ($cw in $cmdWmi) {
    $cmdLine = $cw.CommandLine
    if ($cmdLine -and ($cmdLine -match "\.tmp_(backend|frontend|eeg)")) {
        taskkill /T /F /PID $cw.ProcessId 2>$null | Out-Null
        $cmdKilled = $true
    }
}

if ($cmdKilled) {
    Write-OK "FUMORIVE terminal windows closed"
} else {
    Write-Info "No FUMORIVE terminal windows found"
}

# ===========================
# 5. Stop Docker Containers
# ===========================
Write-Step "Stopping Docker containers..."

$dockerAvailable = docker --version 2>$null
if ($LASTEXITCODE -eq 0) {
    docker info *>$null 2>&1
    if ($LASTEXITCODE -eq 0) {
        $dbRunning = docker inspect -f '{{.State.Running}}' fumorive-db 2>$null
        if ($dbRunning -eq "true") {
            docker stop fumorive-db *>$null
            Write-OK "fumorive-db stopped"
        } else {
            Write-Info "fumorive-db was not running"
        }

        $redisRunning = docker inspect -f '{{.State.Running}}' fumorive-redis 2>$null
        if ($redisRunning -eq "true") {
            docker stop fumorive-redis *>$null
            Write-OK "fumorive-redis stopped"
        } else {
            Write-Info "fumorive-redis was not running"
        }
    } else {
        Write-Info "Docker daemon not running, skipping container stop"
    }
} else {
    Write-Info "Docker not found, skipping container stop"
}

# ===========================
# 6. Cleanup temp files
# ===========================
Write-Step "Cleaning up temporary files..."
$tmpFiles = Get-ChildItem -Path $ROOT_DIR -Filter ".tmp_*.cmd" -ErrorAction SilentlyContinue
if ($tmpFiles) {
    $tmpFiles | Remove-Item -Force -ErrorAction SilentlyContinue
    Write-OK "Temp files cleaned up ($($tmpFiles.Count) files)"
} else {
    Write-Info "No temp files to clean"
}

# ===========================
# 7. Final verification
# ===========================
Write-Host ""
Write-Step "Verifying all services stopped..."

$remaining = @()
$port8000 = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
if ($port8000) { $remaining += "Backend (port 8000)" }

$port3000 = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($port3000) { $remaining += "Frontend (port 3000)" }

if ($remaining.Count -eq 0) {
    Write-OK "All ports cleared"
} else {
    Write-Host "  [WARN] " -ForegroundColor DarkYellow -NoNewline
    Write-Host "Still running: $($remaining -join ', ')"
    Write-Info "You may need to close these manually or run this script as Administrator"
}

Write-Host ""
Write-Host "  ================================================================" -ForegroundColor Green
Write-Host "     ALL SERVICES STOPPED" -ForegroundColor Green
Write-Host "  ================================================================" -ForegroundColor Green
Write-Host ""

Read-Host "Press Enter to close"
