import { useState, useEffect, useRef } from 'react';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';

interface TranscriptViewerProps {
  sessionId: string;
  theme?: 'dark' | 'light';
  onClose: () => void;
}

/** Minimal JSON syntax highlighter for a single line */
function highlightJsonLine(line: string, isDark: boolean): React.ReactNode {
  // Try to pretty-format if it's a valid JSON line
  let displayLine = line;
  try {
    const parsed = JSON.parse(line);
    displayLine = JSON.stringify(parsed, null, 2);
  } catch {
    // not valid JSON, show as-is
  }

  // Tokenize with regex for strings, numbers, booleans, null
  const regex = /("(?:\\.|[^"\\])*")\s*(:)?|(\btrue\b|\bfalse\b|\bnull\b)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(displayLine)) !== null) {
    // Push text before match
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{displayLine.slice(lastIndex, match.index)}</span>);
    }

    if (match[1]) {
      // It's a string
      if (match[2]) {
        // It's a key
        parts.push(
          <span key={key++} style={{ color: isDark ? '#9cdcfe' : '#0451a5' }}>{match[1]}</span>
        );
        parts.push(
          <span key={key++} style={{ color: isDark ? '#d4d4d4' : '#333333' }}>{match[2]}</span>
        );
      } else {
        // It's a string value
        parts.push(
          <span key={key++} style={{ color: isDark ? '#ce9178' : '#a31515' }}>{match[1]}</span>
        );
      }
    } else if (match[3]) {
      // boolean or null
      parts.push(
        <span key={key++} style={{ color: isDark ? '#569cd6' : '#0000ff' }}>{match[3]}</span>
      );
    } else if (match[4]) {
      // number
      parts.push(
        <span key={key++} style={{ color: isDark ? '#b5cea8' : '#098658' }}>{match[4]}</span>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Push remaining text
  if (lastIndex < displayLine.length) {
    parts.push(<span key={key++}>{displayLine.slice(lastIndex)}</span>);
  }

  return parts.length > 0 ? parts : displayLine;
}

export function TranscriptViewer({ sessionId, theme = 'dark', onClose }: TranscriptViewerProps) {
  const { t } = useI18n();
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getTranscript(sessionId);
        if (!cancelled) {
          setContent(data);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : t('transcript.loadFailed'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sessionId]);

  const handleCopy = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const isDark = theme === 'dark';
  const lines = content ? content.split('\n').filter(l => l.trim().length > 0) : [];

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn"
      onClick={handleBackdropClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('dialog.transcript')}
        className={`w-full h-full max-w-6xl max-h-[90vh] m-4 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-fadeIn ${
          isDark
            ? 'bg-gray-800 border border-gray-700'
            : 'bg-white border border-gray-200'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b shrink-0 ${
          isDark ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-base"> </span>
            <h2 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {t('transcript.title')}
            </h2>
            {content && (
              <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {lines.length} {t('transcript.lines')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {content && (
              <button
                onClick={handleCopy}
                aria-label={t('common.copy')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors ${
                  isDark
                    ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {copied ? (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {t('transcript.copied')}
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    {t('transcript.copy')}
                  </>
                )}
              </button>
            )}
            <button
              onClick={onClose}
              aria-label={t('common.close')}
              className={`p-1 rounded-md transition-colors ${
                isDark
                  ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div ref={containerRef} className="flex-1 overflow-auto p-4">
          {loading && (
            <div className={`flex items-center justify-center h-full ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {t('common.loading')}
            </div>
          )}

          {error && (
            <div className={`flex items-center justify-center h-full ${isDark ? 'text-red-400' : 'text-red-500'}`}>
              {error}
            </div>
          )}

          {!loading && !error && content && (
            <pre
              className={`text-xs leading-relaxed font-mono whitespace-pre ${
                isDark ? 'text-gray-300' : 'text-gray-800'
              }`}
            >
              {lines.map((line, i) => (
                <div key={i} className={`py-0.5 ${
                  i % 2 === 0
                    ? (isDark ? 'bg-transparent' : 'bg-transparent')
                    : (isDark ? 'bg-gray-800/30' : 'bg-gray-50')
                }`}>
                  <span className={`inline-block w-12 text-right pr-3 select-none ${
                    isDark ? 'text-gray-600' : 'text-gray-400'
                  }`}>
                    {i + 1}
                  </span>
                  <span className="break-all">{highlightJsonLine(line, isDark)}</span>
                </div>
              ))}
            </pre>
          )}

          {!loading && !error && !content && (
            <div className={`flex items-center justify-center h-full ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              {t('transcript.empty')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
