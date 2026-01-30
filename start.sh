#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== MEDICAL APP LAUNCHER ===${NC}"

# 1. Check Node
if ! command -v node &> /dev/null
then
    echo -e "${RED}[ERROR] Node.js not found.${NC}"
    exit 1
fi

# 2. Check Docker
if ! command -v docker &> /dev/null
then
    echo -e "${RED}[ERROR] Docker not found.${NC}"
    exit 1
fi

echo -e "1/4 Starting Docker Compose..."
docker-compose up -d

echo -e "Waiting for MySQL to initialize (15s)..."
sleep 15

echo -e "\n2/4 Running Seed..."
cd backend || exit
node src/seed.js

echo -e "\n3/4 Starting Backend..."
# Start the server in the background and save the PID
node src/server.js &
BACKEND_PID=$!

echo -e "\n4/4 Starting Frontend..."
cd ../frontend || exit
quasar dev

# When you close Quasar (Ctrl+C), also kill the Backend
kill $BACKEND_PID