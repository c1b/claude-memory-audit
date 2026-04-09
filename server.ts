import { readdir } from "fs/promises";
import { join } from "path";
import index from "./index.html";

const REPORTS_DIR = join(import.meta.dir, "reports");

interface Finding {
  category: string;
  severity: string;
  summary: string;
  details: string;
}

interface AuditReport {
  timestamp: string;
  findings: Finding[];
  summary: string;
  _filename?: string;
}

async function loadReports(): Promise<AuditReport[]> {
  try {
    const files = await readdir(REPORTS_DIR);
    const jsonFiles = files.filter((f) => f.endsWith(".json")).sort().reverse();
    const reports: AuditReport[] = [];
    for (const file of jsonFiles) {
      try {
        const raw = await Bun.file(join(REPORTS_DIR, file)).text();
        const report = JSON.parse(raw) as AuditReport;
        report._filename = file;
        reports.push(report);
      } catch {}
    }
    return reports;
  } catch {
    return [];
  }
}

Bun.serve({
  port: 3100,
  routes: {
    "/": index,
    "/api/reports": async () => {
      const reports = await loadReports();
      return Response.json(reports);
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

console.log("VM Audit Monitor UI running at http://localhost:3100");
