import express from 'express';
import cors from 'cors';
import { execFileSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
const app = express();
const PORT = 3001;

// Claude CLI path — use forward slashes to avoid Windows backslash escaping pitfalls
const CLAUDE_PATH = path.resolve('C:/Users/elchi/AppData/Roaming/Claude/claude-code/2.1.87/claude.exe');

// CWD for spawned CLI processes. Use the user's home dir (clean path, no special chars)
// so Claude can access project files. The ENOENT fix is about avoiding the project
// folder's special characters in the CWD, not restricting access.
const CLAUDE_CWD = process.env.USERPROFILE || path.dirname(CLAUDE_PATH);

// Verify the CLI is reachable at startup
try {
  const ver = execFileSync(CLAUDE_PATH, ['--version'], {
    encoding: 'utf-8', timeout: 10000, windowsHide: true, cwd: CLAUDE_CWD,
  }).trim();
  console.log(`  Claude CLI: ${CLAUDE_PATH} (${ver})`);
} catch (err) {
  console.error(`  WARNING: Claude CLI not reachable at ${CLAUDE_PATH}`);
  console.error(`  ${err.code}: ${err.message?.substring(0, 200)}`);
}

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// ═══════════════════════════════════════════════════
// SECURITY — Rate limiting + input validation
// ═══════════════════════════════════════════════════

const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 20; // max requests per window

function rateLimit(req, res, next) {
  const ip = req.ip || 'local';
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, reset: now + RATE_LIMIT_WINDOW };

  if (now > entry.reset) {
    entry.count = 0;
    entry.reset = now + RATE_LIMIT_WINDOW;
  }

  entry.count++;
  rateLimitMap.set(ip, entry);

  if (entry.count > RATE_LIMIT_MAX) {
    return res.status(429).json({ error: 'Rate limit exceeded. Wait a minute.' });
  }

  next();
}

function validateInput(req, res, next) {
  const { messages, systemPrompt } = req.body;

  // Max message length
  if (messages && messages.length > 50000) {
    return res.status(400).json({ error: 'Message too long (max 50,000 chars)' });
  }

  // Max system prompt length
  if (systemPrompt && systemPrompt.length > 10000) {
    return res.status(400).json({ error: 'System prompt too long (max 10,000 chars)' });
  }

  next();
}

// ═══════════════════════════════════════════════════
// CHAT — Send message to Claude agent
// ═══════════════════════════════════════════════════

app.post('/api/chat', rateLimit, validateInput, async (req, res) => {
  const { systemPrompt, messages, model, projectFolder, enableTools, allowedTools } = req.body;

  if (!messages) {
    return res.status(400).json({ error: 'messages is required' });
  }

  // Extract just the last user message
  const lastMessage = messages.split('\n').filter(l => l.trim()).pop() || messages;

  // Bake system prompt into message to avoid CLI arg escaping issues
  const fullPrompt = systemPrompt
    ? `You are: ${systemPrompt.replace(/\n/g, ' ')}\n\nUser message: ${lastMessage}`
    : lastMessage;

  // Use project folder as CWD if provided (so Claude can see project files)
  const cwd = projectFolder || CLAUDE_CWD;

  const args = ['--print'];
  if (model && model !== 'auto') args.push('--model', model);

  // Enable tool use if the agent has permissions
  if (enableTools) {
    const tools = allowedTools || 'Bash,Read,Write,Edit,Glob,Grep';
    args.push('--allowedTools', tools);
  }

  // Use -- separator to prevent prompt from being parsed as flags
  args.push('--', fullPrompt);

  console.log(`[chat] Agent request (model: ${model || 'auto'}, prompt: ${lastMessage.substring(0, 80)})`);

  try {
    const response = execFileSync(CLAUDE_PATH, args, {
      timeout: 120000,
      maxBuffer: 1024 * 1024,
      windowsHide: true,
      encoding: 'utf-8',
      cwd,
    }).trim();

    console.log(`[chat] Response received (${response.length} chars)`);
    res.json({ response });
  } catch (err) {
    console.error('[chat] Error:', err.message?.substring(0, 200));
    res.status(500).json({ error: err.stderr || err.message || 'Claude CLI error' });
  }
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

/**
 * POST /api/files/save-chat
 * Body: { projectFolder, agentName, rosterId, conversation }
 *
 * Saves to: {projectFolder}/agentic-chat/chat-logs/{roster}/{agent}-{timestamp}.json
 */
app.post('/api/files/save-chat', async (req, res) => {
  const { projectFolder, agentName, rosterName, conversation } = req.body;

  if (!projectFolder || !conversation) {
    return res.status(400).json({ error: 'projectFolder and conversation required' });
  }

  try {
    const safeName = (agentName || 'unknown').replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
    const safeRoster = (rosterName || 'default').replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const dir = path.join(projectFolder, 'agentic-chat', 'chat-logs', safeRoster);

    await fs.mkdir(dir, { recursive: true });

    const filePath = path.join(dir, `${safeName}-${timestamp}.json`);
    await fs.writeFile(filePath, JSON.stringify({
      agent: agentName,
      roster: rosterName,
      savedAt: new Date().toISOString(),
      messages: conversation,
    }, null, 2));

    console.log(`[files] Chat saved: ${filePath}`);
    res.json({ path: filePath });
  } catch (err) {
    console.error('[files] Save error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/files/save-suggestion
 * Body: { projectFolder, agentName, title, content }
 *
 * Saves to: {projectFolder}/agentic-chat/suggestions/{agent}-{title}.md
 */
app.post('/api/files/save-suggestion', async (req, res) => {
  const { projectFolder, agentName, title, content } = req.body;

  if (!projectFolder || !content) {
    return res.status(400).json({ error: 'projectFolder and content required' });
  }

  try {
    const safeName = (agentName || 'agent').replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
    const safeTitle = (title || 'suggestion').replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
    const dir = path.join(projectFolder, 'agentic-chat', 'suggestions');

    await fs.mkdir(dir, { recursive: true });

    const filePath = path.join(dir, `${safeName}-${safeTitle}.md`);
    await fs.writeFile(filePath, content);

    console.log(`[files] Suggestion saved: ${filePath}`);
    res.json({ path: filePath });
  } catch (err) {
    console.error('[files] Save error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/files/list-chats
 * Body: { projectFolder, rosterName }
 *
 * Lists saved chat files from {projectFolder}/agentic-chat/chat-logs/{roster}/
 */
app.post('/api/files/list-chats', async (req, res) => {
  const { projectFolder, rosterName } = req.body;

  if (!projectFolder) {
    return res.status(400).json({ error: 'projectFolder required' });
  }

  try {
    const safeRoster = (rosterName || 'default').replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
    const dir = path.join(projectFolder, 'agentic-chat', 'chat-logs', safeRoster);

    let files = [];
    try {
      const entries = await fs.readdir(dir);
      files = entries
        .filter((f) => f.endsWith('.json'))
        .map((f) => ({
          name: f,
          path: path.join(dir, f),
        }));
    } catch {
      // Directory doesn't exist yet — return empty
    }

    res.json({ files });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/files/load-chat
 * Body: { filePath }
 *
 * Loads a saved chat file
 */
app.post('/api/files/load-chat', async (req, res) => {
  const { filePath, projectFolder } = req.body;

  if (!filePath) {
    return res.status(400).json({ error: 'filePath required' });
  }

  // Security: prevent path traversal — file must be within agentic-chat dir
  const resolved = path.resolve(filePath);
  if (projectFolder) {
    const allowedBase = path.resolve(projectFolder, 'agentic-chat');
    if (!resolved.startsWith(allowedBase)) {
      return res.status(403).json({ error: 'Access denied: path outside project' });
    }
  }

  try {
    const content = await fs.readFile(resolved, 'utf-8');
    try {
      res.json(JSON.parse(content));
    } catch {
      res.status(400).json({ error: 'Invalid JSON file' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/files/init-project
 * Body: { projectFolder }
 *
 * Creates the agentic-chat folder structure in a project
 */
app.post('/api/files/init-project', async (req, res) => {
  const { projectFolder } = req.body;

  if (!projectFolder) {
    return res.status(400).json({ error: 'projectFolder required' });
  }

  try {
    const base = path.join(projectFolder, 'agentic-chat');
    await fs.mkdir(path.join(base, 'chat-logs'), { recursive: true });
    await fs.mkdir(path.join(base, 'suggestions'), { recursive: true });
    await fs.mkdir(path.join(base, 'docs'), { recursive: true });

    console.log(`[files] Project initialized: ${base}`);
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
  console.log(`  Endpoints:`);
  console.log(`    POST /api/chat             — Send message to Claude agent`);
  console.log(`    POST /api/files/save-chat   — Save conversation to project`);
  console.log(`    POST /api/files/list-chats  — List saved chats`);
  console.log(`    POST /api/files/load-chat   — Load a saved chat`);
  console.log(`    POST /api/files/init-project — Create project folders`);
  console.log(`    GET  /api/health            — Health check\n`);
});
