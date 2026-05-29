import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { DiffViewer } from './DiffViewer';

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
}

export function GitPanel({ cwd }: GitPanelProps) {
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
    <div className="h-full flex flex-col bg-gray-800">
      <div className="flex border-b border-gray-700">
        {(['status', 'diff', 'log'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'text-white bg-gray-700 border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
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
              <span className="text-gray-400">Branch:</span>
              <span className="text-white font-mono">{status.branch}</span>
              {status.ahead > 0 && (
                <span className="text-green-400">↑{status.ahead}</span>
              )}
              {status.behind > 0 && (
                <span className="text-red-400">↓{status.behind}</span>
              )}
            </div>

            {status.staged.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-400 uppercase mb-2">Staged</h4>
                {status.staged.map(file => (
                  <div key={file} className="flex items-center gap-2 py-1 text-sm">
                    <span className="text-green-400 w-4">A</span>
                    <span className="text-gray-300">{file}</span>
                  </div>
                ))}
              </div>
            )}

            {status.unstaged.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-400 uppercase mb-2">Changes</h4>
                {status.unstaged.map(file => (
                  <div key={file} className="flex items-center gap-2 py-1 text-sm group">
                    <span className="text-yellow-400 w-4">M</span>
                    <span className="flex-1 text-gray-300">{file}</span>
                    <button
                      onClick={() => handleStage([file])}
                      className="opacity-0 group-hover:opacity-100 px-2 py-0.5 text-xs text-blue-400 hover:text-blue-300 transition-opacity"
                    >
                      Stage
                    </button>
                  </div>
                ))}
              </div>
            )}

            {status.untracked.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-400 uppercase mb-2">Untracked</h4>
                {status.untracked.map(file => (
                  <div key={file} className="flex items-center gap-2 py-1 text-sm group">
                    <span className="text-gray-500 w-4">?</span>
                    <span className="flex-1 text-gray-300">{file}</span>
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

            <div className="pt-4 border-t border-gray-700">
              <textarea
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="Commit message..."
                className="w-full px-3 py-2 bg-gray-700 text-white text-sm rounded border border-gray-600 focus:outline-none focus:border-blue-500 resize-none"
                rows={3}
              />
              <button
                onClick={handleCommit}
                disabled={!commitMessage.trim() || isCommitting}
                className="mt-2 w-full px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isCommitting ? 'Committing...' : 'Commit'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'diff' && (
          <div className="flex flex-col h-full">
            {/* Diff mode selector */}
            <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-700/50">
              {(['working', 'staged', 'branch'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setDiffMode(mode)}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                    diffMode === mode
                      ? 'bg-blue-600/20 text-blue-400'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
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
              <div key={commit.hash} className="py-2 border-b border-gray-700 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-yellow-400 font-mono text-xs">{commit.hash}</span>
                  <span className="text-gray-500 text-xs">{commit.author}</span>
                </div>
                <p className="text-gray-300 text-sm mt-1">{commit.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
