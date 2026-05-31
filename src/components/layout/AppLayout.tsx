import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { ChatPanel } from '../chat/ChatPanel';
import { FileExplorer } from '../files/FileExplorer';
import { wsClient } from '../../api/websocket';
import { useSessionStore } from '../../stores/sessionStore';
import { useI18n } from '../../i18n';
import { useTheme } from '../ui/ThemeProvider';
import { encodePath } from '../../utils/format';

// Lazy-load heavy panels to reduce initial bundle size
const FileEditor = lazy(() => import('../files/FileEditor').then(m => ({ default: m.FileEditor })));
const GitPanel = lazy(() => import('../git/GitPanel').then(m => ({ default: m.GitPanel })));
const TerminalPanel = lazy(() => import('../terminal/TerminalPanel').then(m => ({ default: m.TerminalPanel })));
const SettingsPanel = lazy(() => import('../settings/SettingsPanel').then(m => ({ default: m.SettingsPanel })));

type LeftPanel = 'sessions' | 'files';
type RightPanel = 'git' | 'terminal' | 'none';

interface Settings {
  model: string;
  fontSize: number;
  tabSize: number;
  wordWrap: 'on' | 'off';
  minimap: boolean;
  lineHeight: number;
}

const SETTINGS_KEY = 'claude-code-web-settings';

const defaultSettings: Settings = {
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
      const parsed = JSON.parse(saved);
      // Remove legacy theme field if present
      delete parsed.theme;
      return { ...defaultSettings, ...parsed };
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

export function AppLayout({ projectPath }: { projectPath?: string }) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const [leftPanel, setLeftPanel] = useState<LeftPanel>('sessions');
  const [rightPanel, setRightPanel] = useState<RightPanel>('none');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { currentSessionId, currentMessages, sessions } = useSessionStore();
  const [wsStatus, setWsStatus] = useState({ connected: false, reconnecting: false });

  // Persist non-theme settings
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    wsClient.connect();
    setWsStatus(wsClient.getStatus());
    const unsubscribe = wsClient.onStatusChange(setWsStatus);
    // Don't disconnect - WebSocket is a singleton, persists across HMR reloads
    return () => { unsubscribe(); };
  }, []);

  // Command palette commands
  const commands = [
    {
      id: 'new-session',
      label: t('command.newSession'),
      shortcut: 'Ctrl+N',
      action: () => {
        if (projectPath) {
          const dir = encodePath(projectPath);
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
          const dir = encodePath(projectPath);
          navigate(`/${dir}/session`);
        }
      }
      // Ctrl+Shift+T: Toggle theme
      if (e.ctrlKey && e.shiftKey && (e.key === 'T' || e.key === 't')) {
        e.preventDefault();
        toggleTheme();
      }

      // Ctrl+L: Focus chat input
      if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        // Dispatch custom event that InputBar listens for
        window.dispatchEvent(new CustomEvent('focus-chat-input'));
        return;
      }

      // Ctrl+Up/Down: Session quick-switch
      if (e.ctrlKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        // Don't trigger when input/textarea is focused
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

        e.preventDefault();
        const state = useSessionStore.getState();
        const { sessions, currentSessionId } = state;
        if (sessions.length === 0) return;

        // Sort sessions by updatedAt (newest first) - same as sidebar
        const sorted = [...sessions].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );

        const currentIndex = sorted.findIndex(s => s.id === currentSessionId);
        let nextIndex: number;
        if (e.key === 'ArrowUp') {
          nextIndex = currentIndex <= 0 ? sorted.length - 1 : currentIndex - 1;
        } else {
          nextIndex = currentIndex >= sorted.length - 1 ? 0 : currentIndex + 1;
        }

        const nextSession = sorted[nextIndex];
        if (nextSession) {
          state.setCurrentSession(nextSession.id);
          const dir = encodePath(nextSession.projectPath || nextSession.cwd);
          navigate(`/${dir}/session/${nextSession.id}`);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [projectPath, navigate, toggleTheme]);

  const cwd = projectPath || '';

  return (
    <div className={`flex flex-col h-screen overflow-hidden ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      {/* Header */}
      <header className={`flex items-center justify-between px-3 py-2 border-b ${theme === 'dark' ? 'bg-gray-800/80 border-gray-700/50' : 'bg-white/80 border-gray-200'}`}>
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <span className="text-xl"> </span>
            <h1 className={`text-sm font-semibold ${theme === 'dark' ? 'text-gradient' : 'text-gray-800'}`}>{t('app.name')}</h1>
          </div>

          {/* Separator */}
          <div className={`w-px h-5 ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-300'}`} />

          {/* Panel toggles */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setLeftPanel('sessions')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-all duration-200 ${
                leftPanel === 'sessions'
                  ? theme === 'dark'
                    ? 'bg-gray-700/80 text-white shadow-sm'
                    : 'bg-gray-200 text-gray-800 shadow-sm'
                  : theme === 'dark'
                    ? 'text-gray-400 hover:text-white hover:bg-gray-700/40'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              {t('sidebar.sessions')}
            </button>
            <button
              onClick={() => setLeftPanel('files')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-all duration-200 ${
                leftPanel === 'files'
                  ? theme === 'dark'
                    ? 'bg-gray-700/80 text-white shadow-sm'
                    : 'bg-gray-200 text-gray-800 shadow-sm'
                  : theme === 'dark'
                    ? 'text-gray-400 hover:text-white hover:bg-gray-700/40'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              {t('sidebar.files')}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Command palette button */}
          <button
            onClick={() => setShowCommandPalette(true)}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-md transition-all duration-200 ${
              theme === 'dark'
                ? 'text-gray-400 hover:text-white bg-gray-700/30 hover:bg-gray-700/50'
                : 'text-gray-600 hover:text-gray-800 bg-gray-200 hover:bg-gray-300'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>{t('command.palette')}</span>
            <kbd className={`ml-1 px-1 py-0.5 rounded text-[10px] ${theme === 'dark' ? 'bg-gray-600/50' : 'bg-gray-300'}`}>Ctrl+K</kbd>
          </button>

          {/* Separator */}
          <div className={`w-px h-5 ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-300'}`} />

          {/* Right panel toggles */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setRightPanel(prev => prev === 'git' ? 'none' : 'git')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-all duration-200 ${
                rightPanel === 'git'
                  ? theme === 'dark'
                    ? 'bg-gray-700/80 text-white shadow-sm'
                    : 'bg-gray-200 text-gray-800 shadow-sm'
                  : theme === 'dark'
                    ? 'text-gray-400 hover:text-white hover:bg-gray-700/40'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
              }`}
              title={t('layout.gitTooltip')}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {t('git.title')}
            </button>
            <button
              onClick={() => setRightPanel(prev => prev === 'terminal' ? 'none' : 'terminal')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-all duration-200 ${
                rightPanel === 'terminal'
                  ? theme === 'dark'
                    ? 'bg-gray-700/80 text-white shadow-sm'
                    : 'bg-gray-200 text-gray-800 shadow-sm'
                  : theme === 'dark'
                    ? 'text-gray-400 hover:text-white hover:bg-gray-700/40'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
              }`}
              title={t('layout.terminalTooltip')}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {t('terminal.title')}
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-all duration-200 ${
                theme === 'dark'
                  ? 'text-gray-400 hover:text-white hover:bg-gray-700/40'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
              }`}
              title={t('layout.settingsTooltip')}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>

          {/* Connection status indicator */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            <span className={`w-2 h-2 rounded-full ${wsStatus.connected ? 'bg-green-400' : wsStatus.reconnecting ? 'bg-yellow-400 animate-pulse' : 'bg-red-400'}`} />
            {wsStatus.connected
              ? t('status.connected')
              : wsStatus.reconnecting
                ? t('status.reconnecting')
                : <>
                    {t('status.disconnected')}
                    <button
                      onClick={() => wsClient.connect()}
                      className={`ml-1 px-1.5 py-0.5 rounded text-[10px] transition-colors ${theme === 'dark' ? 'bg-gray-600/50 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                    >
                      {t('status.reconnect')}
                    </button>
                  </>
            }
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel */}
        <div
          className={`border-r transition-all duration-300 ${
            sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-64'
          } ${theme === 'dark' ? 'border-gray-700/50' : 'border-gray-200'}`}
        >
          {leftPanel === 'sessions' ? (
            <Sidebar projectPath={projectPath} theme={theme} />
          ) : (
            cwd ? <FileExplorer rootPath={cwd} onFileSelect={setSelectedFile} theme={theme} /> : <div className="flex items-center justify-center h-full text-gray-500"><p>{t("fileExplorer.noProject")}</p></div>
          )}
        </div>

        {/* Center Panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedFile ? (
            <Suspense fallback={<LoadingPanel theme={theme} />}>
              <FileEditor filePath={selectedFile} onClose={() => setSelectedFile(null)} settings={{ fontSize: settings.fontSize, tabSize: settings.tabSize, wordWrap: settings.wordWrap, minimap: settings.minimap }} theme={theme} />
            </Suspense>
          ) : (
            <ChatPanel theme={theme} />
          )}
          {rightPanel === 'terminal' && currentSessionId && (
            <Suspense fallback={<LoadingPanel theme={theme} />}>
              <TerminalPanel
                sessionId={currentSessionId}
                theme={theme}
              />
            </Suspense>
          )}
        </div>

        {/* Right Panel */}
        {rightPanel === 'git' && (
          <div className={`w-80 border-l animate-slideIn ${theme === 'dark' ? 'border-gray-700/50' : 'border-gray-200'}`}>
            {cwd ? <Suspense fallback={<LoadingPanel theme={theme} />}><GitPanel cwd={cwd} theme={theme} /></Suspense> : <div className="flex items-center justify-center h-full text-gray-500 p-4"><p>{t("git.noProject")}</p></div>}
          </div>
        )}
      </div>

      {/* Command Palette */}
      {showCommandPalette && (
        <CommandPalette
          commands={commands}
          onSelect={handleCommandSelect}
          onClose={() => setShowCommandPalette(false)}
          theme={theme}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <Suspense fallback={<LoadingPanel theme={theme} />}>
          <SettingsPanel
            settings={settings}
            onSave={setSettings}
            onClose={() => setShowSettings(false)}
            theme={theme}
          />
        </Suspense>
      )}

      {/* Status Bar */}
      <footer className={`flex items-center justify-between px-4 py-1.5 border-t text-[11px] ${
        theme === 'dark'
          ? 'bg-gray-800/60 border-gray-700/50 text-gray-500'
          : 'bg-gray-100 border-gray-200 text-gray-600'
      }`}>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="text-base"> </span>
            <span className="font-medium">{t('app.name')}</span>
            <span className={theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}>{t('app.version')}</span>
          </span>
          <span className={theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}>|</span>
          <span className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${wsStatus.connected ? 'bg-green-400' : wsStatus.reconnecting ? 'bg-yellow-400' : 'bg-red-400'}`} />
            {wsStatus.connected ? t('status.connected') : wsStatus.reconnecting ? t('status.reconnecting') : t('status.disconnected')}
          </span>
          <span className={theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}>|</span>
          <span>{sessions.find(s => s.id === currentSessionId)?.model?.split('/').pop() || settings.model || t('status.defaultModel')}</span>
          <span className={theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}>|</span>
          <span>{t('status.messages', { count: currentMessages.length })}</span>
        </div>
        <div className="flex items-center gap-3">
          <kbd className={`px-1.5 py-0.5 rounded text-[10px] ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-200'}`}>Ctrl+K</kbd>
          <span>{t('command.palette')}</span>
          <span className={theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}>|</span>
          <kbd className={`px-1.5 py-0.5 rounded text-[10px] ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-200'}`}>Ctrl+B</kbd>
          <span>{t('sidebar.title')}</span>
        </div>
      </footer>
    </div>
  );
}

// Loading fallback for lazy-loaded panels
function LoadingPanel({ theme = 'dark' }: { theme?: 'dark' | 'light' }) {
  const { t } = useI18n();
  return (
    <div className={`flex items-center justify-center h-full ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="flex flex-col items-center gap-3">
        <div className={`w-6 h-6 border-2 rounded-full animate-spin ${theme === 'dark' ? 'border-gray-600 border-t-blue-400' : 'border-gray-300 border-t-blue-500'}`} />
        <span className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{t('common.loading')}</span>
      </div>
    </div>
  );
}

// Command Palette Component
function CommandPalette({ commands, onSelect, onClose, theme = 'dark' }: {
  commands: Array<{ id: string; label: string; shortcut: string; action: () => void }>;
  onSelect: (id: string) => void;
  onClose: () => void;
  theme?: 'dark' | 'light';
}) {
  const { t } = useI18n();
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
