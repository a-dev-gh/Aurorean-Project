import { useEffect } from 'react';
import useStore from './store/useStore';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import ChatScreen from './components/screens/ChatScreen';
import RosterScreen from './components/screens/RosterScreen';
import SettingsScreen from './components/screens/SettingsScreen';
import AgentEditor from './components/agent/AgentEditor';
import Toast from './components/shared/Toast';
import './styles/global.css';

const App = () => {
  const initialize = useStore((s) => s.initialize);
  const activeScreen = useStore((s) => s.activeScreen);
  const theme = useStore((s) => s.settings.theme);
  const editingAgent = useStore((s) => s.editingAgent);
  const setEditingAgent = useStore((s) => s.setEditingAgent);
  const activeRosterId = useStore((s) => s.activeRosterId);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const renderScreen = () => {
    switch (activeScreen) {
      case 'roster': return <RosterScreen />;
      case 'settings': return <SettingsScreen />;
      case 'chat':
      default: return <ChatScreen />;
    }
  };

  return (
    <div className="app">
      {/* Ambient light orbs — alexander.ad signature */}
      <div className="ambient-orb ambient-orb-cyan" />
      <div className="ambient-orb ambient-orb-pink" />

      <Sidebar />
      <div className="main-area">
        <Header />
        <div className="screen">
          {renderScreen()}
        </div>
      </div>

      {editingAgent && activeRosterId && (
        <AgentEditor
          agentId={editingAgent === '__new__' ? null : editingAgent}
          rosterId={activeRosterId}
          isNew={editingAgent === '__new__'}
          onClose={() => setEditingAgent(null)}
        />
      )}

      <Toast />
    </div>
  );
};

export default App;
