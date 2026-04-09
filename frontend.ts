import "./style.css";

interface Memory {
  project: string;
  filename: string;
  name: string;
  description: string;
  type: string;
  content: string;
  evidence: string;
}

interface AuditReport {
  timestamp: string;
  memories: Memory[];
  summary: string;
  findings_count: number;
  _filename?: string;
}

let reports: AuditReport[] = [];

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatTime(ts: string): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

(window as any).toggle = function toggle(idx: number) {
  document.getElementById("memories-" + idx)?.classList.toggle("open");
};

function render() {
  const statsEl = document.getElementById("stats")!;
  const reportsEl = document.getElementById("reports")!;

  const totalMemories = reports.reduce(
    (s, r) => s + (r.memories?.length || 0),
    0
  );
  const projects = new Set(
    reports.flatMap((r) => (r.memories || []).map((m) => m.project))
  );

  statsEl.innerHTML = [
    { value: reports.length, label: "Audits Run", color: "#5bc0de" },
    { value: totalMemories, label: "Memories Created", color: "#f0ad4e" },
    { value: projects.size, label: "Projects Covered", color: "#5cb85c" },
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
      const memoriesHtml = (r.memories || [])
        .map(
          (m) =>
            `<div class="finding">
              <div class="finding-header">
                <span class="finding-cat">${esc(m.project)}</span>
                <span class="badge badge-${m.type === "feedback" ? "warning" : "info"}">${esc(m.type)}</span>
                <span class="finding-summary">${esc(m.name)}</span>
              </div>
              <div class="finding-details">${esc(m.content)}</div>
              ${m.evidence ? `<div style="margin-top:8px;padding-top:8px;border-top:1px solid #2a2a35;font-size:0.75rem;color:#666">Evidence: ${esc(m.evidence)}</div>` : ""}
            </div>`
        )
        .join("");

      const count = r.memories?.length || 0;
      const badge =
        count === 0
          ? '<span class="badge badge-clean">clean</span>'
          : `<span class="badge badge-warning">${count} memories</span>`;

      return `<div class="report">
        <div class="report-header" onclick="toggle(${i})">
          <div>
            <div class="report-time">${formatTime(r.timestamp)}</div>
            <div class="report-summary">${esc(r.summary || "")}</div>
          </div>
          <div class="badges">${badge}</div>
        </div>
        <div class="findings" id="memories-${i}">
          ${memoriesHtml || '<div style="color:#555;padding:8px">No patterns found</div>'}
        </div>
      </div>`;
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
