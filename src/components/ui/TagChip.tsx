import React from 'react';

interface TagChipProps {
  tag: string;
  onRemove?: (tag: string) => void;
  onClick?: (tag: string) => void;
  active?: boolean;
  size?: 'sm' | 'md';
  theme?: 'dark' | 'light';
}

const TAG_COLORS_DARK = [
  'bg-blue-500/20 text-blue-400',
  'bg-green-500/20 text-green-400',
  'bg-purple-500/20 text-purple-400',
  'bg-orange-500/20 text-orange-400',
  'bg-pink-500/20 text-pink-400',
];

const TAG_COLORS_LIGHT = [
  'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700',
  'bg-purple-100 text-purple-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700',
];

function getTagColor(tag: string, theme: 'dark' | 'light'): string {
  let hash = 0;
  for (const char of tag) hash = ((hash << 5) - hash) + char.charCodeAt(0);
  const colors = theme === 'dark' ? TAG_COLORS_DARK : TAG_COLORS_LIGHT;
  return colors[Math.abs(hash) % colors.length];
}

export function TagChip({ tag, onRemove, onClick, active, size = 'sm', theme = 'dark' }: TagChipProps) {
  const colorClass = getTagColor(tag, theme);
  const sizeClass = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1';

  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full font-medium ${sizeClass} ${colorClass} ${
        onClick ? 'cursor-pointer hover:opacity-80' : ''
      } ${active ? (theme === 'dark' ? 'ring-1 ring-white/30' : 'ring-1 ring-gray-400/30') : ''}`}
      onClick={onClick ? () => onClick(tag) : undefined}
    >
      <span>#</span>
      <span className="truncate max-w-[80px]">{tag}</span>
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(tag);
          }}
          className="ml-0.5 hover:opacity-70 transition-opacity"
          aria-label={`Remove tag ${tag}`}
        >
          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
}
