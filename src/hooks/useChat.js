import { useState } from 'react';
import useStore from '../store/useStore';
import { sendMessage } from '../lib/ai';

async function saveChatToDisk(settings, rosterName, agentName, conversation) {
  if (!settings.saveToDisk || !settings.projectFolder) return;

  try {
    await fetch('/api/files/save-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectFolder: settings.projectFolder,
        agentName,
        rosterName,
        conversation,
      }),
    });
  } catch {
    // Silent fail — disk save is best-effort
  }
}

export function useChat() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const addMessage = useStore((s) => s.addMessage);
  const settings = useStore((s) => s.settings);
  const rosters = useStore((s) => s.rosters);

  const send = async (rosterId, agent, existingMessages, userText) => {
    if (!userText.trim() || loading) return;

    setError(null);

    // Add user message
    addMessage(rosterId, agent.id, { role: 'user', content: userText.trim() });

    // Build messages array for the AI
    const messages = [
      ...existingMessages.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: userText.trim() },
    ];

    setLoading(true);
    try {
      const response = await sendMessage({ agent, messages, settings });
      addMessage(rosterId, agent.id, { role: 'assistant', content: response });

      // Auto-save to disk if enabled
      const roster = rosters.find((r) => r.id === rosterId);
      const fullConversation = [
        ...messages,
        { role: 'assistant', content: response },
      ];
      saveChatToDisk(settings, roster?.name, agent.name, fullConversation);
    } catch (err) {
      setError(err.message);
      addMessage(rosterId, agent.id, {
        role: 'assistant',
        content: `Error: ${err.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  return { send, loading, error };
}
