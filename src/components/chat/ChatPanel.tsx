import { useEffect, useState, useCallback, useRef } from 'react';
import { useSessionStore } from '../../stores/sessionStore';
import { wsClient } from '../../api/websocket';
import { MessageList } from './MessageList';
import { InputBar } from './InputBar';
import type { StreamEvent } from '../../types';
import { v4 as uuidv4 } from 'uuid';

export function ChatPanel() {
  const { sessions, currentSessionId, currentMessages, addMessage } = useSessionStore();
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const currentSession = sessions.find((s) => s.id === currentSessionId);
  const streamingTextRef = useRef<string>('');

  // Sync streamingText to ref so closures always read the latest value
  useEffect(() => { streamingTextRef.current = streamingText; }, [streamingText]);

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

          case 'tool_use':
            // Add tool use message
            addMessage({
              id: uuidv4(),
              role: 'assistant',
              type: 'tool_use',
              content: {
                toolName: event.data.toolName,
                toolUseId: event.data.toolUseId,
                input: event.data.input,
              },
              timestamp: new Date().toISOString(),
              sessionId: currentSessionId,
            });
            break;

          case 'tool_result':
            addMessage({
              id: uuidv4(),
              role: 'assistant',
              type: 'tool_result',
              content: {
                toolUseId: event.data.toolUseId,
                output: event.data.output,
                isError: event.data.isError,
              },
              timestamp: new Date().toISOString(),
              sessionId: currentSessionId,
            });
            break;

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
          <h2 className="text-3xl font-bold mb-3 text-gradient">Claude Code Web</h2>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">
            Select a session or create a new one to start coding with Claude
          </p>
          <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">Ctrl+N</kbd>
              New Session
            </span>
            <span className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">Ctrl+K</kbd>
              Commands
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
              {isStreaming ? 'Claude is thinking...' : 'Ready'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600">
            {currentMessages.length} messages
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <MessageList
          messages={currentMessages}
          streamingText={streamingText}
          isStreaming={isStreaming}
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
