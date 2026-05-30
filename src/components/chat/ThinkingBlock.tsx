import { useState } from 'react';
import { useI18n } from '../../i18n';

// Thinking block component - real-time display
export function ThinkingBlock({ content, isStreaming, theme = 'dark' }: { content: string; isStreaming?: boolean; theme?: 'dark' | 'light' }) {
  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = useState(true);
  const safeContent = typeof content === 'string' ? content : String(content || '');
  const preview = safeContent.slice(0, 200);

  return (
    <div className={`border rounded-lg overflow-hidden ${
      theme === 'dark'
        ? 'bg-purple-900/10 border-purple-700/30'
        : 'bg-purple-50 border-purple-200'
    }`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center gap-2 p-3 text-left transition-colors ${
          theme === 'dark' ? 'hover:bg-purple-800/10' : 'hover:bg-purple-100'
        }`}
      >
        <span className={`text-sm ${isStreaming ? 'animate-pulse' : ''}`}>
          {isStreaming ? ' ' : ' '}
        </span>
        <span className={`text-sm flex-1 italic ${
          theme === 'dark' ? 'text-purple-400/80' : 'text-purple-600'
        }`}>
          {isExpanded ? t('message.thinking') : `${preview}...`}
        </span>
        {isStreaming && (
          <span className={`text-xs ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`}>
            {t('message.streaming')}
          </span>
        )}
        <svg
          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''} ${
            theme === 'dark' ? 'text-purple-500' : 'text-purple-400'
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isExpanded && (
        <div className={`border-t p-3 ${
          theme === 'dark' ? 'border-purple-700/30 bg-purple-900/5' : 'border-purple-200 bg-white'
        }`}>
          <p className={`text-sm italic leading-relaxed whitespace-pre-wrap ${
            theme === 'dark' ? 'text-purple-300/80' : 'text-purple-700'
          }`}>
            {safeContent}
            {isStreaming && <span className="inline-block w-2 h-4 bg-purple-400 animate-pulse ml-1 rounded-sm" />}
          </p>
        </div>
      )}
    </div>
  );
}
