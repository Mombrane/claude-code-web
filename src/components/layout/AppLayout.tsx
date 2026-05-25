import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { ChatPanel } from '../chat/ChatPanel';
import { FileExplorer } from '../files/FileExplorer';
import { FileEditor } from '../files/FileEditor';
import { GitPanel } from '../git/GitPanel';
import { TerminalPanel } from '../terminal/TerminalPanel';
import { SettingsPanel } from '../settings/SettingsPanel';
import { wsClient } from '../../api/websocket';
import { useSessionStore } from '../../stores/sessionStore';

type LeftPanel = 'sessions' | 'files';
type RightPanel = 'git' | 'terminal' | 'none';

interface Settings {
  theme: 'dark' | 'light';
  model: string;
  fontSize: number;
  tabSize: number;
  wordWrap: 'on' | 'off';
  minimap: boolean;
  lineHeight: number;
}

const defaultSettings: Settings = {
  theme: 'dark',
  model: 'claude-sonnet-4-20250514',
  fontSize: 14,
  tabSize: 2,
  wordWrap: 'on',
  minimap: false,
  lineHeight: 1.2,
};

export function AppLayout() {
  const [leftPanel, setLeftPanel] = useState<LeftPanel>('sessions');
  const [rightPanel, setRightPanel] = useState<RightPanel>('none');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [terminalOutput, setTerminalOutput] = useState('');
  const [isTerminalRunning] = useState(false);
  useSessionStore();

  useEffect(() => {
    wsClient.connect();
    return () => wsClient.disconnect();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+F: Toggle files panel
      if (e.ctrlKey && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        setLeftPanel(prev => prev === 'files' ? 'sessions' : 'files');
      }
      // Ctrl+`: Toggle terminal
      if (e.ctrlKey && e.key === '`') {
        e.preventDefault();
        setRightPanel(prev => prev === 'terminal' ? 'none' : 'terminal');
      }
      // Ctrl+G: Toggle git panel
      if (e.ctrlKey && e.key === 'g') {
        e.preventDefault();
        setRightPanel(prev => prev === 'git' ? 'none' : 'git');
      }
      // Ctrl+,: Open settings
      if (e.ctrlKey && e.key === ',') {
        e.preventDefault();
        setShowSettings(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const cwd = '/home/huguangyao/mimo-workspace'; // Default working directory

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold">Claude Code Web</h1>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setLeftPanel('sessions')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                leftPanel === 'sessions' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Sessions
            </button>
            <button
              onClick={() => setLeftPanel('files')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                leftPanel === 'files' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Files
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRightPanel(prev => prev === 'git' ? 'none' : 'git')}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              rightPanel === 'git' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Git
          </button>
          <button
            onClick={() => setRightPanel(prev => prev === 'terminal' ? 'none' : 'terminal')}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              rightPanel === 'terminal' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Terminal
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="px-3 py-1 text-sm text-gray-400 hover:text-white rounded transition-colors"
          >
            Settings
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel */}
        <div className="w-64 border-r border-gray-700">
          {leftPanel === 'sessions' ? (
            <Sidebar />
          ) : (
            <FileExplorer rootPath={cwd} onFileSelect={setSelectedFile} />
          )}
        </div>

        {/* Center Panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedFile ? (
            <FileEditor filePath={selectedFile} onClose={() => setSelectedFile(null)} />
          ) : (
            <ChatPanel />
          )}
          {rightPanel === 'terminal' && (
            <TerminalPanel
              output={terminalOutput}
              isRunning={isTerminalRunning}
              onClear={() => setTerminalOutput('')}
            />
          )}
        </div>

        {/* Right Panel */}
        {rightPanel === 'git' && (
          <div className="w-80 border-l border-gray-700">
            <GitPanel cwd={cwd} />
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <SettingsPanel
          settings={settings}
          onSave={setSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Status Bar */}
      <footer className="flex items-center justify-between px-4 py-1 bg-gray-800 border-t border-gray-700 text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <span>Claude Code Web v1.0.0</span>
          <span>Model: {settings.model}</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Ctrl+Shift+F: Files</span>
          <span>Ctrl+`: Terminal</span>
          <span>Ctrl+G: Git</span>
          <span>Ctrl+,: Settings</span>
        </div>
      </footer>
    </div>
  );
}
