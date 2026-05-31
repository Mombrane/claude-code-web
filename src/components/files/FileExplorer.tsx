import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';

interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'dir' | 'symlink';
  size: number;
  modified: string;
}

interface FileExplorerProps {
  rootPath: string;
  onFileSelect: (path: string) => void;
  theme?: 'dark' | 'light';
}

export function FileExplorer({ rootPath, onFileSelect, theme = 'dark' }: FileExplorerProps) {
  const { t } = useI18n();
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set([rootPath]));
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FileEntry[]>([]);

  useEffect(() => {
    loadDirectory(rootPath);
  }, [rootPath]);

  const loadDirectory = async (path: string) => {
    setLoading(true);
    try {
      const data = await api.listDirectory(path);
      setEntries(prev => {
        const filtered = prev.filter(e => !e.path.startsWith(path) || e.path === path);
        return [...filtered, ...data];
      });
    } catch (e) {
      console.error('Failed to load directory:', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleDir = (path: string) => {
    setExpandedDirs(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
        loadDirectory(path);
      }
      return next;
    });
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const results = await api.searchFiles(query, rootPath);
      setSearchResults(results);
    } catch (e) {
      console.error('Search failed:', e);
    }
  };

  const getFileIcon = (name: string, type: string) => {
    if (type === 'dir') return '📁';
    const ext = name.split('.').pop()?.toLowerCase() || '';
    const iconMap: Record<string, string> = {
      ts: '📘', tsx: '⚛️', js: '📙', jsx: '⚛️', json: '📋', md: '📝',
      css: '🎨', html: '🌐', py: '🐍', go: '🔵', rs: '🦀', java: '☕',
      sh: '⚙️', yml: '⚙️', yaml: '⚙️', svg: '🖼️', png: '🖼️', jpg: '🖼️', gif: '🖼️',
    };
    return iconMap[ext] || '📄';
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderEntry = (entry: FileEntry, depth: number = 0) => {
    const isExpanded = expandedDirs.has(entry.path);
    const indent = depth * 16;

    return (
      <div key={entry.path}>
        <div
          className={`flex items-center py-1 px-2 cursor-pointer group ${
            theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
          }`}
          style={{ paddingLeft: `${indent + 8}px` }}
          onClick={() => {
            if (entry.type === 'dir') {
              toggleDir(entry.path);
            } else {
              onFileSelect(entry.path);
            }
          }}
        >
          {entry.type === 'dir' && (
            <span className={`mr-1 text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
              {isExpanded ? '▼' : '▶'}
            </span>
          )}
          <span className="mr-2">{getFileIcon(entry.name, entry.type)}</span>
          <span className={`flex-1 text-sm truncate ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{entry.name}</span>
          <span className={`text-xs opacity-0 group-hover:opacity-100 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
            {entry.type === 'file' && formatSize(entry.size)}
          </span>
        </div>
        {entry.type === 'dir' && isExpanded && (
          <div>
            {entries
              .filter(e => e.path.startsWith(entry.path + '/') && e.path.split('/').length === entry.path.split('/').length + 1)
              .sort((a, b) => {
                if (a.type === 'dir' && b.type !== 'dir') return -1;
                if (a.type !== 'dir' && b.type === 'dir') return 1;
                return a.name.localeCompare(b.name);
              })
              .map(e => renderEntry(e, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const displayEntries = searchQuery.length >= 2 ? searchResults : entries.filter(e => e.path.startsWith(rootPath) && e.path.split('/').length === rootPath.split('/').length + 1);

  return (
    <div className={`h-full flex flex-col ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
      <div className={`p-2 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={t('fileExplorer.search')}
          className={`w-full px-3 py-1.5 text-sm rounded border focus:outline-none focus:border-blue-500 ${
            theme === 'dark'
              ? 'bg-gray-700 text-white border-gray-600'
              : 'bg-gray-50 text-gray-800 border-gray-300'
          }`}
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className={`p-4 text-center text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{t('fileExplorer.loading')}</div>
        )}
        {displayEntries
          .sort((a, b) => {
            if (a.type === 'dir' && b.type !== 'dir') return -1;
            if (a.type !== 'dir' && b.type === 'dir') return 1;
            return a.name.localeCompare(b.name);
          })
          .map(entry => renderEntry(entry))}
      </div>
    </div>
  );
}
