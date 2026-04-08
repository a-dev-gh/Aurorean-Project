import { useState, useRef } from 'react';
import useStore from '../../store/useStore';

const RosterScreen = () => {
  const rosters = useStore((s) => s.rosters);
  const activeRosterId = useStore((s) => s.activeRosterId);
  const addRoster = useStore((s) => s.addRoster);
  const deleteRoster = useStore((s) => s.deleteRoster);
  const setActiveRoster = useStore((s) => s.setActiveRoster);
  const updateRoster = useStore((s) => s.updateRoster);
  const addToast = useStore((s) => s.addToast);
  const importRoster = useStore((s) => s.importRoster);
  const exportRoster = useStore((s) => s.exportRoster);
  const setActiveScreen = useStore((s) => s.setActiveScreen);

  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState('');
  const fileRef = useRef(null);

  const handleCreate = () => {
    if (!newName.trim()) return;
    const roster = addRoster(newName.trim());
    setNewName('');
    setActiveRoster(roster.id);
    addToast(`Roster "${newName.trim()}" created`, 'success');
  };

  const handleDelete = (id) => {
    if (rosters.length <= 1) {
      addToast('Cannot delete the last roster', 'warning');
      return;
    }
    const name = rosters.find((r) => r.id === id)?.name;
    deleteRoster(id);
    addToast(`Roster "${name}" deleted`, 'info');
  };

  const handleExport = (id) => {
    const json = exportRoster(id);
    if (!json) return;
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const roster = rosters.find((r) => r.id === id);
    a.download = `${roster?.name || 'roster'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const roster = importRoster(reader.result);
      if (roster) setActiveRoster(roster.id);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleRename = (id) => {
    if (!editName.trim()) return;
    updateRoster(id, { name: editName.trim() });
    setEditing(null);
  };

  return (
    <div className="roster-screen p-24">
      <div className="flex items-center justify-between">
        <h2>Rosters</h2>
        <button className="btn btn-ghost" onClick={() => setActiveScreen('chat')}>
          Back to Chat
        </button>
      </div>

      {/* Create new roster */}
      <div className="roster-create" style={{ marginTop: 20 }}>
        <div className="flex gap-8">
          <input
            type="text"
            placeholder="New roster name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary" onClick={handleCreate}>
            Create
          </button>
        </div>
      </div>

      {/* Import */}
      <div style={{ marginTop: 12 }}>
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          style={{ display: 'none' }}
        />
        <button
          className="btn btn-ghost"
          onClick={() => fileRef.current?.click()}
        >
          Import Roster (JSON)
        </button>
      </div>

      {/* Roster list */}
      <div className="roster-list" style={{ marginTop: 24 }}>
        {rosters.map((roster) => {
          const isActive = roster.id === activeRosterId;
          const isEditing = editing === roster.id;

          return (
            <div
              key={roster.id}
              className={`roster-card ${isActive ? 'active' : ''}`}
            >
              <div className="roster-card-main">
                {isEditing ? (
                  <div className="flex gap-8 flex-1">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(roster.id);
                        if (e.key === 'Escape') setEditing(null);
                      }}
                      autoFocus
                      style={{ flex: 1 }}
                    />
                    <button className="btn btn-primary" onClick={() => handleRename(roster.id)}>
                      Save
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="roster-card-info" onClick={() => setActiveRoster(roster.id)}>
                      <h3>{roster.name}</h3>
                      <span className="text-sm text-muted">
                        {roster.agents.length} agent{roster.agents.length !== 1 ? 's' : ''}
                        {roster.description && ` \u2022 ${roster.description}`}
                      </span>
                    </div>
                    <div className="roster-card-actions">
                      {isActive && <span className="roster-active-badge">Active</span>}
                      <button
                        className="btn-icon"
                        onClick={() => { setEditing(roster.id); setEditName(roster.name); }}
                        title="Rename"
                      >
                        &#9998;
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => handleExport(roster.id)}
                        title="Export"
                      >
                        &#8681;
                      </button>
                      {rosters.length > 1 && (
                        <button
                          className="btn-icon"
                          onClick={() => handleDelete(roster.id)}
                          title="Delete"
                          style={{ color: 'var(--danger)' }}
                        >
                          &#10005;
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RosterScreen;
