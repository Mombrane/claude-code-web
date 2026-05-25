import { useState, useEffect, useCallback } from 'react';
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
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [terminalOutput, setTerminalOutput] = useState('');
  const [isTerminalRunning] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  useSessionStore();

  useEffect(() => {
    wsClient.connect();
    return () => wsClient.disconnect();
  }, []);

  // Command palette commands
  const commands = [
    { id: 'new-session', label: 'New Session', shortcut: 'Ctrl+N', action: () => {} },
    { id: 'toggle-files', label: 'Toggle Files Panel', shortcut: 'Ctrl+Shift+F', action: () => setLeftPanel(prev => prev === 'files' ? 'sessions' : 'files') },
    { id: 'toggle-terminal', label: 'Toggle Terminal', shortcut: 'Ctrl+`', action: () => setRightPanel(prev => prev === 'terminal' ? 'none' : 'terminal') },
    { id: 'toggle-git', label: 'Toggle Git Panel', shortcut: 'Ctrl+G', action: () => setRightPanel(prev => prev === 'git' ? 'none' : 'git') },
    { id: 'open-settings', label: 'Open Settings', shortcut: 'Ctrl+,', action: () => setShowSettings(true) },
    { id: 'toggle-sidebar', label: 'Toggle Sidebar', shortcut: 'Ctrl+B', action: () => setSidebarCollapsed(prev => !prev) },
  ];

  const handleCommandSelect = useCallback((commandId: string) => {
    const cmd = commands.find(c => c.id === commandId);
    if (cmd) {
      cmd.action();
    }
    setShowCommandPalette(false);
  }, [commands]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K: Command palette
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
        return;
      }

      // Escape: Close command palette
      if (e.key === 'Escape') {
        setShowCommandPalette(false);
        return;
      }

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
      if (e.ctrlKey && e.key === 'g' && !e.shiftKey) {
        e.preventDefault();
        setRightPanel(prev => prev === 'git' ? 'none' : 'git');
      }
      // Ctrl+,: Open settings
      if (e.ctrlKey && e.key === ',') {
        e.preventDefault();
        setShowSettings(true);
      }
      // Ctrl+B: Toggle sidebar
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        setSidebarCollapsed(prev => !prev);
      }
      // Ctrl+N: New session
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        // TODO: Implement new session
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const cwd = '/home/huguangyao/mimo-workspace'; // Default working directory

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-3 py-2 bg-gray-800/80 border-b border-gray-700/50 glass">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <span className="text-xl"> </span>
            <h1 className="text-sm font-semibold text-gradient">Claude Code Web</h1>
          </div>

          {/* Separator */}
          <div className="w-px h-5 bg-gray-700/50" />

          {/* Panel toggles */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setLeftPanel('sessions')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-all duration-200 ${
                leftPanel === 'sessions'
                  ? 'bg-gray-700/80 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/40'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              Sessions
            </button>
            <button
              onClick={() => setLeftPanel('files')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-all duration-200 ${
                leftPanel === 'files'
                  ? 'bg-gray-700/80 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/40'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              Files
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Command palette button */}
          <button
            onClick={() => setShowCommandPalette(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-gray-700/30 hover:bg-gray-700/50 rounded-md transition-all duration-200"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>Commands</span>
            <kbd className="ml-1 px-1 py-0.5 bg-gray-600/50 rounded text-[10px]">Ctrl+K</kbd>
          </button>

          {/* Separator */}
          <div className="w-px h-5 bg-gray-700/50" />

          {/* Right panel toggles */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setRightPanel(prev => prev === 'git' ? 'none' : 'git')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-all duration-200 ${
                rightPanel === 'git'
                  ? 'bg-gray-700/80 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/40'
              }`}
              title="Git Panel (Ctrl+G)"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Git
            </button>
            <button
              onClick={() => setRightPanel(prev => prev === 'terminal' ? 'none' : 'terminal')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-all duration-200 ${
                rightPanel === 'terminal'
                  ? 'bg-gray-700/80 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/40'
              }`}
              title="Terminal (Ctrl+`)"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Terminal
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-gray-700/40 rounded-md transition-all duration-200"
              title="Settings (Ctrl+,)"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel */}
        <div
          className={`border-r border-gray-700/50 transition-all duration-300 ${
            sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-64'
          }`}
        >
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
          <div className="w-80 border-l border-gray-700/50 animate-slideIn">
            <GitPanel cwd={cwd} />
          </div>
        )}
      </div>

      {/* Command Palette */}
      {showCommandPalette && (
        <CommandPalette
          commands={commands}
          onSelect={handleCommandSelect}
          onClose={() => setShowCommandPalette(false)}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsPanel
          settings={settings}
          onSave={setSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Status Bar */}
      <footer className="flex items-center justify-between px-4 py-1.5 bg-gray-800/60 border-t border-gray-700/50 text-[11px] text-gray-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="text-base"> </span>
            <span className="font-medium">Claude Code Web</span>
            <span className="text-gray-600">v1.0.0</span>
          </span>
          <span className="text-gray-600">|</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            Connected
          </span>
          <span className="text-gray-600">|</span>
          <span>{settings.model}</span>
        </div>
        <div className="flex items-center gap-3">
          <kbd className="px-1.5 py-0.5 bg-gray-700/50 rounded text-[10px]">Ctrl+K</kbd>
          <span>Commands</span>
          <span className="text-gray-600">|</span>
          <kbd className="px-1.5 py-0.5 bg-gray-700/50 rounded text-[10px]">Ctrl+B</kbd>
          <span>Sidebar</span>
        </div>
      </footer>
    </div>
  );
}

// Command Palette Component
function CommandPalette({ commands, onSelect, onClose }: {
  commands: Array<{ id: string; label: string; shortcut: string; action: () => void }>;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filtered = commands.filter(cmd =>
    cmd.label.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    // Focus input on mount
    const input = document.querySelector('[data-command-input]') as HTMLInputElement;
    if (input) {
      input.focus();
    }
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filtered[selectedIndex]) {
          onSelect(filtered[selectedIndex].id);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]" onClick={onClose}>
      <div
        className="w-full max-w-md bg-gray-800 border border-gray-700 rounded-xl shadow-2xl overflow-hidden animate-fadeIn"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-700">
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            data-command-input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search commands..."
            className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none text-sm"
          />
          <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-[10px] text-gray-400">Esc</kbd>
        </div>

        {/* Command list */}
        <div className="max-h-64 overflow-y-auto py-2">
          {filtered.map((cmd, index) => (
            <button
              key={cmd.id}
              onClick={() => onSelect(cmd.id)}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                index === selectedIndex
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-gray-300 hover:bg-gray-700/50'
              }`}
            >
              <span>{cmd.label}</span>
              <kbd className="px-2 py-0.5 bg-gray-700/50 rounded text-xs text-gray-500">
                {cmd.shortcut}
              </kbd>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-500">
              No commands found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
