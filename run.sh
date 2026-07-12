#!/bin/bash

# File: run.sh
# One-click script to start both backend and frontend concurrently
# with proper logging, signal handling, and cleanup

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

# Colors for output
BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RESET='\033[0m'

# Create logs directory if it doesn't exist
mkdir -p "$PROJECT_ROOT/logs"
BACKEND_LOG="$PROJECT_ROOT/logs/backend.log"
FRONTEND_LOG="$PROJECT_ROOT/logs/frontend.log"

# Function to cleanup on exit
cleanup() {
  echo -e "\n${BOLD}Shutting down...${RESET}"
  
  # Kill all child processes
  if [ -n "$BACKEND_PID" ]; then
    echo "Stopping backend (PID: $BACKEND_PID)..."
    kill $BACKEND_PID 2>/dev/null || true
  fi
  
  if [ -n "$FRONTEND_PID" ]; then
    echo "Stopping frontend (PID: $FRONTEND_PID)..."
    kill $FRONTEND_PID 2>/dev/null || true
  fi
  
  # Wait for processes to terminate
  wait 2>/dev/null || true
  
  echo -e "${GREEN}✓ All services stopped.${RESET}"
  exit 0
}

# Set trap to cleanup on signals
trap cleanup SIGINT SIGTERM EXIT

# Check if dependencies are installed
if [ ! -d "$BACKEND_DIR/node_modules" ]; then
  echo -e "${BOLD}Installing backend dependencies...${RESET}"
  cd "$BACKEND_DIR"
  npm install
fi

if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  echo -e "${BOLD}Installing frontend dependencies...${RESET}"
  cd "$FRONTEND_DIR"
  npm install
fi

# Clear old logs
> "$BACKEND_LOG"
> "$FRONTEND_LOG"

# Start backend in background
echo -e "${BOLD}Starting backend...${RESET}"
cd "$BACKEND_DIR"
npm run dev > "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${RESET}"
echo -e "  Logs: ${BLUE}logs/backend.log${RESET}"

# Wait a moment for backend to initialize
sleep 2

# Start frontend in background
echo -e "${BOLD}Starting frontend...${RESET}"
cd "$FRONTEND_DIR"
npm run dev > "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${RESET}"
echo -e "  Logs: ${BLUE}logs/frontend.log${RESET}"

# Display endpoints
echo -e "\n${BOLD}═══════════════════════════════════════════${RESET}"
echo -e "${GREEN}TransitOps is running!${RESET}"
echo -e "${BOLD}═══════════════════════════════════════════${RESET}"
echo -e "  Backend:  ${BLUE}http://localhost:4000${RESET}"
echo -e "  Frontend: ${BLUE}http://localhost:5173${RESET}"
echo -e "\n  Logs:"
echo -e "    Backend:  ${BLUE}logs/backend.log${RESET}"
echo -e "    Frontend: ${BLUE}logs/frontend.log${RESET}"
echo -e "\n  Press ${BOLD}Ctrl+C${RESET} to stop all services"
echo -e "${BOLD}═══════════════════════════════════════════${RESET}\n"

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
