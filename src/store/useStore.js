import { create } from 'zustand';
import { loadState, saveState } from '../utils/storage';
import { defaultRoster } from '../data/defaultRoster';

let initialized = false;

const useStore = create((set, get) => ({
  // ── ROSTERS ──
  rosters: [],
  activeRosterId: null,

  // ── AGENTS ──
  activeAgentId: null,

  // ── CHAT ──
  // conversations: { [rosterId]: { [agentId]: Message[] } }
  conversations: {},
  isStreaming: false,

  // ── SETTINGS ──
  settings: {
    theme: 'dark',
    aiProvider: 'mock', // 'mock' | 'claude-cli' | 'gemini'
    aiModel: 'auto', // 'auto' (use agent's preference) | specific model
    apiKeys: {
      gemini: '',
    },
    projectFolder: '', // e.g. "C:/Users/elchi/Documents/my-project"
    saveToDisk: false, // whether to save chat logs to disk
  },

  // ── TOASTS ──
  toasts: [],

  // ── USAGE TRACKING ──
  usage: {
    totalTokens: 0,
    totalMessages: 0,
    sessionStart: new Date().toISOString(),
  },

  // ── UI ──
  activeScreen: 'chat', // 'chat' | 'roster' | 'settings'
  sidebarOpen: true,
  editingAgent: null, // agentId being edited, or null

  // ═══════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════

  initialize: () => {
    if (initialized) return;
    initialized = true;
    const saved = loadState();
    if (saved) {
      set({
        rosters: saved.rosters || [],
        activeRosterId: saved.activeRosterId || null,
        activeAgentId: saved.activeAgentId || null,
        conversations: saved.conversations || {},
        settings: { ...get().settings, ...saved.settings },
      });
    } else {
      // First launch: create default roster
      const roster = { ...defaultRoster, id: 'roster_' + Date.now() };
      set({
        rosters: [roster],
        activeRosterId: roster.id,
        activeAgentId: roster.agents[0]?.id || null,
      });
      get().save();
    }
  },

  save: () => {
    const { rosters, activeRosterId, activeAgentId, conversations, settings } = get();
    saveState({ rosters, activeRosterId, activeAgentId, conversations, settings });
  },

  // ═══════════════════════════════════════════
  // ROSTER ACTIONS
  // ═══════════════════════════════════════════

  addRoster: (name) => {
    const roster = {
      id: 'roster_' + Date.now(),
      name,
      description: '',
      createdAt: new Date().toISOString(),
      agents: [],
    };
    set((s) => ({ rosters: [...s.rosters, roster] }));
    get().save();
    return roster;
  },

  deleteRoster: (id) => {
    set((s) => {
      const rosters = s.rosters.filter((r) => r.id !== id);
      const conversations = { ...s.conversations };
      delete conversations[id];
      return {
        rosters,
        conversations,
        activeRosterId: s.activeRosterId === id
          ? (rosters[0]?.id || null)
          : s.activeRosterId,
      };
    });
    get().save();
  },

  setActiveRoster: (id) => {
    const roster = get().rosters.find((r) => r.id === id);
    set({
      activeRosterId: id,
      activeAgentId: roster?.agents[0]?.id || null,
      activeScreen: 'chat',
    });
    get().save();
  },

  updateRoster: (id, updates) => {
    set((s) => ({
      rosters: s.rosters.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    }));
    get().save();
  },

  importRoster: (json) => {
    try {
      const data = typeof json === 'string' ? JSON.parse(json) : json;
      const roster = {
        ...data,
        id: 'roster_' + Date.now(),
        createdAt: new Date().toISOString(),
      };
      set((s) => ({ rosters: [...s.rosters, roster] }));
      get().save();
      return roster;
    } catch {
      return null;
    }
  },

  exportRoster: (id) => {
    const roster = get().rosters.find((r) => r.id === id);
    if (!roster) return null;
    return JSON.stringify(roster, null, 2);
  },

  // ═══════════════════════════════════════════
  // AGENT ACTIONS
  // ═══════════════════════════════════════════

  setActiveAgent: (agentId) => {
    set({ activeAgentId: agentId, activeScreen: 'chat', editingAgent: null });
    get().save();
  },

  addAgent: (rosterId, agent) => {
    const newAgent = {
      ...agent,
      id: 'agent_' + Date.now(),
    };
    set((s) => ({
      rosters: s.rosters.map((r) =>
        r.id === rosterId ? { ...r, agents: [...r.agents, newAgent] } : r
      ),
    }));
    get().save();
    return newAgent;
  },

  updateAgent: (rosterId, agentId, updates) => {
    set((s) => ({
      rosters: s.rosters.map((r) =>
        r.id === rosterId
          ? { ...r, agents: r.agents.map((a) => (a.id === agentId ? { ...a, ...updates } : a)) }
          : r
      ),
    }));
    get().save();
  },

  deleteAgent: (rosterId, agentId) => {
    set((s) => ({
      rosters: s.rosters.map((r) =>
        r.id === rosterId ? { ...r, agents: r.agents.filter((a) => a.id !== agentId) } : r
      ),
      activeAgentId: s.activeAgentId === agentId ? null : s.activeAgentId,
    }));
    get().save();
  },

  setEditingAgent: (agentId) => set({ editingAgent: agentId }),

  // ═══════════════════════════════════════════
  // CHAT ACTIONS
  // ═══════════════════════════════════════════

  addMessage: (rosterId, agentId, message) => {
    set((s) => {
      const convs = { ...s.conversations };
      if (!convs[rosterId]) convs[rosterId] = {};
      if (!convs[rosterId][agentId]) convs[rosterId][agentId] = [];
      convs[rosterId][agentId] = [...convs[rosterId][agentId], {
        ...message,
        id: 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        timestamp: new Date().toISOString(),
      }];
      return { conversations: convs };
    });
    get().save();
  },

  getMessages: (rosterId, agentId) => {
    return get().conversations[rosterId]?.[agentId] || [];
  },

  clearConversation: (rosterId, agentId) => {
    set((s) => {
      const convs = { ...s.conversations };
      if (convs[rosterId]) {
        convs[rosterId] = { ...convs[rosterId] };
        delete convs[rosterId][agentId];
      }
      return { conversations: convs };
    });
    get().save();
  },

  setStreaming: (val) => set({ isStreaming: val }),

  // ═══════════════════════════════════════════
  // SETTINGS & UI
  // ═══════════════════════════════════════════

  setTheme: (theme) => {
    set((s) => ({ settings: { ...s.settings, theme } }));
    get().save();
  },

  setAiProvider: (provider) => {
    set((s) => ({ settings: { ...s.settings, aiProvider: provider } }));
    get().save();
  },

  setAiModel: (model) => {
    set((s) => ({ settings: { ...s.settings, aiModel: model } }));
    get().save();
  },

  setApiKey: (provider, key) => {
    set((s) => ({
      settings: {
        ...s.settings,
        apiKeys: { ...s.settings.apiKeys, [provider]: key },
      },
    }));
    get().save();
  },

  setProjectFolder: (folder) => {
    set((s) => ({ settings: { ...s.settings, projectFolder: folder } }));
    get().save();
  },

  setSaveToDisk: (val) => {
    set((s) => ({ settings: { ...s.settings, saveToDisk: val } }));
    get().save();
  },

  setActiveScreen: (screen) => set({ activeScreen: screen }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  // ═══════════════════════════════════════════
  // TOASTS
  // ═══════════════════════════════════════════

  addToast: (message, type = 'info', duration = 4000) => {
    const toast = { id: Date.now(), message, type, duration };
    set((s) => ({ toasts: [...s.toasts, toast] }));
  },

  removeToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },

  // ═══════════════════════════════════════════
  // USAGE TRACKING
  // ═══════════════════════════════════════════

  trackUsage: (tokens = 0) => {
    set((s) => ({
      usage: {
        ...s.usage,
        totalTokens: s.usage.totalTokens + tokens,
        totalMessages: s.usage.totalMessages + 1,
      },
    }));
  },

  resetUsage: () => {
    set({ usage: { totalTokens: 0, totalMessages: 0, sessionStart: new Date().toISOString() } });
  },

  // ═══════════════════════════════════════════
  // COMPUTED
  // ═══════════════════════════════════════════

  getActiveRoster: () => {
    const { rosters, activeRosterId } = get();
    return rosters.find((r) => r.id === activeRosterId) || null;
  },

  getActiveAgent: () => {
    const roster = get().getActiveRoster();
    if (!roster) return null;
    return roster.agents.find((a) => a.id === get().activeAgentId) || null;
  },
}));

export default useStore;
