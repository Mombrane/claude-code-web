import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';

interface FilePickerModalProps {
  rootPath: string;
  onSelect: (files: Array<{ path: string; content: string }>) => void;
  onClose: () => void;
  theme?: 'dark' | 'light';
}

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

export function FilePickerModal({ rootPath, onSelect, onClose, theme = 'dark' }: FilePickerModalProps) {
  const { t } = useI18n();
  const [files, setFiles] = useState<FileNode[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadFiles(rootPath);
  }, [rootPath]);

  const loadFiles = async (path: string) => {
    try {
      setLoading(true);
      const data = await api.listDirectory(path);
      setFiles(data);
    } catch (error) {
      console.error('Failed to load files:', error);
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
      }
      return next;
    });
  };

  const toggleFile = (path: string) => {
    setSelectedFiles(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleConfirm = async () => {
    const fileContents = await Promise.all(
      Array.from(selectedFiles).map(async (path) => {
        try {
          const data = await api.readFile(path);
          return { path, content: data.content || '' };
        } catch (error) {
          console.error(`Failed to read file ${path}:`, error);
          return { path, content: '' };
        }
      })
    );
    onSelect(fileContents);
  };

  const getFileIcon = (name: string, type: 'file' | 'directory') => {
    if (type === 'directory') return ' ';
    const ext = name.split('.').pop()?.toLowerCase() || '';
    const iconMap: Record<string, string> = {
      ts: ' ', tsx: ' ', js: ' ', jsx: ' ',
      py: ' ', rb: ' ', go: ' ', rs: ' ',
      html: ' ', css: ' ', scss: ' ',
      json: ' ', yml: ' ', yaml: ' ', toml: ' ',
      md: ' ', txt: ' ',
      sh: ' ️', bash: ' ️',
      gitignore: ' ', env: ' ',
    };
    return iconMap[ext] || ' ';
  };

  const renderFileNode = (node: FileNode, depth: number = 0) => {
    const isExpanded = expandedDirs.has(node.path);
    const isSelected = selectedFiles.has(node.path);
    const matchesSearch = !searchQuery || node.name.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch && node.type === 'file') return null;

    return (
      <div key={node.path}>
        <div
          className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors ${
            isSelected
              ? theme === 'dark'
                ? 'bg-blue-600/20 text-blue-400'
                : 'bg-blue-100 text-blue-600'
              : theme === 'dark'
                ? 'hover:bg-gray-700/50 text-gray-300'
                : 'hover:bg-gray-100 text-gray-700'
          }`}
          style={{ paddingLeft: `${depth * 20 + 12}px` }}
          onClick={() => {
            if (node.type === 'directory') {
              toggleDir(node.path);
            } else {
              toggleFile(node.path);
            }
          }}
        >
          {node.type === 'directory' && (
            <svg
              className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''} ${
                theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
          <span className="text-sm">{getFileIcon(node.name, node.type)}</span>
          <span className="text-sm truncate">{node.name}</span>
          {node.type === 'file' && isSelected && (
            <span className="ml-auto text-xs text-blue-400">✓</span>
          )}
        </div>
        {node.type === 'directory' && isExpanded && node.children && (
          <div>
            {node.children.map(child => renderFileNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className={`w-full max-w-2xl max-h-[80vh] rounded-xl shadow-2xl overflow-hidden animate-fadeIn ${
          theme === 'dark'
            ? 'bg-gray-800 border border-gray-700'
            : 'bg-white border border-gray-200'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <h2 className={`text-lg font-semibold ${
            theme === 'dark' ? 'text-white' : 'text-gray-800'
          }`}>Attach Files</h2>
          <button
            onClick={onClose}
            className={`p-1 rounded-md transition-colors ${
              theme === 'dark'
                ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className={`px-4 py-3 border-b ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="relative">
            <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
              theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('fileExplorer.search')}
              className={`w-full pl-10 pr-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                theme === 'dark'
                  ? 'bg-gray-700 text-white placeholder-gray-400'
                  : 'bg-gray-100 text-gray-800 placeholder-gray-500'
              }`}
            />
          </div>
        </div>

        {/* File list */}
        <div className="overflow-y-auto max-h-[50vh]">
          {loading ? (
            <div className={`flex items-center justify-center py-12 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`}>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          ) : files.length === 0 ? (
            <div className={`flex items-center justify-center py-12 ${
              theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
            }`}>
              No files found
            </div>
          ) : (
            <div className="py-2">
              {files.map(file => renderFileNode(file))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-between px-4 py-3 border-t ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <span className={`text-sm ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          }`}>
            {selectedFiles.size} file{selectedFiles.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedFiles.size === 0}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Attach {selectedFiles.size > 0 ? `(${selectedFiles.size})` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
