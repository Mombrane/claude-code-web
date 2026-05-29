import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { ChatPanel } from '../chat/ChatPanel';
import { FileExplorer } from '../files/FileExplorer';
import { FileEditor } from '../files/FileEditor';
import { GitPanel } from '../git/GitPanel';
import { TerminalPanel } from '../terminal/TerminalPanel';
import { SettingsPanel } from '../settings/SettingsPanel';
import { wsClient } from '../../api/websocket';
import { useSessionStore } from '../../stores/sessionStore';
import { useI18n } from '../../i18n';

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

const SETTINGS_KEY = 'claude-code-web-settings';

const defaultSettings: Settings = {
  theme: 'dark',
  model: '',
  fontSize: 14,
  tabSize: 2,
  wordWrap: 'on',
  minimap: false,
  lineHeight: 1.2,
};

function loadSettings(): Settings {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      return { ...defaultSettings, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return defaultSettings;
}

function saveSettings(settings: Settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

function applyTheme(theme: 'dark' | 'light') {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.classList.toggle('light', theme === 'light');
}

export function AppLayout({ projectPath }: { projectPath?: string }) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [leftPanel, setLeftPanel] = useState<LeftPanel>('sessions');
  const [rightPanel, setRightPanel] = useState<RightPanel>('none');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { currentSessionId } = useSessionStore();

  // Apply theme on mount and when settings change
  useEffect(() => {
    applyTheme(settings.theme);
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    wsClient.connect();
    return () => wsClient.disconnect();
  }, []);

  // Command palette commands
  const commands = [
    {
      id: 'new-session',
      label: t('command.newSession'),
      shortcut: 'Ctrl+N',
      action: () => {
        if (projectPath) {
          const dir = btoa(projectPath);
          navigate(`/${dir}/session`);
        }
      }
    },
    { id: 'toggle-files', label: t('command.toggleFiles'), shortcut: 'Ctrl+Shift+F', action: () => setLeftPanel(prev => prev === 'files' ? 'sessions' : 'files') },
    { id: 'toggle-terminal', label: t('command.toggleTerminal'), shortcut: 'Ctrl+`', action: () => setRightPanel(prev => prev === 'terminal' ? 'none' : 'terminal') },
    { id: 'toggle-git', label: t('command.toggleGit'), shortcut: 'Ctrl+G', action: () => setRightPanel(prev => prev === 'git' ? 'none' : 'git') },
    { id: 'open-settings', label: t('command.openSettings'), shortcut: 'Ctrl+,', action: () => setShowSettings(true) },
    { id: 'toggle-sidebar', label: t('command.toggleSidebar'), shortcut: 'Ctrl+B', action: () => setSidebarCollapsed(prev => !prev) },
  ];

  const handleCommandSelect = useCallback((commandId: string) => {
    const cmd = commands.find(c => c.id === commandId);
    if (cmd) {
      cmd.action();
    }
    setShowCommandPalette(false);
  }, [commands, projectPath, navigate]);

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
        if (projectPath) {
          const dir = btoa(projectPath);
          navigate(`/${dir}/session`);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [projectPath, navigate]);

  const cwd = projectPath || '/home/huguangyao/mimo-workspace'; // Default working directory

  return (
    <div className={`flex flex-col h-screen overflow-hidden ${settings.theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      {/* Header */}
      <header className={`flex items-center justify-between px-3 py-2 border-b ${settings.theme === 'dark' ? 'bg-gray-800/80 border-gray-700/50' : 'bg-white/80 border-gray-200'}`}>
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <span className="text-xl"> </span>
            <h1 className={`text-sm font-semibold ${settings.theme === 'dark' ? 'text-gradient' : 'text-gray-800'}`}>Claude Code Web</h1>
          </div>

          {/* Separator */}
          <div className={`w-px h-5 ${settings.theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-300'}`} />

          {/* Panel toggles */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setLeftPanel('sessions')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-all duration-200 ${
                leftPanel === 'sessions'
                  ? settings.theme === 'dark'
                    ? 'bg-gray-700/80 text-white shadow-sm'
                    : 'bg-gray-200 text-gray-800 shadow-sm'
                  : settings.theme === 'dark'
                    ? 'text-gray-400 hover:text-white hover:bg-gray-700/40'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
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
                  ? settings.theme === 'dark'
                    ? 'bg-gray-700/80 text-white shadow-sm'
                    : 'bg-gray-200 text-gray-800 shadow-sm'
                  : settings.theme === 'dark'
                    ? 'text-gray-400 hover:text-white hover:bg-gray-700/40'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
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
            className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-md transition-all duration-200 ${
              settings.theme === 'dark'
                ? 'text-gray-400 hover:text-white bg-gray-700/30 hover:bg-gray-700/50'
                : 'text-gray-600 hover:text-gray-800 bg-gray-200 hover:bg-gray-300'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>Commands</span>
            <kbd className={`ml-1 px-1 py-0.5 rounded text-[10px] ${settings.theme === 'dark' ? 'bg-gray-600/50' : 'bg-gray-300'}`}>Ctrl+K</kbd>
          </button>

          {/* Separator */}
          <div className={`w-px h-5 ${settings.theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-300'}`} />

          {/* Right panel toggles */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setRightPanel(prev => prev === 'git' ? 'none' : 'git')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-all duration-200 ${
                rightPanel === 'git'
                  ? settings.theme === 'dark'
                    ? 'bg-gray-700/80 text-white shadow-sm'
                    : 'bg-gray-200 text-gray-800 shadow-sm'
                  : settings.theme === 'dark'
                    ? 'text-gray-400 hover:text-white hover:bg-gray-700/40'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
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
                  ? settings.theme === 'dark'
                    ? 'bg-gray-700/80 text-white shadow-sm'
                    : 'bg-gray-200 text-gray-800 shadow-sm'
                  : settings.theme === 'dark'
                    ? 'text-gray-400 hover:text-white hover:bg-gray-700/40'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
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
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-all duration-200 ${
                settings.theme === 'dark'
                  ? 'text-gray-400 hover:text-white hover:bg-gray-700/40'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
              }`}
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
          className={`border-r transition-all duration-300 ${
            sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-64'
          } ${settings.theme === 'dark' ? 'border-gray-700/50' : 'border-gray-200'}`}
        >
          {leftPanel === 'sessions' ? (
            <Sidebar projectPath={projectPath} theme={settings.theme} />
          ) : (
            <FileExplorer rootPath={cwd} onFileSelect={setSelectedFile} />
          )}
        </div>

        {/* Center Panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedFile ? (
            <FileEditor filePath={selectedFile} onClose={() => setSelectedFile(null)} settings={{ fontSize: settings.fontSize, tabSize: settings.tabSize, wordWrap: settings.wordWrap, minimap: settings.minimap }} />
          ) : (
            <ChatPanel />
          )}
          {rightPanel === 'terminal' && currentSessionId && (
            <TerminalPanel
              sessionId={currentSessionId}
              theme={settings.theme}
            />
          )}
        </div>

        {/* Right Panel */}
        {rightPanel === 'git' && (
          <div className={`w-80 border-l animate-slideIn ${settings.theme === 'dark' ? 'border-gray-700/50' : 'border-gray-200'}`}>
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
          theme={settings.theme}
          t={t}
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
      <footer className={`flex items-center justify-between px-4 py-1.5 border-t text-[11px] ${
        settings.theme === 'dark'
          ? 'bg-gray-800/60 border-gray-700/50 text-gray-500'
          : 'bg-gray-100 border-gray-200 text-gray-600'
      }`}>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="text-base"> </span>
            <span className="font-medium">Claude Code Web</span>
            <span className={settings.theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}>v1.0.0</span>
          </span>
          <span className={settings.theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}>|</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            Connected
          </span>
          <span className={settings.theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}>|</span>
          <span>{settings.model || 'mimo-v2.5-pro'}</span>
        </div>
        <div className="flex items-center gap-3">
          <kbd className={`px-1.5 py-0.5 rounded text-[10px] ${settings.theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-200'}`}>Ctrl+K</kbd>
          <span>Commands</span>
          <span className={settings.theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}>|</span>
          <kbd className={`px-1.5 py-0.5 rounded text-[10px] ${settings.theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-200'}`}>Ctrl+B</kbd>
          <span>Sidebar</span>
        </div>
      </footer>
    </div>
  );
}

// Command Palette Component
function CommandPalette({ commands, onSelect, onClose, theme = 'dark', t }: {
  commands: Array<{ id: string; label: string; shortcut: string; action: () => void }>;
  onSelect: (id: string) => void;
  onClose: () => void;
  theme?: 'dark' | 'light';
  t: (key: string) => string;
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
        className={`w-full max-w-md border rounded-xl shadow-2xl overflow-hidden animate-fadeIn ${
          theme === 'dark'
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className={`flex items-center gap-3 px-4 py-3 border-b ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <svg className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            data-command-input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('command.search')}
            className={`flex-1 bg-transparent focus:outline-none text-sm ${
              theme === 'dark'
                ? 'text-white placeholder-gray-500'
                : 'text-gray-800 placeholder-gray-400'
            }`}
          />
          <kbd className={`px-1.5 py-0.5 rounded text-[10px] ${
            theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'
          }`}>Esc</kbd>
        </div>

        {/* Command list */}
        <div className="max-h-64 overflow-y-auto py-2">
          {filtered.map((cmd, index) => (
            <button
              key={cmd.id}
              onClick={() => onSelect(cmd.id)}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                index === selectedIndex
                  ? theme === 'dark'
                    ? 'bg-blue-600/20 text-blue-400'
                    : 'bg-blue-100 text-blue-600'
                  : theme === 'dark'
                    ? 'text-gray-300 hover:bg-gray-700/50'
                    : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span>{cmd.label}</span>
              <kbd className={`px-2 py-0.5 rounded text-xs ${
                theme === 'dark' ? 'bg-gray-700/50 text-gray-500' : 'bg-gray-200 text-gray-500'
              }`}>
                {cmd.shortcut}
              </kbd>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className={`px-4 py-8 text-center ${
              theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
            }`}>
              {t('command.noResults')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
