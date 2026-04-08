import { useState, useEffect } from 'react';
import useStore from '../../store/useStore';

const SavedChats = ({ onLoad }) => {
  const settings = useStore((s) => s.settings);
  const rosters = useStore((s) => s.rosters);
  const activeRosterId = useStore((s) => s.activeRosterId);

  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);

  const roster = rosters.find((r) => r.id === activeRosterId);

  useEffect(() => {
    if (!settings.projectFolder || !roster) {
      setChats([]);
      return;
    }
    loadChats();
  }, [settings.projectFolder, activeRosterId]);

  const loadChats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/files/list-chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectFolder: settings.projectFolder,
          rosterName: roster?.name,
        }),
      });
      const data = await res.json();
      setChats(data.files || []);
    } catch {
      setChats([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLoad = async (filePath) => {
    try {
      const res = await fetch('/api/files/load-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath }),
      });
      const data = await res.json();
      if (data.messages && onLoad) {
        onLoad(data);
      }
    } catch (err) {
      console.error('Failed to load chat:', err);
    }
  };

  if (!settings.projectFolder || chats.length === 0) return null;

  return (
    <div className="saved-chats">
      <div className="saved-chats-header">
        <span className="text-muted text-sm">Saved conversations</span>
        <button className="chat-clear-btn" onClick={loadChats}>
          {loading ? '...' : 'Refresh'}
        </button>
      </div>
      <div className="saved-chats-list">
        {chats.map((chat) => {
          const name = chat.name.replace('.json', '').replace(/-\d{4}-\d{2}-\d{2}T.*/, '');
          const date = chat.name.match(/(\d{4}-\d{2}-\d{2})/)?.[1] || '';
          return (
            <button
              key={chat.name}
              className="saved-chat-item"
              onClick={() => handleLoad(chat.path)}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
              <span className="saved-chat-name">{name}</span>
              {date && <span className="saved-chat-date">{date}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SavedChats;
