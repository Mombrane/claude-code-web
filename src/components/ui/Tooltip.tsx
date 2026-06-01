import { useState, useCallback, useId, type ReactNode } from 'react';

interface TooltipProps {
  content: string;
  children: ReactNode;
  theme?: 'dark' | 'light';
}

export function Tooltip({ content, children, theme = 'dark' }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const tooltipId = useId();

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    // Clamp to viewport
    const x = Math.min(rect.left, window.innerWidth - 380);
    const y = rect.bottom + 4 > window.innerHeight - 100
      ? rect.top - 4 // Show above if near bottom
      : rect.bottom + 4;
    setPosition({ x: Math.max(8, x), y });
    setVisible(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setVisible(false);
  }, []);

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter as unknown as React.FocusEventHandler}
      onBlur={handleMouseLeave}
      aria-describedby={visible ? tooltipId : undefined}
      style={{ position: 'relative' }}
    >
      {children}
      {visible && (
        <div
          id={tooltipId}
          role="tooltip"
          style={{
            position: 'fixed',
            left: position.x,
            top: position.y,
            zIndex: 50,
            maxWidth: 360,
            pointerEvents: 'none',
          }}
          className={`px-3 py-2 rounded-lg shadow-lg text-xs leading-relaxed whitespace-pre-line ${
            theme === 'dark'
              ? 'bg-gray-800 text-gray-200 border border-gray-700'
              : 'bg-white text-gray-700 border border-gray-200'
          }`}
        >
          {content}
        </div>
      )}
    </div>
  );
}
