import { useMemo } from 'react';
import { useI18n } from '../../i18n';
import type { Message, ToolExecutionContent } from '../../types';

interface SessionTimelineProps {
  messages: Message[];
  visibleRange?: { start: number; end: number };
  theme?: 'dark' | 'light';
  onMessageClick?: (index: number) => void;
}

interface TimelineItem {
  id: string;
  icon: string;
  color: string;
  tooltip: string;
  preview: string;
  index: number;
}

function getMessagePreview(
  content: Message['content'],
  type: string | undefined,
): string {
  if (type === 'tool_execution' && content && typeof content === 'object') {
    const exec = content as ToolExecutionContent;
    const name = exec.toolName || 'tool';
    return `${name}: ${exec.status || ''}`;
  }
  if (typeof content === 'string') {
    return content.length > 50 ? content.slice(0, 50) + '...' : content;
  }
  return '';
}

export function SessionTimeline({ messages, visibleRange, theme = 'dark', onMessageClick }: SessionTimelineProps) {
  const { t } = useI18n();

  const timelineItems = useMemo((): TimelineItem[] => {
    return messages.map((msg, index) => {
      let icon: string;
      let color: string;
      let tooltipKey: string;

      if (msg.type === 'error') {
        icon = '❌';
        color = theme === 'dark' ? 'text-red-400' : 'text-red-500';
        tooltipKey = 'timeline.error';
      } else if (msg.type === 'thinking') {
        icon = '💭';
        color = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
        tooltipKey = 'timeline.thinking';
      } else if (msg.type === 'tool_execution' || msg.type === 'tool_use') {
        icon = '🔧';
        color = theme === 'dark' ? 'text-orange-400' : 'text-orange-500';
        tooltipKey = 'timeline.toolCall';
      } else if (msg.type === 'tool_result') {
        icon = '📋';
        color = theme === 'dark' ? 'text-purple-400' : 'text-purple-500';
        tooltipKey = 'timeline.toolResult';
      } else if (msg.role === 'user') {
        icon = '💬';
        color = theme === 'dark' ? 'text-blue-400' : 'text-blue-500';
        tooltipKey = 'timeline.userMessage';
      } else if (msg.role === 'assistant') {
        icon = '🤖';
        color = theme === 'dark' ? 'text-green-400' : 'text-green-500';
        tooltipKey = 'timeline.assistantMessage';
      } else {
        // system or unknown
        icon = '⚙️';
        color = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
        tooltipKey = 'timeline.userMessage';
      }

      const preview = getMessagePreview(msg.content, msg.type);

      return {
        id: msg.id,
        icon,
        color,
        tooltip: t(tooltipKey),
        preview,
        index,
      };
    });
  }, [messages, theme, t]);

  const isVisible = (index: number): boolean => {
    if (!visibleRange) return false;
    return index >= visibleRange.start && index <= visibleRange.end;
  };

  const handleClick = (index: number) => {
    if (onMessageClick) {
      onMessageClick(index);
    }
    window.dispatchEvent(new CustomEvent('scroll-to-message-index', { detail: { index } }));
  };

  return (
    <div
      role="navigation"
      aria-label={t('timeline.title')}
      className={`flex flex-col h-full overflow-hidden ${
        theme === 'dark' ? 'bg-gray-900 border-l border-gray-700/50' : 'bg-gray-50 border-l border-gray-200'
      }`}
    >
      <div
        className={`px-1 py-2 text-[9px] font-medium text-center border-b ${
          theme === 'dark' ? 'text-gray-400 border-gray-700/50' : 'text-gray-500 border-gray-200'
        }`}
      >
        {t('timeline.title')}
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-1">
        {timelineItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleClick(item.index)}
            title={`${item.tooltip}${item.preview ? ': ' + item.preview : ''}`}
            className={`group relative w-full flex items-center justify-center py-1 transition-all duration-150 ${
              isVisible(item.index)
                ? theme === 'dark'
                  ? 'bg-blue-500/10'
                  : 'bg-blue-50'
                : theme === 'dark'
                  ? 'hover:bg-gray-800'
                  : 'hover:bg-gray-100'
            }`}
          >
            <span className={`text-xs ${item.color} transition-transform group-hover:scale-125`}>
              {item.icon}
            </span>
            {/* Visible range indicator */}
            {isVisible(item.index) && (
              <span
                className={`absolute left-0 top-0 bottom-0 w-0.5 ${
                  theme === 'dark' ? 'bg-blue-400' : 'bg-blue-500'
                }`}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
