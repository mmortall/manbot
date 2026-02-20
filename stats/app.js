import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');

const PORT = process.env.PORT || 3001;

const COLORS = {
  primary: '#6366f1',
  secondary: '#a855f7',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  bg: '#0f172a',
  card: 'rgba(30, 41, 59, 0.7)',
  text: '#f8fafc',
  muted: '#94a3b8'
};

const CSS = `
  :root {
    --primary: ${COLORS.primary};
    --secondary: ${COLORS.secondary};
    --success: ${COLORS.success};
    --warning: ${COLORS.warning};
    --error: ${COLORS.error};
    --bg: ${COLORS.bg};
    --card: ${COLORS.card};
    --text: ${COLORS.text};
    --muted: ${COLORS.muted};
  }

  * { box-sizing: border-box; }
  body { 
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; 
    background-color: var(--bg);
    background-image: radial-gradient(circle at 0% 0%, rgba(99, 102, 241, 0.15) 0, transparent 50%),
                      radial-gradient(circle at 100% 100%, rgba(168, 85, 247, 0.15) 0, transparent 50%);
    color: var(--text);
    margin: 0;
    padding: 2rem;
    min-height: 100vh;
    line-height: 1.5;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 3rem;
  }

  h1 {
    font-size: 2.25rem;
    font-weight: 800;
    margin: 0;
    background: linear-gradient(135deg, var(--primary), var(--secondary));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    letter-spacing: -0.025em;
  }

  .btn-refresh {
    background: linear-gradient(135deg, var(--primary), var(--secondary));
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 9999px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
  }

  .btn-refresh:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
    filter: brightness(1.1);
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 1.5rem;
  }

  .card {
    background: var(--card);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 1.25rem;
    padding: 1.5rem;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    transition: transform 0.3s ease;
  }

  .card:hover {
    transform: translateY(-4px);
    border-color: rgba(255, 255, 255, 0.15);
  }

  .card h2 {
    font-size: 1.125rem;
    font-weight: 600;
    margin-top: 0;
    margin-bottom: 1.25rem;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .metric-value {
    font-size: 3rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
  }

  .chart-container {
    height: 240px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 1rem;
    font-size: 0.875rem;
  }

  th {
    text-align: left;
    color: var(--muted);
    font-weight: 500;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  td {
    padding: 0.75rem 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .status-tag {
    padding: 0.25rem 0.625rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .status-tag.success { background: rgba(16, 185, 129, 0.1); color: var(--success); }
  .status-tag.error { background: rgba(239, 68, 68, 0.1); color: var(--error); }
  .status-tag.warning { background: rgba(245, 158, 11, 0.1); color: var(--warning); }

  .log-entry {
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 0.8125rem;
  }

  @media (max-width: 640px) {
    body { padding: 1rem; }
    h1 { font-size: 1.75rem; }
  }
`;

function generateDonutChart(data, size = 200) {
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  if (total === 0) return `<svg viewBox="0 0 ${size} ${size}"><text x="50%" y="50%" text-anchor="middle" fill="${COLORS.muted}">No Data</text></svg>`;
  const center = size / 2;
  const radius = size * 0.38;
  const strokeWidth = size * 0.12;
  const circumference = 2 * Math.PI * radius;
  let currentOffset = 0;
  const sliceColors = { 'completed': COLORS.success, 'failed': COLORS.error, 'pending': COLORS.warning };
  const slices = Object.entries(data).map(([label, value]) => {
    const percentage = value / total;
    const dashArray = (percentage * circumference) + ' ' + circumference;
    const dashOffset = -currentOffset;
    currentOffset += percentage * circumference;
    return `<circle cx="${center}" cy="${center}" r="${radius}" fill="transparent" stroke="${sliceColors[label] || COLORS.primary}" stroke-width="${strokeWidth}" stroke-dasharray="${dashArray}" stroke-dashoffset="${dashOffset}" transform="rotate(-90 ${center} ${center})"></circle>`;
  }).join('');
  return `<svg viewBox="0 0 ${size} ${size}">${slices}<text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="white" font-size="${size * 0.18}" font-weight="800">${total}</text></svg>`;
}

function generateBarChart(labels, values, width = 400, height = 240) {
  const max = Math.max(...values, 1);
  const bars = labels.map((label, i) => {
    const bHeight = (values[i] / max) * height * 0.7;
    const x = i * (width / labels.length) + 10;
    return `<rect x="${x}" y="${height - bHeight - 30}" width="40" height="${bHeight}" fill="${COLORS.primary}" rx="4"></rect>`;
  }).join('');
  return `<svg viewBox="0 0 ${width} ${height}">${bars}</svg>`;
}

function getTableCount(dbPath, table) {
  try {
    const fullPath = path.join(ROOT_DIR, dbPath);
    if (!fs.existsSync(fullPath)) return 0;
    const db = new Database(fullPath, { readonly: true });
    const row = db.prepare('SELECT count(*) as count FROM ' + table).get();
    db.close();
    return row.count;
  } catch (e) { return 0; }
}

function getTaskStats() {
  try {
    const dbPath = path.join(ROOT_DIR, 'data/tasks.sqlite');
    if (!fs.existsSync(dbPath)) return {};
    const db = new Database(dbPath, { readonly: true });
    const rows = db.prepare('SELECT status, count(*) as count FROM tasks GROUP BY status').all();
    db.close();
    return rows.reduce((acc, row) => ({ ...acc, [row.status]: row.count }), {});
  } catch (e) { return {}; }
}

function getLatestLogs(n = 20) {
  try {
    const logPath = path.join(ROOT_DIR, 'logs/events.log');
    if (!fs.existsSync(logPath)) return [];
    const content = fs.readFileSync(logPath, 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);
    return lines.slice(-n).map(line => {
      try { return JSON.parse(line); } catch (e) { return { message: line }; }
    }).reverse();
  } catch (e) { return []; }
}

const server = http.createServer((req, res) => {
  if (req.url === '/api/stats') {
    const tasks = getTaskStats();
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      tasks,
      ragDocuments: getTableCount('data/rag.sqlite', 'rag_documents'),
      activeCron: getTableCount('data/cron.sqlite', 'cron_schedules'),
      latestLogs: getLatestLogs(12),
      charts: {
        taskDonut: generateDonutChart(tasks),
        complexityBar: generateBarChart(['Low', 'Med', 'High'], [45, 82, 19])
      }
    }));
    return;
  }

  res.setHeader('Content-Type', 'text/html');
  res.end('<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>ManBot Dashboard</title><style>' + CSS + '</style></head><body>' +
    '<header><h1>ManBot Dashboard</h1><button class="btn-refresh" onclick="location.reload()">Refresh Data</button></header>' +
    '<div class="grid"><div class="card"><h2>Tasks</h2><div id="donut-chart" class="chart-container"></div></div>' +
    '<div class="card"><h2>Complexity</h2><div id="bar-chart" class="chart-container"></div></div>' +
    '<div class="card"><h2>System</h2><div style="display:flex;flex-direction:column;gap:1rem;">' +
    '<div><div style="color:var(--muted);font-size:0.875rem;">RAG Documents</div><div class="metric-value" id="rag-count">0</div></div>' +
    '<div><div style="color:var(--muted);font-size:0.875rem;">Active Jobs</div><div class="metric-value" id="cron-count" style="color:var(--secondary);">0</div></div></div></div></div>' +
    '<div class="card" style="margin-top:1.5rem;overflow-x:auto;"><h2>Recent Events</h2><table><thead><tr><th>Time</th><th>Type</th><th>Details</th></tr></thead><tbody id="logs-table"></tbody></table></div>' +
    '<script>fetch("/api/stats").then(r=>r.json()).then(data=>{' +
    'document.getElementById("donut-chart").innerHTML=data.charts.taskDonut;' +
    'document.getElementById("bar-chart").innerHTML=data.charts.complexityBar;' +
    'document.getElementById("rag-count").textContent=data.ragDocuments;' +
    'document.getElementById("cron-count").textContent=data.activeCron;' +
    'const table=document.getElementById("logs-table");' +
    'table.innerHTML=data.latestLogs.map(log=>"<tr><td>"+new Date(log.time||Date.now()).toLocaleTimeString()+"</td><td>"+(log.type||"EVENT").split(".").pop()+"</td><td style=\'color:var(--muted)\'>"+(log.payload?.toolName||log.message||"-")+"</td></tr>").join("");' +
    '});</script></body></html>');
});

server.listen(PORT, () => {
  console.log('Dashboard running at http://localhost:' + PORT);
});
