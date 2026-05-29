import { useState, useRef, useEffect, type KeyboardEvent, type ClipboardEvent } from 'react';
import { FilePickerModal } from '../files/FilePickerModal';

interface InputBarProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  isStreaming?: boolean;
  onStop?: () => void;
  theme?: 'dark' | 'light';
  rootPath?: string;
}

export function InputBar({ onSend, disabled, isStreaming, onStop, theme = 'dark', rootPath }: InputBarProps) {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<Array<{ path: string; content: string }>>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Reset height when message is cleared
  useEffect(() => {
    if (!message && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [message]);

  const handleSend = () => {
    if (message.trim() && !disabled && !isStreaming) {
      let finalMessage = message.trim();

      // Prepend attached files as code blocks
      if (attachedFiles.length > 0) {
        const fileBlocks = attachedFiles.map(file => {
          const ext = file.path.split('.').pop() || '';
          return `\`\`\`${ext} file:${file.path}\n${file.content}\n\`\`\``;
        }).join('\n\n');
        finalMessage = `${fileBlocks}\n\n${finalMessage}`;
      }

      onSend(finalMessage);
      setMessage('');
      setAttachedFiles([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleFileSelect = (files: Array<{ path: string; content: string }>) => {
    setAttachedFiles(prev => [...prev, ...files]);
    setShowFilePicker(false);
  };

  const removeAttachedFile = (path: string) => {
    setAttachedFiles(prev => prev.filter(f => f.path !== path));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter to send (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }

    // Escape to clear
    if (e.key === 'Escape') {
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }

    // Ctrl+Enter to send (alternative)
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    // Handle multi-line paste
    const text = e.clipboardData.getData('text');
    if (text.includes('\n')) {
      // Allow default behavior for multi-line paste
      return;
    }
  };

  const charCount = message.length;
  const isNearLimit = charCount > 4000;

  return (
    <div className={`border-t p-4 ${
      theme === 'dark'
        ? 'border-gray-700/50 bg-gradient-to-t from-gray-900 to-gray-800/80'
        : 'border-gray-200 bg-white'
    }`}>
      {/* Attached files */}
      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachedFiles.map((file) => (
            <div
              key={file.path}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs ${
                theme === 'dark'
                  ? 'bg-gray-700 text-gray-300'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              <span> </span>
              <span className="truncate max-w-[150px]">
                {file.path.split('/').pop()}
              </span>
              <button
                onClick={() => removeAttachedFile(file.path)}
                className={`p-0.5 rounded transition-colors ${
                  theme === 'dark'
                    ? 'hover:bg-gray-600 text-gray-400 hover:text-gray-200'
                    : 'hover:bg-gray-300 text-gray-500 hover:text-gray-700'
                }`}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Context hint */}
      <div className={`flex items-center gap-2 mb-2 text-xs ${
        theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
      }`}>
        <span> </span>
        <span>Claude Code</span>
        <span className={theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}>|</span>
        <span>mimo-v2.5-pro</span>
        {disabled && (
          <>
            <span className={theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}>|</span>
            <span className="text-yellow-500">⏳ Processing...</span>
          </>
        )}
      </div>

      {/* Input area */}
      <div className={`relative flex items-end gap-3 rounded-xl transition-all duration-200 ${
        isFocused
          ? theme === 'dark'
            ? 'ring-2 ring-blue-500/50 bg-gray-700/80'
            : 'ring-2 ring-blue-500/50 bg-white border border-blue-300'
          : theme === 'dark'
            ? 'bg-gray-700/50 hover:bg-gray-700/60'
            : 'bg-gray-100 hover:bg-gray-200 border border-gray-200'
      }`}>
        {/* File attach button */}
        <div className="absolute left-3 bottom-3 flex items-center gap-1">
          <button
            onClick={() => setShowFilePicker(true)}
            className={`p-1 rounded transition-colors ${
              theme === 'dark'
                ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-600/50'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'
            }`}
            title="Attach file"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
        </div>

        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          onPaste={handlePaste}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={isStreaming ? "Claude is responding..." : "Type a message... (Shift+Enter for new line)"}
          disabled={disabled || isStreaming}
          className={`flex-1 bg-transparent pl-10 pr-3 py-3 resize-none focus:outline-none disabled:opacity-50 min-h-[44px] max-h-[200px] ${
            theme === 'dark'
              ? 'text-white placeholder-gray-500'
              : 'text-gray-800 placeholder-gray-400'
          }`}
          rows={1}
        />

        {/* Send/Stop button */}
        <div className="flex items-center gap-2 pr-3 pb-3">
          {isStreaming ? (
            <button
              onClick={onStop}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200 shadow-lg hover:shadow-red-500/25"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
              <span className="text-sm font-medium">Stop</span>
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={disabled || !message.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-blue-500/25 disabled:hover:shadow-none"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              <span className="text-sm font-medium">Send</span>
            </button>
          )}
        </div>
      </div>

      {/* Bottom hints */}
      <div className={`flex items-center justify-between mt-2 text-xs ${
        theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
      }`}>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <kbd className={`px-1.5 py-0.5 rounded text-[10px] ${
              theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-200'
            }`}>Enter</kbd>
            <span>Send</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className={`px-1.5 py-0.5 rounded text-[10px] ${
              theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-200'
            }`}>Shift+Enter</kbd>
            <span>New line</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className={`px-1.5 py-0.5 rounded text-[10px] ${
              theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-200'
            }`}>Esc</kbd>
            <span>Clear</span>
          </span>
        </div>
        {charCount > 0 && (
          <span className={isNearLimit ? 'text-yellow-500' : ''}>
            {charCount.toLocaleString()} chars
          </span>
        )}
      </div>

      {/* File Picker Modal */}
      {showFilePicker && rootPath && (
        <FilePickerModal
          rootPath={rootPath}
          onSelect={handleFileSelect}
          onClose={() => setShowFilePicker(false)}
          theme={theme}
        />
      )}
    </div>
  );
}
