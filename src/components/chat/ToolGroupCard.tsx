import { useState } from 'react';
import type { Message, ToolCallContent, ToolResultContent, ToolExecutionContent } from '../../types';
import { useI18n } from '../../i18n';
import { ToolExecutionCard, ToolCallCard, ToolResultCard } from './ToolExecutionCard';

// Tool icon mapping (shared with ToolExecutionCard)
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

// Collapsible group of consecutive tool execution cards
export function ToolGroupCard({
  messages,
  expandedTools,
  onToggleTool,
  copiedMessageId,
  onCopyMessage,
  theme = 'dark',
}: {
  messages: Message[];
  expandedTools: Set<string>;
  onToggleTool: (id: string) => void;
  copiedMessageId: string | null;
  onCopyMessage: (msg: Message) => void;
  theme?: 'dark' | 'light';
}) {
  const { t } = useI18n();
  const [isGroupExpanded, setIsGroupExpanded] = useState(false);

  // Build summary from tool names (handle tool_execution, tool_use, and tool_result)
  const toolNames = messages.map(m => {
    if (m.type === 'tool_execution') {
      return (m.content as ToolExecutionContent).toolName;
    }
    if (m.type === 'tool_use') {
      return (m.content as ToolCallContent).toolName;
    }
    return 'Unknown';
  });

  // Count unique tool names for summary
  const nameCounts = new Map<string, number>();
  for (const name of toolNames) {
    nameCounts.set(name, (nameCounts.get(name) || 0) + 1);
  }

  const summaryParts: string[] = [];
  for (const [name, count] of nameCounts) {
    const icon = TOOL_ICONS[name] || TOOL_ICONS['default'];
    summaryParts.push(count > 1 ? `${icon} ${name}×${count}` : `${icon} ${name}`);
  }

  // Count completed vs running vs error (only for tool_execution messages)
  const execMessages = messages.filter(m => m.type === 'tool_execution');
  const completed = execMessages.filter(m => (m.content as ToolExecutionContent).status === 'completed').length;
  const errors = execMessages.filter(m => (m.content as ToolExecutionContent).status === 'error').length;
  const running = execMessages.length - completed - errors;

  return (
    <div className={`w-full border rounded-lg overflow-hidden transition-all duration-200 ${
      theme === 'dark'
        ? 'bg-gray-800/60 border-gray-700/50'
        : 'bg-gray-50 border-gray-200'
    }`}>
      {/* Group header — always visible */}
      <button
        onClick={() => setIsGroupExpanded(prev => !prev)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
          theme === 'dark' ? 'hover:bg-gray-700/30' : 'hover:bg-gray-100'
        }`}
      >
        {/* Status indicator */}
        <div className="flex-shrink-0">
          {running > 0 ? (
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          ) : errors > 0 ? (
            <div className="w-2 h-2 rounded-full bg-red-400" />
          ) : (
            <div className="w-2 h-2 rounded-full bg-green-400" />
          )}
        </div>

        {/* Summary text */}
        <div className="flex-1 min-w-0">
          <span className={`text-sm font-medium ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
          }`}>
            {t('tool.groupSummary', { count: messages.length })}
          </span>
          <span className={`text-xs ml-2 ${
            theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
          }`}>
            {summaryParts.join(' · ')}
          </span>
        </div>

        {/* Expand/collapse chevron */}
        <svg
          className={`w-4 h-4 transition-transform ${isGroupExpanded ? 'rotate-180' : ''} ${
            theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded tool cards */}
      {isGroupExpanded && (
        <div className={`border-t px-4 py-3 space-y-2 ${
          theme === 'dark' ? 'border-gray-700/50' : 'border-gray-200'
        }`}>
          {messages.map((msg) => {
            if (msg.type === 'tool_execution') {
              const execution = msg.content as ToolExecutionContent;
              return (
                <div key={msg.id} className="group/tool relative">
                  <ToolExecutionCard
                    execution={execution}
                    isExpanded={expandedTools.has(msg.id)}
                    onToggle={() => onToggleTool(msg.id)}
                    theme={theme}
                  />
                  {/* Copy button per tool */}
                  <button
                    onClick={() => onCopyMessage(msg)}
                    className={`absolute top-2 right-2 p-1 rounded-md text-xs opacity-0 group-hover/tool:opacity-100 transition-opacity ${
                      theme === 'dark'
                        ? 'bg-gray-700/80 hover:bg-gray-600 text-gray-300'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    }`}
                    title={t('chat.copyMessage')}
                  >
                    {copiedMessageId === msg.id ? '✓' : ' '}
                  </button>
                </div>
              );
            }
            if (msg.type === 'tool_use') {
              const toolCall = msg.content as ToolCallContent;
              return (
                <div key={msg.id} className="group/tool relative">
                  <ToolCallCard
                    toolCall={toolCall}
                    isExpanded={expandedTools.has(msg.id)}
                    onToggle={() => onToggleTool(msg.id)}
                    theme={theme}
                  />
                </div>
              );
            }
            if (msg.type === 'tool_result') {
              const result = msg.content as ToolResultContent;
              return (
                <div key={msg.id} className="group/tool relative">
                  <ToolResultCard result={result} theme={theme} />
                </div>
              );
            }
            return null;
          })}
        </div>
      )}
    </div>
  );
}
