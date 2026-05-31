import { useState, useEffect, useMemo } from 'react';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';

interface DiffViewerProps {
  cwd: string;
  mode?: 'working' | 'staged' | 'branch';
  baseBranch?: string;
  theme?: 'dark' | 'light';
}

interface DiffLine {
  type: 'add' | 'delete' | 'context' | 'header' | 'hunk';
  content: string;
  oldLine?: number;
  newLine?: number;
}

interface DiffFile {
  path: string;
  lines: DiffLine[];
  additions: number;
  deletions: number;
}

function parseDiff(diffText: string): DiffFile[] {
  if (!diffText) return [];

  const files: DiffFile[] = [];
  let currentFile: DiffFile | null = null;
  let oldLine = 0;
  let newLine = 0;

  for (const line of diffText.split('\n')) {
    // New file header
    if (line.startsWith('diff --git')) {
      const match = line.match(/b\/(.+)$/);
      if (match) {
        currentFile = {
          path: match[1],
          lines: [],
          additions: 0,
          deletions: 0,
        };
        files.push(currentFile);
      }
      continue;
    }

    if (!currentFile) continue;

    // File metadata lines
    if (line.startsWith('---') || line.startsWith('+++') || line.startsWith('index') || line.startsWith('new file') || line.startsWith('deleted file')) {
      continue;
    }

    // Hunk header
    if (line.startsWith('@@')) {
      const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) {
        oldLine = parseInt(match[1]);
        newLine = parseInt(match[2]);
      }
      currentFile.lines.push({ type: 'hunk', content: line });
      continue;
    }

    // Diff content
    if (line.startsWith('+')) {
      currentFile.lines.push({ type: 'add', content: line.slice(1), newLine: newLine++ });
      currentFile.additions++;
    } else if (line.startsWith('-')) {
      currentFile.lines.push({ type: 'delete', content: line.slice(1), oldLine: oldLine++ });
      currentFile.deletions++;
    } else {
      currentFile.lines.push({ type: 'context', content: line.slice(1), oldLine: oldLine++, newLine: newLine++ });
    }
  }

  return files;
}

function DiffLineComponent({ line, theme }: { line: DiffLine; theme: 'dark' | 'light' }) {
  const bgColor = {
    add: theme === 'dark' ? 'bg-green-900/20' : 'bg-green-100',
    delete: theme === 'dark' ? 'bg-red-900/20' : 'bg-red-100',
    context: '',
    header: theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-100',
    hunk: theme === 'dark' ? 'bg-blue-900/10' : 'bg-blue-50',
  }[line.type];

  const textColor = {
    add: theme === 'dark' ? 'text-green-400' : 'text-green-600',
    delete: theme === 'dark' ? 'text-red-400' : 'text-red-600',
    context: theme === 'dark' ? 'text-gray-300' : 'text-gray-700',
    header: theme === 'dark' ? 'text-gray-500' : 'text-gray-500',
    hunk: theme === 'dark' ? 'text-blue-400' : 'text-blue-600',
  }[line.type];

  const prefix = {
    add: '+',
    delete: '-',
    context: ' ',
    header: '',
    hunk: '',
  }[line.type];

  return (
    <div className={`flex ${bgColor}`}>
      {line.type !== 'hunk' && line.type !== 'header' && (
        <>
          <span className={`w-12 text-right pr-2 text-xs select-none shrink-0 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>
            {line.oldLine || ''}
          </span>
          <span className={`w-12 text-right pr-2 text-xs select-none shrink-0 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>
            {line.newLine || ''}
          </span>
        </>
      )}
      <span className={`w-6 text-center select-none shrink-0 ${textColor}`}>
        {prefix}
      </span>
      <pre className={`flex-1 px-2 ${textColor} whitespace-pre-wrap break-all`}>
        {line.content}
      </pre>
    </div>
  );
}

function DiffFileComponent({ file, isExpanded, onToggle, theme }: {
  file: DiffFile;
  isExpanded: boolean;
  onToggle: () => void;
  theme: 'dark' | 'light';
}) {
  return (
    <div className={`border rounded-lg overflow-hidden ${theme === 'dark' ? 'border-gray-700/50' : 'border-gray-200'}`}>
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left ${
          theme === 'dark'
            ? 'bg-gray-800/50 hover:bg-gray-800/80'
            : 'bg-gray-50 hover:bg-gray-100'
        }`}
      >
        <svg
          className={`w-4 h-4 transition-transform ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'} ${isExpanded ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className={`text-sm font-mono flex-1 truncate ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{file.path}</span>
        <span className="flex items-center gap-2 text-xs">
          <span className={theme === 'dark' ? 'text-green-400' : 'text-green-600'}>+{file.additions}</span>
          <span className={theme === 'dark' ? 'text-red-400' : 'text-red-600'}>-{file.deletions}</span>
        </span>
      </button>
      {isExpanded && (
        <div className={`border-t overflow-x-auto ${theme === 'dark' ? 'border-gray-700/50' : 'border-gray-200'}`}>
          {file.lines.map((line, i) => (
            <DiffLineComponent key={i} line={line} theme={theme} />
          ))}
        </div>
      )}
    </div>
  );
}

export function DiffViewer({ cwd, mode = 'working', baseBranch, theme = 'dark' }: DiffViewerProps) {
  const { t } = useI18n();
  const [diffText, setDiffText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified');

  useEffect(() => {
    loadDiff();
  }, [cwd, mode, baseBranch]);

  const loadDiff = async () => {
    setIsLoading(true);
    try {
      let data;
      if (mode === 'branch') {
        data = await api.getBranchDiff(cwd, baseBranch);
      } else {
        data = await api.getGitDiff(cwd, mode === 'staged');
      }
      setDiffText(data.diff || '');
    } catch (e) {
      console.error('Failed to load diff:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const files = useMemo(() => parseDiff(diffText), [diffText]);

  const toggleFile = (path: string) => {
    setExpandedFiles(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedFiles(new Set(files.map(f => f.path)));
  };

  const collapseAll = () => {
    setExpandedFiles(new Set());
  };

  const totalAdditions = files.reduce((sum, f) => sum + f.additions, 0);
  const totalDeletions = files.reduce((sum, f) => sum + f.deletions, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center h-full ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
        <svg className={`w-12 h-12 mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm">{t('diff.noChanges')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={`px-4 py-3 border-b ${theme === 'dark' ? 'border-gray-700/50 bg-gray-800/30' : 'border-gray-200 bg-gray-50'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              {mode === 'staged' ? t('diff.stagedChanges') : mode === 'branch' ? t('diff.branchDiff') : t('diff.workingChanges')}
            </span>
            <span className="flex items-center gap-1 text-xs">
              <span className={theme === 'dark' ? 'text-green-400' : 'text-green-600'}>+{totalAdditions}</span>
              <span className={theme === 'dark' ? 'text-red-400' : 'text-red-600'}>-{totalDeletions}</span>
            </span>
            <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
              {t('diff.fileCount', { count: files.length })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={expandAll}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                theme === 'dark'
                  ? 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t('diff.expandAll')}
            </button>
            <button
              onClick={collapseAll}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                theme === 'dark'
                  ? 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t('diff.collapseAll')}
            </button>
            <button
              onClick={loadDiff}
              className={`p-1 rounded transition-colors ${
                theme === 'dark'
                  ? 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
              }`}
              title={t('common.refresh')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {files.map(file => (
          <DiffFileComponent
            key={file.path}
            file={file}
            isExpanded={expandedFiles.has(file.path)}
            onToggle={() => toggleFile(file.path)}
            theme={theme}
          />
        ))}
      </div>
    </div>
  );
}
