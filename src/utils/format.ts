import React from 'react';
import type { Session } from '../types';

type TFunction = (key: string, params?: Record<string, string | number>) => string;

export function formatCost(cost: number | undefined | null, t: TFunction): string {
  if (cost === undefined || cost === null) return '';
  return t('chat.cost', { amount: cost.toFixed(2) });
}

export function formatTokens(tokens: number | undefined | null, t: TFunction): string {
  if (tokens === undefined || tokens === null || isNaN(tokens)) return '';
  if (tokens < 1000) return `${tokens} ${t('chat.tokens')}`;
  if (tokens < 1000000) return `${(tokens / 1000).toFixed(1)}k ${t('chat.tokens')}`;
  return `${(tokens / 1000000).toFixed(1)}M ${t('chat.tokens')}`;
}

export function formatTime(dateStr: string, locale: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr || '';
  return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(dateStr: string, locale: string = 'en-US', t: TFunction): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr || '';
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (minutes < 1) return t('time.justNow');
  if (minutes < 60) return t('time.minutesAgo', { n: minutes });
  if (hours < 24) return t('time.hoursAgo', { n: hours });
  return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}

export function groupSessionsByTime(
  sessions: Session[],
  t: TFunction,
  labelKeys: { today: string; yesterday: string; older: string } = {
    today: 'sidebar.group.today',
    yesterday: 'sidebar.group.yesterday',
    older: 'sidebar.group.older',
  }
): { label: string; sessions: Session[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);

  const groups: Record<string, Session[]> = {
    'today': [],
    'yesterday': [],
    'older': [],
  };

  for (const session of sessions) {
    const updated = new Date(session.updatedAt);
    if (updated >= today) {
      groups['today'].push(session);
    } else if (updated >= yesterday) {
      groups['yesterday'].push(session);
    } else {
      groups['older'].push(session);
    }
  }

  const labelMap: Record<string, string> = {
    'today': t(labelKeys.today),
    'yesterday': t(labelKeys.yesterday),
    'older': t(labelKeys.older),
  };

  return Object.entries(groups)
    .filter(([, sessions]) => sessions.length > 0)
    .map(([key, sessions]) => ({ label: labelMap[key] || key, sessions }));
}

export function formatDuration(startDate: string, endDate: string): string | null {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  if (isNaN(start) || isNaN(end) || end <= start) return null;
  const diffMs = end - start;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMin < 1) return '<1m';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHours < 24) return `${diffHours}h${diffMin % 60 > 0 ? `${diffMin % 60}m` : ''}`;
  return `${diffDays}d${diffHours % 24 > 0 ? `${diffHours % 24}h` : ''}`;
}

/**
 * Encode a filesystem path for use in a single URL segment.
 * Handles non-ASCII paths (Chinese, Japanese, etc.) unlike btoa().
 * Uses ~ as segment separator to avoid / in URL which breaks routing.
 * Example: /home/user/项目 → home~user~%E9%A1%B9%E7%9B%AE
 */
export function encodePath(path: string): string {
  // Strip leading /, split by /, encode each segment, join with ~
  const clean = path.startsWith('/') ? path.slice(1) : path;
  return clean.split('/').map(s => encodeURIComponent(s)).join('~');
}

/**
 * Decode a URL-encoded path back to a filesystem path.
 * Reverses the encodePath transformation.
 */
export function decodePath(encoded: string): string {
  return '/' + encoded.split('~').map(s => decodeURIComponent(s)).join('/');
}

/**
 * Get relative time string (e.g., "just now", "5m ago", "3h ago").
 * Returns null if older than 24 hours (caller should fall back to full time).
 */
export function getRelativeTime(timestamp: string, t: TFunction): string | null {
  const now = Date.now();
  const msgTime = new Date(timestamp).getTime();
  if (isNaN(msgTime)) return null;
  const diffMs = now - msgTime;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMin < 1) return t('time.justNow');
  if (diffMin < 60) return t('time.minutesAgo', { n: diffMin });
  if (diffHours < 24) return t('time.hoursAgo', { n: diffHours });
  return null;
}

/**
 * Escape special regex characters in a string.
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Highlight matching text in a string with <mark> elements.
 * Returns JSX-compatible output for search result highlighting.
 */
export function highlightMatch(text: string, query: string, theme: 'dark' | 'light'): React.ReactNode {
  if (!query) return text;
  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
  const parts = text.split(regex);
  if (parts.length === 1) return text; // No match
  const markClass = theme === 'dark' ? 'bg-yellow-500/30 text-yellow-200' : 'bg-yellow-200 text-yellow-800';
  return parts.map((part, i) =>
    regex.test(part) ? React.createElement('mark', { key: i, className: markClass }, part) : part
  );
}
