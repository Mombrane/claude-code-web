import { useState, useRef, useEffect, type KeyboardEvent, type ClipboardEvent } from 'react';

interface InputBarProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  isStreaming?: boolean;
  onStop?: () => void;
}

export function InputBar({ onSend, disabled, isStreaming, onStop }: InputBarProps) {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
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
      onSend(message.trim());
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
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
    <div className="border-t border-gray-700/50 bg-gradient-to-t from-gray-900 to-gray-800/80 p-4">
      {/* Context hint */}
      <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
        <span> </span>
        <span>Claude Code</span>
        <span className="text-gray-600">|</span>
        <span>mimo-v2.5-pro</span>
        {disabled && (
          <>
            <span className="text-gray-600">|</span>
            <span className="text-yellow-500">⏳ Processing...</span>
          </>
        )}
      </div>

      {/* Input area */}
      <div
        className={`relative flex items-end gap-3 rounded-xl transition-all duration-200 ${
          isFocused
            ? 'ring-2 ring-blue-500/50 bg-gray-700/80'
            : 'bg-gray-700/50 hover:bg-gray-700/60'
        }`}
      >
        {/* File attach hint */}
        <div className="absolute left-3 bottom-3 flex items-center gap-1">
          <button
            className="p-1 text-gray-500 hover:text-gray-300 hover:bg-gray-600/50 rounded transition-colors"
            title="Attach file (coming soon)"
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
          className="flex-1 bg-transparent text-white pl-10 pr-3 py-3 resize-none focus:outline-none disabled:opacity-50 placeholder-gray-500 min-h-[44px] max-h-[200px]"
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
      <div className="flex items-center justify-between mt-2 text-xs text-gray-600">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-gray-700/50 rounded text-[10px]">Enter</kbd>
            <span>Send</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-gray-700/50 rounded text-[10px]">Shift+Enter</kbd>
            <span>New line</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-gray-700/50 rounded text-[10px]">Esc</kbd>
            <span>Clear</span>
          </span>
        </div>
        {charCount > 0 && (
          <span className={`${isNearLimit ? 'text-yellow-500' : 'text-gray-600'}`}>
            {charCount.toLocaleString()} chars
          </span>
        )}
      </div>
    </div>
  );
}
