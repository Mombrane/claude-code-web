import { useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { ChatPanel } from './components/chat/ChatPanel';
import { wsClient } from './api/websocket';

function App() {
  useEffect(() => {
    wsClient.connect();
    return () => wsClient.disconnect();
  }, []);

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      <Sidebar />
      <ChatPanel />
    </div>
  );
}

export default App;
