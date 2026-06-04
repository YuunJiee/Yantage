#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

echo -e "${GREEN}⬇️  Pulling latest code...${NC}"
git pull

# Detect which services actually changed since last build
CHANGED=$(git diff --name-only HEAD@{1} HEAD 2>/dev/null || echo "all")

REBUILD_BACKEND=false
REBUILD_FRONTEND=false

if echo "$CHANGED" | grep -q "^backend/"; then
    REBUILD_BACKEND=true
fi
if echo "$CHANGED" | grep -q "^frontend/"; then
    REBUILD_FRONTEND=true
fi
# Always rebuild if Dockerfiles or compose config changed
if echo "$CHANGED" | grep -qE "^(docker-compose|Dockerfile)"; then
    REBUILD_BACKEND=true
    REBUILD_FRONTEND=true
fi
# Fallback: if detection fails, rebuild both
if [ "$CHANGED" = "all" ]; then
    REBUILD_BACKEND=true
    REBUILD_FRONTEND=true
fi

if [ "$REBUILD_BACKEND" = false ] && [ "$REBUILD_FRONTEND" = false ]; then
    echo -e "${YELLOW}⚡ No source changes detected, restarting containers only...${NC}"
    docker compose up -d
else
    SERVICES=""
    [ "$REBUILD_BACKEND" = true ]  && SERVICES="$SERVICES backend"  && echo -e "${YELLOW}🔧 Backend changed — rebuilding${NC}"
    [ "$REBUILD_FRONTEND" = true ] && SERVICES="$SERVICES frontend" && echo -e "${YELLOW}🎨 Frontend changed — rebuilding${NC}"

    # Build with layer cache (no --no-cache) — only reinstalls packages if lockfiles changed
    docker compose build $SERVICES
    docker compose up -d
fi

echo -e "${GREEN}✅ Update Complete!${NC}"
