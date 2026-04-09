#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPORTS_DIR="$SCRIPT_DIR/reports"
CURSOR_FILE="$SCRIPT_DIR/cursor.json"
CLAUDE_PROJECTS="$HOME/.claude/projects"
MEMORY_BASE="$HOME/.claude/projects"

mkdir -p "$REPORTS_DIR"

TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
OUTFILE="$REPORTS_DIR/audit-${TIMESTAMP}.json"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Running conversation audit..."

# Step 1: Extract unseen conversation lines
UNSEEN=$("$SCRIPT_DIR/extract-unseen.sh")
UNSEEN_LINES=$(echo "$UNSEEN" | wc -l)

if [ -z "$UNSEEN" ] || [ "$UNSEEN_LINES" -lt 5 ]; then
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] No significant new conversations to audit."
    echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"memories\":[],\"summary\":\"No new conversations to audit.\",\"findings_count\":0}" > "$OUTFILE"
    exit 0
fi

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Found $UNSEEN_LINES unseen conversation lines across projects."

# Step 2: Build the prompt with conversation data appended
PROMPT=$(cat "$SCRIPT_DIR/audit-prompt.md")
FULL_PROMPT="$PROMPT

--- BEGIN CONVERSATION HISTORY ---
$UNSEEN
--- END CONVERSATION HISTORY ---"

# Step 3: Run claude to analyze (use home dir as cwd so it has broad file access)
RAW=$(cd "$HOME" && claude --output-format text -p "$FULL_PROMPT" 2>/dev/null || true)

# Step 4: Parse JSON response
JSON=$(echo "$RAW" | python3 -c "
import sys, json, re
text = sys.stdin.read()
match = re.search(r'\{[\s\S]*\}', text)
if match:
    obj = json.loads(match.group())
    print(json.dumps(obj, indent=2))
else:
    print(json.dumps({
        'timestamp': '$(date -u +%Y-%m-%dT%H:%M:%SZ)',
        'memories': [],
        'summary': 'Audit ran but output could not be parsed. Raw: ' + text[:300],
        'findings_count': 0
    }, indent=2))
" 2>/dev/null || echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"memories\":[],\"summary\":\"JSON parse error\",\"findings_count\":0}")

echo "$JSON" > "$OUTFILE"

# Step 5: Write memory files from the audit results
MEMORIES_WRITTEN=$(echo "$JSON" | python3 "$SCRIPT_DIR/write-memories.py" 2>&1) || true
echo "$MEMORIES_WRITTEN"

# Step 6: Update cursor to mark these conversations as processed
"$SCRIPT_DIR/update-cursor.sh"

# Step 7: Git-commit any new memory files
cd "$SCRIPT_DIR"
CHANGED=$(git status --porcelain 2>/dev/null | grep -E '^\?\?|^ M|^A ' | grep -v 'reports/' || true)
if [ -n "$CHANGED" ]; then
    git add cursor.json memory-log.md 2>/dev/null || true
    # Check if there are memory files that were written to project dirs
    if echo "$MEMORIES_WRITTEN" | grep -q "Wrote memory:"; then
        echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] New memories written. Recording in audit log."
    fi
    git add -A
    git commit -m "audit: $(date -u +%Y-%m-%dT%H:%M:%SZ) — $(echo "$JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'{d.get(\"findings_count\",0)} findings')" 2>/dev/null || echo 'update')" 2>/dev/null || true
fi

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Audit complete. Report: $OUTFILE"
