#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SESSION="vm-audit"

# Kill existing session if present
tmux kill-session -t "$SESSION" 2>/dev/null || true

# Create tmux session with the UI server
tmux new-session -d -s "$SESSION" -n ui -c "$SCRIPT_DIR" "bun run server.ts"

# Add the audit scheduler in a second pane
tmux split-window -t "$SESSION:ui" -v -c "$SCRIPT_DIR" "bash scheduler.sh"

echo "VM Audit Monitor started in tmux session '$SESSION'"
echo "  UI:        http://localhost:3100"
echo "  Attach:    tmux attach -t $SESSION"
