import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../i18n';

interface MessageSearchProps {
  onSearch: (query: string) => void;
  onNext: () => void;
  onPrevious: () => void;
  onClose: () => void;
  currentMatch: number;
  totalMatches: number;
}

export function MessageSearch({
  onSearch,
  onNext,
  onPrevious,
  onClose,
  currentMatch,
  totalMatches,
}: MessageSearchProps) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [localQuery, setLocalQuery] = useState('');

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalQuery(e.target.value);
    onSearch(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
      if (e.shiftKey) {
        onPrevious();
      } else {
        onNext();
      }
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 h-10 bg-gray-800 border-b border-gray-700 shrink-0">
      <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        ref={inputRef}
        type="text"
        value={localQuery}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={t('search.placeholder')}
        className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-500 outline-none"
      />
      {localQuery && (
        <span className="text-xs text-gray-400 shrink-0 min-w-[60px] text-center">
          {totalMatches > 0
            ? t('search.matches', { current: currentMatch + 1, total: totalMatches })
            : t('search.noResults')
          }
        </span>
      )}
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          onClick={onPrevious}
          disabled={totalMatches === 0}
          className="p-1 rounded hover:bg-gray-700 disabled:opacity-30 text-gray-400 hover:text-gray-200 transition-colors"
          title={t('search.previous')}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
        <button
          onClick={onNext}
          disabled={totalMatches === 0}
          className="p-1 rounded hover:bg-gray-700 disabled:opacity-30 text-gray-400 hover:text-gray-200 transition-colors"
          title={t('search.next')}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      <button
        onClick={onClose}
        className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors shrink-0"
        title={t('search.close')}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
