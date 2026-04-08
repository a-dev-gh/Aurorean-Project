import express from 'express';
import cors from 'cors';
import { execFileSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
const app = express();
const PORT = 3001;

// Claude CLI path
const CLAUDE_PATH = path.resolve('C:/Users/elchi/AppData/Roaming/Claude/claude-code/2.1.87/claude.exe');

// Safe CWD (no special chars) — use home dir
const CLAUDE_CWD = process.env.USERPROFILE || path.dirname(CLAUDE_PATH);

// Session tracking — maps "rosterId_agentId" to sessionId for --continue
const sessionMap = new Map();

// Verify CLI at startup
try {
  const ver = execFileSync(CLAUDE_PATH, ['--version'], {
    encoding: 'utf-8', timeout: 10000, windowsHide: true, cwd: CLAUDE_CWD,
  }).trim();
  console.log(`  Claude CLI: ${CLAUDE_PATH} (${ver})`);
} catch (err) {
  console.error(`  WARNING: Claude CLI not reachable at ${CLAUDE_PATH}`);
}

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// ═══════════════════════════════════════════════════
// SECURITY — Rate limiting + input validation
// ═══════════════════════════════════════════════════

const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000;
const RATE_LIMIT_MAX = 20;

function rateLimit(req, res, next) {
  const ip = req.ip || 'local';
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, reset: now + RATE_LIMIT_WINDOW };
  if (now > entry.reset) { entry.count = 0; entry.reset = now + RATE_LIMIT_WINDOW; }
  entry.count++;
  rateLimitMap.set(ip, entry);
  if (entry.count > RATE_LIMIT_MAX) return res.status(429).json({ error: 'Rate limit exceeded.' });
  next();
}

function validateInput(req, res, next) {
  const { messages, systemPrompt } = req.body;
  if (messages && messages.length > 50000) return res.status(400).json({ error: 'Message too long' });
  if (systemPrompt && systemPrompt.length > 10000) return res.status(400).json({ error: 'System prompt too long' });
  next();
}

// ═══════════════════════════════════════════════════
// CHAT — Send message to Claude agent with tools + sessions
// ═══════════════════════════════════════════════════

app.post('/api/chat', rateLimit, validateInput, async (req, res) => {
  const { systemPrompt, messages, model, projectFolder, enableTools, allowedTools, sessionKey } = req.body;

  if (!messages) return res.status(400).json({ error: 'messages is required' });

  const lastMessage = messages.split('\n').filter(l => l.trim()).pop() || messages;

  // Bake system prompt into message (avoids CLI escaping issues)
  const fullPrompt = systemPrompt
    ? `You are: ${systemPrompt.replace(/\n/g, ' ')}\n\nUser message: ${lastMessage}`
    : lastMessage;

  const args = ['--print', '--output-format', 'json'];

  // Model selection
  if (model && model !== 'auto') args.push('--model', model);

  // Session persistence: continue previous conversation if we have a session
  const existingSession = sessionKey ? sessionMap.get(sessionKey) : null;
  if (existingSession) {
    args.push('--resume', existingSession);
  }

  // Tool access: each tool as separate --allowedTools arg
  if (enableTools) {
    const toolList = (allowedTools || 'Bash Read Write Edit Glob Grep').split(/[,\s]+/).filter(Boolean);
    toolList.forEach(t => args.push('--allowedTools', t.trim()));
    // Bypass CWD path restrictions so tools can access project files
    args.push('--permission-mode', 'bypassPermissions');
  }

  // Include project folder path in the prompt so Claude uses the right paths
  const projectContext = projectFolder
    ? `\n\nProject directory: ${projectFolder.replace(/\\/g, '/')} — use absolute paths when reading or writing files.`
    : '';

  args.push('--', fullPrompt + projectContext);

  console.log(`[chat] Request (model: ${model || 'auto'}, session: ${existingSession ? 'continue' : 'new'}, tools: ${enableTools ? 'yes' : 'no'})`);
  console.log(`[chat] Prompt: ${lastMessage.substring(0, 80)}`);

  try {
    const raw = execFileSync(CLAUDE_PATH, args, {
      timeout: 120000,
      maxBuffer: 2 * 1024 * 1024,
      windowsHide: true,
      encoding: 'utf-8',
      cwd: CLAUDE_CWD,
    }).trim();

    // Parse JSON response from claude
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Fallback: treat as plain text (happens if --output-format json isn't supported)
      console.log(`[chat] Response (plain text, ${raw.length} chars)`);
      return res.json({ response: raw, usage: null, sessionId: null });
    }

    const response = parsed.result || raw;
    const sessionId = parsed.session_id || null;
    const usage = {
      inputTokens: parsed.usage?.input_tokens || 0,
      outputTokens: parsed.usage?.output_tokens || 0,
      cacheReadTokens: parsed.usage?.cache_read_input_tokens || 0,
      durationMs: parsed.duration_ms || 0,
      totalCost: parsed.total_cost_usd || 0,
      numTurns: parsed.num_turns || 1,
    };

    // Save session ID for --continue on next message
    if (sessionKey && sessionId) {
      sessionMap.set(sessionKey, sessionId);
    }

    console.log(`[chat] Response (${response.length} chars, ${usage.outputTokens} out tokens, session: ${sessionId?.slice(0, 8) || 'none'})`);

    res.json({ response, usage, sessionId });
  } catch (err) {
    console.error('[chat] Error:', err.message?.substring(0, 200));
    res.status(500).json({ error: err.stderr || err.message || 'Claude CLI error' });
  }
});

// ═══════════════════════════════════════════════════
// SESSION MANAGEMENT
// ═══════════════════════════════════════════════════

app.post('/api/sessions/clear', (req, res) => {
  const { sessionKey } = req.body;
  if (sessionKey) {
    sessionMap.delete(sessionKey);
    res.json({ cleared: sessionKey });
  } else {
    sessionMap.clear();
    res.json({ cleared: 'all' });
  }
});

app.get('/api/sessions', (req, res) => {
  const sessions = {};
  sessionMap.forEach((v, k) => { sessions[k] = v; });
  res.json({ sessions, count: sessionMap.size });
});

// ═══════════════════════════════════════════════════
// GEMINI — Proxy to avoid API key exposure in browser
// ═══════════════════════════════════════════════════

app.post('/api/gemini', rateLimit, validateInput, async (req, res) => {
  const { systemPrompt, messages, model, apiKey } = req.body;

  if (!apiKey) return res.status(400).json({ error: 'Gemini API key required' });
  if (!messages) return res.status(400).json({ error: 'messages required' });

  const modelId = model && model !== 'auto' ? model : 'gemini-2.0-flash';

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
          contents: messages,
        }),
      }
    );

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      return res.status(geminiRes.status).json({ error: `Gemini: ${err.substring(0, 200)}` });
    }

    const data = await geminiRes.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
    res.json({ response: text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════
// FILES — Save/load chat logs and suggestions
// ═══════════════════════════════════════════════════

app.post('/api/files/save-chat', async (req, res) => {
  const { projectFolder, agentName, rosterName, conversation } = req.body;
  if (!projectFolder || !conversation) return res.status(400).json({ error: 'projectFolder and conversation required' });

  try {
    const safeName = (agentName || 'unknown').replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
    const safeRoster = (rosterName || 'default').replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const dir = path.join(projectFolder, 'agentic-chat', 'chat-logs', safeRoster);
    await fs.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, `${safeName}-${timestamp}.json`);
    await fs.writeFile(filePath, JSON.stringify({ agent: agentName, roster: rosterName, savedAt: new Date().toISOString(), messages: conversation }, null, 2));
    console.log(`[files] Chat saved: ${filePath}`);
    res.json({ path: filePath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/files/save-suggestion', async (req, res) => {
  const { projectFolder, agentName, title, content } = req.body;
  if (!projectFolder || !content) return res.status(400).json({ error: 'projectFolder and content required' });

  try {
    const safeName = (agentName || 'agent').replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
    const safeTitle = (title || 'suggestion').replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
    const dir = path.join(projectFolder, 'agentic-chat', 'suggestions');
    await fs.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, `${safeName}-${safeTitle}.md`);
    await fs.writeFile(filePath, content);
    res.json({ path: filePath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/files/list-chats', async (req, res) => {
  const { projectFolder, rosterName } = req.body;
  if (!projectFolder) return res.status(400).json({ error: 'projectFolder required' });

  try {
    const safeRoster = (rosterName || 'default').replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
    const dir = path.join(projectFolder, 'agentic-chat', 'chat-logs', safeRoster);
    let files = [];
    try {
      const entries = await fs.readdir(dir);
      files = entries.filter(f => f.endsWith('.json')).sort().reverse().map(f => ({ name: f, path: path.join(dir, f) }));
    } catch {}
    res.json({ files });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/files/load-chat', async (req, res) => {
  const { filePath, projectFolder } = req.body;
  if (!filePath) return res.status(400).json({ error: 'filePath required' });
  const resolved = path.resolve(filePath);
  if (projectFolder) {
    const allowedBase = path.resolve(projectFolder, 'agentic-chat');
    if (!resolved.startsWith(allowedBase)) return res.status(403).json({ error: 'Access denied' });
  }
  try {
    const content = await fs.readFile(resolved, 'utf-8');
    try { res.json(JSON.parse(content)); } catch { res.status(400).json({ error: 'Invalid JSON' }); }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/files/init-project', async (req, res) => {
  const { projectFolder } = req.body;
  if (!projectFolder) return res.status(400).json({ error: 'projectFolder required' });
  try {
    const base = path.join(projectFolder, 'agentic-chat');
    await fs.mkdir(path.join(base, 'chat-logs'), { recursive: true });
    await fs.mkdir(path.join(base, 'suggestions'), { recursive: true });
    await fs.mkdir(path.join(base, 'docs'), { recursive: true });
    res.json({ path: base, folders: ['chat-logs', 'suggestions', 'docs'] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`\n  Agentic Chat API server running on http://localhost:${PORT}`);
  console.log(`  Sessions tracked: ${sessionMap.size}`);
  console.log(`  Endpoints: /api/chat, /api/sessions, /api/gemini, /api/files/*, /api/health\n`);
});
