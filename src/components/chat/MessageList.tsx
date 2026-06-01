import { useEffect, useRef, useState, useMemo, useCallback, type JSX } from 'react';
import { MessageErrorBoundary } from './MessageErrorBoundary';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { Message, ToolCallContent, ToolResultContent, ToolExecutionContent, FileContent, PatchContent } from '../../types';
import { useI18n } from '../../i18n';
import { useToast } from '../ui/ToastProvider';
import { useSessionStore } from '../../stores/sessionStore';
import { getRelativeTime, escapeRegex } from '../../utils/format';
import { CopyButton } from './CopyButton';
import { ToolCallCard, ToolResultCard, ToolExecutionCard } from './ToolExecutionCard';
import { ToolGroupCard } from './ToolGroupCard';
import { ThinkingBlock } from './ThinkingBlock';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';

// Floating action toolbar that appears on hover over message bubbles
function MessageActionToolbar({
  message,
  theme,
  copiedMessageId,
  onCopy,
  onRetry,
  showRetry,
  isPinned,
  onPinToggle,
  t,
}: {
  message: Message;
  theme: 'dark' | 'light';
  copiedMessageId: string | null;
  onCopy: (message: Message) => void;
  onRetry?: () => void;
  showRetry: boolean;
  isPinned: boolean;
  onPinToggle: (messageId: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  return (
    <div className={`
      absolute -top-3 right-2 z-10
      flex items-center gap-0.5 px-1 py-0.5 rounded-md shadow-md
      opacity-0 group-hover:opacity-100
      transition-opacity duration-200 ease-in-out
      ${theme === 'dark'
        ? 'bg-gray-700/95 border border-gray-600/50'
        : 'bg-white/95 border border-gray-200'
      }
    `}>
      {/* Copy button */}
      <button
        onClick={(e) => { e.stopPropagation(); onCopy(message); }}
        className={`p-1 rounded transition-colors ${
          theme === 'dark'
            ? 'hover:bg-gray-600 text-gray-300'
            : 'hover:bg-gray-100 text-gray-600'
        }`}
        title={t('chat.copyMessage')}
        aria-label={t('message.copy')}
      >
        {copiedMessageId === message.id ? (
          <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </button>

      {/* Retry button (only for last assistant text message) */}
      {showRetry && onRetry && (
        <button
          onClick={(e) => { e.stopPropagation(); onRetry(); }}
          className={`p-1 rounded transition-colors ${
            theme === 'dark'
              ? 'hover:bg-gray-600 text-gray-300'
              : 'hover:bg-gray-100 text-gray-600'
          }`}
          title={t('message.retry')}
          aria-label={t('message.retry')}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      )}

      {/* Delete button (only for user messages) */}
      {message.role === 'user' && (
        <button
          onClick={(e) => { e.stopPropagation(); useSessionStore.getState().deleteMessage(message.id); }}
          className={`p-1 rounded transition-colors ${
            theme === 'dark'
              ? 'hover:bg-red-600/60 text-gray-300 hover:text-white'
              : 'hover:bg-red-100 text-gray-600 hover:text-red-600'
          }`}
          title={t('message.delete')}
          aria-label={t('message.delete')}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}

      {/* Pin/Unpin button */}
      <button
        onClick={(e) => { e.stopPropagation(); onPinToggle(message.id); }}
        className={`p-1 rounded transition-colors ${
          isPinned
            ? (theme === 'dark' ? 'bg-amber-600/40 text-amber-300' : 'bg-amber-100 text-amber-600')
            : (theme === 'dark' ? 'hover:bg-gray-600 text-gray-300' : 'hover:bg-gray-100 text-gray-600')
        }`}
        title={isPinned ? t('message.unpin') : t('message.pin')}
        aria-label={isPinned ? t('message.unpin') : t('message.pin')}
      >
        <span className="text-xs">{isPinned ? '📌' : ' '}</span>
      </button>
    </div>
  );
}

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
          className="text-inherit"
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
  isLoading?: boolean;
  onVisibleRangeChange?: (range: { start: number; end: number }) => void;
  pinnedMessages?: string[];
  onPinToggle?: (messageId: string) => void;
}

// Code block wrapper with copy button — uses ref to extract textContent
// so it works with syntax-highlighted code (rehype-highlight)
function CodeBlock({ children, theme, ...props }: { children: React.ReactNode; theme: 'dark' | 'light'; [key: string]: any }) {
  const preRef = useRef<HTMLPreElement>(null);
  const [codeText, setCodeText] = useState('');

  // Extract language from className (e.g., "language-typescript" → "typescript")
  const langMatch = typeof props.className === 'string'
    ? props.className.match(/language-(\S+)/)
    : null;
  const language = langMatch ? langMatch[1] : null;

  useEffect(() => {
    if (preRef.current) {
      setCodeText(preRef.current.textContent || '');
    }
  }, [children]);

  return (
    <div className="relative group/code">
      {language && (
        <span className={`absolute top-2 right-12 text-[10px] px-1.5 py-0.5 rounded ${
          theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'
        }`}>
          {language}
        </span>
      )}
      <pre ref={preRef} {...props} className="rounded-lg p-4 overflow-x-auto">
        {children}
      </pre>
      {codeText && <CopyButton text={codeText} theme={theme} />}
    </div>
  );
}

export function MessageList({ messages, streamingText, isStreaming, streamingThinking, theme = 'dark', searchQuery, currentMatchIndex, onRetry, isLoading = false, onVisibleRangeChange, pinnedMessages = [], onPinToggle }: MessageListProps) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [pinnedExpanded, setPinnedExpanded] = useState(false);

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

  // Scroll to bottom handler — uses Virtuoso API
  const scrollToBottom = useCallback(() => {
    if (virtuosoRef.current) {
      virtuosoRef.current.scrollToIndex({ index: 'LAST', align: 'end', behavior: 'smooth' });
    }
  }, []);

  // Listen for scroll-to-bottom event (triggered by Ctrl+End)
  useEffect(() => {
    const handleScrollToBottom = () => scrollToBottom();
    window.addEventListener('scroll-to-bottom', handleScrollToBottom);
    return () => window.removeEventListener('scroll-to-bottom', handleScrollToBottom);
  }, [scrollToBottom]);

  // Listen for scroll-to-message-index event (triggered by timeline click)
  useEffect(() => {
    const handleScrollToIndex = (e: Event) => {
      const customEvent = e as CustomEvent<{ index: number }>;
      const index = customEvent.detail?.index;
      if (typeof index === 'number' && virtuosoRef.current) {
        virtuosoRef.current.scrollToIndex({ index, align: 'center', behavior: 'smooth' });
      }
    };
    window.addEventListener('scroll-to-message-index', handleScrollToIndex);
    return () => window.removeEventListener('scroll-to-message-index', handleScrollToIndex);
  }, []);

  // Pre-process messages: group consecutive tool_execution and tool_use messages
  type RenderItem =
    | { kind: 'message'; message: Message; index: number }
    | { kind: 'tool_group'; messages: Message[]; startIndex: number }
    | { kind: 'streaming_thinking'; content: string }
    | { kind: 'streaming_text'; content: string };

  const renderItems = useMemo((): RenderItem[] => {
    const items: RenderItem[] = [];
    let i = 0;
    while (i < messages.length) {
      const msg = messages[i];
      // Detect tool-related messages: tool_execution, tool_use, tool_result
      const isToolMsg = msg.role === 'assistant' && (
        msg.type === 'tool_execution' || msg.type === 'tool_use' || msg.type === 'tool_result'
      );

      if (isToolMsg) {
        // Collect consecutive tool-related messages (allowing interleaved thinking)
        const group: Message[] = [];
        let j = i;
        while (j < messages.length) {
          const m = messages[j];
          const isTool = m.role === 'assistant' && (
            m.type === 'tool_execution' || m.type === 'tool_use' || m.type === 'tool_result'
          );
          const isThinking = m.role === 'assistant' && m.type === 'thinking';
          if (isTool || isThinking) {
            // Skip thinking blocks in the group (they're noise between tool calls)
            if (isTool) group.push(m);
            j++;
          } else {
            break;
          }
        }
        if (group.length >= 2) {
          items.push({ kind: 'tool_group', messages: group, startIndex: i });
        } else if (group.length === 1) {
          items.push({ kind: 'message', message: group[0], index: i });
        }
        // Skip all consumed messages (including thinking blocks between tools)
        i = j;
      } else {
        items.push({ kind: 'message', message: messages[i], index: i });
        i++;
      }
    }
    return items;
  }, [messages]);

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
    } else if (message.type === 'file') {
      const file = message.content as FileContent;
      textToCopy = file.content || '';
    } else if (message.type === 'patch') {
      const patch = message.content as PatchContent;
      textToCopy = patch.diff || '';
    }
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedMessageId(message.id);
      setTimeout(() => setCopiedMessageId(null), 2000);
      toast.success(t('toast.copied'));
    } catch (err) {
      toast.error(t('toast.copyFailed'));
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
                  <div className="text-xs opacity-70 mt-2 text-right" title={new Date(message.timestamp).toLocaleString(locale)}>
                    {getRelativeTime(message.timestamp, t) || new Date(message.timestamp).toLocaleTimeString(locale)}
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
                  }`} title={new Date(message.timestamp).toLocaleString(locale)}>
                    {getRelativeTime(message.timestamp, t) || new Date(message.timestamp).toLocaleTimeString(locale)}
                    {(message.costUsd || message.tokens) && (
                      <>
                        <span className="mx-1">·</span>
                        {message.costUsd != null && (
                          <span>{t('chat.cost', { amount: message.costUsd < 0.01 ? '<0.01' : message.costUsd.toFixed(2) })}</span>
                        )}
                        {message.tokens != null && (
                          <>
                            {message.costUsd != null && <span> </span>}
                            <span>{message.tokens < 1000 ? message.tokens : `${(message.tokens / 1000).toFixed(1)}k`} {t('chat.tokens')}</span>
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

    const isLastAssistant = message.role === 'assistant' && message.type === 'text' && index === lastAssistantIndex;

    return (
      <div className="group relative">
        {messageContent}
        {/* Floating action toolbar (appears on hover at top-right) */}
        {(message.type === 'text' || message.type === 'tool_use' || message.type === 'tool_result' || message.type === 'tool_execution' || message.type === 'file' || message.type === 'patch') && (
          <MessageActionToolbar
            message={message}
            theme={theme}
            copiedMessageId={copiedMessageId}
            onCopy={handleCopyMessage}
            onRetry={onRetry}
            showRetry={isLastAssistant && !isStreaming}
            isPinned={pinnedMessages.includes(message.id)}
            onPinToggle={onPinToggle || (() => {})}
            t={t}
          />
        )}

      </div>
    );
  };

  return (
    <div ref={containerRef} role="log" aria-live="polite" aria-label={t('chat.ariaMessages')} className={`h-full flex flex-col overflow-hidden ${
      theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'
    }`}>
      {messages.length === 0 && !isStreaming && isLoading && (
        <div className="space-y-4 p-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex gap-3">
              <div className={`w-8 h-8 rounded-full animate-pulse ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-300/50'}`} />
              <div className="flex-1 space-y-2">
                <div className={`h-4 rounded animate-pulse ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-300/50'}`} style={{ width: `${60 + i * 10}%` }} />
                <div className={`h-3 rounded animate-pulse ${theme === 'dark' ? 'bg-gray-700/30' : 'bg-gray-300/30'}`} style={{ width: `${40 + i * 5}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {messages.length === 0 && !isStreaming && !isLoading && (
        <div className={`flex flex-col items-center justify-center h-full p-6 ${
          theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
        }`}>
          <div className="text-6xl mb-4"> </div>
          <h2 className="text-xl font-semibold mb-2">{t('app.name')}</h2>
          <p className="text-sm mb-6">{t('message.startConversation')}</p>
          <div className={`text-xs space-y-1 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>
            <p><kbd className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${theme === 'dark' ? 'bg-gray-700/50 text-gray-400' : 'bg-gray-200 text-gray-500'}`}>Ctrl+N</kbd> {t('shortcuts.newSession')}</p>
            <p><kbd className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${theme === 'dark' ? 'bg-gray-700/50 text-gray-400' : 'bg-gray-200 text-gray-500'}`}>Ctrl+K</kbd> {t('shortcuts.commandPalette')}</p>
            <p><kbd className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${theme === 'dark' ? 'bg-gray-700/50 text-gray-400' : 'bg-gray-200 text-gray-500'}`}>Ctrl+F</kbd> {t('shortcuts.search')}</p>
            <p><kbd className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${theme === 'dark' ? 'bg-gray-700/50 text-gray-400' : 'bg-gray-200 text-gray-500'}`}>Ctrl+B</kbd> {t('shortcuts.toggleSidebar')}</p>
          </div>
        </div>
      )}


      {/* Pinned messages section */}
      {pinnedMessages.length > 0 && messages.length > 0 && (
        <div className={`border-b ${theme === 'dark' ? 'border-gray-700/50 bg-gray-800/20' : 'border-gray-200 bg-gray-50/50'}`}>
          <button
            onClick={() => setPinnedExpanded(prev => !prev)}
            className={`w-full flex items-center gap-2 px-4 py-1.5 text-xs transition-colors ${
              theme === 'dark' ? 'text-amber-400/80 hover:text-amber-300' : 'text-amber-600 hover:text-amber-700'
            }`}
          >
            <span>📌</span>
            <span>{t('message.pinnedMessages')}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
              theme === 'dark' ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-100 text-amber-600'
            }`}>{pinnedMessages.length}</span>
            <span className="ml-1">{pinnedExpanded ? '▾' : '▸'}</span>
          </button>
          {pinnedExpanded && (
            <div className={`px-4 pb-2 max-h-40 overflow-y-auto text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {pinnedMessages.map((msgId) => {
                const msg = messages.find(m => m.id === msgId);
                if (!msg) return null;
                const preview = typeof msg.content === 'string'
                  ? msg.content.slice(0, 80) + (msg.content.length > 80 ? '...' : '')
                  : `[${msg.type}]`;
                const idx = messages.indexOf(msg);
                return (
                  <button
                    key={msgId}
                    onClick={() => {
                      if (virtuosoRef.current) {
                        virtuosoRef.current.scrollToIndex({ index: idx, align: 'center', behavior: 'smooth' });
                      }
                    }}
                    className={`w-full text-left py-1 px-2 rounded transition-colors truncate flex items-center gap-2 ${
                      theme === 'dark' ? 'hover:bg-gray-700/50' : 'hover:bg-gray-200/50'
                    }`}
                    title={preview}
                  >
                    <span className={`flex-shrink-0 ${msg.role === 'user' ? 'text-blue-400' : 'text-emerald-400'}`}>
                      {msg.role === 'user' ? '›' : '‹'}
                    </span>
                    <span className="truncate">{preview}</span>
                    {onPinToggle && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); onPinToggle(msgId); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onPinToggle(msgId); } }}
                        className={`flex-shrink-0 ml-auto opacity-0 group-hover:opacity-100 hover:opacity-100 cursor-pointer ${theme === 'dark' ? 'text-gray-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`}
                        aria-label={t('message.unpin')}
                        title={t('message.unpin')}
                      >
                        ✕
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
      {/* Virtuoso virtualized message list — includes streaming items */}
      {(renderItems.length > 0 || isStreaming) ? (
        <Virtuoso
          ref={virtuosoRef}
          data={[
            ...renderItems,
            ...(isStreaming && streamingThinking ? [{ kind: 'streaming_thinking' as const, content: streamingThinking }] : []),
            ...(isStreaming && streamingText ? [{ kind: 'streaming_text' as const, content: streamingText }] : []),
          ]}
          followOutput="smooth"
          atBottomStateChange={(atBottom) => setIsNearBottom(atBottom)}
          rangeChanged={(range) => {
            if (onVisibleRangeChange) {
              onVisibleRangeChange({ start: range.startIndex, end: range.endIndex });
            }
          }}
          computeItemKey={(index, item) => {
            if (item.kind === 'tool_group') return `group-${item.startIndex}`;
            if (item.kind === 'streaming_thinking') return 'streaming-thinking';
            if (item.kind === 'streaming_text') return 'streaming-text';
            return item.message.id;
          }}
          className="flex-1"
          itemContent={(index, item) => {
            if (item.kind === 'tool_group') {
              return (
                <div className="px-6 py-2">
                  <MessageErrorBoundary>
                    <div className="animate-fadeIn">
                      <ToolGroupCard
                        messages={item.messages}
                        expandedTools={expandedTools}
                        onToggleTool={toggleTool}
                        copiedMessageId={copiedMessageId}
                        onCopyMessage={handleCopyMessage}
                        theme={theme}
                      />
                    </div>
                  </MessageErrorBoundary>
                </div>
              );
            }
            if (item.kind === 'streaming_thinking') {
              return (
                <div className="px-6 py-2 animate-fadeIn">
                  <ThinkingBlock content={item.content} isStreaming={true} theme={theme} />
                </div>
              );
            }
            if (item.kind === 'streaming_text') {
              return (
                <div className="px-6 py-2 animate-fadeIn">
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
                        components={markdownComponents}
                      >
                        {item.content}
                      </ReactMarkdown>
                    </div>
                    <span className={`inline-block w-2 h-4 animate-pulse ml-1 rounded-sm ${
                      theme === 'dark' ? 'bg-blue-400' : 'bg-blue-500'
                    }`} />
                  </div>
                </div>
              );
            }
            return (
              <div className="px-6 py-2">
                <MessageErrorBoundary>
                  <div className="animate-fadeIn">
                    {renderMessage(item.message, item.index)}
                  </div>
                </MessageErrorBoundary>
              </div>
            );
          }}
        />
      ) : null}

      <div ref={bottomRef} />

      {/* Scroll to bottom button */}
      {!isNearBottom && (
        <button
          onClick={scrollToBottom}
          className={`fixed bottom-24 right-8 z-50 flex items-center gap-2 px-3 py-2 rounded-full shadow-lg transition-all duration-200 animate-fadeIn ${
            theme === 'dark'
              ? 'bg-gray-700/90 hover:bg-gray-600 text-gray-200 border border-gray-600/50'
              : 'bg-white/90 hover:bg-gray-100 text-gray-700 border border-gray-200'
          }`}
          title={t('chat.scrollToBottom')}
          aria-label={t('message.scrollToBottom')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>

        </button>
      )}
    </div>
  );
}
