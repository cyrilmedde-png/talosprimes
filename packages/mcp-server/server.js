import express from 'express';
import cors from 'cors';
import pg from 'pg';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';

const { Pool } = pg;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Config
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const PORT = process.env.MCP_PORT || 3100;
const API_TOKEN = process.env.MCP_TOKEN || 'talosprimes-mcp-secret-2026';
const DATABASE_URL = process.env.DATABASE_URL || '';
const N8N_API_URL = process.env.N8N_API_URL || 'http://localhost:5678';
const N8N_API_KEY = process.env.N8N_API_KEY || '';
const PROJECT_DIR = process.env.PROJECT_DIR || '/var/www/talosprimes';

// DB Pool
const pool = DATABASE_URL ? new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } }) : null;

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Auth middleware
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function auth(req, res, next) {
  const token = req.headers['x-mcp-token'] || req.query.token;
  if (token !== API_TOKEN) {
    return res.status(401).json({ error: 'Token invalide' });
  }
  next();
}

app.use('/mcp', auth);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Health check (public)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get('/mcp/health', (req, res) => {
  res.json({ status: 'ok', version: '0.1.0', timestamp: new Date().toISOString() });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. Database query
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.post('/mcp/db/query', async (req, res) => {
  const { query, params } = req.body;
  if (!query) return res.status(400).json({ error: 'query requis' });
  if (!pool) return res.status(500).json({ error: 'DATABASE_URL non configure' });

  // Securite : bloquer les commandes destructives
  const upper = query.toUpperCase().trim();
  if (upper.startsWith('DROP') || upper.startsWith('TRUNCATE') || upper.startsWith('ALTER')) {
    return res.status(403).json({ error: 'Commandes DROP/TRUNCATE/ALTER interdites' });
  }

  try {
    const result = await pool.query(query, params || []);
    res.json({
      success: true,
      rowCount: result.rowCount,
      rows: result.rows,
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. Shell command (safe)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const ALLOWED_COMMANDS = [
  'git status', 'git log', 'git diff', 'git pull',
  'pm2 list', 'pm2 logs', 'pm2 restart',
  'ls', 'cat', 'head', 'tail', 'wc', 'grep',
  'df -h', 'free -m', 'uptime',
  'systemctl status',
  'npm run build',
];

app.post('/mcp/exec', (req, res) => {
  const { command } = req.body;
  if (!command) return res.status(400).json({ error: 'command requis' });

  // Securite : verifier que la commande est autorisee
  const isAllowed = ALLOWED_COMMANDS.some(prefix => command.startsWith(prefix));
  if (!isAllowed) {
    return res.status(403).json({
      error: `Commande non autorisee. Commandes autorisees : ${ALLOWED_COMMANDS.join(', ')}`,
    });
  }

  try {
    const output = execSync(command, {
      cwd: PROJECT_DIR,
      timeout: 30000,
      maxBuffer: 1024 * 1024,
      encoding: 'utf-8',
    });
    res.json({ success: true, output: output.trim() });
  } catch (err) {
    res.json({
      success: false,
      error: err.message,
      output: err.stdout?.trim() || '',
      stderr: err.stderr?.trim() || '',
    });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. PM2 logs
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get('/mcp/pm2/logs', (req, res) => {
  const lines = req.query.lines || '50';
  const app = req.query.app || 'platform';
  try {
    const output = execSync(`pm2 logs ${app} --nostream --lines ${lines}`, {
      timeout: 10000,
      encoding: 'utf-8',
      maxBuffer: 1024 * 1024,
    });
    res.json({ success: true, logs: output.trim() });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. PM2 status
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get('/mcp/pm2/status', (req, res) => {
  try {
    const output = execSync('pm2 jlist', {
      timeout: 10000,
      encoding: 'utf-8',
    });
    const processes = JSON.parse(output);
    const summary = processes.map(p => ({
      name: p.name,
      status: p.pm2_env?.status,
      cpu: p.monit?.cpu,
      memory: Math.round((p.monit?.memory || 0) / 1024 / 1024) + 'MB',
      uptime: p.pm2_env?.pm_uptime ? Math.round((Date.now() - p.pm2_env.pm_uptime) / 1000 / 60) + 'min' : '-',
      restarts: p.pm2_env?.restart_time,
    }));
    res.json({ success: true, processes: summary });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5. n8n workflows
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get('/mcp/n8n/workflows', async (req, res) => {
  try {
    const resp = await fetch(`${N8N_API_URL}/api/v1/workflows?limit=100`, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY },
    });
    const data = await resp.json();
    const workflows = (data.data || data).map(w => ({
      id: w.id,
      name: w.name,
      active: w.active,
      updatedAt: w.updatedAt,
    }));
    res.json({ success: true, count: workflows.length, workflows });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 6. n8n executions (recentes)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get('/mcp/n8n/executions', async (req, res) => {
  const limit = req.query.limit || '10';
  const status = req.query.status || '';
  try {
    let url = `${N8N_API_URL}/api/v1/executions?limit=${limit}`;
    if (status) url += `&status=${status}`;
    const resp = await fetch(url, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY },
    });
    const data = await resp.json();
    const executions = (data.data || data).map(e => ({
      id: e.id,
      workflowName: e.workflowData?.name || e.workflowId,
      status: e.status,
      startedAt: e.startedAt,
      stoppedAt: e.stoppedAt,
      duration: e.stoppedAt && e.startedAt
        ? Math.round((new Date(e.stoppedAt) - new Date(e.startedAt)))  + 'ms'
        : '-',
    }));
    res.json({ success: true, count: executions.length, executions });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 7. File read (safe, project only)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.post('/mcp/file/read', (req, res) => {
  const { path: filePath } = req.body;
  if (!filePath) return res.status(400).json({ error: 'path requis' });

  // Securite : limiter au dossier projet
  const fullPath = filePath.startsWith('/') ? filePath : `${PROJECT_DIR}/${filePath}`;
  if (!fullPath.startsWith(PROJECT_DIR)) {
    return res.status(403).json({ error: 'Acces limite au dossier projet' });
  }

  try {
    const content = readFileSync(fullPath, 'utf-8');
    res.json({ success: true, path: fullPath, content: content.substring(0, 50000) });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 8. Git status
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get('/mcp/git/status', (req, res) => {
  try {
    const status = execSync('git status --short', { cwd: PROJECT_DIR, encoding: 'utf-8' });
    const branch = execSync('git branch --show-current', { cwd: PROJECT_DIR, encoding: 'utf-8' });
    const lastCommit = execSync('git log --oneline -5', { cwd: PROJECT_DIR, encoding: 'utf-8' });
    res.json({
      success: true,
      branch: branch.trim(),
      status: status.trim() || 'Clean',
      lastCommits: lastCommit.trim(),
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 9. System info
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get('/mcp/system/info', (req, res) => {
  try {
    const uptime = execSync('uptime', { encoding: 'utf-8' }).trim();
    const disk = execSync('df -h / | tail -1', { encoding: 'utf-8' }).trim();
    const memory = execSync('free -m | grep Mem', { encoding: 'utf-8' }).trim();
    res.json({ success: true, uptime, disk, memory });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Start
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[MCP Server] TalosPrimes MCP running on port ${PORT}`);
  console.log(`[MCP Server] DB: ${DATABASE_URL ? 'connected' : 'not configured'}`);
  console.log(`[MCP Server] n8n: ${N8N_API_URL}`);
  console.log(`[MCP Server] Project: ${PROJECT_DIR}`);
});
