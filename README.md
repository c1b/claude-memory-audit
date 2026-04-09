# Claude Memory Audit

Audits Claude Code conversation history to find repeated errors and anti-patterns, then writes project-scoped memory files so future sessions don't repeat the same mistakes.

Runs every 6 hours, processes only unseen conversations (cursor-tracked), and git-commits all memory file changes.

## Usage

```bash
./start.sh                # Start UI + audit loop in tmux
bash run-audit.sh          # Single audit run
bun run server.ts          # UI only on http://localhost:3100
```

## How it works

1. `extract-unseen.sh` reads `~/.claude/projects/` JSONL logs, skipping already-processed lines (tracked in `cursor.json`)
2. Unseen conversation chunks are fed to Claude via `run-audit.sh` with the analysis prompt
3. Claude identifies repeated failures, recurring errors, and anti-patterns
4. `write-memories.py` writes memory files to the correct project's `~/.claude/projects/<project>/memory/` directory
5. Changes are git-committed with an audit summary
6. Results are displayed in the web dashboard

## Files

- `audit-prompt.md` — Prompt instructing Claude what patterns to look for
- `run-audit.sh` — Orchestrates: extract -> analyze -> write memories -> commit
- `extract-unseen.sh` — Reads JSONL logs, outputs only unprocessed lines
- `update-cursor.sh` — Marks all current JSONL lines as processed
- `write-memories.py` — Parses audit JSON, writes memory files to project dirs
- `cursor.json` — Tracks last-processed line per conversation file (git-tracked)
- `memory-log.md` — Append-only log of all memories created (git-tracked)
- `reports/` — JSON audit reports (gitignored)
- `server.ts` / `frontend.ts` — Dashboard UI
