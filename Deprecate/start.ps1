# ---------------- CONFIG ----------------
$BACKEND_DIR  = "medical_backend"
$FRONTEND_DIR = "medical_frontend"

# ----------------------------------------
Write-Host "=== MEDICAL APP LAUNCHER ===" -ForegroundColor Green

# Vai nella directory dello script
Set-Location $PSScriptRoot

# ---------------------------------------------------------
# 1. BACKEND
# ---------------------------------------------------------
Write-Host "📂 Looking for backend folder: $BACKEND_DIR..."

if (-Not (Test-Path $BACKEND_DIR)) {
    Write-Host "[ERROR] Folder '$BACKEND_DIR' not found!" -ForegroundColor Red
    exit 1
}

Set-Location $BACKEND_DIR

# npm install se necessario
if (-Not (Test-Path "node_modules")) {
    Write-Host "📦 Missing dependencies. Running 'npm install'..."
    npm install
}

# Docker Compose
Write-Host "`n1/4 Starting Docker Compose..."
if (Test-Path "docker-compose.yml") {
    docker-compose up -d
} else {
    Write-Host "[ERROR] docker-compose.yml not found!" -ForegroundColor Red
    exit 1
}

Write-Host "⏳ Waiting for Database (10s)..."
Start-Sleep -Seconds 10

# Seed
Write-Host "`n2/4 Populating Database..."
node src/seed.js

# Server
Write-Host "`n3/4 Starting Server..."
$backendProcess = Start-Process node "src/server.js" -PassThru

# ---------------------------------------------------------
# 2. FRONTEND
# ---------------------------------------------------------
Set-Location ..

Write-Host "`n📂 Looking for frontend folder: $FRONTEND_DIR..."

if (-Not (Test-Path $FRONTEND_DIR)) {
    Write-Host "[ERROR] Frontend folder not found!" -ForegroundColor Red
    Stop-Process $backendProcess.Id
    exit 1
}

Set-Location $FRONTEND_DIR

if (-Not (Test-Path "node_modules")) {
    Write-Host "📦 Missing frontend dependencies. Running 'npm install'..."
    npm install
}

Write-Host "`n4/4 Starting Quasar..."
quasar dev

# Cleanup
Stop-Process $backendProcess.Id
