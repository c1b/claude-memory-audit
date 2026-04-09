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

interface SchedulerState {
  status: string;
  next_run?: string;
  last_run?: string;
}

let reports: AuditReport[] = [];
let state: SchedulerState = { status: "unknown" };

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

function timeAgo(ts: string): string {
  try {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ${mins % 60}m ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return "";
  }
}

function formatCountdown(target: string): string {
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) return "due now";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

(window as any).toggle = function (idx: number) {
  document.getElementById("memories-" + idx)?.classList.toggle("open");
};

(window as any).triggerRun = async function () {
  const btn = document.getElementById("run-btn") as HTMLButtonElement;
  btn.disabled = true;
  btn.textContent = "Triggering...";
  try {
    await fetch("/api/trigger", { method: "POST" });
    btn.textContent = "Triggered!";
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = "Run Now";
      loadState();
    }, 3000);
  } catch {
    btn.textContent = "Error";
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = "Run Now";
    }, 2000);
  }
};

function renderScheduler() {
  const dot = document.getElementById("status-dot")!;
  const text = document.getElementById("status-text")!;
  const countdown = document.getElementById("countdown")!;
  const btn = document.getElementById("run-btn") as HTMLButtonElement;

  dot.className = "status-dot " + state.status;

  if (state.status === "running") {
    text.innerHTML = "<strong>Audit in progress</strong>";
    countdown.textContent = "";
    btn.disabled = true;
    btn.textContent = "Running...";
  } else if (state.status === "waiting" && state.next_run) {
    const lastPart = state.last_run
      ? ` &middot; Last run ${timeAgo(state.last_run)}`
      : "";
    text.innerHTML = `<strong>Waiting</strong>${lastPart}`;
    countdown.textContent = formatCountdown(state.next_run);
    btn.disabled = false;
    btn.textContent = "Run Now";
  } else {
    text.innerHTML = "<strong>Scheduler starting...</strong>";
    countdown.textContent = "";
  }
}

function renderStats() {
  const statsEl = document.getElementById("stats")!;
  const totalMemories = reports.reduce(
    (s, r) => s + (r.memories?.length || 0),
    0
  );
  const projects = new Set(
    reports.flatMap((r) => (r.memories || []).map((m) => m.project))
  );
  const lastRun = reports[0]?.timestamp;
  const conversationsAudited = reports.length;

  statsEl.innerHTML = [
    { value: conversationsAudited, label: "Audits", color: "#60a5fa" },
    { value: totalMemories, label: "Memories", color: "#fbbf24" },
    { value: projects.size, label: "Projects", color: "#4ade80" },
    {
      value: lastRun ? timeAgo(lastRun) : "never",
      label: "Last Audit",
      color: "#a78bfa",
      small: true,
    },
  ]
    .map(
      (s) =>
        `<div class="stat"><div class="stat-value" style="color:${s.color};${(s as any).small ? "font-size:1.1rem" : ""}">${s.value}</div><div class="stat-label">${s.label}</div></div>`
    )
    .join("");
}

function renderReports() {
  const reportsEl = document.getElementById("reports")!;

  if (reports.length === 0) {
    reportsEl.innerHTML =
      '<div class="empty"><div class="empty-text">No audit reports yet. The first audit will run shortly.</div></div>';
    return;
  }

  reportsEl.innerHTML = reports
    .map((r, i) => {
      const memoriesHtml = (r.memories || [])
        .map(
          (m) =>
            `<div class="memory-card">
              <div class="memory-header">
                <span class="memory-project">${esc(m.project)}</span>
                <span class="badge badge-${m.type}">${esc(m.type)}</span>
                <span class="memory-name">${esc(m.name)}</span>
              </div>
              <div class="memory-content">${esc(m.content)}</div>
              ${m.evidence ? `<div class="memory-evidence">Evidence: ${esc(m.evidence)}</div>` : ""}
            </div>`
        )
        .join("");

      const count = r.memories?.length || 0;
      const badge =
        count === 0
          ? '<span class="badge badge-clean">clean</span>'
          : `<span class="badge badge-warning">${count} memor${count === 1 ? "y" : "ies"}</span>`;

      return `<div class="report">
        <div class="report-header" onclick="toggle(${i})">
          <div>
            <div class="report-time">${formatTime(r.timestamp)}<span class="report-ago">${timeAgo(r.timestamp)}</span></div>
            <div class="report-summary">${esc(r.summary || "")}</div>
          </div>
          <div class="badges">${badge}</div>
        </div>
        <div class="memories-panel" id="memories-${i}">
          ${memoriesHtml || '<div style="color:#3a3a48;padding:8px">No patterns found in this batch.</div>'}
        </div>
      </div>`;
    })
    .join("");
}

async function load() {
  try {
    const [reportsRes, stateRes] = await Promise.all([
      fetch("/api/reports"),
      fetch("/api/state"),
    ]);
    reports = await reportsRes.json();
    state = await stateRes.json();
    renderStats();
    renderReports();
    renderScheduler();
  } catch (e) {
    console.error(e);
  }
}

async function loadState() {
  try {
    state = await (await fetch("/api/state")).json();
    renderScheduler();
  } catch {}
}

(window as any).load = load;

load();
// Full refresh every 30s
setInterval(load, 30000);
// Countdown tick every second
setInterval(() => {
  if (state.status === "waiting" && state.next_run) {
    document.getElementById("countdown")!.textContent = formatCountdown(
      state.next_run
    );
  }
}, 1000);
// Poll state more frequently to catch running->waiting transitions
setInterval(loadState, 5000);
