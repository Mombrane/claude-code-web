import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../i18n';

export type MessageFilter = 'all' | 'text' | 'tools' | 'thinking' | 'errors';

interface MessageSearchProps {
  onSearch: (query: string) => void;
  onNext: () => void;
  onPrevious: () => void;
  onClose: () => void;
  onFilterChange?: (filter: MessageFilter) => void;
  currentMatch: number;
  totalMatches: number;
  theme?: 'dark' | 'light';
  activeFilter?: MessageFilter;
}

const FILTER_OPTIONS: { key: MessageFilter; i18nKey: string }[] = [
  { key: 'all', i18nKey: 'search.filterAll' },
  { key: 'text', i18nKey: 'search.filterText' },
  { key: 'tools', i18nKey: 'search.filterTools' },
  { key: 'thinking', i18nKey: 'search.filterThinking' },
  { key: 'errors', i18nKey: 'search.filterErrors' },
];

export function MessageSearch({
  onSearch,
  onNext,
  onPrevious,
  onClose,
  onFilterChange,
  currentMatch,
  totalMatches,
  theme = 'dark',
  activeFilter = 'all',
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
    <div className={`flex items-center gap-2 px-3 h-10 shrink-0 border-b ${
      theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <svg className={`w-4 h-4 shrink-0 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        ref={inputRef}
        type="text"
        value={localQuery}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={t('search.placeholder')}
        aria-label={t('search.input')}
        className={`flex-1 bg-transparent text-sm outline-none ${
          theme === 'dark' ? 'text-gray-200 placeholder-gray-500' : 'text-gray-800 placeholder-gray-400'
        }`}
      />
      
      {/* Message type filter */}
      {onFilterChange && (
        <div className={`flex items-center gap-0.5 shrink-0 ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
        }`}>
          {FILTER_OPTIONS.map(({ key, i18nKey }) => (
            <button
              key={key}
              onClick={() => onFilterChange(key)}
              aria-label={t(`search.filter.${key}`)}
              className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                activeFilter === key
                  ? theme === 'dark'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-500 text-white'
                  : theme === 'dark'
                    ? 'hover:bg-gray-700 text-gray-400'
                    : 'hover:bg-gray-200 text-gray-500'
              }`}
              title={t(i18nKey)}
            >
              {t(i18nKey)}
            </button>
          ))}
        </div>
      )}
      
      {localQuery && (
        <span className={`text-xs shrink-0 min-w-[60px] text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
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
          aria-label={t('search.prev')}
          className={`p-1 rounded disabled:opacity-30 transition-colors ${
            theme === 'dark' ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-200' : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'
          }`}
          title={t('search.previous')}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
        <button
          onClick={onNext}
          disabled={totalMatches === 0}
          aria-label={t('search.next')}
          className={`p-1 rounded disabled:opacity-30 transition-colors ${
            theme === 'dark' ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-200' : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'
          }`}
          title={t('search.next')}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      <button
        onClick={onClose}
        aria-label={t('search.close')}
        className={`p-1 rounded transition-colors shrink-0 ${
          theme === 'dark' ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-200' : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'
        }`}
        title={t('search.close')}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
