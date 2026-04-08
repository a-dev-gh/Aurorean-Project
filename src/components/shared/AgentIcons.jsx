/**
 * Clean SVG icons for each agent role.
 * Minimal line style, matches alexander.ad aesthetic.
 */

const iconStyle = {
  width: '100%',
  height: '100%',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  fill: 'none',
};

export const AgentIcons = {
  orchestrator: ({ color = 'currentColor', size = 20 }) => (
    <svg viewBox="0 0 24 24" style={{ ...iconStyle, width: size, height: size }} stroke={color} strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  ),

  architect: ({ color = 'currentColor', size = 20 }) => (
    <svg viewBox="0 0 24 24" style={{ ...iconStyle, width: size, height: size }} stroke={color} strokeWidth="1.8">
      <path d="M2 20h20M5 20V8l7-5 7 5v12" />
      <path d="M9 20v-6h6v6M9 12h6" />
    </svg>
  ),

  'ui-builder': ({ color = 'currentColor', size = 20 }) => (
    <svg viewBox="0 0 24 24" style={{ ...iconStyle, width: size, height: size }} stroke={color} strokeWidth="1.8">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M3 9h18M9 9v12" />
      <rect x="12" y="12" width="6" height="3" rx="1" />
    </svg>
  ),

  'auth-builder': ({ color = 'currentColor', size = 20 }) => (
    <svg viewBox="0 0 24 24" style={{ ...iconStyle, width: size, height: size }} stroke={color} strokeWidth="1.8">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M12 15v3" />
      <circle cx="12" cy="15" r="1" fill={color} />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  ),

  'db-builder': ({ color = 'currentColor', size = 20 }) => (
    <svg viewBox="0 0 24 24" style={{ ...iconStyle, width: size, height: size }} stroke={color} strokeWidth="1.8">
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
      <path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" />
    </svg>
  ),

  'security-audit': ({ color = 'currentColor', size = 20 }) => (
    <svg viewBox="0 0 24 24" style={{ ...iconStyle, width: size, height: size }} stroke={color} strokeWidth="1.8">
      <path d="M12 2l8 4v6c0 5.25-3.5 8.75-8 10-4.5-1.25-8-4.75-8-10V6l8-4z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),

  'code-reviewer': ({ color = 'currentColor', size = 20 }) => (
    <svg viewBox="0 0 24 24" style={{ ...iconStyle, width: size, height: size }} stroke={color} strokeWidth="1.8">
      <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
      <path d="M14 4l-4 16" strokeDasharray="2 3" />
    </svg>
  ),

  debugger: ({ color = 'currentColor', size = 20 }) => (
    <svg viewBox="0 0 24 24" style={{ ...iconStyle, width: size, height: size }} stroke={color} strokeWidth="1.8">
      <circle cx="12" cy="14" r="6" />
      <path d="M12 8V4M8.5 8.5L6 6M15.5 8.5L18 6" />
      <path d="M6 14H3M21 14h-3M6 18l-2 2M18 18l2 2" />
      <path d="M10 13h4M10 16h4" />
    </svg>
  ),

  'performance-audit': ({ color = 'currentColor', size = 20 }) => (
    <svg viewBox="0 0 24 24" style={{ ...iconStyle, width: size, height: size }} stroke={color} strokeWidth="1.8">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  ),

  documenter: ({ color = 'currentColor', size = 20 }) => (
    <svg viewBox="0 0 24 24" style={{ ...iconStyle, width: size, height: size }} stroke={color} strokeWidth="1.8">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
      <path d="M14 2v6h6M8 13h8M8 17h8M8 9h2" />
    </svg>
  ),
};

// Fallback for custom/unknown agent types
export const DefaultAgentIcon = ({ color = 'currentColor', size = 20 }) => (
  <svg viewBox="0 0 24 24" style={{ ...iconStyle, width: size, height: size }} stroke={color} strokeWidth="1.8">
    <circle cx="12" cy="12" r="10" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
  </svg>
);

// Map agent IDs to icon keys
const ID_TO_KEY = {
  agent_orchestrator: 'orchestrator',
  agent_architect: 'architect',
  agent_ui_builder: 'ui-builder',
  agent_auth_builder: 'auth-builder',
  agent_db_builder: 'db-builder',
  agent_security_audit: 'security-audit',
  agent_code_reviewer: 'code-reviewer',
  agent_debugger: 'debugger',
  agent_performance: 'performance-audit',
  agent_documenter: 'documenter',
};

export function getAgentIcon(agent) {
  // Try by ID mapping first
  const key = ID_TO_KEY[agent?.id];
  if (key && AgentIcons[key]) return AgentIcons[key];

  // Try by name (lowercase, hyphenated)
  const nameKey = agent?.name?.toLowerCase().replace(/\s+/g, '-');
  if (nameKey && AgentIcons[nameKey]) return AgentIcons[nameKey];

  return DefaultAgentIcon;
}
