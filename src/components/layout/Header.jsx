import useStore from '../../store/useStore';
import { getAgentIcon } from '../shared/AgentIcons';

const PROVIDERS = [
  { id: 'mock', label: 'Mock (no AI)' },
  { id: 'claude-cli', label: 'Claude CLI' },
  { id: 'gemini', label: 'Google Gemini' },
];

const MODELS = {
  'mock': [{ id: 'auto', label: 'Auto' }],
  'claude-cli': [
    { id: 'auto', label: 'Auto (agent pref)' },
    { id: 'opus', label: 'Opus' },
    { id: 'sonnet', label: 'Sonnet' },
    { id: 'haiku', label: 'Haiku' },
  ],
  'gemini': [
    { id: 'auto', label: 'Auto' },
    { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { id: 'gemini-2.0-pro', label: 'Gemini 2.0 Pro' },
  ],
};

const Header = () => {
  const rosters = useStore((s) => s.rosters);
  const activeRosterId = useStore((s) => s.activeRosterId);
  const setActiveRoster = useStore((s) => s.setActiveRoster);
  const activeScreen = useStore((s) => s.activeScreen);
  const setActiveScreen = useStore((s) => s.setActiveScreen);
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const theme = useStore((s) => s.settings.theme);
  const setTheme = useStore((s) => s.setTheme);
  const aiProvider = useStore((s) => s.settings.aiProvider);
  const aiModel = useStore((s) => s.settings.aiModel);
  const setAiProvider = useStore((s) => s.setAiProvider);
  const setAiModel = useStore((s) => s.setAiModel);
  const activeAgentId = useStore((s) => s.activeAgentId);

  const roster = rosters.find((r) => r.id === activeRosterId);
  const agent = roster?.agents.find((a) => a.id === activeAgentId) || null;
  const models = MODELS[aiProvider] || MODELS['mock'];

  return (
    <div className="header">
      {/* Left: sidebar toggle + agent info */}
      <button className="btn-icon" onClick={toggleSidebar} title="Toggle sidebar">
        &#9776;
      </button>

      {activeScreen === 'chat' && agent && (
        <div className="header-agent">
          <span className="header-agent-icon">
            {(() => { const Icon = getAgentIcon(agent); return <Icon color={agent.color} size={20} />; })()}
          </span>
          <span className="header-agent-name">{agent.name}</span>
        </div>
      )}

      <div style={{ flex: 1 }} />

      {/* Center: navigation tabs */}
      <nav className="header-nav">
        <button
          className={`header-nav-btn ${activeScreen === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveScreen('chat')}
        >
          Chat
        </button>
        <button
          className={`header-nav-btn ${activeScreen === 'roster' ? 'active' : ''}`}
          onClick={() => setActiveScreen('roster')}
        >
          Rosters
        </button>
        <button
          className={`header-nav-btn ${activeScreen === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveScreen('settings')}
        >
          Settings
        </button>
      </nav>

      <div style={{ flex: 1 }} />

      {/* Right: provider + model + roster + theme */}
      <div className="header-controls">
        <select
          className="header-select"
          value={aiProvider}
          onChange={(e) => { setAiProvider(e.target.value); setAiModel('auto'); }}
          title="AI Provider"
        >
          {PROVIDERS.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>

        <select
          className="header-select"
          value={aiModel}
          onChange={(e) => setAiModel(e.target.value)}
          title="Model"
        >
          {models.map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>

        <div className="header-divider" />

        <select
          className="header-select"
          value={activeRosterId || ''}
          onChange={(e) => setActiveRoster(e.target.value)}
          title="Active roster"
        >
          {rosters.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>

        <button
          className="btn-icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title="Toggle theme"
        >
          {theme === 'dark' ? '\u2600\uFE0F' : '\u{1F319}'}
        </button>
      </div>
    </div>
  );
};

export default Header;
