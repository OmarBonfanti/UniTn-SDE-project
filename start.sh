#!/bin/bash

# --- Configure FOLDER NAMES ---
# Modify here if your folders have different names
BACKEND_DIR="medical_backend"   
FRONTEND_DIR="medical_frontend"         

# --- START SCRIPT ---
cd "$(dirname "$0")"
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}=== MEDICAL APP LAUNCHER ===${NC}"

# ---------------------------------------------------------
# 1. SETUP BACKEND
# ---------------------------------------------------------
echo -e "📂 Looking for backend folder: $BACKEND_DIR..."

if [ ! -d "$BACKEND_DIR" ]; then
    echo -e "${RED}[ERROR] Folder '$BACKEND_DIR' not found!${NC}"
    echo "Check the name of your server folder."
    exit 1
fi

cd "$BACKEND_DIR"

# AUTO-INSTALL: If node_modules is missing, install!
if [ ! -d "node_modules" ]; then
    echo -e "📦 Missing dependencies. Running 'npm install'..."
    npm install
fi

# START DOCKER
echo -e "\n1/4 Starting Docker Compose..."
if [ -f "docker-compose.yml" ]; then
    docker-compose up -d
else
    echo -e "${RED}[ERROR] docker-compose.yml not found in $BACKEND_DIR${NC}"
    exit 1
fi

echo -e "⏳ Waiting for Database (10s)..."
sleep 10

# SEED
echo -e "\n2/4 Populating Database..."
node src/seed.js

# SERVER START
echo -e "\n3/4 Starting Server..."
node src/server.js &
BACKEND_PID=$!

# ---------------------------------------------------------
# 2. SETUP FRONTEND
# ---------------------------------------------------------
cd ..

echo -e "\n📂 Looking for frontend folder: $FRONTEND_DIR..."
if [ ! -d "$FRONTEND_DIR" ]; then
    # Let's guess if it's named medical_frontend
    if [ -d "medical_frontend" ]; then
        FRONTEND_DIR="medical_frontend"
        echo "   Found as 'medical_frontend'!"
    else
        echo -e "${RED}[ERROR] Frontend folder not found!${NC}"
        kill $BACKEND_PID
        exit 1
    fi
fi

cd "$FRONTEND_DIR"

# AUTO-INSTALL: If node_modules is missing, install!
if [ ! -d "node_modules" ]; then
    echo -e "📦 Missing frontend dependencies. Running 'npm install'..."
    npm install
fi

echo -e "\n4/4 Starting Quasar..."
quasar dev

# CLOSING
kill $BACKEND_PID