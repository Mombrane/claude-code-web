import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { api } from '../../api/client';

interface FileEditorProps {
  filePath: string;
  onClose: () => void;
}

export function FileEditor({ filePath, onClose }: FileEditorProps) {
  const [content, setContent] = useState<string>('');
  const [language, setLanguage] = useState<string>('plaintext');
  const [totalLines, setTotalLines] = useState(0);
  const [isModified, setIsModified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFile();
  }, [filePath]);

  const loadFile = async () => {
    try {
      setError(null);
      const data = await api.readFile(filePath);
      setContent(data.content);
      setLanguage(data.language);
      setTotalLines(data.totalLines);
      setIsModified(false);
    } catch (e: any) {
      setError(e.message || 'Failed to load file');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.writeFile(filePath, content);
      setIsModified(false);
    } catch (e: any) {
      setError(e.message || 'Failed to save file');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (value: string | undefined) => {
    if (value !== undefined) {
      setContent(value);
      setIsModified(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  };

  const fileName = filePath.split('/').pop() || '';

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-white text-sm font-medium">{fileName}</span>
          {isModified && (
            <span className="text-yellow-400 text-xs">●</span>
          )}
          <span className="text-gray-500 text-xs">{totalLines} lines</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={!isModified || isSaving}
            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
      {error ? (
        <div className="flex-1 flex items-center justify-center text-red-400">
          {error}
        </div>
      ) : (
        <div className="flex-1" onKeyDown={handleKeyDown}>
          <Editor
            height="100%"
            language={language}
            value={content}
            onChange={handleChange}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              renderWhitespace: 'selection',
              tabSize: 2,
              wordWrap: 'on',
              automaticLayout: true,
              scrollBeyondLastLine: false,
              padding: { top: 8, bottom: 8 },
            }}
          />
        </div>
      )}
    </div>
  );
}
