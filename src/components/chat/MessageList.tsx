import { useEffect, useRef, useState, useMemo, type JSX } from 'react';
import { MessageErrorBoundary } from './MessageErrorBoundary';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { Message, ToolCallContent, ToolResultContent, ToolExecutionContent, FileContent, PatchContent } from '../../types';
import { useI18n } from '../../i18n';
import { useToast } from '../ui/ToastProvider';
import { CopyButton } from './CopyButton';
import { ToolCallCard, ToolResultCard, ToolExecutionCard } from './ToolExecutionCard';
import { ThinkingBlock } from './ThinkingBlock';

// Escape special regex characters
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Highlight text by wrapping matches in <mark> elements (for plain text rendering)
function highlightPlainText(text: string, query: string): (string | JSX.Element)[] {
  if (!query) return [text];
  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
  const parts = text.split(regex);
  let matchIdx = 0;
  return parts.map((part, i) => {
    if (part.toLowerCase() === query.toLowerCase()) {
      const idx = matchIdx++;
      return (
        <mark
          key={`${i}-${idx}`}
          data-search-match
          data-match-index={idx}
          className="bg-yellow-500/40 text-inherit rounded-sm px-0.5"
        >
          {part}
        </mark>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

// Rehype plugin to highlight search matches in HAST tree (for ReactMarkdown)
function rehypeSearchHighlight(query: string) {
  return () => (tree: any) => {
    if (!query) return;
    const queryLower = query.toLowerCase();
    walkAndHighlight(tree, queryLower);
  };
}

function walkAndHighlight(node: any, queryLower: string): void {
  if (!node || !node.children) return;

  let i = 0;
  while (i < node.children.length) {
    const child = node.children[i];

    if (child.type === 'text' && typeof child.value === 'string') {
      const lower = child.value.toLowerCase();
      if (!lower.includes(queryLower)) {
        i++;
        continue;
      }

      const parts: any[] = [];
      let remaining = child.value;
      let searchFrom = 0;

      while (searchFrom < remaining.length) {
        const idx = remaining.toLowerCase().indexOf(queryLower, searchFrom);
        if (idx === -1) {
          parts.push({ type: 'text', value: remaining.slice(searchFrom) });
          break;
        }
        if (idx > searchFrom) {
          parts.push({ type: 'text', value: remaining.slice(searchFrom, idx) });
        }
        parts.push({
          type: 'element',
          tagName: 'mark',
          properties: {
            'data-search-match': true,
            style: 'background-color: rgba(234, 179, 8, 0.4); border-radius: 2px; padding: 0 2px;',
          },
          children: [{ type: 'text', value: remaining.slice(idx, idx + queryLower.length) }],
        });
        searchFrom = idx + queryLower.length;
      }

      node.children.splice(i, 1, ...parts);
      i += parts.length;
    } else {
      walkAndHighlight(child, queryLower);
      i++;
    }
  }
}

interface MessageListProps {
  messages: Message[];
  streamingText: string;
  isStreaming: boolean;
  streamingThinking?: string;
  theme?: 'dark' | 'light';
  searchQuery?: string;
  currentMatchIndex?: number;
  onRetry?: () => void;
}

// Code block wrapper with copy button — uses ref to extract textContent
// so it works with syntax-highlighted code (rehype-highlight)
function CodeBlock({ children, theme, ...props }: { children: React.ReactNode; theme: 'dark' | 'light'; [key: string]: any }) {
  const preRef = useRef<HTMLPreElement>(null);
  const [codeText, setCodeText] = useState('');

  useEffect(() => {
    if (preRef.current) {
      setCodeText(preRef.current.textContent || '');
    }
  }, [children]);

  return (
    <div className="relative group/code">
      <pre ref={preRef} {...props} className="rounded-lg p-4 overflow-x-auto">
        {children}
      </pre>
      {codeText && <CopyButton text={codeText} theme={theme} />}
    </div>
  );
}

export function MessageList({ messages, streamingText, isStreaming, streamingThinking, theme = 'dark', searchQuery, currentMatchIndex, onRetry }: MessageListProps) {
  const { t } = useI18n();
  const toast = useToast();
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  // Compute the index of the last assistant message for retry button
  const lastAssistantIndex = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant' && messages[i].type === 'text') return i;
    }
    return -1;
  }, [messages]);

  // Build rehype plugins array — include search highlight plugin when searching
  const rehypePlugins = useMemo(() => {
    const plugins: any[] = [rehypeHighlight];
    if (searchQuery) {
      plugins.push(rehypeSearchHighlight(searchQuery));
    }
    return plugins;
  }, [searchQuery]);

  // Scroll to current search match
  useEffect(() => {
    if (!searchQuery || currentMatchIndex === undefined || !containerRef.current) return;

    // Assign global indices to all mark[data-search-match] elements
    const marks = containerRef.current.querySelectorAll('mark[data-search-match]');
    marks.forEach((mark, i) => {
      mark.setAttribute('data-match-index', String(i));
      // Reset to default yellow styling
      (mark as HTMLElement).style.backgroundColor = 'rgba(234, 179, 8, 0.4)';
      (mark as HTMLElement).style.borderRadius = '2px';
      (mark as HTMLElement).style.padding = '0 2px';
    });

    // Highlight the current match with orange
    if (marks[currentMatchIndex]) {
      const currentMark = marks[currentMatchIndex] as HTMLElement;
      currentMark.style.backgroundColor = 'rgba(249, 115, 22, 0.6)';
      currentMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [searchQuery, currentMatchIndex, messages, streamingText]);

  useEffect(() => {
    // Only auto-scroll to bottom when not searching
    if (!searchQuery) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingText, streamingThinking, searchQuery]);

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

  const markdownComponents = useMemo(() => ({
    pre: ({ children, ...props }: any) => (
      <CodeBlock theme={theme} {...props}>{children}</CodeBlock>
    ),
    code: ({ className, children, node, ...props }: any) => {
      // In react-markdown v9+, inline code has no className.
      // Fenced code blocks without a language also have no className.
      // Distinguish by checking if content has newlines (block) or not (inline).
      const content = String(children);
      const isInline = !className && !content.includes('\n');
      if (isInline) {
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
    table: ({ children, ...props }: any) => (
      <div className="overflow-x-auto my-4">
        <table {...props} className={`min-w-full divide-y ${
          theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'
        }`}>
          {children}
        </table>
      </div>
    ),
    th: ({ children, ...props }: any) => (
      <th {...props} className={`px-4 py-2 text-left text-sm font-medium ${
        theme === 'dark' ? 'bg-gray-800/50 text-gray-300' : 'bg-gray-100 text-gray-700'
      }`}>
        {children}
      </th>
    ),
    td: ({ children, ...props }: any) => (
      <td {...props} className={`px-4 py-2 text-sm border-t ${
        theme === 'dark' ? 'text-gray-300 border-gray-700/50' : 'text-gray-700 border-gray-200'
      }`}>
        {children}
      </td>
    ),
  }), [theme]);

  const handleCopyMessage = async (message: Message) => {
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
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedMessageId(message.id);
      setTimeout(() => setCopiedMessageId(null), 2000);
      toast.success(t('toast.copied') || 'Copied!');
    } catch (err) {
      toast.error(t('toast.copyFailed') || 'Copy failed');
    }
  };

  const renderMessage = (message: Message, index: number) => {
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
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {searchQuery ? highlightPlainText(message.content as string, searchQuery) : message.content as string}
                  </p>
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
                      rehypePlugins={rehypePlugins}
                      components={markdownComponents}
                    >
                      {message.content as string}
                    </ReactMarkdown>
                  </div>
                  <div className={`text-xs mt-3 ${
                    theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    {new Date(message.timestamp).toLocaleTimeString()}
                    {(message.costUsd || message.tokens) && (
                      <>
                        <span className="mx-1">·</span>
                        {message.costUsd != null && (
                          <span>${message.costUsd < 0.01 ? '<0.01' : message.costUsd.toFixed(2)}</span>
                        )}
                        {message.tokens != null && (
                          <>
                            {message.costUsd != null && <span> </span>}
                            <span>{message.tokens < 1000 ? message.tokens : `${(message.tokens / 1000).toFixed(1)}k`} tokens</span>
                          </>
                        )}
                      </>
                    )}
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
                }`}>{t('tool.error')}</span>
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
                  {(message.content as string) || t('step.label')}
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
                  {(message.content as string) || t('step.complete')}
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
                {patchContent.diff.split('\n').map((line, idx) => {
                   let lineClass = '';
                   if (line.startsWith('+')) {
                     lineClass = theme === 'dark' ? 'text-green-400 bg-green-900/20' : 'text-green-600 bg-green-50';
                   } else if (line.startsWith('-')) {
                     lineClass = theme === 'dark' ? 'text-red-400 bg-red-900/20' : 'text-red-600 bg-red-50';
                   } else if (line.startsWith('@@')) {
                     lineClass = theme === 'dark' ? 'text-blue-400' : 'text-blue-600';
                   }
                   return (
                     <div key={idx} className={lineClass}>{line}</div>
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
            title={t('chat.copyMessage')}
          >
            {copiedMessageId === message.id ? '✓' : ' '}
          </button>
          {message.role === 'assistant' && index === lastAssistantIndex && !isStreaming && onRetry && (
            <button
              onClick={onRetry}
              className={`p-1.5 rounded-md text-xs transition-colors ${
                theme === 'dark'
                  ? 'bg-gray-700/80 hover:bg-gray-600 text-gray-300'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
              title={t('message.retry')}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div ref={containerRef} className={`h-full overflow-y-auto p-6 space-y-4 scroll-smooth ${
      theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'
    }`}>
      {messages.length === 0 && !isStreaming && (
        <div className={`flex flex-col items-center justify-center h-full ${
          theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
        }`}>
          <div className="text-6xl mb-4"> </div>
          <h2 className="text-xl font-semibold mb-2">Claude Code Web</h2>
          <p className="text-sm">{t('message.startConversation')}</p>
        </div>
      )}

      {messages.map((message, index) => (
        <MessageErrorBoundary key={message.id}>
          <div className="animate-fadeIn">
            {renderMessage(message, index)}
          </div>
        </MessageErrorBoundary>
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
                rehypePlugins={rehypePlugins}
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
