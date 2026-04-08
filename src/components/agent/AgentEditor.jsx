import { useState, useEffect } from 'react';
import useStore from '../../store/useStore';

const COLORS = ['#FF6B35', '#4ECDC4', '#FF69B4', '#FFD93D', '#6BCB77', '#FF4757', '#A29BFE', '#FFA502', '#FECA57', '#48DBFB'];

const emptyAgent = {
  name: '',
  icon: '\u{1F916}',
  color: '#7c5cfc',
  model: 'sonnet',
  description: '',
  systemPrompt: '',
  tools: [],
  rules: { requiresApproval: false, canWrite: false },
};

const AgentEditor = ({ agentId, rosterId, onClose, isNew }) => {
  const rosters = useStore((s) => s.rosters);
  const addAgent = useStore((s) => s.addAgent);
  const updateAgent = useStore((s) => s.updateAgent);
  const deleteAgent = useStore((s) => s.deleteAgent);

  const roster = rosters.find((r) => r.id === rosterId);
  const existing = roster?.agents.find((a) => a.id === agentId);

  const [form, setForm] = useState(existing || emptyAgent);

  useEffect(() => {
    if (existing) setForm(existing);
  }, [agentId]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const setRule = (key, val) => setForm((f) => ({ ...f, rules: { ...f.rules, [key]: val } }));

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (isNew) {
      addAgent(rosterId, form);
    } else {
      updateAgent(rosterId, agentId, form);
    }
    onClose();
  };

  const handleDelete = () => {
    deleteAgent(rosterId, agentId);
    onClose();
  };

  return (
    <div className="agent-editor-overlay" onClick={onClose}>
      <div className="agent-editor" onClick={(e) => e.stopPropagation()}>
        <h2>{isNew ? 'New Agent' : `Edit ${form.name || 'Agent'}`}</h2>

        <div className="agent-editor-field">
          <label>Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g., Frontend Builder"
          />
        </div>

        <div className="flex gap-16">
          <div className="agent-editor-field" style={{ flex: 1 }}>
            <label>Icon (emoji)</label>
            <input
              type="text"
              value={form.icon}
              onChange={(e) => set('icon', e.target.value)}
              placeholder="e.g., \u{1F3A8}"
              style={{ width: 80 }}
            />
          </div>
          <div className="agent-editor-field" style={{ flex: 1 }}>
            <label>Color</label>
            <div className="flex gap-8 items-center">
              <input
                type="color"
                value={form.color}
                onChange={(e) => set('color', e.target.value)}
                className="agent-color-preview"
              />
              <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
                {COLORS.map((c) => (
                  <button
                    key={c}
                    className="agent-color-preview"
                    style={{
                      backgroundColor: c,
                      borderColor: form.color === c ? 'var(--text-primary)' : 'var(--border)',
                    }}
                    onClick={() => set('color', c)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="agent-editor-field">
          <label>Model</label>
          <select value={form.model} onChange={(e) => set('model', e.target.value)}>
            <option value="opus">Opus (strongest)</option>
            <option value="sonnet">Sonnet (balanced)</option>
            <option value="haiku">Haiku (fastest)</option>
          </select>
        </div>

        <div className="agent-editor-field">
          <label>Description</label>
          <input
            type="text"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Short description of what this agent does"
          />
        </div>

        <div className="agent-editor-field">
          <label>System Prompt</label>
          <textarea
            value={form.systemPrompt}
            onChange={(e) => set('systemPrompt', e.target.value)}
            placeholder="Define the agent's personality, rules, and behavior..."
          />
        </div>

        <div className="flex gap-16">
          <div className="agent-editor-field">
            <label className="flex items-center gap-8">
              <input
                type="checkbox"
                checked={form.rules.requiresApproval}
                onChange={(e) => setRule('requiresApproval', e.target.checked)}
              />
              Requires human approval
            </label>
          </div>
          <div className="agent-editor-field">
            <label className="flex items-center gap-8">
              <input
                type="checkbox"
                checked={form.rules.canWrite}
                onChange={(e) => setRule('canWrite', e.target.checked)}
              />
              Can write/modify files
            </label>
          </div>
        </div>

        <div className="agent-editor-footer">
          {!isNew && (
            <button
              className="btn btn-ghost"
              onClick={handleDelete}
              style={{ color: 'var(--danger)', marginRight: 'auto' }}
            >
              Delete Agent
            </button>
          )}
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>
            {isNew ? 'Create Agent' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentEditor;
