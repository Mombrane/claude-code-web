import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useSessionStore } from '../../stores/sessionStore';
import { wsClient } from '../../api/websocket';
import { MessageList } from './MessageList';
import { InputBar } from './InputBar';
import { ExportButton } from './ExportButton';
import { MessageSearch } from './MessageSearch';
import { KeyboardShortcutsDialog } from './KeyboardShortcutsDialog';
import type { StreamEvent, ToolExecutionContent } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { useI18n } from '../../i18n';

export function ChatPanel({ theme = 'dark' }: { theme?: 'dark' | 'light' }) {
  const { t } = useI18n();
  const { sessions, currentSessionId, currentMessages, addMessage, updateMessage, isLoadingMessages } = useSessionStore();
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [streamingThinking, setStreamingThinking] = useState('');
  const currentSession = sessions.find((s) => s.id === currentSessionId);
  const streamingTextRef = useRef<string>('');
  const streamingThinkingRef = useRef<string>('');

  // Compute last assistant message cost for header display
  const lastAssistantCost = useMemo(() => {
    for (let i = currentMessages.length - 1; i >= 0; i--) {
      const msg = currentMessages[i];
      if (msg.role === 'assistant' && msg.type === 'text' && msg.costUsd != null && msg.costUsd > 0) {
        return msg.costUsd;
      }
    }
    return null;
  }, [currentMessages]);
  // Maps for tool_use / tool_result pairing
  const toolExecutionIdMap = useRef<Map<string, { msgId: string; content: ToolExecutionContent }>>(new Map()); // toolUseId → { msgId, content }
  const pendingResults = useRef<Map<string, { output: string; isError: boolean }>>(new Map()); // toolUseId → result
  // Track creation timestamps for selective pruning
  const entryTimestamps = useRef<Map<string, number>>(new Map());

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

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
          case 'assistant_text':
            setStreamingText((prev) => prev + (event.data.text || ''));
            setIsStreaming(true);
            break;

          case 'tool_use': {
            const toolUseId = event.data.toolUseId;
            const msgId = uuidv4();

            // Check if a pending result already arrived for this toolUseId
            const pending = pendingResults.current.get(toolUseId);
            const content: ToolExecutionContent = {
              toolName: event.data.toolName,
              toolUseId,
              input: event.data.input,
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
            const toolUseId = event.data.toolUseId;
            const existing = toolExecutionIdMap.current.get(toolUseId);

            if (existing) {
              // Found the paired tool_execution — update it in-place with merged content
              const mergedContent: ToolExecutionContent = {
                ...existing.content,
                output: event.data.output,
                isError: event.data.isError,
                status: event.data.isError ? 'error' : 'completed',
              };
              updateMessage(existing.msgId, { content: mergedContent });
              // Clean up
              toolExecutionIdMap.current.delete(toolUseId);
              entryTimestamps.current.delete(toolUseId);
            } else {
              // tool_result arrived before tool_use — cache it
              pendingResults.current.set(toolUseId, {
                output: event.data.output,
                isError: event.data.isError,
              });
              entryTimestamps.current.set('pending_' + toolUseId, Date.now());
            }
            break;
          }

          case 'thinking':
            setStreamingThinking((prev) => prev + (event.data.text || ''));
            setIsStreaming(true);
            break;
        }
      }),

      wsClient.on('result', (message) => {
        if (message.payload.sessionId !== currentSessionId) return;

        // Extract cost/usage data from result
        const costUsd = message.payload.costUsd as number | undefined;
        const usage = message.payload.usage as Record<string, number> | undefined;
        const tokens = usage ? (usage.input_tokens || 0) + (usage.output_tokens || 0) : undefined;

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
            });
          }
        }
        setIsStreaming(false);
        setStreamingMessageId(null);
      }),

      wsClient.on('error', (message) => {
        if (message.payload.sessionId !== currentSessionId) return;

        addMessage({
          id: uuidv4(),
          role: 'system',
          type: 'error',
          content: message.payload.error,
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
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-blue-400 animate-pulse' : 'bg-green-400'}`} />
            <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              {isStreaming ? t('chat.thinking') : t('chat.ready')}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton messages={currentMessages} sessionTitle={currentSession?.name} theme={theme} />
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
          {lastAssistantCost != null && (
            <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} title={t('chat.lastMessageCost')}>
              ({t('chat.cost', { amount: lastAssistantCost.toFixed(2) })})
            </span>
          )}
        </div>
      </div>

      {/* Search bar */}
      {searchOpen && (
        <MessageSearch
          onSearch={handleSearchQuery}
          onNext={handleNextMatch}
          onPrevious={handlePreviousMatch}
          onClose={handleCloseSearch}
          currentMatch={currentMatchIndex}
          totalMatches={matchCount}
          theme={theme}
        />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <MessageList
          messages={currentMessages}
          streamingText={streamingText}
          isStreaming={isStreaming}
          streamingThinking={streamingThinking}
          searchQuery={searchQuery || undefined}
          currentMatchIndex={searchQuery ? currentMatchIndex : undefined}
          onRetry={handleRetry}
          isLoading={isLoadingMessages}
          theme={theme}
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
      />

      {/* Keyboard shortcuts dialog */}
      {shortcutsOpen && (
        <KeyboardShortcutsDialog onClose={() => setShortcutsOpen(false)} theme={theme} />
      )}
    </div>
  );
}
