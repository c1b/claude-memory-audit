# VM Audit Monitor

Automated VM state auditing using Claude. Runs every 6 hours, detects changes to non-git-tracked files, uncommitted work, new packages/processes/ports, and config changes. Results shown in a local web UI.

## Usage

```bash
# Start everything (UI + audit loop)
./start.sh

# Or run individually:
bun run server.ts          # UI on http://localhost:3100
bash scheduler.sh          # Audit loop (every 6h)
bash run-audit.sh          # Single audit run
```

## Architecture

- `run-audit.sh` — Invokes Claude with the audit prompt, saves JSON report
- `scheduler.sh` — Loops `run-audit.sh` every 6 hours
- `server.ts` — Bun.serve() web server serving the dashboard UI and report API
- `audit-prompt.md` — The prompt sent to Claude for each audit
- `reports/` — JSON audit reports (gitignored)
