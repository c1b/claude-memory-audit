#!/usr/bin/env bash
# Reads all Claude conversation JSONL files, skips lines already processed (per cursor.json),
# and outputs unseen lines with project context headers.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CURSOR_FILE="$SCRIPT_DIR/cursor.json"
CLAUDE_PROJECTS="$HOME/.claude/projects"

# Initialize cursor if missing
if [ ! -f "$CURSOR_FILE" ]; then
    echo '{}' > "$CURSOR_FILE"
fi

# Find all conversation JSONL files
find "$CLAUDE_PROJECTS" -name "*.jsonl" -type f 2>/dev/null | sort | while read -r jsonl; do
    # Get the relative path as key
    REL=$(realpath --relative-to="$CLAUDE_PROJECTS" "$jsonl")

    # Get current line count
    TOTAL=$(wc -l < "$jsonl")

    # Get cursor position (last processed line)
    CURSOR=$(python3 -c "
import json
with open('$CURSOR_FILE') as f:
    cursors = json.load(f)
print(cursors.get('$REL', 0))
" 2>/dev/null || echo 0)

    # Skip if no new lines
    if [ "$TOTAL" -le "$CURSOR" ]; then
        continue
    fi

    # Extract project name from path
    PROJECT_DIR=$(echo "$REL" | cut -d'/' -f1 | sed 's/^-home-adminuser-Repos-//' | sed 's/^-home-adminuser-/~\//' | sed 's/^-home-adminuser$/~/')

    # Output header and unseen lines
    SKIP=$((CURSOR))
    NEW_LINES=$((TOTAL - CURSOR))
    echo "=== PROJECT: $PROJECT_DIR | FILE: $REL | LINES: $((CURSOR+1))-$TOTAL ==="
    tail -n +"$((SKIP + 1))" "$jsonl" | head -n "$NEW_LINES"
done
