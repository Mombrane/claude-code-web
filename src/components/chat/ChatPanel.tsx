import { useEffect, useState } from 'react';
import { useSessionStore } from '../../stores/sessionStore';
import { wsClient } from '../../api/websocket';
import { MessageList } from './MessageList';
import { InputBar } from './InputBar';
import type { StreamEvent } from '../../types';
import { v4 as uuidv4 } from 'uuid';

export function ChatPanel() {
  const { sessions, currentSessionId, addMessage } = useSessionStore();
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const currentSession = sessions.find((s) => s.id === currentSessionId);

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
            addMessage(currentSessionId, {
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
            addMessage(currentSessionId, {
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
            addMessage(currentSessionId, {
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
        if (streamingText) {
          addMessage(currentSessionId, {
            id: uuidv4(),
            role: 'assistant',
            type: 'text',
            content: streamingText,
            timestamp: new Date().toISOString(),
            sessionId: currentSessionId,
          });
          setStreamingText('');
        }
        setIsStreaming(false);
      }),

      wsClient.on('error', (message) => {
        if (message.payload.sessionId !== currentSessionId) return;

        addMessage(currentSessionId, {
          id: uuidv4(),
          role: 'system',
          type: 'error',
          content: message.payload.error,
          timestamp: new Date().toISOString(),
          sessionId: currentSessionId,
        });
        setIsStreaming(false);
        setStreamingText('');
      }),
    ];

    return () => {
      unsubscribers.forEach((unsub) => unsub());
      wsClient.unsubscribe(currentSessionId);
    };
  }, [currentSessionId, addMessage]);

  const handleSendMessage = (message: string) => {
    if (!currentSessionId || !message.trim()) return;

    // Add user message to store
    addMessage(currentSessionId, {
      id: uuidv4(),
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
  };

  if (!currentSessionId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900 text-gray-400">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Welcome to Claude Code Web</h2>
          <p>Select a session or create a new one to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-900">
      <div className="flex-1 overflow-hidden">
        <MessageList
          messages={currentSession?.messages || []}
          streamingText={streamingText}
          isStreaming={isStreaming}
        />
      </div>
      <InputBar onSend={handleSendMessage} disabled={isStreaming} />
    </div>
  );
}
