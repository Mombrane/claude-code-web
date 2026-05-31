import { useState } from 'react';
import type { Message, ToolCallContent, ToolResultContent, ToolExecutionContent } from '../../types';
import { useI18n } from '../../i18n';

// Tool icon mapping
const TOOL_ICONS: Record<string, string> = {
  'Read': ' ',
  'Edit': '✏️',
  'Write': ' ',
  'Bash': ' ️',
  'Grep': ' ',
  'Glob': ' ',
  'Agent': ' ',
  'WebFetch': ' ',
  'WebSearch': ' ',
  'default': ' '
};

function getToolIcon(toolName: string): string {
  return TOOL_ICONS[toolName] || TOOL_ICONS['default'];
}

// Collapsible tool call component
export function ToolCallCard({ toolCall, isExpanded, onToggle, theme = 'dark' }: {
  toolCall: ToolCallContent;
  isExpanded: boolean;
  onToggle: () => void;
  theme?: 'dark' | 'light';
}) {
  const icon = getToolIcon(toolCall.toolName);
  const hasDetails = toolCall.input && Object.keys(toolCall.input).length > 0;

  const getKeyInfo = () => {
    if (!toolCall.input) return null;
    if (toolCall.toolName === 'Read' || toolCall.toolName === 'Write' || toolCall.toolName === 'Edit') {
      return toolCall.input.file_path as string;
    }
    if (toolCall.toolName === 'Bash') {
      return toolCall.input.command as string;
    }
    if (toolCall.toolName === 'Grep' || toolCall.toolName === 'Glob') {
      return (toolCall.input.pattern as string) || (toolCall.input.query as string);
    }
    return null;
  };

  const keyInfo = getKeyInfo();

  return (
    <div className={`border rounded-lg overflow-hidden transition-all duration-200 ${
      theme === 'dark'
        ? 'bg-gray-800/80 border-gray-700/50 hover:border-gray-600/50'
        : 'bg-gray-50 border-gray-200 hover:border-gray-300'
    }`}>
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
          theme === 'dark' ? 'hover:bg-gray-700/30' : 'hover:bg-gray-100'
        }`}
      >
        <span className="text-lg">{icon}</span>
        <div className="flex-1 min-w-0">
          <span className={`font-mono text-sm font-medium ${
            theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
          }`}>
            {toolCall.toolName}
          </span>
          {keyInfo && (
            <span className={`text-xs ml-2 truncate ${
              theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
            }`}>
              {keyInfo.length > 60 ? keyInfo.slice(0, 60) + '...' : keyInfo}
            </span>
          )}
        </div>
        {hasDetails && (
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''} ${
              theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>
      {isExpanded && hasDetails && (
        <div className={`border-t p-3 ${
          theme === 'dark' ? 'border-gray-700/50 bg-gray-900/50' : 'border-gray-200 bg-white'
        }`}>
          <pre className={`text-sm overflow-x-auto font-mono ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
          }`}>
            {JSON.stringify(toolCall.input, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// Tool result component
export function ToolResultCard({ result, theme = 'dark' }: { result: ToolResultContent; theme?: 'dark' | 'light' }) {
  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = useState(false);
  const hasLongContent = result.output && result.output.length > 500;

  return (
    <div className={`border rounded-lg overflow-hidden transition-all duration-200 ${
      result.isError
        ? theme === 'dark'
          ? 'bg-red-900/10 border-red-700/50 hover:border-red-600/50'
          : 'bg-red-50 border-red-200 hover:border-red-300'
        : theme === 'dark'
          ? 'bg-gray-800/60 border-gray-700/50 hover:border-gray-600/50'
          : 'bg-gray-50 border-gray-200 hover:border-gray-300'
    }`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center gap-2 p-3 text-left transition-colors ${
          theme === 'dark' ? 'hover:bg-gray-700/20' : 'hover:bg-gray-100'
        }`}
      >
        <span className="text-sm">{result.isError ? '❌' : '✅'}</span>
        <span className={`text-sm flex-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{t('message.toolResult')}</span>
        {result.isError && (
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            theme === 'dark' ? 'text-red-400 bg-red-500/20' : 'text-red-600 bg-red-100'
          }`}>
            {t('tool.error')}
          </span>
        )}
        {hasLongContent && (
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''} ${
              theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>
      <div className={`border-t p-3 ${
        hasLongContent && !isExpanded ? 'max-h-32 overflow-hidden relative' : ''
      } ${theme === 'dark' ? 'border-gray-700/30 bg-gray-900/30' : 'border-gray-200 bg-white'}`}>
        <pre className={`text-sm overflow-x-auto font-mono whitespace-pre-wrap break-words ${
          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
        }`}>
          {result.output}
        </pre>
        {hasLongContent && !isExpanded && (
          <div className={`absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t ${
            theme === 'dark' ? 'from-gray-900/80' : 'from-white'
          } to-transparent`} />
        )}
      </div>
    </div>
  );
}

// ---- Differentiated result renderers for ToolExecutionCard ----

function BashResult({ output, isError, theme }: { output: string; isError?: boolean; theme: 'dark' | 'light' }) {
  const { t } = useI18n();
  return (
    <div className={`rounded-lg overflow-hidden ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
      <div className={`flex items-center gap-2 px-3 py-1.5 border-b ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'}`}>
        <span className={`text-xs font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{t('tool.terminal')}</span>
        {isError !== undefined && (
          <span className={`text-xs px-1.5 py-0.5 rounded ${isError
            ? theme === 'dark' ? 'text-red-400 bg-red-500/20' : 'text-red-600 bg-red-100'
            : theme === 'dark' ? 'text-green-400 bg-green-500/20' : 'text-green-600 bg-green-100'
          }`}>
            {t('tool.exitCode', { code: isError ? '1' : '0' })}
          </span>
        )}
      </div>
      <pre className={`p-3 text-sm font-mono overflow-x-auto whitespace-pre-wrap break-words ${theme === 'dark' ? 'text-green-300' : 'text-green-800'}`}>
        {output || t('tool.noOutput')}
      </pre>
    </div>
  );
}

function ReadResult({ output, input, theme }: { output: string; input: Record<string, unknown>; theme: 'dark' | 'light' }) {
  const filePath = (input.file_path as string) || '';
  return (
    <div className={`border rounded-lg overflow-hidden ${theme === 'dark' ? 'bg-gray-800/60 border-gray-700/50' : 'bg-white border-gray-200'}`}>
      <div className={`flex items-center gap-2 px-3 py-1.5 border-b ${theme === 'dark' ? 'bg-gray-800/80 border-gray-700/50' : 'bg-gray-50 border-gray-200'}`}>
        <span className="text-sm"> </span>
        <span className={`text-sm font-mono ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>{filePath}</span>
      </div>
      <div className="p-3">
        <pre className={`text-sm overflow-x-auto font-mono ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
          <code>{output}</code>
        </pre>
      </div>
    </div>
  );
}

function EditResult({ output, input, theme }: { output: string; input: Record<string, unknown>; theme: 'dark' | 'light' }) {
  const { t } = useI18n();
  const filePath = (input.file_path as string) || '';
  return (
    <div className={`border rounded-lg overflow-hidden ${theme === 'dark' ? 'bg-gray-800/60 border-gray-700/50' : 'bg-white border-gray-200'}`}>
      <div className={`flex items-center gap-2 px-3 py-1.5 border-b ${theme === 'dark' ? 'bg-gray-800/80 border-gray-700/50' : 'bg-gray-50 border-gray-200'}`}>
        <span className="text-sm">✏️</span>
        <span className={`text-sm font-mono ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}>{filePath}</span>
      </div>
      <div className="p-3">
        {output ? (
          <pre className={`text-sm overflow-x-auto font-mono whitespace-pre-wrap ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            {output.split('\n').map((line, idx) => {
              let lineClass = '';
              if (line.startsWith('+') && !line.startsWith('+++')) {
                lineClass = theme === 'dark' ? 'text-green-400 bg-green-900/20' : 'text-green-600 bg-green-50';
              } else if (line.startsWith('-') && !line.startsWith('---')) {
                lineClass = theme === 'dark' ? 'text-red-400 bg-red-900/20' : 'text-red-600 bg-red-50';
              } else if (line.startsWith('@@')) {
                lineClass = theme === 'dark' ? 'text-blue-400' : 'text-blue-600';
              }
              return <div key={idx} className={lineClass}>{line}</div>;
            })}
          </pre>
        ) : (
          <pre className={`text-sm font-mono ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{t('tool.noOutput')}</pre>
        )}
      </div>
    </div>
  );
}

function GrepGlobResult({ output, theme }: { output: string; theme: 'dark' | 'light' }) {
  const { t } = useI18n();
  const lines = output.split('\n').filter(l => l.trim());
  return (
    <div className={`border rounded-lg overflow-hidden ${theme === 'dark' ? 'bg-gray-800/60 border-gray-700/50' : 'bg-white border-gray-200'}`}>
      <div className="p-3 space-y-0.5">
        {lines.length === 0 ? (
          <span className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{t('tool.noResults')}</span>
        ) : lines.map((line, idx) => {
          // Highlight file paths (before the colon) differently from match content
          const colonIdx = line.indexOf(':');
          if (colonIdx > 0) {
            const path = line.slice(0, colonIdx);
            const rest = line.slice(colonIdx + 1);
            return (
              <div key={`${idx}-${path}`} className="text-sm font-mono flex gap-0">
                <span className={theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}>{path}</span>
                <span className="text-gray-500">:</span>
                <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>{rest}</span>
              </div>
            );
          }
          return (
            <div key={idx} className={`text-sm font-mono ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{line}</div>
          );
        })}
      </div>
    </div>
  );
}

function PlainTextResult({ output, theme }: { output: string; theme: 'dark' | 'light' }) {
  const { t } = useI18n();
  return (
    <pre className={`text-sm font-mono whitespace-pre-wrap break-words ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
      {output || t('tool.noOutput')}
    </pre>
  );
}

function WriteResult({ output, input, theme }: { output: string; input: Record<string, unknown>; theme: 'dark' | 'light' }) {
  const { t } = useI18n();
  const filePath = (input.file_path as string) || '';
  return (
    <div className={`border rounded-lg overflow-hidden ${theme === 'dark' ? 'bg-gray-800/60 border-gray-700/50' : 'bg-white border-gray-200'}`}>
      <div className={`flex items-center gap-2 px-3 py-1.5 border-b ${theme === 'dark' ? 'bg-gray-800/80 border-gray-700/50' : 'bg-gray-50 border-gray-200'}`}>
        <span className="text-sm">✏️</span>
        <span className={`text-sm font-mono ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>{filePath}</span>
      </div>
      <div className="p-3">
        {output ? (
          <pre className={`text-sm overflow-x-auto font-mono whitespace-pre-wrap break-words ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            {output}
          </pre>
        ) : (
          <span className={`text-sm font-mono ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
            {t('tool.fileWritten')}
          </span>
        )}
      </div>
    </div>
  );
}

function WebResult({ output, input, theme }: { output: string; input: Record<string, unknown>; theme: 'dark' | 'light' }) {
  const { t } = useI18n();
  const url = (input.url as string) || (input.query as string) || '';
  return (
    <div className={`border rounded-lg overflow-hidden ${theme === 'dark' ? 'bg-gray-800/60 border-gray-700/50' : 'bg-white border-gray-200'}`}>
      {url && (
        <div className={`flex items-center gap-2 px-3 py-1.5 border-b ${theme === 'dark' ? 'bg-gray-800/80 border-gray-700/50' : 'bg-gray-50 border-gray-200'}`}>
          <span className="text-sm"> </span>
          <span className={`text-sm font-mono truncate ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>{url}</span>
        </div>
      )}
      <div className="p-3">
        <pre className={`text-sm font-mono whitespace-pre-wrap break-words ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
          {output || t('tool.noOutput')}
        </pre>
      </div>
    </div>
  );
}

// ---- ToolExecutionCard — unified tool call + result ----

export function ToolExecutionCard({ execution, isExpanded, onToggle, theme = 'dark' }: {
  execution: ToolExecutionContent;
  isExpanded: boolean;
  onToggle: () => void;
  theme?: 'dark' | 'light';
}) {
  const { t } = useI18n();
  const icon = getToolIcon(execution.toolName);
  const [isOutputExpanded, setIsOutputExpanded] = useState(false);
  const OUTPUT_TRUNCATE_LENGTH = 500;
  const shouldTruncate = execution.output && execution.output.length > OUTPUT_TRUNCATE_LENGTH && !execution.isError;

  const getKeyInfo = () => {
    if (!execution.input) return null;
    if (execution.toolName === 'Read' || execution.toolName === 'Write' || execution.toolName === 'Edit') {
      return execution.input.file_path as string;
    }
    if (execution.toolName === 'Bash') {
      return execution.input.command as string;
    }
    if (execution.toolName === 'Grep' || execution.toolName === 'Glob') {
      return (execution.input.pattern as string) || (execution.input.query as string);
    }
    return null;
  };

  const keyInfo = getKeyInfo();

  const statusIndicator = () => {
    switch (execution.status) {
      case 'running':
        return <span className="inline-block w-2 h-2 rounded-full bg-blue-400 animate-pulse" title={t('tool.running')} />;
      case 'completed':
        return <span className="inline-block w-2 h-2 rounded-full bg-green-400" title={t('tool.completed')} />;
      case 'error':
        return <span className="inline-block w-2 h-2 rounded-full bg-red-400" title={t('tool.error')} />;
    }
  };

  const renderResult = () => {
    if (!execution.output && execution.status === 'running') {
      return (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span className="inline-block w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <span>{t('tool.executing')}</span>
        </div>
      );
    }
    if (!execution.output) {
      return <span className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{t('tool.noOutput')}</span>;
    }

    const displayOutput = shouldTruncate && !isOutputExpanded
      ? execution.output.slice(0, OUTPUT_TRUNCATE_LENGTH) + '...'
      : execution.output;

    switch (execution.toolName) {
      case 'Bash':
        return <BashResult output={displayOutput} isError={execution.isError} theme={theme} />;
      case 'Read':
        return <ReadResult output={displayOutput} input={execution.input} theme={theme} />;
      case 'Edit':
        return <EditResult output={displayOutput} input={execution.input} theme={theme} />;
      case 'Write':
        return <WriteResult output={displayOutput} input={execution.input} theme={theme} />;
      case 'Grep':
      case 'Glob':
        return <GrepGlobResult output={displayOutput} theme={theme} />;
      case 'WebFetch':
      case 'WebSearch':
        return <WebResult output={displayOutput} input={execution.input} theme={theme} />;
      default:
        return <PlainTextResult output={displayOutput} theme={theme} />;
    }
  };

  return (
    <div className={`border rounded-lg overflow-hidden transition-all duration-200 ${
      execution.status === 'error'
        ? theme === 'dark' ? 'bg-red-900/10 border-red-700/50 hover:border-red-600/50' : 'bg-red-50 border-red-200 hover:border-red-300'
        : theme === 'dark' ? 'bg-gray-800/80 border-gray-700/50 hover:border-gray-600/50' : 'bg-gray-50 border-gray-200 hover:border-gray-300'
    }`}>
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
          theme === 'dark' ? 'hover:bg-gray-700/30' : 'hover:bg-gray-100'
        }`}
      >
        {statusIndicator()}
        <span className="text-lg">{icon}</span>
        <div className="flex-1 min-w-0">
          <span className={`font-mono text-sm font-medium ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}>
            {execution.toolName}
          </span>
          {keyInfo && (
            <span className={`text-xs ml-2 truncate ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
              {keyInfo.length > 60 ? keyInfo.slice(0, 60) + '...' : keyInfo}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''} ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isExpanded && (
        <div className={`border-t p-3 ${theme === 'dark' ? 'border-gray-700/50 bg-gray-900/50' : 'border-gray-200 bg-white'}`}>
          {/* Input summary */}
          <details className="mb-3">
            <summary className={`text-xs cursor-pointer ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{t('tool.input')}</summary>
            <pre className={`text-sm mt-1 overflow-x-auto font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {JSON.stringify(execution.input, null, 2)}
            </pre>
          </details>
          {/* Result */}
          {renderResult()}
          {shouldTruncate && (
            <button
              onClick={() => setIsOutputExpanded(prev => !prev)}
              className={`mt-2 text-xs font-medium transition-colors ${
                theme === 'dark'
                  ? 'text-blue-400 hover:text-blue-300'
                  : 'text-blue-600 hover:text-blue-500'
              }`}
            >
              {isOutputExpanded ? t('tool.showLess') : t('tool.showMore')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

