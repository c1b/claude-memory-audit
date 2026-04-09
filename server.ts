import { readdir } from "fs/promises";
import { join } from "path";
import index from "./index.html";

const REPORTS_DIR = join(import.meta.dir, "reports");
const STATE_FILE = join(import.meta.dir, "state.json");
const TRIGGER_FILE = join(import.meta.dir, ".trigger-run");

async function loadReports() {
  try {
    const files = await readdir(REPORTS_DIR);
    const jsonFiles = files.filter((f) => f.endsWith(".json")).sort().reverse();
    const reports = [];
    for (const file of jsonFiles) {
      try {
        const raw = await Bun.file(join(REPORTS_DIR, file)).text();
        const report = JSON.parse(raw);
        report._filename = file;
        reports.push(report);
      } catch {}
    }
    return reports;
  } catch {
    return [];
  }
}

async function loadState() {
  try {
    return JSON.parse(await Bun.file(STATE_FILE).text());
  } catch {
    return { status: "unknown" };
  }
}

Bun.serve({
  port: 3100,
  routes: {
    "/": index,
    "/api/reports": async () => Response.json(await loadReports()),
    "/api/state": async () => Response.json(await loadState()),
    "/api/trigger": {
      POST: async () => {
        await Bun.write(TRIGGER_FILE, new Date().toISOString());
        return Response.json({ triggered: true });
      },
    },
    "/api/reports/:filename": async (req) => {
      const filename = req.params.filename;
      if (!filename.match(/^audit-\d{8}T\d{6}Z\.json$/)) {
        return Response.json({ error: "Invalid filename" }, { status: 400 });
      }
      try {
        const raw = await Bun.file(join(REPORTS_DIR, filename)).text();
        return Response.json(JSON.parse(raw));
      } catch {
        return Response.json({ error: "Not found" }, { status: 404 });
      }
    },
  },
  development: {
    hmr: true,
    console: true,
  },
});

console.log("Claude Memory Audit UI running at http://localhost:3100");
