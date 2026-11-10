# ==============================================================================
# ZKode Autonomous Launcher & Self-Healing Orchestrator
# Supports: Docker Desktop (Auto-Start & Compose) with Native Fallback
# ==============================================================================

[CmdletBinding()]
param (
    [ValidateSet("auto", "docker", "native")]
    [string]$Mode = "auto",
    [switch]$NoBrowser
)

$ErrorActionPreference = "Continue"
$RootPath = $PSScriptRoot
$LogDir = Join-Path $RootPath "logs"
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$ErrorLog = Join-Path $LogDir "launch_error_$Timestamp.log"

function Write-NothingLog {
    param([string]$Message, [string]$Type = "INFO")
    $color = "White"
    $tag = "[ * ]"
    switch ($Type) {
        "SUCCESS" { $color = "Green"; $tag = "[ + ]" }
        "WARN"    { $color = "Yellow"; $tag = "[ ! ]" }
        "ERROR"   { $color = "Red"; $tag = "[ x ]" }
        "BRAND"   { $color = "DarkRed"; $tag = "[ Z ]" }
    }
    Write-Host "$tag $Message" -ForegroundColor $color
}

function Log-Failure {
    param([string]$Context, [string]$Details)
    $logContent = @"
==============================================================================
ZKODE LAUNCH FAILURE REPORT
Timestamp: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Context: $Context
OS: $((Get-CimInstance Win32_OperatingSystem).Caption)
PowerShell: $($PSVersionTable.PSVersion.ToString())
==============================================================================

$Details

------------------------------------------------------------------------------
ENVIRONMENT DUMP
------------------------------------------------------------------------------
PATH: $env:PATH
"@
    Set-Content -Path $ErrorLog -Value $logContent -Encoding utf8
    Write-NothingLog "Error diagnostic written to: $ErrorLog" -Type "ERROR"
}

Write-Host ""
Write-Host "   ============================================================" -ForegroundColor Red
Write-Host "                    Z K O D E   L A U N C H E R               " -ForegroundColor White
Write-Host "        Zero Knowledge Selective Disclosure Platform           " -ForegroundColor Gray
Write-Host "   ============================================================" -ForegroundColor Red
Write-Host ""

# ------------------------------------------------------------------------------
# 1. Port Conflict Auto-Clearing (8000 & 3000)
# ------------------------------------------------------------------------------
function Clear-PortConflict {
    param([int]$Port)
    try {
        $pids = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
        if ($pids) {
            foreach ($p in $pids) {
                Write-NothingLog "Clearing existing process on port $Port (PID: $p)..." -Type "WARN"
                Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
            }
        }
    } catch {}
}

# ------------------------------------------------------------------------------
# 2. Docker Health & Auto-Boot Logic
# ------------------------------------------------------------------------------
function Test-DockerDaemon {
    $res = docker info 2>&1
    return ($LASTEXITCODE -eq 0)
}

function Start-DockerDesktopEngine {
    $dockerPaths = @(
        "C:\Program Files\Docker\Docker\Docker Desktop.exe",
        "$env:LOCALAPPDATA\Programs\Docker\Docker\Docker Desktop.exe"
    )
    $exe = $dockerPaths | Where-Object { Test-Path $_ } | Select-Object -First 1

    if (-not $exe) {
        Write-NothingLog "Docker Desktop executable not found on standard paths." -Type "WARN"
        return $false
    }

    Write-NothingLog "Docker daemon is not running. Starting Docker Desktop automatically..." -Type "WARN"
    Start-Process -FilePath $exe -WindowStyle Minimized

    $retries = 35
    for ($i = 1; $i -le $retries; $i++) {
        Write-Host -NoNewline "." -ForegroundColor Yellow
        Start-Sleep -Seconds 2
        if (Test-DockerDaemon) {
            Write-Host ""
            Write-NothingLog "Docker Engine connected and ready!" -Type "SUCCESS"
            return $true
        }
    }
    Write-Host ""
    Write-NothingLog "Docker Desktop engine startup timed out." -Type "WARN"
    return $false
}

function Launch-DockerStack {
    Write-NothingLog "Initiating Docker Compose build and deployment..."
    Clear-PortConflict -Port 8000
    Clear-PortConflict -Port 3000

    Push-Location $RootPath
    try {
        $output = docker compose up --build -d 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "$output"
        }
        Write-NothingLog "Docker containers running successfully." -Type "SUCCESS"
        Pop-Location
        return $true
    } catch {
        Pop-Location
        Log-Failure -Context "Docker Compose Build/Up" -Details $_.ToString()
        return $false
    }
}

# ------------------------------------------------------------------------------
# 3. Native Direct Execution (Self-Healing Fallback)
# ------------------------------------------------------------------------------
function Launch-NativeStack {
    Write-NothingLog "Starting ZKode in Native Direct Mode..." -Type "BRAND"
    Clear-PortConflict -Port 8000
    Clear-PortConflict -Port 3000

    # A. Backend Setup & Launch
    Write-NothingLog "Setting up Python FastAPI backend on port 8000..."
    $backendDir = Join-Path $RootPath "backend"
    $venvPython = Join-Path $backendDir "venv\Scripts\python.exe"

    if (-not (Test-Path $venvPython)) {
        Write-NothingLog "Creating Python virtual environment in backend/venv..."
        python -m venv (Join-Path $backendDir "venv")
    }

    if (-not (Test-Path $venvPython)) {
        $venvPython = "python"
    }

    # Verify requirements
    Write-NothingLog "Validating Python dependencies..."
    & $venvPython -m pip install -q -r (Join-Path $backendDir "requirements.txt") 2>&1 | Out-Null

    # Launch Backend in new window/background
    Write-NothingLog "Launching FastAPI server..."
    $backendCmd = "Set-Location '$backendDir'; & '$venvPython' -m uvicorn app.main:app --host 0.0.0.0 --port 8000"
    Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", $backendCmd -WindowStyle Normal

    # B. Frontend Setup & Launch
    Write-NothingLog "Setting up Next.js frontend on port 3000..."
    $frontendDir = Join-Path $RootPath "frontend"
    if (-not (Test-Path (Join-Path $frontendDir "node_modules"))) {
        Write-NothingLog "Installing frontend npm packages..."
        npm --prefix $frontendDir install
    }

    Write-NothingLog "Launching Next.js server..."
    $frontendCmd = "Set-Location '$frontendDir'; npm run dev"
    Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", $frontendCmd -WindowStyle Normal

    return $true
}

# ------------------------------------------------------------------------------
# 4. Orchestration & Health Validation
# ------------------------------------------------------------------------------
$launchedMode = ""

if ($Mode -eq "docker" -or $Mode -eq "auto") {
    $dockerAvailable = Get-Command docker -ErrorAction SilentlyContinue
    $dockerReady = $false

    if ($dockerAvailable) {
        if (Test-DockerDaemon) {
            $dockerReady = $true
        } else {
            $dockerReady = Start-DockerDesktopEngine
        }
    }

    if ($dockerReady) {
        if (Launch-DockerStack) {
            $launchedMode = "docker"
        }
    }
}

if (-not $launchedMode) {
    if ($Mode -eq "docker") {
        Write-NothingLog "Docker Mode explicitly requested but Docker was unavailable." -Type "ERROR"
        exit 1
    }
    Write-NothingLog "Self-healing: Docker unavailable or timed out. Falling back to Native Mode." -Type "WARN"
    try {
        if (Launch-NativeStack) {
            $launchedMode = "native"
        }
    } catch {
        Log-Failure -Context "Native Stack Launch" -Details $_.ToString()
        Write-NothingLog "Fatal: Could not launch in Native mode either. Check $ErrorLog" -Type "ERROR"
        exit 1
    }
}

# ------------------------------------------------------------------------------
# 5. Service Readiness Polling & Browser Auto-Open
# ------------------------------------------------------------------------------
Write-NothingLog "Waiting for services to become responsive..."
$frontendUrl = "http://localhost:3000"
$backendUrl = "http://localhost:8000/api/health"

$ready = $false
for ($i = 1; $i -le 25; $i++) {
    Start-Sleep -Seconds 1
    try {
        $backendCheck = Invoke-RestMethod -Uri $backendUrl -TimeoutSec 1 -ErrorAction SilentlyContinue
        if ($backendCheck -and $backendCheck.status -eq "ok") {
            $ready = $true
            break
        }
    } catch {}
}

if ($ready) {
    Write-NothingLog "FastAPI Backend is healthy [OK]" -Type "SUCCESS"
} else {
    Write-NothingLog "Backend took longer than expected; still initializing." -Type "WARN"
}

Write-Host ""
Write-NothingLog "==========================================================" -Type "SUCCESS"
Write-NothingLog "   ZKode Platform is LIVE in $($launchedMode.ToUpper()) mode!   " -Type "SUCCESS"
Write-NothingLog "   Frontend: $frontendUrl                                   " -Type "SUCCESS"
Write-NothingLog "   Backend:  http://localhost:8000                          " -Type "SUCCESS"
Write-NothingLog "   API Docs: http://localhost:8000/docs                     " -Type "SUCCESS"
Write-NothingLog "==========================================================" -Type "SUCCESS"
Write-Host ""

if (-not $NoBrowser) {
    Start-Sleep -Seconds 1
    Start-Process $frontendUrl
}

