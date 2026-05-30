import { useState, useEffect, useMemo } from 'react';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';

interface DiffViewerProps {
  cwd: string;
  mode?: 'working' | 'staged' | 'branch';
  baseBranch?: string;
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

function DiffLineComponent({ line }: { line: DiffLine }) {
  const bgColor = {
    add: 'bg-green-900/20',
    delete: 'bg-red-900/20',
    context: '',
    header: 'bg-gray-800/50',
    hunk: 'bg-blue-900/10',
  }[line.type];

  const textColor = {
    add: 'text-green-400',
    delete: 'text-red-400',
    context: 'text-gray-300',
    header: 'text-gray-500',
    hunk: 'text-blue-400',
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
          <span className="w-12 text-right pr-2 text-gray-600 text-xs select-none shrink-0">
            {line.oldLine || ''}
          </span>
          <span className="w-12 text-right pr-2 text-gray-600 text-xs select-none shrink-0">
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

function DiffFileComponent({ file, isExpanded, onToggle }: {
  file: DiffFile;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border border-gray-700/50 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 bg-gray-800/50 hover:bg-gray-800/80 transition-colors text-left"
      >
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-sm font-mono text-gray-300 flex-1 truncate">{file.path}</span>
        <span className="flex items-center gap-2 text-xs">
          <span className="text-green-400">+{file.additions}</span>
          <span className="text-red-400">-{file.deletions}</span>
        </span>
      </button>
      {isExpanded && (
        <div className="border-t border-gray-700/50 overflow-x-auto">
          {file.lines.map((line, i) => (
            <DiffLineComponent key={i} line={line} />
          ))}
        </div>
      )}
    </div>
  );
}

export function DiffViewer({ cwd, mode = 'working', baseBranch }: DiffViewerProps) {
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
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <svg className="w-12 h-12 mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm">{t('diff.noChanges')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700/50 bg-gray-800/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-300">
              {mode === 'staged' ? 'Staged Changes' : mode === 'branch' ? 'Branch Diff' : 'Working Changes'}
            </span>
            <span className="flex items-center gap-1 text-xs">
              <span className="text-green-400">+{totalAdditions}</span>
              <span className="text-red-400">-{totalDeletions}</span>
            </span>
            <span className="text-xs text-gray-500">
              {files.length} file{files.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={expandAll}
              className="px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-700/50 rounded transition-colors"
            >
              {t('diff.expandAll')}
            </button>
            <button
              onClick={collapseAll}
              className="px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-700/50 rounded transition-colors"
            >
              {t('diff.collapseAll')}
            </button>
            <button
              onClick={loadDiff}
              className="p-1 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded transition-colors"
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
          />
        ))}
      </div>
    </div>
  );
}
