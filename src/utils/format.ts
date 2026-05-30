import type { Session } from '../types';

type TFunction = (key: string, params?: Record<string, string | number>) => string;

export function formatCost(cost: number | undefined | null, t: TFunction): string {
  if (cost === undefined || cost === null) return '';
  return t('chat.cost', { amount: cost.toFixed(2) });
}

export function formatTokens(tokens: number, t: TFunction): string {
  if (tokens < 1000) return `${tokens} ${t('chat.tokens')}`;
  if (tokens < 1000000) return `${(tokens / 1000).toFixed(1)}k ${t('chat.tokens')}`;
  return `${(tokens / 1000000).toFixed(1)}M ${t('chat.tokens')}`;
}

export function formatTime(dateStr: string, locale: string): string {
  const date = new Date(dateStr);
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
