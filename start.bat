@echo off
TITLE Medical App Launcher

echo ==========================================
echo    ENVIRONMENT CHECK AND PROJECT LAUNCH
echo ==========================================

:: 1. CHECK NODE
node -v >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed!
    pause
    exit
)
echo [OK] Node.js found.

:: 2. CHECK DOCKER
docker -v >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Docker is not installed or not in PATH!
    pause
    exit
)
echo [OK] Docker found.

echo.
echo ------------------------------------------
echo 1/4 STARTING DOCKER DATABASE...
echo ------------------------------------------
docker-compose up -d

echo.
echo [WAIT] Waiting 15 seconds for MySQL to be ready...
timeout /t 15 /nobreak >nul

echo.
echo ------------------------------------------
echo 2/4 POPULATING DATABASE (SEED)...
echo ------------------------------------------
cd backend
call node src/seed.js
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Seeding failed. Check the logs above.
    pause
    exit
)

echo.
echo ------------------------------------------
echo 3/4 STARTING BACKEND SERVER...
echo ------------------------------------------
:: Start the server in a new minimized or separate window
start "Medical Backend" /B node src/server.js
echo [OK] Server started in the background.

echo.
echo ------------------------------------------
echo 4/4 STARTING FRONTEND QUASAR...
echo ------------------------------------------
cd ..\frontend
echo The app will open shortly in the browser...
call quasar dev

pause