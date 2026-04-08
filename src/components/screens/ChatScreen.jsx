import { useState, useRef, useEffect } from 'react';
import useStore from '../../store/useStore';
import { useChat } from '../../hooks/useChat';
import { getAgentIcon } from '../shared/AgentIcons';
import { fixGrammar } from '../../lib/grammar';
import SavedChats from '../chat/SavedChats';

const ChatMessage = ({ message, agent }) => {
  const isUser = message.role === 'user';
  const Icon = agent ? getAgentIcon(agent) : null;

  return (
    <div className={`chat-message ${isUser ? 'user' : 'agent'}`}>
      {!isUser && (
        <div className="chat-message-header">
          <span className="chat-message-icon">{Icon && <Icon color={agent.color} size={14} />}</span>
          <span style={{ fontWeight: 500 }}>{agent?.name}</span>
          <span style={{ marginLeft: 'auto' }}>
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )}
      <div className="chat-message-content">{message.content}</div>
      {isUser && (
        <div className="chat-message-time">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </div>
  );
};

const ChatScreen = () => {
  const activeAgentId = useStore((s) => s.activeAgentId);
  const activeRosterId = useStore((s) => s.activeRosterId);
  const rosters = useStore((s) => s.rosters);
  const conversations = useStore((s) => s.conversations);
  const clearConversation = useStore((s) => s.clearConversation);
  const addMessage = useStore((s) => s.addMessage);
  const settings = useStore((s) => s.settings);
  const setProjectFolder = useStore((s) => s.setProjectFolder);

  const roster = rosters.find((r) => r.id === activeRosterId);
  const agent = roster?.agents.find((a) => a.id === activeAgentId) || null;
  const messages = conversations[activeRosterId]?.[activeAgentId] || [];

  const { send, loading } = useChat();
  const [input, setInput] = useState('');
  const [fixing, setFixing] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileRef = useRef(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Focus input when agent changes
  useEffect(() => {
    inputRef.current?.focus();
  }, [activeAgentId]);

  const handleSend = () => {
    if (!input.trim() || !agent || loading) return;

    // Check for @mention to route to a different agent
    const mentionMatch = input.match(/^@(\S+)\s/);
    if (mentionMatch && roster) {
      const mentionName = mentionMatch[1].toLowerCase();
      const targetAgent = roster.agents.find(
        (a) => a.name.toLowerCase().replace(/\s+/g, '-') === mentionName ||
               a.name.toLowerCase() === mentionName
      );
      if (targetAgent) {
        const messageWithoutMention = input.replace(/^@\S+\s/, '').trim();
        if (messageWithoutMention) {
          send(activeRosterId, targetAgent, [], messageWithoutMention);
          useStore.getState().setActiveAgent(targetAgent.id);
        }
        setInput('');
        return;
      }
    }

    send(activeRosterId, agent, messages, input);
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFix = async () => {
    if (!input.trim() || fixing) return;
    setFixing(true);
    try {
      const fixed = await fixGrammar(input, settings);
      setInput(fixed);
      useStore.getState().addToast('Grammar fixed', 'success', 2000);
    } catch (err) {
      useStore.getState().addToast('Grammar fix failed — check AI settings', 'error');
    } finally {
      setFixing(false);
    }
  };

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      if (file.size > MAX_FILE_SIZE) {
        useStore.getState().addToast(`File too large: ${file.name} (max 10MB)`, 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const isImage = file.type.startsWith('image/');
        setAttachments((prev) => [...prev, {
          id: Date.now() + '_' + Math.random().toString(36).slice(2, 5),
          name: file.name,
          type: file.type,
          size: file.size,
          isImage,
          preview: isImage ? reader.result : null,
          content: isImage ? null : reader.result,
        }]);
      };
      if (file.type.startsWith('image/')) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });
    e.target.value = '';
  };

  const removeAttachment = (id) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSendWithAttachments = () => {
    if ((!input.trim() && attachments.length === 0) || !agent || loading) return;

    // Build message with attachment context
    let fullMessage = input.trim();
    if (attachments.length > 0) {
      const fileContext = attachments.map((a) => {
        if (a.isImage) return `[Attached image: ${a.name}]`;
        return `[Attached file: ${a.name}]\n\`\`\`\n${a.content?.slice(0, 5000) || ''}\n\`\`\``;
      }).join('\n\n');
      fullMessage = fullMessage ? `${fullMessage}\n\n${fileContext}` : fileContext;
    }

    send(activeRosterId, agent, messages, fullMessage);
    setInput('');
    setAttachments([]);
  };

  const handleLoadChat = (chatData) => {
    // Clear current conversation and load saved one
    clearConversation(activeRosterId, activeAgentId);
    if (chatData.messages) {
      chatData.messages.forEach((msg) => {
        addMessage(activeRosterId, activeAgentId, {
          role: msg.role,
          content: msg.content,
        });
      });
    }
  };

  if (!agent) {
    return (
      <div className="screen-empty">
        <div className="screen-empty-icon">&#128172;</div>
        <h2>Select an agent to start chatting</h2>
        <p className="text-secondary">Choose an agent from the sidebar to begin a conversation.</p>
      </div>
    );
  }

  return (
    <div className="chat-screen">
      {/* Saved chats from project folder */}
      <SavedChats onLoad={handleLoadChat} />

      {/* Messages area */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-welcome">
            <div className="chat-welcome-icon">
              {(() => { const WIcon = getAgentIcon(agent); return <WIcon color={agent.color} size={48} />; })()}
            </div>
            <h2>{agent.name}</h2>
            <p className="text-secondary">{agent.description}</p>

            {/* Agent capabilities */}
            <div className="chat-welcome-meta">
              <div className="chat-welcome-badges">
                <span className="chat-welcome-badge" style={{ borderColor: agent.color + '40', color: agent.color }}>
                  {agent.model || 'auto'}
                </span>
                {agent.rules?.requiresApproval && (
                  <span className="chat-welcome-badge badge-warning">needs approval</span>
                )}
                {agent.rules?.canWrite && (
                  <span className="chat-welcome-badge badge-success">can write files</span>
                )}
              </div>

              {agent.tools && agent.tools.length > 0 && (
                <div className="chat-welcome-tools">
                  <span className="text-muted text-sm">Tools:</span>
                  {agent.tools.map((t) => (
                    <span key={t} className="chat-tool-pill">{t}</span>
                  ))}
                </div>
              )}
            </div>

            <div className="chat-welcome-prompt">
              <p className="text-muted text-sm">System prompt:</p>
              <pre className="chat-system-prompt">{agent.systemPrompt}</pre>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} agent={agent} />
        ))}

        {loading && (
          <div className="chat-message agent">
            <div className="chat-message-header">
              <span className="chat-message-icon">{(() => { const TIcon = getAgentIcon(agent); return <TIcon color={agent.color} size={14} />; })()}</span>
              <span style={{ fontWeight: 500 }}>{agent.name}</span>
            </div>
            <div className="chat-typing">
              <span className="chat-typing-dot" />
              <span className="chat-typing-dot" />
              <span className="chat-typing-dot" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="chat-input-area">
        {messages.length > 0 && (
          <div className="chat-actions">
            <button
              className="chat-clear-btn"
              onClick={() => clearConversation(activeRosterId, activeAgentId)}
            >
              Clear
            </button>
            <button
              className="chat-clear-btn"
              onClick={() => {
                const json = JSON.stringify({
                  agent: agent.name,
                  roster: roster?.name,
                  exportedAt: new Date().toISOString(),
                  messages,
                }, null, 2);
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${agent.name.toLowerCase()}-chat.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Export
            </button>
          </div>
        )}
        {/* Attachment previews */}
        {attachments.length > 0 && (
          <div className="chat-attachments">
            {attachments.map((att) => (
              <div key={att.id} className="chat-attachment">
                {att.isImage ? (
                  <img src={att.preview} alt={att.name} className="chat-attachment-img" />
                ) : (
                  <div className="chat-attachment-file">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
                      <path d="M14 2v6h6" />
                    </svg>
                    <span>{att.name}</span>
                  </div>
                )}
                <button className="chat-attachment-remove" onClick={() => removeAttachment(att.id)}>
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="chat-input-wrapper">
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,.txt,.md,.json,.js,.jsx,.ts,.tsx,.css,.html,.py,.sql,.yaml,.yml,.toml,.csv"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <button
            className="chat-attach-btn"
            onClick={() => fileRef.current?.click()}
            title="Attach files or images"
            disabled={loading}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
          <textarea
            ref={inputRef}
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendWithAttachments();
              }
            }}
            placeholder={`Message ${agent.name}...`}
            rows={1}
            disabled={loading || fixing}
          />
          <button
            className="chat-fix-btn"
            onClick={handleFix}
            disabled={!input.trim() || fixing || loading}
            title="Fix grammar with AI"
          >
            {fixing ? '...' : 'Fix'}
          </button>
          <button
            className="chat-send-btn"
            onClick={handleSendWithAttachments}
            disabled={(!input.trim() && attachments.length === 0) || loading}
          >
            &#9654;
          </button>
        </div>

        {/* Project context bar */}
        <div className="chat-context-bar">
          <div className="chat-context-item">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
            </svg>
            <input
              className="chat-context-input"
              type="text"
              value={settings.projectFolder || ''}
              onChange={(e) => setProjectFolder(e.target.value)}
              placeholder="Project folder path..."
            />
          </div>
          <div className="chat-context-divider" />
          <div className="chat-context-item">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22" />
            </svg>
            <input
              className="chat-context-input"
              type="text"
              placeholder="GitHub repo URL..."
            />
          </div>
          {settings.saveToDisk && settings.projectFolder && (
            <span className="chat-context-status">Auto-saving</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatScreen;
