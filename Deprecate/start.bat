@echo off
set BACKEND_DIR=medical_backend
set FRONTEND_DIR=medical_frontend

echo === MEDICAL APP LAUNCHER ===
cd /d %~dp0

:: ---------------------------------------------------------
:: 1. BACKEND
:: ---------------------------------------------------------
echo 📂 Looking for backend folder: %BACKEND_DIR%...

if not exist "%BACKEND_DIR%" (
    echo [ERROR] Backend folder not found!
    exit /b 1
)

cd %BACKEND_DIR%

if not exist node_modules (
    echo 📦 Missing dependencies. Running npm install...
    npm install
)

echo 1/4 Starting Docker Compose...
if exist docker-compose.yml (
    docker-compose up -d
) else (
    echo [ERROR] docker-compose.yml not found!
    exit /b 1
)

echo ⏳ Waiting for Database (10s)...
timeout /t 10 >nul

echo 2/4 Populating Database...
node src\seed.js

echo 3/4 Starting Server...
start "Backend Server" node src\server.js

:: ---------------------------------------------------------
:: 2. FRONTEND
:: ---------------------------------------------------------
cd ..

echo 📂 Looking for frontend folder: %FRONTEND_DIR%...

if not exist "%FRONTEND_DIR%" (
    echo [ERROR] Frontend folder not found!
    exit /b 1
)

cd %FRONTEND_DIR%

if not exist node_modules (
    echo 📦 Missing frontend dependencies. Running npm install...
    npm install
)

echo 4/4 Starting Quasar...
quasar dev
