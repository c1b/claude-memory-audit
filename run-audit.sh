#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPORTS_DIR="$SCRIPT_DIR/reports"
mkdir -p "$REPORTS_DIR"

TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
OUTFILE="$REPORTS_DIR/audit-${TIMESTAMP}.json"
PROMPT=$(cat "$SCRIPT_DIR/audit-prompt.md")

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Running VM audit..."

# Run claude with the audit prompt, capture output
RAW=$(claude --output-format text -p "$PROMPT" 2>/dev/null || true)

# Try to extract JSON from the response (claude may wrap it)
JSON=$(echo "$RAW" | python3 -c "
import sys, json, re
text = sys.stdin.read()
# Try to find JSON object in the text
match = re.search(r'\{[\s\S]*\}', text)
if match:
    obj = json.loads(match.group())
    print(json.dumps(obj, indent=2))
else:
    print(json.dumps({
        'timestamp': '$(date -u +%Y-%m-%dT%H:%M:%SZ)',
        'findings': [{'category': 'error', 'severity': 'warning', 'summary': 'Could not parse audit output', 'details': text[:500]}],
        'summary': 'Audit ran but output could not be parsed as JSON.'
    }, indent=2))
" 2>/dev/null || echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"findings\":[],\"summary\":\"Audit script error\"}")

echo "$JSON" > "$OUTFILE"
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Audit saved to $OUTFILE"
