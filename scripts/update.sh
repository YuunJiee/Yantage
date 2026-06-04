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
if echo "$CHANGED" | grep -qE "^(docker-compose|Dockerfile)"; then
    REBUILD_BACKEND=true
    REBUILD_FRONTEND=true
fi
if [ "$CHANGED" = "all" ]; then
    REBUILD_BACKEND=true
    REBUILD_FRONTEND=true
fi

LOG="$PROJECT_ROOT/update.log"

if [ "$REBUILD_BACKEND" = false ] && [ "$REBUILD_FRONTEND" = false ]; then
    echo -e "${YELLOW}⚡ No source changes, restarting containers only...${NC}"
    docker compose up -d
    echo -e "${GREEN}✅ Done.${NC}"
    exit 0
fi

SERVICES=""
[ "$REBUILD_BACKEND" = true ]  && SERVICES="$SERVICES backend"  && echo -e "${YELLOW}🔧 Backend changed — will rebuild${NC}"
[ "$REBUILD_FRONTEND" = true ] && SERVICES="$SERVICES frontend" && echo -e "${YELLOW}🎨 Frontend changed — will rebuild${NC}"

echo -e "${YELLOW}📋 Build log → $LOG${NC}"
echo -e "${YELLOW}   SSH 斷線不影響 build，可用 tail -f $LOG 查看進度${NC}"

# Run build + up detached from the SSH session so it survives disconnection
nohup bash -c "
  set -e
  docker compose build $SERVICES >> '$LOG' 2>&1
  docker compose up -d >> '$LOG' 2>&1
  echo '✅ Update complete' >> '$LOG'
" >> "$LOG" 2>&1 &

BUILD_PID=$!
echo -e "${GREEN}🚀 Build started (PID $BUILD_PID)${NC}"
echo ""
echo "  查看進度：tail -f $LOG"
echo "  確認完成：docker compose ps"
