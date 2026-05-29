import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { Message, ToolCallContent, ToolResultContent, ToolExecutionContent, FileContent, PatchContent } from '../../types';

interface MessageListProps {
  messages: Message[];
  streamingText: string;
  isStreaming: boolean;
  streamingThinking?: string;
  theme?: 'dark' | 'light';
}

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
function ToolCallCard({ toolCall, isExpanded, onToggle, theme = 'dark' }: {
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
      return toolCall.input.pattern as string || toolCall.input.query as string;
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
function ToolResultCard({ result, theme = 'dark' }: { result: ToolResultContent; theme?: 'dark' | 'light' }) {
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
        <span className={`text-sm flex-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Tool Result</span>
        {result.isError && (
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            theme === 'dark' ? 'text-red-400 bg-red-500/20' : 'text-red-600 bg-red-100'
          }`}>
            Error
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
  return (
    <div className={`rounded-lg overflow-hidden ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-900'}`}>
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 border-b border-gray-700">
        <span className="text-xs text-gray-400 font-mono">terminal</span>
        {isError !== undefined && (
          <span className={`text-xs px-1.5 py-0.5 rounded ${isError ? 'text-red-400 bg-red-500/20' : 'text-green-400 bg-green-500/20'}`}>
            exit {isError ? '1' : '0'}
          </span>
        )}
      </div>
      <pre className="p-3 text-sm font-mono text-green-300 overflow-x-auto whitespace-pre-wrap break-words">
        {output || '(no output)'}
      </pre>
    </div>
  );
}

function ReadResult({ output, input, theme }: { output: string; input: Record<string, unknown>; theme: 'dark' | 'light' }) {
  const filePath = input.file_path as string || '';
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
  const filePath = input.file_path as string || '';
  return (
    <div className={`border rounded-lg overflow-hidden ${theme === 'dark' ? 'bg-gray-800/60 border-gray-700/50' : 'bg-white border-gray-200'}`}>
      <div className={`flex items-center gap-2 px-3 py-1.5 border-b ${theme === 'dark' ? 'bg-gray-800/80 border-gray-700/50' : 'bg-gray-50 border-gray-200'}`}>
        <span className="text-sm">✏️</span>
        <span className={`text-sm font-mono ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}>{filePath}</span>
      </div>
      <div className="p-3">
        {output ? (
          <pre className={`text-sm overflow-x-auto font-mono whitespace-pre-wrap ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            {output.split('\n').map((line, i) => {
              let lineClass = '';
              if (line.startsWith('+') && !line.startsWith('+++')) {
                lineClass = theme === 'dark' ? 'text-green-400 bg-green-900/20' : 'text-green-600 bg-green-50';
              } else if (line.startsWith('-') && !line.startsWith('---')) {
                lineClass = theme === 'dark' ? 'text-red-400 bg-red-900/20' : 'text-red-600 bg-red-50';
              } else if (line.startsWith('@@')) {
                lineClass = theme === 'dark' ? 'text-blue-400' : 'text-blue-600';
              }
              return <div key={i} className={lineClass}>{line}</div>;
            })}
          </pre>
        ) : (
          <pre className={`text-sm font-mono ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>(no output)</pre>
        )}
      </div>
    </div>
  );
}

function GrepGlobResult({ output, theme }: { output: string; theme: 'dark' | 'light' }) {
  const lines = output.split('\n').filter(l => l.trim());
  return (
    <div className={`border rounded-lg overflow-hidden ${theme === 'dark' ? 'bg-gray-800/60 border-gray-700/50' : 'bg-white border-gray-200'}`}>
      <div className="p-3 space-y-0.5">
        {lines.length === 0 ? (
          <span className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>(no results)</span>
        ) : lines.map((line, i) => {
          // Highlight file paths (before the colon) differently from match content
          const colonIdx = line.indexOf(':');
          if (colonIdx > 0) {
            const path = line.slice(0, colonIdx);
            const rest = line.slice(colonIdx + 1);
            return (
              <div key={i} className="text-sm font-mono flex gap-0">
                <span className={theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}>{path}</span>
                <span className="text-gray-500">:</span>
                <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>{rest}</span>
              </div>
            );
          }
          return (
            <div key={i} className={`text-sm font-mono ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{line}</div>
          );
        })}
      </div>
    </div>
  );
}

function PlainTextResult({ output, theme }: { output: string; theme: 'dark' | 'light' }) {
  return (
    <pre className={`text-sm font-mono whitespace-pre-wrap break-words ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
      {output || '(no output)'}
    </pre>
  );
}

// ---- ToolExecutionCard — unified tool call + result ----

function ToolExecutionCard({ execution, isExpanded, onToggle, theme = 'dark' }: {
  execution: ToolExecutionContent;
  isExpanded: boolean;
  onToggle: () => void;
  theme?: 'dark' | 'light';
}) {
  const icon = getToolIcon(execution.toolName);

  const getKeyInfo = () => {
    if (!execution.input) return null;
    if (execution.toolName === 'Read' || execution.toolName === 'Write' || execution.toolName === 'Edit') {
      return execution.input.file_path as string;
    }
    if (execution.toolName === 'Bash') {
      return execution.input.command as string;
    }
    if (execution.toolName === 'Grep' || execution.toolName === 'Glob') {
      return execution.input.pattern as string || execution.input.query as string;
    }
    return null;
  };

  const keyInfo = getKeyInfo();

  const statusIndicator = () => {
    switch (execution.status) {
      case 'running':
        return <span className="inline-block w-2 h-2 rounded-full bg-blue-400 animate-pulse" title="Running" />;
      case 'completed':
        return <span className="inline-block w-2 h-2 rounded-full bg-green-400" title="Completed" />;
      case 'error':
        return <span className="inline-block w-2 h-2 rounded-full bg-red-400" title="Error" />;
    }
  };

  const renderResult = () => {
    if (!execution.output && execution.status === 'running') {
      return (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span className="inline-block w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <span>Executing...</span>
        </div>
      );
    }
    if (!execution.output) {
      return <span className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>(no output)</span>;
    }

    switch (execution.toolName) {
      case 'Bash':
        return <BashResult output={execution.output} isError={execution.isError} theme={theme} />;
      case 'Read':
        return <ReadResult output={execution.output} input={execution.input} theme={theme} />;
      case 'Edit':
        return <EditResult output={execution.output} input={execution.input} theme={theme} />;
      case 'Grep':
      case 'Glob':
        return <GrepGlobResult output={execution.output} theme={theme} />;
      default:
        return <PlainTextResult output={execution.output} theme={theme} />;
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
            <summary className={`text-xs cursor-pointer ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Input</summary>
            <pre className={`text-sm mt-1 overflow-x-auto font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {JSON.stringify(execution.input, null, 2)}
            </pre>
          </details>
          {/* Result */}
          {renderResult()}
        </div>
      )}
    </div>
  );
}

// Thinking block component - real-time display
function ThinkingBlock({ content, isStreaming, theme = 'dark' }: { content: string; isStreaming?: boolean; theme?: 'dark' | 'light' }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const preview = content.slice(0, 200);

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
          {isExpanded ? 'Thinking' : `${preview}...`}
        </span>
        {isStreaming && (
          <span className={`text-xs ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`}>
            streaming...
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
            {content}
            {isStreaming && <span className="inline-block w-2 h-4 bg-purple-400 animate-pulse ml-1 rounded-sm" />}
          </p>
        </div>
      )}
    </div>
  );
}

// Copy button for code blocks
function CopyButton({ text, theme = 'dark' }: { text: string; theme?: 'dark' | 'light' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

export function MessageList({ messages, streamingText, isStreaming, streamingThinking, theme = 'dark' }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText, streamingThinking]);

  const toggleTool = (id: string) => {
    setExpandedTools(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCopyMessage = (message: Message) => {
    let textToCopy = '';
    if (typeof message.content === 'string') {
      textToCopy = message.content;
    } else if (message.type === 'tool_use') {
      const toolCall = message.content as ToolCallContent;
      textToCopy = `${toolCall.toolName}: ${JSON.stringify(toolCall.input, null, 2)}`;
    } else if (message.type === 'tool_result') {
      const result = message.content as ToolResultContent;
      textToCopy = result.output || '';
    } else if (message.type === 'tool_execution') {
      const exec = message.content as ToolExecutionContent;
      textToCopy = `[${exec.toolName}] ${exec.status}\nInput: ${JSON.stringify(exec.input, null, 2)}${exec.output ? `\nOutput: ${exec.output}` : ''}`;
    }
    navigator.clipboard.writeText(textToCopy);
    setCopiedMessageId(message.id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const renderMessage = (message: Message) => {
    const messageContent = (() => {
      switch (message.type) {
        case 'text':
          if (message.role === 'user') {
            // User message - bubble style (right aligned)
            return (
              <div className="flex justify-end">
                <div className={`max-w-[70%] rounded-2xl rounded-br-md p-4 shadow-sm ${
                  theme === 'dark'
                    ? 'bg-blue-600/90 text-white'
                    : 'bg-blue-500 text-white'
                }`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{message.content as string}</p>
                  <div className="text-xs opacity-70 mt-2 text-right">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            );
          } else {
            // Assistant message - full width
            return (
              <div className="w-full">
                <div className={`rounded-lg p-4 ${
                  theme === 'dark'
                    ? 'bg-gray-800/80 border border-gray-700/50'
                    : 'bg-white border border-gray-200'
                }`}>
                  <div className={`prose max-w-none ${
                    theme === 'dark'
                      ? 'prose-invert prose-pre:bg-gray-900/80 prose-pre:border prose-pre:border-gray-700/50 prose-code:text-emerald-400 prose-a:text-blue-400 hover:prose-a:text-blue-300'
                      : 'prose-pre:bg-gray-100 prose-pre:border prose-pre:border-gray-200 prose-code:text-emerald-600 prose-a:text-blue-500 hover:prose-a:text-blue-600'
                  }`}>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeHighlight]}
                      components={{
                        pre: ({ children, ...props }) => {
                          const codeText = (children as any)?.props?.children;
                          return (
                            <div className="relative group/code">
                              <pre {...props} className="rounded-lg p-4 overflow-x-auto">
                                {children}
                              </pre>
                              {typeof codeText === 'string' && <CopyButton text={codeText} theme={theme} />}
                            </div>
                          );
                        },
                        code: ({ inline, className, children, ...props }: any) => {
                          if (inline) {
                            return (
                              <code className={`px-1.5 py-0.5 rounded text-sm ${
                                theme === 'dark'
                                  ? 'bg-gray-700/50 text-emerald-400'
                                  : 'bg-gray-200 text-emerald-600'
                              }`} {...props}>
                                {children}
                              </code>
                            );
                          }
                          return <code className={className} {...props}>{children}</code>;
                        },
                        table: ({ children, ...props }) => (
                          <div className="overflow-x-auto my-4">
                            <table {...props} className={`min-w-full divide-y ${
                              theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'
                            }`}>
                              {children}
                            </table>
                          </div>
                        ),
                        th: ({ children, ...props }) => (
                          <th {...props} className={`px-4 py-2 text-left text-sm font-medium ${
                            theme === 'dark' ? 'bg-gray-800/50 text-gray-300' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {children}
                          </th>
                        ),
                        td: ({ children, ...props }) => (
                          <td {...props} className={`px-4 py-2 text-sm border-t ${
                            theme === 'dark' ? 'text-gray-300 border-gray-700/50' : 'text-gray-700 border-gray-200'
                          }`}>
                            {children}
                          </td>
                        ),
                      }}
                    >
                      {message.content as string}
                    </ReactMarkdown>
                  </div>
                  <div className={`text-xs mt-3 ${
                    theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            );
          }

        case 'tool_execution': {
          const execution = message.content as ToolExecutionContent;
          return (
            <div className="w-full">
              <ToolExecutionCard
                execution={execution}
                isExpanded={expandedTools.has(message.id)}
                onToggle={() => toggleTool(message.id)}
                theme={theme}
              />
            </div>
          );
        }

        case 'tool_use':
          const toolCall = message.content as ToolCallContent;
          return (
            <div className="w-full">
              <ToolCallCard
                toolCall={toolCall}
                isExpanded={expandedTools.has(message.id)}
                onToggle={() => toggleTool(message.id)}
                theme={theme}
              />
            </div>
          );

        case 'tool_result':
          const result = message.content as ToolResultContent;
          return (
            <div className="w-full ml-4">
              <ToolResultCard result={result} theme={theme} />
            </div>
          );

        case 'thinking':
          return (
            <div className="w-full">
              <ThinkingBlock content={message.content as string} theme={theme} />
            </div>
          );

        case 'error':
          return (
            <div className={`w-full border rounded-lg p-4 ${
              theme === 'dark'
                ? 'bg-red-900/20 border-red-700/50'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-red-400">⚠️</span>
                <span className={`font-medium text-sm ${
                  theme === 'dark' ? 'text-red-400' : 'text-red-600'
                }`}>Error</span>
              </div>
              <p className={`text-sm ${theme === 'dark' ? 'text-red-300' : 'text-red-700'}`}>
                {message.content as string}
              </p>
            </div>
          );

        case 'step_start':
          return (
            <div className="w-full">
              <div className={`flex items-center gap-3 py-3 ${
                theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
              }`}>
                <div className={`flex-1 h-px ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-300'}`} />
                <span className="text-xs font-medium">
                  {(message.content as string) || 'Step'}
                </span>
                <div className={`flex-1 h-px ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-300'}`} />
              </div>
            </div>
          );

        case 'step_finish':
          return (
            <div className="w-full">
              <div className={`flex items-center gap-3 py-3 ${
                theme === 'dark' ? 'text-green-500/70' : 'text-green-500'
              }`}>
                <div className={`flex-1 h-px ${theme === 'dark' ? 'bg-green-700/30' : 'bg-green-300'}`} />
                <span className="text-xs font-medium flex items-center gap-1">
                  <span>✓</span>
                  {(message.content as string) || 'Step Complete'}
                </span>
                <div className={`flex-1 h-px ${theme === 'dark' ? 'bg-green-700/30' : 'bg-green-300'}`} />
              </div>
            </div>
          );

        case 'file':
          const fileContent = message.content as FileContent;
          return (
            <div className={`w-full border rounded-lg overflow-hidden ${
              theme === 'dark'
                ? 'bg-gray-800/60 border-gray-700/50'
                : 'bg-white border-gray-200'
            }`}>
              <div className={`flex items-center gap-2 px-4 py-2 border-b ${
                theme === 'dark'
                  ? 'bg-gray-800/80 border-gray-700/50'
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <span className="text-sm"> </span>
                <span className={`text-sm font-mono ${
                  theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                }`}>
                  {fileContent.path}
                </span>
                {fileContent.language && (
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {fileContent.language}
                  </span>
                )}
              </div>
              {fileContent.content && (
                <div className="p-4">
                  <pre className={`text-sm overflow-x-auto font-mono ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    <code>{fileContent.content}</code>
                  </pre>
                </div>
              )}
            </div>
          );

        case 'patch':
          const patchContent = message.content as PatchContent;
          return (
            <div className={`w-full border rounded-lg overflow-hidden ${
              theme === 'dark'
                ? 'bg-gray-800/60 border-gray-700/50'
                : 'bg-white border-gray-200'
            }`}>
              <div className={`flex items-center justify-between px-4 py-2 border-b ${
                theme === 'dark'
                  ? 'bg-gray-800/80 border-gray-700/50'
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="text-sm">✏️</span>
                  <span className={`text-sm font-mono ${
                    theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                  }`}>
                    {patchContent.filePath}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                    +{patchContent.additions}
                  </span>
                  <span className={`text-xs ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                    -{patchContent.deletions}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <pre className={`text-sm overflow-x-auto font-mono whitespace-pre-wrap ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {patchContent.diff.split('\n').map((line, i) => {
                    let lineClass = '';
                    if (line.startsWith('+')) {
                      lineClass = theme === 'dark' ? 'text-green-400 bg-green-900/20' : 'text-green-600 bg-green-50';
                    } else if (line.startsWith('-')) {
                      lineClass = theme === 'dark' ? 'text-red-400 bg-red-900/20' : 'text-red-600 bg-red-50';
                    } else if (line.startsWith('@@')) {
                      lineClass = theme === 'dark' ? 'text-blue-400' : 'text-blue-600';
                    }
                    return (
                      <div key={i} className={lineClass}>{line}</div>
                    );
                  })}
                </pre>
              </div>
            </div>
          );

        default:
          return null;
      }
    })();

    return (
      <div className="group relative">
        {messageContent}
        {/* Action buttons */}
        <div className={`absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 ${
          message.role === 'user' ? 'left-2 right-auto' : ''
        }`}>
          <button
            onClick={() => handleCopyMessage(message)}
            className={`p-1.5 rounded-md text-xs transition-colors ${
              theme === 'dark'
                ? 'bg-gray-700/80 hover:bg-gray-600 text-gray-300'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
            title="Copy message"
          >
            {copiedMessageId === message.id ? '✓' : ' '}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={`h-full overflow-y-auto p-6 space-y-4 scroll-smooth ${
      theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'
    }`}>
      {messages.length === 0 && !isStreaming && (
        <div className={`flex flex-col items-center justify-center h-full ${
          theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
        }`}>
          <div className="text-6xl mb-4"> </div>
          <h2 className="text-xl font-semibold mb-2">Claude Code Web</h2>
          <p className="text-sm">Start a conversation to begin coding</p>
        </div>
      )}

      {messages.map((message) => (
        <div key={message.id} className="animate-fadeIn">
          {renderMessage(message)}
        </div>
      ))}

      {/* Streaming thinking */}
      {isStreaming && streamingThinking && (
        <div className="w-full animate-fadeIn">
          <ThinkingBlock content={streamingThinking} isStreaming={true} theme={theme} />
        </div>
      )}

      {/* Streaming text */}
      {isStreaming && streamingText && (
        <div className="w-full animate-fadeIn">
          <div className={`rounded-lg p-4 ${
            theme === 'dark'
              ? 'bg-gray-800/80 border border-gray-700/50'
              : 'bg-white border border-gray-200'
          }`}>
            <div className={`prose max-w-none ${
              theme === 'dark'
                ? 'prose-invert prose-pre:bg-gray-900/80 prose-pre:border prose-pre:border-gray-700/50 prose-code:text-emerald-400'
                : 'prose-pre:bg-gray-100 prose-pre:border prose-pre:border-gray-200 prose-code:text-emerald-600'
            }`}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
              >
                {streamingText}
              </ReactMarkdown>
            </div>
            <span className={`inline-block w-2 h-4 animate-pulse ml-1 rounded-sm ${
              theme === 'dark' ? 'bg-blue-400' : 'bg-blue-500'
            }`} />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
