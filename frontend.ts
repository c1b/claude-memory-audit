import "./style.css";

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

let reports: AuditReport[] = [];

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function severityBadge(findings: Finding[]): string {
  if (!findings || findings.length === 0)
    return '<span class="badge badge-clean">clean</span>';
  if (findings.some((f) => f.severity === "critical"))
    return '<span class="badge badge-critical">critical</span>';
  if (findings.some((f) => f.severity === "warning"))
    return '<span class="badge badge-warning">warning</span>';
  return '<span class="badge badge-info">info</span>';
}

function formatTime(ts: string): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

(window as any).toggle = function toggle(idx: number) {
  document.getElementById("findings-" + idx)?.classList.toggle("open");
};

function render() {
  const statsEl = document.getElementById("stats")!;
  const reportsEl = document.getElementById("reports")!;

  const totalFindings = reports.reduce(
    (s, r) => s + (r.findings?.length || 0),
    0
  );
  const criticals = reports.reduce(
    (s, r) =>
      s + (r.findings?.filter((f) => f.severity === "critical").length || 0),
    0
  );
  const warnings = reports.reduce(
    (s, r) =>
      s + (r.findings?.filter((f) => f.severity === "warning").length || 0),
    0
  );

  statsEl.innerHTML = [
    { value: reports.length, label: "Total Audits", color: "#5bc0de" },
    { value: totalFindings, label: "Total Findings", color: "#f0ad4e" },
    { value: criticals, label: "Critical", color: "#d9534f" },
    { value: warnings, label: "Warnings", color: "#f0ad4e" },
  ]
    .map(
      (s) =>
        `<div class="stat"><div class="stat-value" style="color:${s.color}">${s.value}</div><div class="stat-label">${s.label}</div></div>`
    )
    .join("");

  if (reports.length === 0) {
    reportsEl.innerHTML =
      '<div class="empty">No audit reports yet. First audit is running...</div>';
    return;
  }

  reportsEl.innerHTML = reports
    .map((r, i) => {
      const findingsHtml = (r.findings || [])
        .map(
          (f) =>
            `<div class="finding"><div class="finding-header"><span class="finding-cat">${esc(f.category)}</span><span class="badge badge-${f.severity}">${esc(f.severity)}</span><span class="finding-summary">${esc(f.summary || "")}</span></div>${f.details ? `<div class="finding-details">${esc(f.details)}</div>` : ""}</div>`
        )
        .join("");

      return `<div class="report"><div class="report-header" onclick="toggle(${i})"><div><div class="report-time">${formatTime(r.timestamp)}</div><div class="report-summary">${esc(r.summary || "")}</div></div><div class="badges">${severityBadge(r.findings)} <span style="color:#555;font-size:0.8rem">${r.findings?.length || 0} findings</span></div></div><div class="findings" id="findings-${i}">${findingsHtml || '<div style="color:#555;padding:8px">No findings</div>'}</div></div>`;
    })
    .join("");
}

async function load() {
  try {
    const res = await fetch("/api/reports");
    reports = await res.json();
    render();
  } catch (e) {
    console.error(e);
  }
}

(window as any).load = load;

load();
setInterval(load, 60000);
