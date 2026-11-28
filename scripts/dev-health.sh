#!/bin/bash
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WEB_NEXT_DIR="$REPO_ROOT/apps/web/.next"

echo "=== 1. Mac RAM, Swap & Load ==="
uptime 2>/dev/null || true
memory_pressure -Q 2>/dev/null || true
sysctl vm.swapusage 2>/dev/null || true
top -l 1 -n 0 2>/dev/null | grep -E "^PhysMem:|^Load Avg:" || true

echo ""
echo "=== 2. Dev Servers & .next Cache ==="
PORT_3000_PID=$(lsof -t -iTCP:3000 -sTCP:LISTEN 2>/dev/null | head -n 1 || true)
PORT_4000_PID=$(lsof -t -iTCP:4000 -sTCP:LISTEN 2>/dev/null | head -n 1 || true)
PORT_4001_PID=$(lsof -t -iTCP:4001 -sTCP:LISTEN 2>/dev/null | head -n 1 || true)

inspect_port() {
  local label="$1"
  local port="$2"
  local pid="$3"
  if [ -z "$pid" ]; then
    printf "  %-16s :%s  STOPPED\n" "$label" "$port"
    return
  fi
  local stats ppid cmd mode=""
  stats=$(ps -o rss=,%cpu=,etime= -p "$pid" 2>/dev/null | awk '{printf "%.1f MB  CPU=%s%%  UP=%s", $1/1024, $2, $3}' || true)
  ppid=$(ps -o ppid= -p "$pid" 2>/dev/null | tr -d ' ' || true)
  if [ -n "$ppid" ]; then
    cmd=$(ps -o command= -p "$ppid" 2>/dev/null || true)
    if echo "$cmd" | grep -q -- "--turbopack"; then
      mode=" [turbopack]"
    elif echo "$cmd" | grep -q -- "--webpack"; then
      mode=" [webpack]"
    fi
  fi
  printf "  %-16s :%s  PID=%-6s  %s%s\n" "$label" "$port" "$pid" "${stats:-unknown}" "$mode"
}

inspect_port "mos-lab web" "4000" "$PORT_4000_PID"
inspect_port "mos-lab api" "4001" "$PORT_4001_PID"
inspect_port "WingsApp web" "3000" "$PORT_3000_PID"

if [ -d "$WEB_NEXT_DIR" ]; then
  du -sh "$WEB_NEXT_DIR" "$WEB_NEXT_DIR/cache" 2>/dev/null | sed 's/^/  /' || true
else
  echo "  apps/web/.next: not present"
fi

echo ""
echo "=== 3. Top 10 Memory Consumers (aggregated) ==="
ps -axo rss,comm 2>/dev/null | awk 'NR>1{sum[$2]+=$1; cnt[$2]++} END{for(k in sum) printf "  %8.1f MB  (%3d procs)  %s\n", sum[k]/1024, cnt[k], k}' | sort -rn | head -n 10 || true
CHROME_PROCS=$(pgrep -f "Google Chrome Helper" 2>/dev/null | wc -l | tr -d ' ' || echo "0")
echo "  Google Chrome Helper count: $CHROME_PROCS"

echo ""
echo "=== 4. Quick Recommendations ==="
WARNS=0

SWAP_USED_MB=$(sysctl -n vm.swapusage 2>/dev/null | awk -F'used = ' '{print $2}' | awk '{val=$1; sub(/[MG]/,"",val); if($1 ~ /G/) val=val*1024; printf "%.0f", val}' || echo "0")
if [ "${SWAP_USED_MB:-0}" -gt 2048 ]; then
  echo "  [WARN] Swap used is ${SWAP_USED_MB} MB (> 2048 MB)."
  WARNS=$((WARNS + 1))
fi

if [ -d "$WEB_NEXT_DIR" ]; then
  NEXT_KB=$(du -sk "$WEB_NEXT_DIR" 2>/dev/null | awk '{print $1}' || echo "0")
  if [ "${NEXT_KB:-0}" -gt 1572864 ]; then
    echo "  [WARN] apps/web/.next exceeds 1.5 GB ($((NEXT_KB / 1024)) MB) -> run: pnpm --filter @mos-lab/web clean"
    WARNS=$((WARNS + 1))
  fi
fi

if [ -n "$PORT_4000_PID" ]; then
  WEB_RSS_MB=$(ps -o rss= -p "$PORT_4000_PID" 2>/dev/null | awk '{printf "%.0f", $1/1024}' || echo "0")
  if [ "${WEB_RSS_MB:-0}" -gt 2500 ]; then
    echo "  [WARN] mos-lab next-server (:4000) is using ${WEB_RSS_MB} MB (> 2500 MB) -> restart via ./start-servers.sh"
    WARNS=$((WARNS + 1))
  fi
fi

CHROME_MB=$(ps -axo rss,comm 2>/dev/null | awk '/Google Chrome/{s+=$1} END{printf "%.0f", s/1024}' || echo "0")
if [ "${CHROME_MB:-0}" -gt 6000 ]; then
  echo "  [WARN] Google Chrome total RSS is ${CHROME_MB} MB (> 6000 MB) -> open chrome://restart to reclaim RAM while keeping tabs"
  WARNS=$((WARNS + 1))
fi

if [ -n "$PORT_3000_PID" ]; then
  echo "  [INFO] WingsApp (:3000) is running. If unused, run ./start-servers.sh (default skips :3000)."
fi

if [ "$WARNS" -eq 0 ]; then
  echo "  [OK] Memory, swap, dev servers, and .next cache look healthy."
fi
