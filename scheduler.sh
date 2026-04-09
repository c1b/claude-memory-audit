#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
STATE_FILE="$SCRIPT_DIR/state.json"
TRIGGER_FILE="$SCRIPT_DIR/.trigger-run"
INTERVAL_SECONDS=21600  # 6 hours

write_state() {
    local status="$1"
    local next_run="${2:-}"
    local last_run="${3:-}"
    python3 -c "
import json
state = {'status': '$status'}
if '$next_run': state['next_run'] = '$next_run'
if '$last_run': state['last_run'] = '$last_run'
with open('$STATE_FILE', 'w') as f:
    json.dump(state, f)
    f.write('\n')
"
}

echo "=== Claude Memory Audit ==="
echo "Auditing conversations every 6 hours. First run starting now."
echo "Reports: $SCRIPT_DIR/reports/"
echo "PID: $$"
echo ""

while true; do
    write_state "running" "" ""
    bash "$SCRIPT_DIR/run-audit.sh"
    LAST_RUN=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    NEXT_RUN=$(date -u -d "+${INTERVAL_SECONDS} seconds" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v+${INTERVAL_SECONDS}S +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || echo "")
    write_state "waiting" "$NEXT_RUN" "$LAST_RUN"
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Next audit at $NEXT_RUN"

    # Sleep but check for trigger file every 5 seconds
    ELAPSED=0
    while [ "$ELAPSED" -lt "$INTERVAL_SECONDS" ]; do
        if [ -f "$TRIGGER_FILE" ]; then
            rm -f "$TRIGGER_FILE"
            echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Manual trigger detected!"
            break
        fi
        sleep 5
        ELAPSED=$((ELAPSED + 5))
    done
done
