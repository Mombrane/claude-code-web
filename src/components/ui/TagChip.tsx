import React from 'react';

const TAG_COLORS = [
  'bg-blue-500/20 text-blue-400',
  'bg-green-500/20 text-green-400',
  'bg-purple-500/20 text-purple-400',
  'bg-orange-500/20 text-orange-400',
  'bg-pink-500/20 text-pink-400',
];

function getTagColor(tag: string): string {
  let hash = 0;
  for (const char of tag) hash = ((hash << 5) - hash) + char.charCodeAt(0);
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

interface TagChipProps {
  tag: string;
  onRemove?: (tag: string) => void;
  onClick?: (tag: string) => void;
  active?: boolean;
  size?: 'sm' | 'md';
}

export function TagChip({ tag, onRemove, onClick, active, size = 'sm' }: TagChipProps) {
  const colorClass = getTagColor(tag);
  const sizeClass = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1';

  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full font-medium ${sizeClass} ${colorClass} ${
        onClick ? 'cursor-pointer hover:opacity-80' : ''
      } ${active ? 'ring-1 ring-white/30' : ''}`}
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
