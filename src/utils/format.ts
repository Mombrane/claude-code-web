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
