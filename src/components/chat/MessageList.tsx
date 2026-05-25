import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { Message, ToolCallContent, ToolResultContent } from '../../types';

interface MessageListProps {
  messages: Message[];
  streamingText: string;
  isStreaming: boolean;
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
function ToolCallCard({ toolCall, isExpanded, onToggle }: {
  toolCall: ToolCallContent;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const icon = getToolIcon(toolCall.toolName);
  const hasDetails = toolCall.input && Object.keys(toolCall.input).length > 0;

  return (
    <div className="bg-gray-800/80 border border-gray-700/50 rounded-lg overflow-hidden transition-all duration-200 hover:border-gray-600/50">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-700/30 transition-colors"
      >
        <span className="text-lg">{icon}</span>
        <span className="text-amber-400 font-mono text-sm font-medium flex-1">
          {toolCall.toolName}
        </span>
        {hasDetails && (
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>
      {isExpanded && hasDetails && (
        <div className="border-t border-gray-700/50 p-3 bg-gray-900/50">
          <pre className="text-sm text-gray-300 overflow-x-auto font-mono">
            {JSON.stringify(toolCall.input, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// Tool result component
function ToolResultCard({ result }: { result: ToolResultContent }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasLongContent = result.output && result.output.length > 500;

  return (
    <div
      className={`border rounded-lg overflow-hidden transition-all duration-200 ${
        result.isError
          ? 'bg-red-900/10 border-red-700/50 hover:border-red-600/50'
          : 'bg-gray-800/60 border-gray-700/50 hover:border-gray-600/50'
      }`}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 p-3 text-left hover:bg-gray-700/20 transition-colors"
      >
        <span className="text-sm">{result.isError ? '❌' : '✅'}</span>
        <span className="text-gray-400 text-sm flex-1">Tool Result</span>
        {result.isError && (
          <span className="text-red-400 text-xs bg-red-500/20 px-2 py-0.5 rounded-full">
            Error
          </span>
        )}
        {hasLongContent && (
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>
      <div
        className={`border-t border-gray-700/30 p-3 bg-gray-900/30 ${
          hasLongContent && !isExpanded ? 'max-h-32 overflow-hidden relative' : ''
        }`}
      >
        <pre className="text-sm text-gray-300 overflow-x-auto font-mono whitespace-pre-wrap break-words">
          {result.output}
        </pre>
        {hasLongContent && !isExpanded && (
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-gray-900/80 to-transparent" />
        )}
      </div>
    </div>
  );
}

// Thinking block component
function ThinkingBlock({ content }: { content: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const preview = content.slice(0, 150);

  return (
    <div className="bg-purple-900/10 border border-purple-700/30 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 p-3 text-left hover:bg-purple-800/10 transition-colors"
      >
        <span className="text-purple-400 text-sm"> </span>
        <span className="text-purple-400/80 text-sm flex-1 italic">
          {isExpanded ? 'Thinking' : `${preview}...`}
        </span>
        <svg
          className={`w-4 h-4 text-purple-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isExpanded && (
        <div className="border-t border-purple-700/30 p-3 bg-purple-900/5">
          <p className="text-purple-300/80 text-sm italic leading-relaxed whitespace-pre-wrap">
            {content}
          </p>
        </div>
      )}
    </div>
  );
}

export function MessageList({ messages, streamingText, isStreaming }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

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

  const renderMessage = (message: Message) => {
    switch (message.type) {
      case 'text':
        return (
          <div
            className={`group relative ${
              message.role === 'user'
                ? 'bg-blue-600/90 ml-auto rounded-2xl rounded-br-md'
                : 'bg-gray-800/80 rounded-2xl rounded-bl-md'
            } p-4 max-w-[85%] shadow-lg transition-all duration-200 hover:shadow-xl`}
          >
            {message.role === 'user' ? (
              <p className="whitespace-pre-wrap text-white leading-relaxed">{message.content as string}</p>
            ) : (
              <div className="prose prose-invert max-w-none prose-pre:bg-gray-900/80 prose-pre:border prose-pre:border-gray-700/50 prose-code:text-emerald-400 prose-a:text-blue-400 hover:prose-a:text-blue-300">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                  components={{
                    pre: ({ children, ...props }) => (
                      <div className="relative group/code">
                        <pre {...props} className="rounded-lg p-4 overflow-x-auto">
                          {children}
                        </pre>
                        <button
                          onClick={() => {
                            const codeEl = document.querySelector('.group\\/code code');
                            if (codeEl?.textContent) navigator.clipboard.writeText(codeEl.textContent);
                          }}
                          className="absolute top-2 right-2 opacity-0 group-hover/code:opacity-100 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs px-2 py-1 rounded transition-opacity"
                        >
                          Copy
                        </button>
                      </div>
                    ),
                    code: ({ inline, className, children, ...props }: any) => {
                      if (inline) {
                        return (
                          <code className="bg-gray-700/50 text-emerald-400 px-1.5 py-0.5 rounded text-sm" {...props}>
                            {children}
                          </code>
                        );
                      }
                      return <code className={className} {...props}>{children}</code>;
                    },
                    table: ({ children, ...props }) => (
                      <div className="overflow-x-auto my-4">
                        <table {...props} className="min-w-full divide-y divide-gray-700">
                          {children}
                        </table>
                      </div>
                    ),
                    th: ({ children, ...props }) => (
                      <th {...props} className="px-4 py-2 bg-gray-800/50 text-left text-sm font-medium text-gray-300">
                        {children}
                      </th>
                    ),
                    td: ({ children, ...props }) => (
                      <td {...props} className="px-4 py-2 text-sm text-gray-300 border-t border-gray-700/50">
                        {children}
                      </td>
                    ),
                  }}
                >
                  {message.content as string}
                </ReactMarkdown>
              </div>
            )}
            <div className="absolute -bottom-5 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-gray-500">
              {new Date(message.timestamp).toLocaleTimeString()}
            </div>
          </div>
        );

      case 'tool_use':
        const toolCall = message.content as ToolCallContent;
        return (
          <div className="max-w-[85%]">
            <ToolCallCard
              toolCall={toolCall}
              isExpanded={expandedTools.has(message.id)}
              onToggle={() => toggleTool(message.id)}
            />
          </div>
        );

      case 'tool_result':
        const result = message.content as ToolResultContent;
        return (
          <div className="max-w-[85%] ml-4">
            <ToolResultCard result={result} />
          </div>
        );

      case 'thinking':
        return (
          <div className="max-w-[85%]">
            <ThinkingBlock content={message.content as string} />
          </div>
        );

      case 'error':
        return (
          <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4 max-w-[85%] shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-red-400">⚠️</span>
              <span className="text-red-400 font-medium text-sm">Error</span>
            </div>
            <p className="text-red-300 text-sm">{message.content as string}</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 scroll-smooth">
      {messages.length === 0 && !isStreaming && (
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <div className="text-6xl mb-4"> </div>
          <h2 className="text-xl font-semibold mb-2">Claude Code Web</h2>
          <p className="text-sm">Start a conversation to begin coding</p>
        </div>
      )}

      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
        >
          {renderMessage(message)}
        </div>
      ))}

      {isStreaming && streamingText && (
        <div className="flex justify-start animate-fadeIn">
          <div className="bg-gray-800/80 rounded-2xl rounded-bl-md p-4 max-w-[85%] shadow-lg">
            <div className="prose prose-invert max-w-none prose-pre:bg-gray-900/80 prose-pre:border prose-pre:border-gray-700/50 prose-code:text-emerald-400">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
              >
                {streamingText}
              </ReactMarkdown>
            </div>
            <span className="inline-block w-2 h-4 bg-blue-400 animate-pulse ml-1 rounded-sm" />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
