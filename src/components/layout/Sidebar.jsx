import useStore from '../../store/useStore';
import { getAgentIcon } from '../shared/AgentIcons';

const Sidebar = () => {
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const activeAgentId = useStore((s) => s.activeAgentId);
  const setActiveAgent = useStore((s) => s.setActiveAgent);
  const setEditingAgent = useStore((s) => s.setEditingAgent);
  const activeRosterId = useStore((s) => s.activeRosterId);
  const rosters = useStore((s) => s.rosters);
  const conversations = useStore((s) => s.conversations);

  const roster = rosters.find((r) => r.id === activeRosterId);
  const agents = roster?.agents || [];

  const getMessageCount = (agentId) => {
    return conversations[activeRosterId]?.[agentId]?.length || 0;
  };

  return (
    <div className={`sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
      <div className="sidebar-header">
        <h3 className="sidebar-title">Agents</h3>
        {roster && <span className="sidebar-roster-name">{roster.name}</span>}
      </div>

      <div className="sidebar-agents">
        {agents.length === 0 && (
          <div className="sidebar-empty">
            No agents in this roster yet.
            <br />
            Click + to add one.
          </div>
        )}
        {agents.map((agent) => {
          const msgCount = getMessageCount(agent.id);
          const isActive = agent.id === activeAgentId;

          return (
            <button
              key={agent.id}
              className={`sidebar-agent ${isActive ? 'active' : ''}`}
              onClick={() => setActiveAgent(agent.id)}
              onDoubleClick={(e) => { e.preventDefault(); setEditingAgent(agent.id); }}
            >
              <span
                className="sidebar-agent-dot"
                style={{ backgroundColor: agent.color }}
              />
              <span className="sidebar-agent-icon">
                {(() => { const Icon = getAgentIcon(agent); return <Icon color={agent.color} size={18} />; })()}
              </span>
              <div className="sidebar-agent-info">
                <span className="sidebar-agent-name">{agent.name}</span>
                <span className="sidebar-agent-desc">{agent.description}</span>
              </div>
              {msgCount > 0 && (
                <span className="sidebar-agent-badge">{msgCount}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="sidebar-footer flex items-center justify-between">
        <span className="text-sm text-muted">
          {agents.length} agent{agents.length !== 1 ? 's' : ''}
        </span>
        <button
          className="btn-icon"
          onClick={() => setEditingAgent('__new__')}
          title="Add agent"
        >
          +
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
