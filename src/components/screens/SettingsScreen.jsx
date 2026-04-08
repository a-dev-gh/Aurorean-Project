import { useState } from 'react';
import useStore from '../../store/useStore';

const SettingsScreen = () => {
  const settings = useStore((s) => s.settings);
  const setTheme = useStore((s) => s.setTheme);
  const setAiProvider = useStore((s) => s.setAiProvider);
  const setAiModel = useStore((s) => s.setAiModel);
  const setApiKey = useStore((s) => s.setApiKey);
  const setProjectFolder = useStore((s) => s.setProjectFolder);
  const setSaveToDisk = useStore((s) => s.setSaveToDisk);

  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [initStatus, setInitStatus] = useState('');

  const handleInitProject = async () => {
    if (!settings.projectFolder) return;
    try {
      setInitStatus('Creating...');
      const res = await fetch('/api/files/init-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectFolder: settings.projectFolder }),
      });
      const data = await res.json();
      if (res.ok) {
        setInitStatus(`Created: ${data.folders.join(', ')}`);
        setSaveToDisk(true);
      } else {
        setInitStatus(`Error: ${data.error}`);
      }
    } catch (err) {
      setInitStatus(`Error: ${err.message}`);
    }
  };

  return (
    <div className="settings-screen p-24">
      <h2>Settings</h2>

      {/* Project Folder */}
      <div className="settings-section" style={{ marginTop: 24 }}>
        <h3>Project Folder</h3>
        <div className="settings-group" style={{ marginTop: 12 }}>
          <label className="settings-label">Working Directory</label>
          <div className="flex gap-8 items-center">
            <input
              type="text"
              value={settings.projectFolder || ''}
              onChange={(e) => setProjectFolder(e.target.value)}
              placeholder="C:/Users/you/Documents/my-project"
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary" onClick={handleInitProject}>
              Init
            </button>
          </div>
          <p className="text-muted text-sm" style={{ marginTop: 4 }}>
            Set a project folder to save chat logs and suggestions to disk.
            Click "Init" to create the folder structure.
          </p>
          {initStatus && (
            <p className="text-sm" style={{ marginTop: 4, color: initStatus.startsWith('Error') ? 'var(--danger)' : 'var(--success)' }}>
              {initStatus}
            </p>
          )}
        </div>

        <div className="settings-group" style={{ marginTop: 12 }}>
          <label className="flex items-center gap-8" style={{ cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.saveToDisk || false}
              onChange={(e) => setSaveToDisk(e.target.checked)}
            />
            <span className="settings-label" style={{ margin: 0 }}>Auto-save chats to disk</span>
          </label>
          <p className="text-muted text-sm" style={{ marginTop: 4 }}>
            When enabled, conversations are saved to:<br />
            <code style={{ color: 'var(--accent)', fontSize: 11 }}>
              {settings.projectFolder || '[project]'}/agentic-chat/chat-logs/
            </code>
          </p>
        </div>
      </div>

      {/* Appearance */}
      <div className="settings-section" style={{ marginTop: 32 }}>
        <h3>Appearance</h3>
        <div className="settings-group" style={{ marginTop: 12 }}>
          <label className="settings-label">Theme</label>
          <select value={settings.theme} onChange={(e) => setTheme(e.target.value)}>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </div>
      </div>

      {/* AI Config */}
      <div className="settings-section" style={{ marginTop: 32 }}>
        <h3>AI Configuration</h3>

        <div className="settings-group" style={{ marginTop: 12 }}>
          <label className="settings-label">Default Provider</label>
          <select
            value={settings.aiProvider}
            onChange={(e) => { setAiProvider(e.target.value); setAiModel('auto'); }}
          >
            <option value="mock">Mock (no AI - for testing)</option>
            <option value="claude-cli">Claude CLI (uses your subscription)</option>
            <option value="gemini">Google Gemini</option>
          </select>
          <p className="text-muted text-sm" style={{ marginTop: 4 }}>
            {settings.aiProvider === 'mock' && 'Responses are simulated. Good for testing the UI.'}
            {settings.aiProvider === 'claude-cli' && 'Uses `claude --print` from your Claude subscription. Works locally.'}
            {settings.aiProvider === 'gemini' && 'Uses Google Gemini API. Requires an API key below.'}
          </p>
        </div>

        <div className="settings-group" style={{ marginTop: 16 }}>
          <label className="settings-label">Default Model</label>
          <select value={settings.aiModel} onChange={(e) => setAiModel(e.target.value)}>
            <option value="auto">Auto (use agent preference)</option>
            {settings.aiProvider === 'claude-cli' && (
              <>
                <option value="opus">Opus (strongest)</option>
                <option value="sonnet">Sonnet (balanced)</option>
                <option value="haiku">Haiku (fastest)</option>
              </>
            )}
            {settings.aiProvider === 'gemini' && (
              <>
                <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                <option value="gemini-2.0-pro">Gemini 2.0 Pro</option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* API Keys */}
      <div className="settings-section" style={{ marginTop: 32 }}>
        <h3>API Keys</h3>

        <div className="settings-group" style={{ marginTop: 12 }}>
          <label className="settings-label">Google Gemini API Key</label>
          <div className="flex gap-8 items-center">
            <input
              type={showGeminiKey ? 'text' : 'password'}
              value={settings.apiKeys?.gemini || ''}
              onChange={(e) => setApiKey('gemini', e.target.value)}
              placeholder="Enter your Gemini API key"
              style={{ flex: 1 }}
            />
            <button className="btn btn-ghost" onClick={() => setShowGeminiKey(!showGeminiKey)}>
              {showGeminiKey ? 'Hide' : 'Show'}
            </button>
          </div>
          <p className="text-muted text-sm" style={{ marginTop: 4 }}>
            Free key at aistudio.google.com
          </p>
        </div>
      </div>

      {/* About */}
      <div className="settings-section" style={{ marginTop: 32 }}>
        <h3>About</h3>
        <p className="text-secondary text-sm" style={{ marginTop: 8 }}>
          Agentic Chat v1.0 — Adrian Alexander Studio
        </p>
      </div>
    </div>
  );
};

export default SettingsScreen;
