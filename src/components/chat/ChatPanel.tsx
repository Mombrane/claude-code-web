import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useSessionStore } from '../../stores/sessionStore';
import { wsClient } from '../../api/websocket';
import { MessageList } from './MessageList';
import { InputBar } from './InputBar';
import { ExportButton } from './ExportButton';
import { MessageSearch } from './MessageSearch';
import type { StreamEvent, ToolExecutionContent } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { useI18n } from '../../i18n';

export function ChatPanel() {
  const { t } = useI18n();
  const { sessions, currentSessionId, currentMessages, addMessage, updateMessage } = useSessionStore();
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const currentSession = sessions.find((s) => s.id === currentSessionId);
  const streamingTextRef = useRef<string>('');
  // Maps for tool_use / tool_result pairing
  const toolExecutionIdMap = useRef<Map<string, { msgId: string; content: ToolExecutionContent }>>(new Map()); // toolUseId → { msgId, content }
  const pendingResults = useRef<Map<string, { output: string; isError: boolean }>>(new Map()); // toolUseId → result

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

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
        setSearchOpen((prev) => !prev);
        if (!searchOpen) {
          setCurrentMatchIndex(0);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen]);

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

  // Timeout cleanup for unpaired tool entries (memory leak prevention)
  useEffect(() => {
    const FIVE_MINUTES = 5 * 60 * 1000;
    const timeoutIds: ReturnType<typeof setTimeout>[] = [];

    const scheduleCleanup = () => {
      // Check current refs and schedule removal for unpaired entries
      const now = Date.now();
      for (const [toolUseId] of toolExecutionIdMap.current) {
        const tid = setTimeout(() => {
          if (toolExecutionIdMap.current.has(toolUseId)) {
            console.warn(`Tool execution pairing timeout for toolUseId: ${toolUseId}`);
            toolExecutionIdMap.current.delete(toolUseId);
          }
        }, FIVE_MINUTES);
        timeoutIds.push(tid);
      }
      for (const [toolUseId] of pendingResults.current) {
        const tid = setTimeout(() => {
          if (pendingResults.current.has(toolUseId)) {
            console.warn(`Pending tool result timeout for toolUseId: ${toolUseId}`);
            pendingResults.current.delete(toolUseId);
          }
        }, FIVE_MINUTES);
        timeoutIds.push(tid);
      }
    };

    // Run cleanup check periodically (every minute)
    const interval = setInterval(scheduleCleanup, 60_000);

    return () => {
      clearInterval(interval);
      timeoutIds.forEach(clearTimeout);
    };
  }, [currentSessionId]);

  // Clear streaming state when session changes
  useEffect(() => {
    setStreamingText('');
    setIsStreaming(false);
    setStreamingMessageId(null);
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
            }

            // Record mapping: toolUseId → { msgId, content }
            toolExecutionIdMap.current.set(toolUseId, { msgId, content });

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
            } else {
              // tool_result arrived before tool_use — cache it
              pendingResults.current.set(toolUseId, {
                output: event.data.output,
                isError: event.data.isError,
              });
            }
            break;
          }

          case 'thinking':
            addMessage({
              id: uuidv4(),
              role: 'assistant',
              type: 'thinking',
              content: event.data.text,
              timestamp: new Date().toISOString(),
              sessionId: currentSessionId,
            });
            break;
        }
      }),

      wsClient.on('result', (message) => {
        if (message.payload.sessionId !== currentSessionId) return;

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
          });
          streamingTextRef.current = '';
          setStreamingText('');
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
        setStreamingMessageId(null);
      }),
    ];

    return () => {
      unsubscribers.forEach((unsub) => unsub());
      wsClient.unsubscribe(currentSessionId);
    };
  }, [currentSessionId, addMessage]);

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

    // Save any partial streaming text
    const text = streamingTextRef.current;
    if (text && currentSessionId) {
      addMessage({
        id: streamingMessageId || uuidv4(),
        role: 'assistant',
        type: 'text',
        content: text + '\n\n[Generation stopped]',
        timestamp: new Date().toISOString(),
        sessionId: currentSessionId,
      });
      streamingTextRef.current = '';
    }
    setStreamingText('');
    setStreamingMessageId(null);
  }, [currentSessionId, streamingMessageId, addMessage]);

  if (!currentSessionId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-subtle text-gray-400">
        <div className="text-center animate-fadeIn">
          <div className="text-7xl mb-6"> </div>
          <h2 className="text-3xl font-bold mb-3 text-gradient">{t('chat.welcome.title')}</h2>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">
            {t('chat.welcome.subtitle')}
          </p>
          <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">Ctrl+N</kbd>
              {t('chat.welcome.newSession')}
            </span>
            <span className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">Ctrl+K</kbd>
              {t('chat.welcome.commands')}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gradient-subtle">
      {/* Chat header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700/50 bg-gray-800/30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-blue-400 animate-pulse' : 'bg-green-400'}`} />
            <span className="text-sm text-gray-400">
              {isStreaming ? t('chat.thinking') : t('chat.ready')}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton messages={currentMessages} sessionTitle={currentSession?.name} />
          <span className="text-xs text-gray-600">
            {t('chat.messages', { count: currentMessages.length })}
          </span>
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
        />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <MessageList
          messages={currentMessages}
          streamingText={streamingText}
          isStreaming={isStreaming}
          searchQuery={searchQuery || undefined}
          currentMatchIndex={searchQuery ? currentMatchIndex : undefined}
        />
      </div>

      {/* Input */}
      <InputBar
        onSend={handleSendMessage}
        disabled={!currentSessionId}
        isStreaming={isStreaming}
        onStop={handleStopStreaming}
      />
    </div>
  );
}
