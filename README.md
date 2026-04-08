# Aurorean Project

Multi-agent chat interface for AI-augmented development workflows.

## What it does

- Chat with specialized AI agents (Orchestrator, Architect, UI Builder, Auth Builder, DB Builder, Security Auditor, Code Reviewer, Debugger, Performance Auditor, Documenter)
- Save and switch between agent rosters (team configurations)
- Create custom agents with system prompts, model preferences, and rules
- Import/export rosters as JSON to share workflows
- Auto-save chat logs to project folders for context persistence
- Grammar fix button powered by AI
- File and image attachments in chat
- Claude CLI, Google Gemini, or Mock mode

## Tech Stack

- React + Vite
- Zustand (state management)
- Custom CSS (no frameworks)
- Express.js (local API server)
- Claude Code CLI integration

## Getting Started

```bash
# Install dependencies
npm install

# Start the frontend (terminal 1)
npm run dev

# Start the API server (terminal 2)
npm run server
```

Frontend runs on `http://localhost:5173`
API server runs on `http://localhost:3001`

## AI Providers

| Provider | Setup | Cost |
|----------|-------|------|
| Mock | None — works out of the box | Free |
| Claude CLI | Requires Claude Code desktop app | Uses your subscription |
| Google Gemini | Add API key in Settings | Free tier available |

## Project Structure

```
src/
  components/     UI components (layout, screens, chat, roster, agent)
  store/          Zustand state management
  lib/            AI provider abstraction, grammar fix
  hooks/          Custom React hooks
  data/           Default agent roster definitions
  styles/         CSS (themes, chat, roster, global)
  utils/          localStorage helpers
server/
  index.js        Express API server (Claude CLI proxy, file operations)
```

---

Adrian Alexander Studio — alexander.ad
