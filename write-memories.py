"""
Reads audit JSON from stdin, writes memory files to the appropriate
project-scoped Claude memory directories, and logs what was written.
"""
import json
import os
import sys

CLAUDE_PROJECTS = os.path.expanduser("~/.claude/projects")
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MEMORY_LOG = os.path.join(SCRIPT_DIR, "memory-log.md")

# Map project short names to their Claude memory directories
PROJECT_MAP = {}
for entry in os.listdir(CLAUDE_PROJECTS):
    entry_path = os.path.join(CLAUDE_PROJECTS, entry)
    if os.path.isdir(entry_path):
        # Extract project name: -home-adminuser-Repos-foo -> foo
        short = entry.replace("-home-adminuser-Repos-", "").replace("-home-adminuser-", "~-").replace("-home-adminuser", "~")
        PROJECT_MAP[short] = entry

data = json.load(sys.stdin)
memories = data.get("memories", [])

if not memories:
    print("No memories to write.")
    sys.exit(0)

log_entries = []

for mem in memories:
    project = mem.get("project", "_global")
    filename = mem.get("filename", "unnamed.md")
    name = mem.get("name", "unnamed")
    description = mem.get("description", "")
    mem_type = mem.get("type", "feedback")
    content = mem.get("content", "")
    evidence = mem.get("evidence", "")

    # Find the right memory directory
    if project == "_global":
        mem_dir = os.path.join(CLAUDE_PROJECTS, "-home-adminuser", "memory")
    else:
        # Try to find matching project directory
        matched = None
        for short, full_dir in PROJECT_MAP.items():
            if project in short or short in project:
                matched = full_dir
                break
        if not matched:
            # Fall back to global
            mem_dir = os.path.join(CLAUDE_PROJECTS, "-home-adminuser", "memory")
            project = "_global (originally: " + project + ")"
        else:
            mem_dir = os.path.join(CLAUDE_PROJECTS, matched, "memory")

    os.makedirs(mem_dir, exist_ok=True)

    # Write the memory file
    filepath = os.path.join(mem_dir, filename)
    with open(filepath, "w") as f:
        f.write(f"---\n")
        f.write(f"name: {name}\n")
        f.write(f"description: {description}\n")
        f.write(f"type: {mem_type}\n")
        f.write(f"---\n\n")
        f.write(content + "\n")

    print(f"Wrote memory: {filepath}")
    log_entries.append(f"- **{name}** ({project}) — {description} [{filename}]")

    # Update the project's MEMORY.md index
    memory_index = os.path.join(mem_dir, "MEMORY.md")
    index_line = f"- [{name}]({filename}) — {description}\n"

    existing = ""
    if os.path.exists(memory_index):
        with open(memory_index) as f:
            existing = f.read()

    # Don't add duplicates
    if filename not in existing:
        with open(memory_index, "a") as f:
            f.write(index_line)
        print(f"Updated index: {memory_index}")

# Append to the audit memory log
with open(MEMORY_LOG, "a") as f:
    from datetime import datetime, timezone
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    f.write(f"\n## {ts}\n")
    for entry in log_entries:
        f.write(entry + "\n")
    f.write(f"\nEvidence summary: {data.get('summary', 'N/A')}\n")

print(f"Wrote {len(memories)} memory file(s).")
