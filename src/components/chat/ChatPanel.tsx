import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useSessionStore } from '../../stores/sessionStore';
import { wsClient } from '../../api/websocket';
import { MessageList } from './MessageList';
import { InputBar } from './InputBar';
import { ExportButton } from './ExportButton';
import { TranscriptViewer } from './TranscriptViewer';
import { MessageSearch, type MessageFilter } from './MessageSearch';
import { KeyboardShortcutsDialog } from './KeyboardShortcutsDialog';
import type { StreamEvent, StreamTextData, StreamToolUseData, StreamToolResultData, ResultPayload, ToolExecutionContent } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { useI18n } from '../../i18n';
import { formatTokens } from '../../utils/format';

export function ChatPanel({ theme = 'dark', timelineVisible, onVisibleRangeChange }: { theme?: 'dark' | 'light'; timelineVisible?: boolean; onVisibleRangeChange?: (range: { start: number; end: number }) => void }) {
  const { t } = useI18n();
  const { sessions, currentSessionId, currentMessages, addMessage, updateMessage, isLoadingMessages } = useSessionStore();
  const { pinMessage, unpinMessage } = useSessionStore();
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [streamingThinking, setStreamingThinking] = useState('');
  const currentSession = sessions.find((s) => s.id === currentSessionId);
  const streamingTextRef = useRef<string>('');
  const streamingThinkingRef = useRef<string>('');

  // File change tracker state
  const [sessionFiles, setSessionFiles] = useState<Set<string>>(new Set());
  const [filesExpanded, setFilesExpanded] = useState(false);

  // Compute session context info for header display
  const sessionModelDisplay = useMemo(() => {
    if (!currentSession?.model) return null;
    return currentSession.model.split('/').pop() ?? currentSession.model;
  }, [currentSession?.model]);

  const sessionPathDisplay = useMemo(() => {
    if (!currentSession?.cwd) return null;
    const parts = currentSession.cwd.split('/').filter(Boolean);
    return parts.slice(-2).join('/');
  }, [currentSession?.cwd]);

  const sessionAgeDisplay = useMemo(() => {
    if (!currentSession?.createdAt) return null;
    const now = Date.now();
    const created = new Date(currentSession.createdAt).getTime();
    if (isNaN(created)) return null;
    const diffMs = now - created;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMin < 60) return `${diffMin}m`;
    if (diffHours < 24) return `${diffHours}h`;
    return `${diffDays}d`;
  }, [currentSession?.createdAt]);

  // Compute last assistant message cost and token breakdown for header display
  const lastAssistantStats = useMemo(() => {
    for (let i = currentMessages.length - 1; i >= 0; i--) {
      const msg = currentMessages[i];
      if (msg.role === 'assistant' && msg.type === 'text') {
        return {
          costUsd: msg.costUsd != null && msg.costUsd > 0 ? msg.costUsd : null,
          inputTokens: msg.inputTokens ?? null,
          outputTokens: msg.outputTokens ?? null,
          tokens: msg.tokens ?? null,
        };
      }
    }
    return { costUsd: null, inputTokens: null, outputTokens: null, tokens: null };
  }, [currentMessages]);
  // Maps for tool_use / tool_result pairing
  const toolExecutionIdMap = useRef<Map<string, { msgId: string; content: ToolExecutionContent }>>(new Map()); // toolUseId → { msgId, content }
  const pendingResults = useRef<Map<string, { output: string; isError: boolean }>>(new Map()); // toolUseId → result
  // Track creation timestamps for selective pruning
  const entryTimestamps = useRef<Map<string, number>>(new Map());

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [messageFilter, setMessageFilter] = useState<MessageFilter>('all');

  // Filter messages based on the selected type
  const filteredMessages = useMemo(() => {
    if (messageFilter === 'all') return currentMessages;
    return currentMessages.filter(msg => {
      switch (messageFilter) {
        case 'text': return msg.type === 'text';
        case 'tools': return msg.type === 'tool_execution' || msg.type === 'tool_use' || msg.type === 'tool_result';
        case 'thinking': return msg.type === 'thinking';
        case 'errors': return msg.type === 'error';
        default: return true;
      }
    });
  }, [currentMessages, messageFilter]);

  // Extract text from message content for search
  const getMessageText = useCallback((msg: typeof currentMessages[number]): string => {
    if (typeof msg.content === 'string') return msg.content;
    if (msg.type === 'tool_execution') {
      const exec = msg.content as ToolExecutionContent;
      return `[${exec.toolName}] ${exec.input ? JSON.stringify(exec.input) : ''} ${exec.output || ''}`;
    }
    return '';
  }, []);

  // Count all matches across messages
  const { matchCount, matchIndices } = useMemo(() => {
    if (!searchQuery) return { matchCount: 0, matchIndices: [] as { msgId: string; localIndex: number }[] };
    const query = searchQuery.toLowerCase();
    const indices: { msgId: string; localIndex: number }[] = [];
    for (const msg of currentMessages) {
      const text = getMessageText(msg).toLowerCase();
      let pos = 0;
      while (true) {
        const idx = text.indexOf(query, pos);
        if (idx === -1) break;
        indices.push({ msgId: msg.id, localIndex: idx });
        pos = idx + 1;
      }
    }
    return { matchCount: indices.length, matchIndices: indices };
  }, [currentMessages, searchQuery, getMessageText]);

  // Ctrl+F keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setSearchOpen((prev) => {
          if (prev) setCurrentMatchIndex(0);
          return !prev;
        });
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setShortcutsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Prevent accidental tab close during streaming
  useEffect(() => {
    if (!isStreaming) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isStreaming]);

  const handleSearchQuery = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentMatchIndex(0);
  }, []);

  const handleNextMatch = useCallback(() => {
    if (matchCount === 0) return;
    setCurrentMatchIndex((prev) => (prev + 1) % matchCount);
  }, [matchCount]);

  const handlePreviousMatch = useCallback(() => {
    if (matchCount === 0) return;
    setCurrentMatchIndex((prev) => (prev - 1 + matchCount) % matchCount);
  }, [matchCount]);

  const handleCloseSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery('');
    setCurrentMatchIndex(0);
  }, []);

  // Sync streamingText to ref so closures always read the latest value
  useEffect(() => { streamingTextRef.current = streamingText; }, [streamingText]);
  useEffect(() => { streamingThinkingRef.current = streamingThinking; }, [streamingThinking]);

  // Timeout cleanup for unpaired tool entries (memory leak prevention)
  useEffect(() => {
    const FIVE_MINUTES = 5 * 60 * 1000;
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, timestamp] of entryTimestamps.current) {
        if (now - timestamp > FIVE_MINUTES) {
          if (key.startsWith('pending_')) {
            const toolUseId = key.slice(8);
            pendingResults.current.delete(toolUseId);
          } else {
            toolExecutionIdMap.current.delete(key);
          }
          entryTimestamps.current.delete(key);
        }
      }
    }, 60_000);

    return () => clearInterval(cleanupInterval);
  }, [currentSessionId]);

  // Clear streaming state when session changes
  useEffect(() => {
    setStreamingText('');
    setIsStreaming(false);
    setStreamingMessageId(null);
    setStreamingThinking('');
    streamingThinkingRef.current = '';
    setSessionFiles(new Set());
    setFilesExpanded(false);
  }, [currentSessionId]);

  useEffect(() => {
    if (!currentSessionId) return;

    // Subscribe to session
    wsClient.subscribe(currentSessionId);

    // Handle stream events
    const unsubscribers = [
      wsClient.on('stream', (message) => {
        const event = message.payload as StreamEvent;
        if (event.sessionId !== currentSessionId) return;

        switch (event.event) {
          case 'assistant_text': {
            const data = event.data as StreamTextData;
            setStreamingText((prev) => prev + (data.text || ''));
            setIsStreaming(true);
            break;
          }

          case 'tool_use': {
            const data = event.data as StreamToolUseData;
            const toolUseId = data.toolUseId;
            const msgId = uuidv4();

            // Check if a pending result already arrived for this toolUseId
            const pending = pendingResults.current.get(toolUseId);
            const content: ToolExecutionContent = {
              toolName: data.toolName,
              toolUseId,
              input: data.input,
              output: pending?.output,
              isError: pending?.isError,
              status: pending ? (pending.isError ? 'error' : 'completed') : 'running',
            };
            if (pending) {
              pendingResults.current.delete(toolUseId);
              entryTimestamps.current.delete('pending_' + toolUseId);
            }

            // Record mapping: toolUseId → { msgId, content }
            toolExecutionIdMap.current.set(toolUseId, { msgId, content });
            entryTimestamps.current.set(toolUseId, Date.now());

            // Track file changes from tool executions
            const trackableTools = ['Read', 'Write', 'Edit'];
            if (trackableTools.includes(data.toolName) && data.input?.file_path) {
              setSessionFiles(prev => {
                const next = new Set(prev);
                next.add(String(data.input.file_path));
                return next;
              });
            }

            addMessage({
              id: msgId,
              role: 'assistant',
              type: 'tool_execution',
              content,
              timestamp: new Date().toISOString(),
              sessionId: currentSessionId,
            });
            break;
          }

          case 'tool_result': {
            const data = event.data as StreamToolResultData;
            const toolUseId = data.toolUseId;
            const existing = toolExecutionIdMap.current.get(toolUseId);

            if (existing) {
              // Found the paired tool_execution — update it in-place with merged content
              const mergedContent: ToolExecutionContent = {
                ...existing.content,
                output: data.output,
                isError: data.isError,
                status: data.isError ? 'error' : 'completed',
              };
              updateMessage(existing.msgId, { content: mergedContent });
              // Clean up
              toolExecutionIdMap.current.delete(toolUseId);
              entryTimestamps.current.delete(toolUseId);
            } else {
              // tool_result arrived before tool_use — cache it
              pendingResults.current.set(toolUseId, {
                output: data.output,
                isError: data.isError,
              });
              entryTimestamps.current.set('pending_' + toolUseId, Date.now());
            }
            break;
          }

          case 'thinking': {
            const data = event.data as StreamTextData;
            setStreamingThinking((prev) => prev + (data.text || ''));
            setIsStreaming(true);
            break;
          }
        }
      }),

      wsClient.on('result', (message) => {
        const payload = message.payload as ResultPayload;
        if (payload.sessionId !== currentSessionId) return;

        // Extract cost/usage data from result
        const costUsd = payload.costUsd as number | undefined;
        const usage = payload.usage as Record<string, number> | undefined;
        const tokens = usage ? (usage.input_tokens || 0) + (usage.output_tokens || 0) : undefined;
        const inputTokens = usage?.input_tokens ?? undefined;
        const outputTokens = usage?.output_tokens ?? undefined;

        // Add accumulated thinking as a message if present
        const thinkingText = streamingThinkingRef.current;
        if (thinkingText) {
          addMessage({
            id: uuidv4(),
            role: 'assistant',
            type: 'thinking',
            content: thinkingText,
            timestamp: new Date().toISOString(),
            sessionId: currentSessionId,
          });
          streamingThinkingRef.current = '';
          setStreamingThinking('');
        }

        // Add final assistant message if there's streaming text
        const text = streamingTextRef.current;
        if (text) {
          addMessage({
            id: uuidv4(),
            role: 'assistant',
            type: 'text',
            content: text,
            timestamp: new Date().toISOString(),
            sessionId: currentSessionId,
            costUsd: costUsd ?? undefined,
            tokens: tokens ?? undefined,
            inputTokens: inputTokens ?? undefined,
            outputTokens: outputTokens ?? undefined,
          });
          streamingTextRef.current = '';
          setStreamingText('');
        } else if (costUsd || tokens) {
          // No streaming text but cost data exists — update the last assistant message
          const lastAssistant = [...useSessionStore.getState().currentMessages].reverse().find(m => m.role === 'assistant');
          if (lastAssistant) {
            updateMessage(lastAssistant.id, {
              costUsd: lastAssistant.costUsd ?? costUsd ?? undefined,
              tokens: lastAssistant.tokens ?? tokens ?? undefined,
              inputTokens: lastAssistant.inputTokens ?? inputTokens ?? undefined,
              outputTokens: lastAssistant.outputTokens ?? outputTokens ?? undefined,
            });
          }
        }
        setIsStreaming(false);
        setStreamingMessageId(null);
      }),

      wsClient.on('error', (message) => {
        const payload = message.payload as { sessionId?: string; error: string };
        if (payload.sessionId !== currentSessionId) return;

        addMessage({
          id: uuidv4(),
          role: 'system',
          type: 'error',
          content: payload.error,
          timestamp: new Date().toISOString(),
          sessionId: currentSessionId,
        });
        setIsStreaming(false);
        streamingTextRef.current = '';
        setStreamingText('');
        streamingThinkingRef.current = '';
        setStreamingThinking('');
        setStreamingMessageId(null);
      }),
    ];

    return () => {
      unsubscribers.forEach((unsub) => unsub());
      wsClient.unsubscribe(currentSessionId);
    };
  }, [currentSessionId, addMessage, updateMessage]);

  const handleSendMessage = useCallback((message: string) => {
    if (!currentSessionId || !message.trim()) return;

    // Add user message to store
    const userMessageId = uuidv4();
    addMessage({
      id: userMessageId,
      role: 'user',
      type: 'text',
      content: message,
      timestamp: new Date().toISOString(),
      sessionId: currentSessionId,
    });

    // Send via WebSocket
    wsClient.sendChat(currentSessionId, message);
    setIsStreaming(true);
    setStreamingText('');

    // Create a placeholder for streaming
    const assistantMessageId = uuidv4();
    setStreamingMessageId(assistantMessageId);
  }, [currentSessionId, addMessage]);

  const handleStopStreaming = useCallback(() => {
    // Send stop signal via WebSocket
    if (currentSessionId) {
      wsClient.send({
        type: 'stop',
        payload: { sessionId: currentSessionId },
      });
    }
    setIsStreaming(false);

    // Save accumulated thinking as a message
    const thinkingText = streamingThinkingRef.current;
    if (thinkingText && currentSessionId) {
      addMessage({
        id: uuidv4(),
        role: 'assistant',
        type: 'thinking',
        content: thinkingText,
        timestamp: new Date().toISOString(),
        sessionId: currentSessionId,
      });
      streamingThinkingRef.current = '';
    }
    setStreamingThinking('');

    // Save any partial streaming text
    const text = streamingTextRef.current;
    if (text && currentSessionId) {
      addMessage({
        id: streamingMessageId || uuidv4(),
        role: 'assistant',
        type: 'text',
        content: text + '\n\n' + t('chat.generationStopped'),
        timestamp: new Date().toISOString(),
        sessionId: currentSessionId,
      });
      streamingTextRef.current = '';
    }
    setStreamingText('');
    setStreamingMessageId(null);
  }, [currentSessionId, streamingMessageId, addMessage, t]);

  // Escape key to stop streaming
  useEffect(() => {
    if (!isStreaming) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleStopStreaming();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isStreaming, handleStopStreaming]);

  const handleRetry = useCallback(() => {
    if (!currentSessionId || isStreaming) return;
    const lastUserMessage = [...currentMessages].reverse().find(m => m.role === 'user');
    if (lastUserMessage && typeof lastUserMessage.content === 'string') {
      // Clear thinking state
      setStreamingThinking('');
      streamingThinkingRef.current = '';
      // Send via WebSocket
      wsClient.sendChat(currentSessionId, lastUserMessage.content);
      setIsStreaming(true);
      setStreamingText('');
      streamingTextRef.current = '';
      const assistantMessageId = uuidv4();
      setStreamingMessageId(assistantMessageId);
    }
  }, [currentSessionId, currentMessages, isStreaming]);

  // Listen for retry-last-message event (triggered by Ctrl+R)
  useEffect(() => {
    const handleRetryEvent = () => {
      if (!isStreaming && currentSessionId) {
        handleRetry();
      }
    };
    window.addEventListener('retry-last-message', handleRetryEvent);
    return () =>    window.removeEventListener('retry-last-message', handleRetryEvent);
  }, [isStreaming, currentSessionId, handleRetry]);

  const handleVisibleRangeChange = useCallback((range: { start: number; end: number }) => {
    if (onVisibleRangeChange) {
      onVisibleRangeChange(range);
    }
  }, [onVisibleRangeChange]);

  // Pin/unpin message toggle handler
  const handlePinToggle = useCallback((messageId: string) => {
    if (!currentSessionId) return;
    const pinned = currentSession?.pinnedMessages || [];
    if (pinned.includes(messageId)) {
      unpinMessage(currentSessionId, messageId);
    } else {
      pinMessage(currentSessionId, messageId);
    }
  }, [currentSessionId, currentSession?.pinnedMessages, pinMessage, unpinMessage]);

  if (!currentSessionId) {
    return (
      <div className={`flex-1 flex items-center justify-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
        <div className="text-center animate-fadeIn">
          <div className="text-7xl mb-6"> </div>
          <h2 className={`text-3xl font-bold mb-3 ${theme === 'dark' ? 'text-gradient' : 'text-gray-800'}`}>{t('chat.welcome.title')}</h2>
          <p className={`mb-8 max-w-md mx-auto ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
            {t('chat.welcome.subtitle')}
          </p>
          <div className={`flex items-center justify-center gap-4 text-sm ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>
            <span className="flex items-center gap-2">
              <kbd className={`px-2 py-1 rounded text-xs ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'}`}>Ctrl+N</kbd>
              {t('chat.welcome.newSession')}
            </span>
            <span className="flex items-center gap-2">
              <kbd className={`px-2 py-1 rounded text-xs ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'}`}>Ctrl+K</kbd>
              {t('chat.welcome.commands')}
            </span>
            <span className="flex items-center gap-2">
              <kbd className={`px-2 py-1 rounded text-xs ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'}`}>Ctrl+/</kbd>
              {t('shortcuts.title')}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gradient-subtle">
      {/* Chat header */}
      <div className={`flex items-center justify-between px-4 py-2 border-b ${
        theme === 'dark' ? 'border-gray-700/50 bg-gray-800/30' : 'border-gray-200 bg-white/50'
      }`}>
        <div className="flex items-center gap-3">
          {sessionModelDisplay && (
            <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
              🤖 {sessionModelDisplay}
            </span>
          )}
          {sessionPathDisplay && (
            <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
              📁 {sessionPathDisplay}
            </span>
          )}
          {sessionAgeDisplay && (
            <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
              ⏱ {sessionAgeDisplay}
            </span>
          )}
          {sessionModelDisplay && <span className={`text-xs ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`}>·</span>}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-blue-400 animate-pulse' : 'bg-green-400'}`} />
            <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              {isStreaming ? t('chat.thinking') : t('chat.ready')}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton messages={currentMessages} sessionTitle={currentSession?.name} theme={theme} />
          <button
            onClick={() => setTranscriptOpen(true)}
            className={`p-1.5 rounded-md transition-colors ${
              theme === 'dark'
                ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
            title={t('transcript.view')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
          <span className={`text-xs ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>
            {t('chat.messages', { count: currentMessages.length })}
          </span>
          {currentSession?.totalCostUsd != null && currentSession.totalCostUsd > 0 && (
            <span className={`text-xs ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>
              · {t('chat.cost', { amount: currentSession.totalCostUsd.toFixed(2) })}
            </span>
          )}
          {currentSession?.totalTokens != null && currentSession.totalTokens > 0 && (
            <span className={`text-xs ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>
              · {currentSession.totalTokens < 1000 ? currentSession.totalTokens : `${(currentSession.totalTokens / 1000).toFixed(1)}k`} {t('chat.tokens')}
            </span>
          )}
          {(lastAssistantStats.inputTokens != null || lastAssistantStats.outputTokens != null) ? (
            <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} title={t('chat.tokenBreakdown')}>
              📥 {formatTokens(lastAssistantStats.inputTokens ?? 0, t)} / 📤 {formatTokens(lastAssistantStats.outputTokens ?? 0, t)}
            </span>
          ) : lastAssistantStats.tokens != null && lastAssistantStats.tokens > 0 ? (
            <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
              · {formatTokens(lastAssistantStats.tokens, t)}
            </span>
          ) : null}
          {lastAssistantStats.costUsd != null && (
            <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} title={t('chat.lastMessageCost')}>
              ({t('chat.cost', { amount: lastAssistantStats.costUsd.toFixed(2) })})
            </span>
          )}
        </div>
      </div>

      {/* Files Modified tracker */}
      {sessionFiles.size > 0 && (
        <div className={`border-b ${theme === 'dark' ? 'border-gray-700/50 bg-gray-800/20' : 'border-gray-200 bg-gray-50/50'}`}>
          <button
            onClick={() => setFilesExpanded(prev => !prev)}
            className={`w-full flex items-center gap-2 px-4 py-1.5 text-xs transition-colors ${
              theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span> </span>
            <span>{t('chat.filesModified')}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
              theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
            }`}>{sessionFiles.size}</span>
            <span className="ml-1">{filesExpanded ? '▾' : '▸'}</span>
          </button>
          {filesExpanded && (
            <div className={`px-4 pb-2 max-h-32 overflow-y-auto text-[11px] font-mono ${
              theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
            }`}>
              {Array.from(sessionFiles).sort().map((filePath) => {
                const relativePath = currentSession?.cwd && filePath.startsWith(currentSession.cwd)
                  ? filePath.slice(currentSession.cwd.length).replace(/^\//, '')
                  : filePath;
                return (
                  <div key={filePath} className="py-0.5 truncate" title={filePath}>
                     {relativePath}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Search bar */}
      {searchOpen && (
        <MessageSearch
          onSearch={handleSearchQuery}
          onNext={handleNextMatch}
          onPrevious={handlePreviousMatch}
          onClose={handleCloseSearch}
          onFilterChange={setMessageFilter}
          currentMatch={currentMatchIndex}
          totalMatches={matchCount}
          theme={theme}
          activeFilter={messageFilter}
        />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <MessageList
          messages={filteredMessages}
          streamingText={streamingText}
          isStreaming={isStreaming}
          streamingThinking={streamingThinking}
          searchQuery={searchQuery || undefined}
          currentMatchIndex={searchQuery ? currentMatchIndex : undefined}
          onRetry={handleRetry}
          isLoading={isLoadingMessages}
          theme={theme}
          onVisibleRangeChange={handleVisibleRangeChange}
          pinnedMessages={currentSession?.pinnedMessages}
          onPinToggle={handlePinToggle}
        />
      </div>

      {/* Input */}
      <InputBar
        onSend={handleSendMessage}
        disabled={!currentSessionId}
        isStreaming={isStreaming}
        onStop={handleStopStreaming}
        model={currentSession?.model}
        theme={theme}
        rootPath={currentSession?.cwd}
        sessionId={currentSessionId ?? undefined}
      />

      {/* Keyboard shortcuts dialog */}
      {shortcutsOpen && (
        <KeyboardShortcutsDialog onClose={() => setShortcutsOpen(false)} theme={theme} />
      )}

      {/* Transcript viewer */}
      {transcriptOpen && currentSessionId && (
        <TranscriptViewer sessionId={currentSessionId} theme={theme} onClose={() => setTranscriptOpen(false)} />
      )}
    </div>
  );
}
