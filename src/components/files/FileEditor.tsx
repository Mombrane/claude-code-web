import { useState, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';

interface EditorSettings {
  fontSize?: number;
  tabSize?: number;
  wordWrap?: 'on' | 'off';
  minimap?: boolean;
}

interface FileEditorProps {
  filePath: string;
  onClose: () => void;
  settings?: EditorSettings;
  theme?: 'dark' | 'light';
}

export function FileEditor({ filePath, onClose, settings, theme = 'dark' }: FileEditorProps) {
  const { t } = useI18n();
  const [content, setContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [language, setLanguage] = useState<string>('plaintext');
  const [totalLines, setTotalLines] = useState(0);
  const [isModified, setIsModified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [monacoLoaded, setMonacoLoaded] = useState(false);
  const [monacoLoadError, setMonacoLoadError] = useState(false);

  useEffect(() => {
    loadFile();
  }, [filePath]);

  // Timeout: if Monaco doesn't load within 10s, switch to textarea fallback
  useEffect(() => {
    if (monacoLoaded || monacoLoadError) return;
    const timer = setTimeout(() => {
      if (!monacoLoaded) {
        setMonacoLoadError(true);
      }
    }, 10000);
    return () => clearTimeout(timer);
  }, [monacoLoaded, monacoLoadError]);

  const loadFile = async () => {
    try {
      setError(null);
      const data = await api.readFile(filePath);
      setContent(data.content);
      setOriginalContent(data.content);
      setLanguage(data.language);
      setTotalLines(data.totalLines);
      setIsModified(false);
    } catch (e: any) {
      setError(e.message || t('editor.error'));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.writeFile(filePath, content);
      setOriginalContent(content);
      setIsModified(false);
    } catch (e: any) {
      setError(e.message || t('editor.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevert = useCallback(() => {
    if (isModified) {
      setContent(originalContent);
      setIsModified(false);
    }
  }, [isModified, originalContent]);

  const handleChange = (value: string | undefined) => {
    if (value !== undefined) {
      setContent(value);
      setIsModified(value !== originalContent);
    }
  };

  const handleEditorMount = (editor: any) => {
    setMonacoLoaded(true);
    editor.onDidChangeCursorPosition((e: any) => {
      setCursorPosition({
        line: e.position.lineNumber,
        column: e.position.column,
      });
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      // Let Monaco handle undo
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  // Parse file path for breadcrumbs
  const pathParts = filePath.split('/').filter(Boolean);
  const fileName = pathParts.pop() || '';
  const directory = pathParts.join('/');

  // File size
  const fileSize = new Blob([content]).size;
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex flex-col h-full bg-gradient-subtle">
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-2 border-b ${
        theme === 'dark'
          ? 'bg-gray-800/60 border-gray-700/50'
          : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-center gap-3">
          {/* File icon */}
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{fileName}</span>
            {isModified && (
              <span className="w-2 h-2 rounded-full bg-yellow-400" title={t('editor.modified')} />
            )}
          </div>

          {/* Breadcrumb */}
          <div className={`flex items-center gap-1 text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
            <span>{directory}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* File info */}
          <div className={`flex items-center gap-3 text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
            <span>{language}</span>
            <span>{totalLines} lines</span>
            <span>{formatSize(fileSize)}</span>
          </div>

          {/* Separator */}
          <div className={`w-px h-4 ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-200'}`} />

          {/* Actions */}
          {isModified && (
            <button
              onClick={handleRevert}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                theme === 'dark'
                  ? 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
              }`}
              title={t('editor.revert')}
            >
              {t('editor.revert')}
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!isModified || isSaving}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ${
              theme === 'dark'
                ? 'bg-blue-600/80 hover:bg-blue-600'
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {isSaving ? (
              <>
                <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {t('editor.saving')}
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                {t('editor.save')}
                <kbd className="ml-1 px-1 py-0.5 bg-blue-700/50 rounded text-[10px]">⌘S</kbd>
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-md transition-colors ${
              theme === 'dark'
                ? 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
            title={t('editor.close')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Editor */}
      {error ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <svg className="w-12 h-12 mx-auto mb-4 text-red-400/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-red-400 mb-2">{error}</p>
            <button
              onClick={loadFile}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      ) : monacoLoadError ? (
        // Textarea fallback when Monaco fails to load
        <div className="flex-1 flex flex-col" onKeyDown={handleKeyDown}>
          <div className="px-4 py-1.5 bg-yellow-900/20 border-b border-yellow-700/30 text-[11px] text-yellow-400">
            Monaco Editor failed to load. Using basic editor. Check your network connection.
          </div>
          <textarea
            className={`flex-1 w-full p-4 font-mono text-sm resize-none focus:outline-none ${
              theme === 'dark'
                ? 'bg-[#1e1e1e] text-gray-200'
                : 'bg-white text-gray-900'
            }`}
            value={content}
            onChange={(e) => handleChange(e.target.value)}
            spellCheck={false}
          />
        </div>
      ) : !monacoLoaded ? (
        // Loading spinner while Monaco loads
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <svg className="w-8 h-8 mx-auto mb-3 animate-spin text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{t('editor.loading')}</p>
          </div>
        </div>
      ) : null}

      {/* Monaco Editor (always rendered, hidden when fallback is shown) */}
      <div className={`flex-1 ${error || monacoLoadError ? 'hidden' : ''}`} onKeyDown={handleKeyDown}>
        <Editor
          height="100%"
          language={language}
          value={content}
          onChange={handleChange}
          onMount={handleEditorMount}
          theme={theme === 'dark' ? 'vs-dark' : 'vs'}
          options={{
            minimap: { enabled: settings?.minimap ?? false },
            fontSize: settings?.fontSize ?? 14,
            lineNumbers: 'on',
            renderWhitespace: 'selection',
            tabSize: settings?.tabSize ?? 2,
            wordWrap: settings?.wordWrap ?? 'on',
            automaticLayout: true,
            scrollBeyondLastLine: false,
            padding: { top: 12, bottom: 12 },
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            bracketPairColorization: { enabled: true },
            guides: {
              bracketPairs: true,
              indentation: true,
            },
          }}
        />
      </div>

      {/* Status bar */}
      <div className={`flex items-center justify-between px-4 py-1.5 border-t text-[11px] ${
        theme === 'dark'
          ? 'bg-gray-800/60 border-gray-700/50 text-gray-500'
          : 'bg-gray-50 border-gray-200 text-gray-400'
      }`}>
        <div className="flex items-center gap-4">
          <span>Ln {cursorPosition.line}, Col {cursorPosition.column}</span>
          <span>{language}</span>
          <span>UTF-8</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Spaces: 2</span>
          <span>{formatSize(fileSize)}</span>
        </div>
      </div>
    </div>
  );
}
