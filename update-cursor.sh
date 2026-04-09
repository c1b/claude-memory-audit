#!/usr/bin/env bash
# Updates cursor.json with current line counts for all JSONL files
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CURSOR_FILE="$SCRIPT_DIR/cursor.json"
CLAUDE_PROJECTS="$HOME/.claude/projects"

python3 -c "
import json, os, glob

cursor_file = '$CURSOR_FILE'
projects_dir = '$CLAUDE_PROJECTS'

# Load existing cursors
try:
    with open(cursor_file) as f:
        cursors = json.load(f)
except:
    cursors = {}

# Update with current line counts
for root, dirs, files in os.walk(projects_dir):
    for fname in files:
        if fname.endswith('.jsonl'):
            full = os.path.join(root, fname)
            rel = os.path.relpath(full, projects_dir)
            with open(full) as f:
                lines = sum(1 for _ in f)
            cursors[rel] = lines

with open(cursor_file, 'w') as f:
    json.dump(cursors, f, indent=2, sort_keys=True)
    f.write('\n')

print(f'Cursor updated: {len(cursors)} files tracked')
"
