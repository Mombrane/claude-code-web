import { useState } from 'react';
import { useI18n } from '../../i18n';

// Copy button for code blocks
export function CopyButton({ text, theme = 'dark' }: { text: string; theme?: 'dark' | 'light' }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Copy failed:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`absolute top-2 right-2 opacity-0 group-hover/code:opacity-100 text-xs px-2 py-1 rounded transition-opacity ${
        theme === 'dark'
          ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
          : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
      }`}
    >
      {copied ? (
        <svg className="w-3 h-3 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        t('message.copy')
      )}
    </button>
  );
}
