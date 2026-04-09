#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SESSION="claude-audit"

# Kill existing session if present
tmux kill-session -t "$SESSION" 2>/dev/null || true

# Create tmux session with the UI server
tmux new-session -d -s "$SESSION"
tmux send-keys -t "$SESSION" "cd $SCRIPT_DIR && bun run server.ts" Enter

# Add the audit scheduler in a second pane
sleep 1
tmux split-window -t "$SESSION" -v
tmux send-keys -t "$SESSION" "cd $SCRIPT_DIR && bash scheduler.sh" Enter

echo "Claude Memory Audit started in tmux session '$SESSION'"
echo "  UI:        http://localhost:3100"
echo "  Attach:    tmux attach -t $SESSION"
