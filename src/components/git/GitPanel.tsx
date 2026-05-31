import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { DiffViewer } from './DiffViewer';
import { useI18n } from '../../i18n';

interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: string[];
  unstaged: string[];
  untracked: string[];
}

interface CommitInfo {
  hash: string;
  author: string;
  date: string;
  message: string;
}

interface GitPanelProps {
  cwd: string;
  theme?: 'dark' | 'light';
}

export function GitPanel({ cwd, theme = 'dark' }: GitPanelProps) {
  const { t } = useI18n();
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [log, setLog] = useState<CommitInfo[]>([]);
  const [commitMessage, setCommitMessage] = useState('');
  const [isCommitting, setIsCommitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'status' | 'diff' | 'log'>('status');
  const [diffMode, setDiffMode] = useState<'working' | 'staged' | 'branch'>('working');

  useEffect(() => {
    loadGitData();
  }, [cwd]);

  const loadGitData = async () => {
    try {
      const [statusData, logData] = await Promise.all([
        api.getGitStatus(cwd),
        api.getGitLog(cwd, 20),
      ]);
      setStatus(statusData);
      setLog(logData);
    } catch (e) {
      console.error('Failed to load git data:', e);
    }
  };

  const handleStage = async (files: string[]) => {
    try {
      await api.gitStage(cwd, files);
      loadGitData();
    } catch (e) {
      console.error('Failed to stage files:', e);
    }
  };

  const handleCommit = async () => {
    if (!commitMessage.trim()) return;
    setIsCommitting(true);
    try {
      await api.gitCommit(cwd, commitMessage);
      setCommitMessage('');
      loadGitData();
    } catch (e) {
      console.error('Failed to commit:', e);
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className={`h-full flex flex-col ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
      <div className={`flex border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        {(['status', 'diff', 'log'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? theme === 'dark'
                  ? 'text-white bg-gray-700 border-b-2 border-blue-500'
                  : 'text-gray-900 bg-gray-200 border-b-2 border-blue-500'
                : theme === 'dark'
                  ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'status' && status && (
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>{t('git.branch')}:</span>
              <span className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'} font-mono`}>{status.branch}</span>
              {status.ahead > 0 && (
                <span className="text-green-400">↑{status.ahead}</span>
              )}
              {status.behind > 0 && (
                <span className="text-red-400">↓{status.behind}</span>
              )}
            </div>

            {status.staged.length > 0 && (
              <div>
                <h4 className={`text-xs font-medium uppercase mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Staged</h4>
                {status.staged.map(file => (
                  <div key={file} className="flex items-center gap-2 py-1 text-sm">
                    <span className="text-green-400 w-4">A</span>
                    <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>{file}</span>
                  </div>
                ))}
              </div>
            )}

            {status.unstaged.length > 0 && (
              <div>
                <h4 className={`text-xs font-medium uppercase mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Changes</h4>
                {status.unstaged.map(file => (
                  <div key={file} className="flex items-center gap-2 py-1 text-sm group">
                    <span className="text-yellow-400 w-4">M</span>
                    <span className={`flex-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{file}</span>
                    <button
                      onClick={() => handleStage([file])}
                      className="opacity-0 group-hover:opacity-100 px-2 py-0.5 text-xs text-blue-400 hover:text-blue-300 transition-opacity"
                    >
                      {t('git.stage')}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {status.untracked.length > 0 && (
              <div>
                <h4 className={`text-xs font-medium uppercase mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Untracked</h4>
                {status.untracked.map(file => (
                  <div key={file} className="flex items-center gap-2 py-1 text-sm group">
                    <span className="text-gray-500 w-4">?</span>
                    <span className={`flex-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{file}</span>
                    <button
                      onClick={() => handleStage([file])}
                      className="opacity-0 group-hover:opacity-100 px-2 py-0.5 text-xs text-blue-400 hover:text-blue-300 transition-opacity"
                    >
                      Track
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className={`pt-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <textarea
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder={t('git.commitMessage')}
                className={`w-full px-3 py-2 text-sm rounded border focus:outline-none focus:border-blue-500 resize-none ${
                  theme === 'dark'
                    ? 'bg-gray-700 text-white border-gray-600'
                    : 'bg-white text-gray-900 border-gray-300'
                }`}
                rows={3}
              />
              <button
                onClick={handleCommit}
                disabled={!commitMessage.trim() || isCommitting}
                className="mt-2 w-full px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isCommitting ? t('git.commit') + '...' : t('git.commit')}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'diff' && (
          <div className="flex flex-col h-full">
            {/* Diff mode selector */}
            <div className={`flex items-center gap-2 px-4 py-2 border-b ${theme === 'dark' ? 'border-gray-700/50' : 'border-gray-200'}`}>
              {(['working', 'staged', 'branch'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setDiffMode(mode)}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                    diffMode === mode
                      ? 'bg-blue-600/20 text-blue-400'
                      : theme === 'dark'
                        ? 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
            <DiffViewer cwd={cwd} mode={diffMode} />
          </div>
        )}

        {activeTab === 'log' && (
          <div className="p-4 space-y-2">
            {log.map(commit => (
              <div key={commit.hash} className={`py-2 border-b last:border-0 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-yellow-400 font-mono text-xs">{commit.hash}</span>
                  <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>{commit.author}</span>
                </div>
                <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{commit.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
