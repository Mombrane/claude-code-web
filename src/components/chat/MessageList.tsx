import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { Message, ToolCallContent, ToolResultContent } from '../../types';

interface MessageListProps {
  messages: Message[];
  streamingText: string;
  isStreaming: boolean;
}

export function MessageList({ messages, streamingText, isStreaming }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  const renderMessage = (message: Message) => {
    switch (message.type) {
      case 'text':
        return (
          <div
            className={`message ${
              message.role === 'user' ? 'bg-blue-600 ml-auto' : 'bg-gray-700'
            } rounded-lg p-4 max-w-[80%]`}
          >
            {message.role === 'user' ? (
              <p className="whitespace-pre-wrap">{message.content as string}</p>
            ) : (
              <div className="prose prose-invert max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                >
                  {message.content as string}
                </ReactMarkdown>
              </div>
            )}
          </div>
        );

      case 'tool_use':
        const toolCall = message.content as ToolCallContent;
        return (
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 max-w-[80%]">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-yellow-400 text-sm font-mono">
                {toolCall.toolName}
              </span>
              <span className="text-gray-500 text-xs">tool call</span>
            </div>
            <pre className="text-sm text-gray-300 overflow-x-auto">
              {JSON.stringify(toolCall.input, null, 2)}
            </pre>
          </div>
        );

      case 'tool_result':
        const result = message.content as ToolResultContent;
        return (
          <div
            className={`border rounded-lg p-4 max-w-[80%] ${
              result.isError
                ? 'bg-red-900/20 border-red-600'
                : 'bg-gray-800 border-gray-600'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-gray-500 text-xs">tool result</span>
              {result.isError && (
                <span className="text-red-400 text-xs">error</span>
              )}
            </div>
            <pre className="text-sm text-gray-300 overflow-x-auto max-h-48 overflow-y-auto">
              {result.output}
            </pre>
          </div>
        );

      case 'thinking':
        return (
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 max-w-[80%]">
            <div className="text-gray-500 text-xs mb-2">thinking</div>
            <p className="text-gray-400 text-sm italic">
              {message.content as string}
            </p>
          </div>
        );

      case 'error':
        return (
          <div className="bg-red-900/20 border border-red-600 rounded-lg p-4 max-w-[80%]">
            <p className="text-red-400">{message.content as string}</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          {renderMessage(message)}
        </div>
      ))}

      {isStreaming && streamingText && (
        <div className="flex justify-start">
          <div className="bg-gray-700 rounded-lg p-4 max-w-[80%]">
            <div className="prose prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
              >
                {streamingText}
              </ReactMarkdown>
            </div>
            <span className="inline-block w-2 h-4 bg-blue-400 animate-pulse ml-1" />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
