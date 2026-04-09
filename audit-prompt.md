Review this VM for changes to state or non-git-tracked files since the last audit. Check:

1. Recently modified files (last 6 hours) outside git repos:
   find /home/adminuser -maxdepth 3 -mmin -360 -not -path '*/.git/*' -not -path '*/node_modules/*' -not -path '*/.venv/*' -not -path '*/__pycache__/*' -not -path '*/vm-audit-monitor/*' -type f 2>/dev/null

2. Uncommitted changes in all git repos under ~/Repos and ~/openclaw

3. New or removed packages (check bash_history tail for apt/pip/npm/bun install)

4. New processes or services (ps aux --sort=-start_time | head -20)

5. Any new listening ports (ss -tlnp)

6. Changes to shell config files (.bashrc, .profile, .zshrc)

7. Changes to ~/.azure/, ~/.codex/, ~/.claude/ config files

8. New or modified files in /tmp

Output your findings as JSON with this exact structure (no markdown, no code fences, just raw JSON):

{
  "timestamp": "<ISO 8601>",
  "findings": [
    {
      "category": "<files|git|packages|processes|ports|config|tmp>",
      "severity": "<info|warning|critical>",
      "summary": "<one line>",
      "details": "<details>"
    }
  ],
  "summary": "<one paragraph overview>"
}

If nothing noteworthy changed, return an empty findings array with a summary saying so.
