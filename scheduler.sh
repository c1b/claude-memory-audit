#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INTERVAL_SECONDS=21600  # 6 hours

echo "=== VM Audit Monitor ==="
echo "Running audit every 6 hours. First run starting now."
echo "Reports stored in: $SCRIPT_DIR/reports/"
echo "PID: $$"
echo ""

while true; do
    bash "$SCRIPT_DIR/run-audit.sh"
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Next audit in 6 hours."
    sleep "$INTERVAL_SECONDS"
done
