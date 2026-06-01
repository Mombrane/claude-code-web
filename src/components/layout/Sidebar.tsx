import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '../../stores/sessionStore';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';
import { formatCost, formatTokens, formatTime, groupSessionsByTime, encodePath, formatDuration } from '../../utils/format';
import { TagChip } from '../ui/TagChip';
import { SessionNotesDialog } from '../ui/SessionNotesDialog';
import { useToast } from '../ui/ToastProvider';
import type { Session } from '../../types';

export function Sidebar({ projectPath, theme = 'dark' }: { projectPath?: string; theme?: 'dark' | 'light' }) {
  const navigate = useNavigate();
  const {
    sessions,
    currentSessionId,
    setSessions,
    addSession,
    removeSession,
    setCurrentSession,
    updateSession,
    streamingSessions,
    errorSessions,
  } = useSessionStore();
  const { t, locale } = useI18n();
  const toast = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deepSearch, setDeepSearch] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'idle' | 'closed'>('all');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [editingTagsSessionId, setEditingTagsSessionId] = useState<string | null>(null);
  const [newTagInput, setNewTagInput] = useState('');
  const tagInputRef = useRef<HTMLInputElement>(null);
  const [editingNotesSessionId, setEditingNotesSessionId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<'updatedAt' | 'cost' | 'tokens' | 'created' | 'name'>('updatedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSessions();
  }, [projectPath]);

  // Deep search effect: reload sessions from server when deepSearch is enabled
  useEffect(() => {
    if (deepSearch && searchQuery.trim()) {
      const timer = setTimeout(async () => {
        try {
          const data = await api.getSessions({ 
            projectPath, 
            search: searchQuery, 
            searchContent: true 
          });
          setSessions(data);
        } catch (e) {
          console.error('Failed to deep search:', e);
        }
      }, 500); // Debounce 500ms
      return () => clearTimeout(timer);
    } else if (!deepSearch) {
      // Reload normal sessions when deep search is disabled
      loadSessions();
    }
  }, [deepSearch, searchQuery]);

  useEffect(() => {
    loadTags();
  }, []);

  useEffect(() => {
    if (editingSessionId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingSessionId]);

  useEffect(() => {
    if (editingTagsSessionId && tagInputRef.current) {
      tagInputRef.current.focus();
    }
  }, [editingTagsSessionId]);

  // Escape exits select mode
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectMode) {
        setSelectMode(false);
        setSelectedSessions(new Set());
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [selectMode]);

  // Close sort menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setSortMenuOpen(false);
      }
    };
    if (sortMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [sortMenuOpen]);

  const loadSessions = async () => {
    try {
      const data = await api.getSessions({ projectPath });
      setSessions(data);
    } catch (e) {
      console.error('Failed to load sessions:', e);
    }
  };

  const loadTags = async () => {
    try {
      const tags = await api.getAllTags();
      setAllTags(tags);
    } catch (e) {
      console.error('Failed to load tags:', e);
    }
  };

  const handleCreateSession = async () => {
    setIsCreating(true);
    try {
      const session = await api.createSession(undefined, projectPath, projectPath);
      addSession(session);
      setCurrentSession(session.id);
      toast.success(t('toast.sessionCreated'));
      const dir = encodePath(projectPath || session.cwd);
      navigate(`/${dir}/session/${session.id}`);
    } catch (e) {
      console.error('Failed to create session:', e);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(t('confirm.deleteSession'))) return;
    try {
      await api.deleteSession(sessionId);
      removeSession(sessionId);
      toast.success(t('toast.sessionDeleted'));
    } catch (e) {
      console.error('Failed to delete session:', e);
    }
  };

  const handleRenameSession = async (sessionId: string) => {
    if (editName.trim()) {
      try {
        await api.updateSession(sessionId, { name: editName.trim() });
        updateSession(sessionId, { name: editName.trim() });
      } catch (e) {
        console.error('Failed to rename session:', e);
      }
    }
    setEditingSessionId(null);
    setEditName('');
  };

  const handleStartRename = (session: Session, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditName(session.name);
  };

  const handleTogglePin = async (session: Session, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.togglePin(session.id, !session.pinned);
      updateSession(session.id, { pinned: !session.pinned });
    } catch (e) {
      console.error('Failed to toggle pin:', e);
    }
  };

  const handleUpdateTags = async (sessionId: string, tags: string[]) => {
    try {
      await api.updateSessionTags(sessionId, tags);
      updateSession(sessionId, { tags });
      loadTags();
    } catch (e) {
      console.error('Failed to update tags:', e);
    }
  };

  const handleAddTag = (sessionId: string, tag: string, currentTags: string[]) => {
    const trimmed = tag.trim().toLowerCase();
    if (trimmed && !currentTags.includes(trimmed)) {
      handleUpdateTags(sessionId, [...currentTags, trimmed]);
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (sessionId: string, tag: string, currentTags: string[]) => {
    handleUpdateTags(sessionId, currentTags.filter(t => t !== tag));
  };

  const handleSaveNotes = async (sessionId: string, notes: string) => {
    try {
      await api.updateSession(sessionId, { notes });
      updateSession(sessionId, { notes });
      toast.success(t('session.notes.updated'));
    } catch (e) {
      console.error('Failed to save notes:', e);
    }
  };

  const handleDuplicateSession = async (session: Session, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const newSession = await api.duplicateSession(session.id);
      addSession(newSession);
      toast.success(t('toast.sessionDuplicated'));
    } catch (e) {
      console.error('Failed to duplicate session:', e);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, sessionId: string) => {
    if (e.key === 'Enter') {
      handleRenameSession(sessionId);
    } else if (e.key === 'Escape') {
      setEditingSessionId(null);
      setEditName('');
    }
  };

  const handleSessionClick = (session: Session) => {
    if (editingSessionId === session.id) return;
    if (selectMode) {
      setSelectedSessions(prev => {
        const next = new Set(prev);
        if (next.has(session.id)) {
          next.delete(session.id);
        } else {
          next.add(session.id);
        }
        return next;
      });
      return;
    }
    setCurrentSession(session.id);
    const dir = encodePath(session.projectPath || session.cwd);
    navigate(`/${dir}/session/${session.id}`);
  };

  const handleToggleSelectMode = useCallback(() => {
    setSelectMode(prev => {
      if (prev) {
        setSelectedSessions(new Set());
      }
      return !prev;
    });
  }, []);

  const buildSessionTooltip = (session: Session) => {
    const lines: string[] = [];
    lines.push(`${t('session.tooltip.name')}: ${session.name}`);
    if (session.createdAt) {
      lines.push(`${t('session.tooltip.created')}: ${new Date(session.createdAt).toLocaleString(locale)}`);
    }
    if (session.updatedAt) {
      lines.push(`${t('session.tooltip.lastActive')}: ${new Date(session.updatedAt).toLocaleString(locale)}`);
    }
    if (session.totalCostUsd != null && session.totalCostUsd > 0) {
      lines.push(`${t('session.tooltip.cost')}: $${session.totalCostUsd.toFixed(4)}`);
    }
    if (session.totalTokens != null && session.totalTokens > 0) {
      lines.push(`${t('session.tooltip.tokens')}: ${session.totalTokens.toLocaleString()}`);
    }
    if (session.model) {
      lines.push(`${t('session.tooltip.model')}: ${session.model.split('/').pop()}`);
    }
    lines.push(`${t('session.tooltip.status')}: ${t(`sidebar.filter.${session.status}`)}`);
    if (session.notes) {
      lines.push(`${t('session.notes')}: ${session.notes}`);
    }
    return lines.join('\n');
  };

  const filteredSessions = useMemo(() => {
    let result = sessions;
    if (statusFilter !== 'all') {
      result = result.filter(session => session.status === statusFilter);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(session =>
        session.name.toLowerCase().includes(query)
      );
    }
    if (tagFilter) {
      result = result.filter(session =>
        session.tags && session.tags.includes(tagFilter)
      );
    }
    // Sort: pinned sessions always on top
    const pinned = result.filter(s => s.pinned);
    const unpinned = result.filter(s => !s.pinned);
    const compare = (a: Session, b: Session) => {
      let valA: number | string;
      let valB: number | string;
      switch (sortField) {
        case 'cost':
          valA = a.totalCostUsd ?? 0;
          valB = b.totalCostUsd ?? 0;
          break;
        case 'tokens':
          valA = a.totalTokens ?? 0;
          valB = b.totalTokens ?? 0;
          break;
        case 'created':
          valA = new Date(a.createdAt).getTime();
          valB = new Date(b.createdAt).getTime();
          break;
        case 'name':
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case 'updatedAt':
        default:
          valA = new Date(a.updatedAt).getTime();
          valB = new Date(b.updatedAt).getTime();
          break;
      }
      return sortDir === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    };
    pinned.sort(compare);
    unpinned.sort(compare);
    return [...pinned, ...unpinned];
  }, [sessions, searchQuery, statusFilter, tagFilter, sortField, sortDir]);

  const groupedSessions = useMemo(() =>
    groupSessionsByTime(filteredSessions, t),
    [filteredSessions, t]
  );
  const totalCost = useMemo(() =>
    sessions.reduce((sum, s) => sum + (s.totalCostUsd ?? 0), 0),
    [sessions]
  );

  const totalTokens = useMemo(() =>
    sessions.reduce((sum, s) => sum + (s.totalTokens ?? 0), 0),
    [sessions]
  );

  const handleSelectAll = useCallback(() => {
    if (selectedSessions.size === filteredSessions.length) {
      setSelectedSessions(new Set());
    } else {
      setSelectedSessions(new Set(filteredSessions.map(s => s.id)));
    }
  }, [selectedSessions, filteredSessions]);

  const handleBatchDelete = useCallback(async () => {
    if (selectedSessions.size === 0) return;
    if (!window.confirm(t('sidebar.batchDeleteConfirm', { count: selectedSessions.size }))) return;
    try {
      const ids = Array.from(selectedSessions);
      const result = await api.batchDeleteSessions(ids);
      const failedSet = new Set(result.failed);
      const succeeded = ids.filter(id => !failedSet.has(id));
      succeeded.forEach(id => removeSession(id));
      if (result.failed.length > 0) {
        toast.error(t('toast.batchDeleteFailed'));
      } else {
        toast.success(t('toast.batchDeleteSuccess', { count: result.deleted }));
      }
    } catch (e) {
      console.error('Failed to batch delete:', e);
      toast.error(t('toast.batchDeleteFailed'));
    }
    setSelectMode(false);
    setSelectedSessions(new Set());
  }, [selectedSessions, t, toast, removeSession]);

  const handleBatchTag = useCallback(() => {
    if (selectedSessions.size > 0) {
      const firstId = Array.from(selectedSessions)[0];
      setEditingTagsSessionId(firstId);
    }
  }, [selectedSessions]);



  return (
    <div className={`w-64 flex flex-col h-full ${theme === 'dark' ? 'bg-gray-800/80' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`p-3 border-b ${theme === 'dark' ? 'border-gray-700/50' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg"> </span>
            <h1 className="text-sm font-semibold text-gradient">{t('app.name')}</h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleToggleSelectMode}
              className={`p-1.5 text-xs rounded-md transition-all duration-200 ${
                selectMode
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : `text-gray-400 ${theme === 'dark' ? 'hover:text-white hover:bg-gray-700/50' : 'hover:text-gray-900 hover:bg-gray-200'}`
              }`}
              aria-label={t(selectMode ? 'sidebar.exitSelect' : 'sidebar.selectMode')}
            >
              {selectMode ? t('sidebar.exitSelect') : t('sidebar.selectMode')}
            </button>
            <button
              onClick={handleCreateSession}
              disabled={isCreating}
              className={`p-1.5 text-gray-400 ${theme === 'dark' ? 'hover:text-white hover:bg-gray-700/50' : 'hover:text-gray-900 hover:bg-gray-200'} rounded-md transition-all duration-200`}
              title={t('sidebar.newSessionTooltip')}
              aria-label={t('sidebar.newSession')}
            >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('sidebar.search')}
            aria-label={t('sidebar.search')}
            className={`w-full pl-8 pr-3 py-1.5 text-sm rounded-md focus:outline-none focus:ring-1 transition-all ${
              theme === 'dark'
                ? 'bg-gray-700/50 text-white placeholder-gray-500 focus:ring-blue-500/50 focus:bg-gray-700/70'
                : 'bg-gray-100 text-gray-800 placeholder-gray-400 focus:ring-blue-500/50 focus:bg-gray-200/70'
            }`}
          />
        </div>
        {/* Deep search toggle */}
        {searchQuery && (
          <div className="flex items-center gap-2 mt-2">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={deepSearch}
                onChange={(e) => setDeepSearch(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-gray-500 text-blue-500 focus:ring-blue-500/50"
              />
              <span className={`text-[11px] ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {t('sidebar.deepSearch')}
              </span>
            </label>
          </div>
        )}
        {/* Status filter */}
        <div className="flex gap-1 mt-2" role="radiogroup" aria-label={t('sidebar.statusFilter')}>
          {(['all', 'active', 'idle', 'closed'] as const).map((status) => (
            <button
              key={status}
              role="radio"
              aria-checked={statusFilter === status}
              onClick={() => setStatusFilter(status)}
              className={`flex-1 px-2 py-1 text-[11px] rounded-md transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-blue-500/50 ${
                statusFilter === status
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : theme === 'dark'
                    ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-700/40'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/60'
              }`}
            >
              {t(`sidebar.filter.${status}`)}
            </button>
          ))}
        </div>
        {/* Tag filter */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            <button
              onClick={() => setTagFilter(null)}
              className={`text-[10px] px-1.5 py-0.5 rounded-full transition-all ${
                tagFilter === null
                  ? theme === 'dark' ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-700'
                  : 'text-gray-500 hover:text-gray-400'
              }`}
            >
              {t('tags.all')}
            </button>
            {allTags.map((tag) => (
              <TagChip
                key={tag}
                tag={tag}
                active={tagFilter === tag}
                onClick={(tag) => setTagFilter(tagFilter === tag ? null : tag)}
                theme={theme}
              />
            ))}
          </div>
        )}
        {/* Sort options */}
        <div className="flex items-center justify-between mt-2">
          <div className="relative" ref={sortMenuRef}>
            <button
              onClick={() => setSortMenuOpen(!sortMenuOpen)}
              className={`flex items-center gap-1 px-2 py-1 text-[11px] rounded-md transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-blue-500/50 ${
                theme === 'dark'
                  ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/60'
              }`}
              aria-label={t('sidebar.sortBy')}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9M3 12h5m4 0v6m0 0l-3-3m3 3l3-3" />
              </svg>
              <span>{t(`sidebar.${({ updatedAt: 'sortDate', cost: 'sortCost', tokens: 'sortTokens', created: 'sortCreated', name: 'sortName' } as const)[sortField]}`)}</span>
              <span className="text-[10px] opacity-60">{sortDir === 'asc' ? '↑' : '↓'}</span>
            </button>
            {sortMenuOpen && (
              <div className={`absolute left-0 top-full mt-1 z-50 min-w-[140px] rounded-lg border shadow-xl backdrop-blur-sm ${
                theme === 'dark'
                  ? 'bg-gray-800/95 border-gray-600/50'
                  : 'bg-white/95 border-gray-200'
              }`}>
                {([
                  { field: 'updatedAt' as const, labelKey: 'sortDate' },
                  { field: 'cost' as const, labelKey: 'sortCost' },
                  { field: 'tokens' as const, labelKey: 'sortTokens' },
                  { field: 'created' as const, labelKey: 'sortCreated' },
                  { field: 'name' as const, labelKey: 'sortName' },
                ]).map(({ field, labelKey }) => (
                  <button
                    key={field}
                    onClick={() => {
                      if (sortField === field) {
                        setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortField(field);
                        setSortDir(field === 'name' ? 'asc' : 'desc');
                      }
                      setSortMenuOpen(false);
                    }}
                    className={`flex items-center justify-between w-full px-3 py-1.5 text-[11px] transition-colors ${
                      sortField === field
                        ? theme === 'dark' ? 'text-blue-400 bg-blue-500/10' : 'text-blue-600 bg-blue-50'
                        : theme === 'dark' ? 'text-gray-300 hover:bg-gray-700/60' : 'text-gray-700 hover:bg-gray-100'
                    } ${field === 'updatedAt' ? 'rounded-t-lg' : ''} ${field === 'name' ? 'rounded-b-lg' : ''}`}
                  >
                    <span>{t(`sidebar.${labelKey}`)}</span>
                    {sortField === field && (
                      <span className="text-[10px] opacity-70">{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto py-2">
        {groupedSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 px-4">
            {searchQuery ? (
              <>
                <svg className="w-8 h-8 mb-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-sm text-center">{t('sidebar.noResults', { query: searchQuery })}</p>
              </>
            ) : statusFilter !== 'all' ? (
              <>
                <svg className="w-8 h-8 mb-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <p className="text-sm text-center mb-1">{t('sidebar.noFilterResults', { filter: t(`sidebar.filter.${statusFilter}`) })}</p>
                <button
                  onClick={() => setStatusFilter('all')}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {t('sidebar.clearFilter')}
                </button>
              </>
            ) : (
              <>
                <svg className="w-8 h-8 mb-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <p className="text-sm text-center mb-3">{t('sidebar.noSessions')}</p>
                <button
                  onClick={handleCreateSession}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {t('sidebar.createFirst')}
                </button>
              </>
            )}
          </div>
        ) : (
          groupedSessions.map(({ label, sessions: groupSessions }) => (
            <div key={label} className="mb-2">
              <div className="px-3 py-1.5 text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                {label}
              </div>
              <div className="space-y-0.5 px-1.5">
                {groupSessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => handleSessionClick(session)}
                    title={buildSessionTooltip(session)}
                    aria-current={currentSessionId === session.id ? 'true' : undefined}
                    className={`group relative flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-all duration-200 ${
                      currentSessionId === session.id
                        ? theme === 'dark'
                          ? 'bg-gray-700/80 text-white shadow-sm'
                          : 'bg-blue-100 text-blue-900 shadow-sm'
                        : theme === 'dark'
                          ? 'text-gray-400 hover:bg-gray-700/40 hover:text-white'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    {/* Checkbox in select mode, session icon otherwise */}
                    {selectMode ? (
                      <input
                        type="checkbox"
                        checked={selectedSessions.has(session.id)}
                        onChange={() => {}} // handled by parent div click
                        aria-label={session.name}
                        className={`flex-shrink-0 w-4 h-4 rounded border-gray-500 text-blue-500 focus:ring-blue-500/50 ${
                          theme === 'dark' ? 'bg-gray-700' : 'bg-white'
                        }`}
                      />
                    ) : (
                    <div className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center ${
                      currentSessionId === session.id
                        ? theme === 'dark'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-blue-200 text-blue-700'
                        : theme === 'dark'
                          ? 'bg-gray-700/50 text-gray-500'
                          : 'bg-gray-200 text-gray-500'
                    }`}>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                    </div>
                    )}

                    {/* Session info */}
                    <div className="flex-1 min-w-0">
                      {editingSessionId === session.id ? (
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onBlur={() => handleRenameSession(session.id)}
                          onKeyDown={(e) => handleKeyDown(e, session.id)}
                          className={`w-full text-sm px-1 py-0.5 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${theme === 'dark' ? 'bg-gray-600 text-white' : 'bg-white text-gray-800 border border-gray-300'}`}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <>
                          <div
                            className="text-sm font-medium truncate cursor-text"
                            onDoubleClick={(e) => handleStartRename(session, e)}
                            title={t('session.renameHint')}
                          >{session.name}</div>
                          {session.lastUserMessage && (
                            <div
                              className={`text-[11px] truncate max-w-[180px] ${
                                currentSessionId === session.id
                                  ? 'text-gray-400'
                                  : theme === 'dark'
                                    ? 'text-gray-500'
                                    : 'text-gray-400'
                              }`}
                              title={session.lastUserMessage}
                              aria-label={t('sidebar.lastMessage')}
                            >
                              {session.lastUserMessage.length > 50
                                ? session.lastUserMessage.slice(0, 50) + '...'
                                : session.lastUserMessage}
                            </div>
                          )}
                          {session.matchSnippet && (
                            <div
                              className={`text-[11px] truncate max-w-[180px] ${
                                theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                              }`}
                              title={session.matchSnippet}
                            >
                                {session.matchSnippet.length > 60
                                ? session.matchSnippet.slice(0, 60) + '...'
                                : session.matchSnippet}
                            </div>
                          )}
                          {/* Tags display */}
                          {session.notes && (
                            <div
                              className={`inline-flex items-center gap-1 mt-1 text-[11px] cursor-pointer transition-colors ${
                                theme === 'dark' ? 'text-yellow-400/70 hover:text-yellow-300' : 'text-yellow-600 hover:text-yellow-700'
                              }`}
                              title={session.notes}
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                setEditingNotesSessionId(session.id);
                              }}
                            >
                              <span> </span>
                              <span className="truncate max-w-[160px]">{session.notes.length > 30 ? session.notes.slice(0, 30) + '...' : session.notes}</span>
                            </div>
                          )}
                          {session.tags && session.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {session.tags.map((tag) => (
                                <TagChip key={tag} tag={tag} theme={theme} />
                              ))}
                            </div>
                          )}
                        </>
                      )}
                      {/* Inline tag editor */}
                      {editingTagsSessionId === session.id && (
                        <div className="mt-1" onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-wrap gap-1 mb-1">
                            {(session.tags || []).map((tag) => (
                              <TagChip
                                key={tag}
                                tag={tag}
                                onRemove={(t) => handleRemoveTag(session.id, t, session.tags || [])}
                                theme={theme}
                              />
                            ))}
                          </div>
                          <input
                            ref={tagInputRef}
                            type="text"
                            value={newTagInput}
                            onChange={(e) => setNewTagInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newTagInput.trim()) {
                                handleAddTag(session.id, newTagInput, session.tags || []);
                              } else if (e.key === 'Escape') {
                                setEditingTagsSessionId(null);
                                setNewTagInput('');
                              }
                            }}
                            onBlur={() => {
                              setTimeout(() => {
                                setEditingTagsSessionId(null);
                                setNewTagInput('');
                              }, 150);
                            }}
                            placeholder={t('tags.placeholder')}
                            className={`w-full text-[11px] px-1.5 py-0.5 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                              theme === 'dark'
                                ? 'bg-gray-600 text-white placeholder-gray-400'
                                : 'bg-gray-200 text-gray-800 placeholder-gray-500'
                            }`}
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-[11px] text-gray-500">
                        <span>{formatTime(session.updatedAt, locale)}</span>
                        {session.model && (
                          <>
                            <span>·</span>
                            <span className="truncate max-w-[80px]" title={session.model}>
                              {session.model.split('/').pop() || session.model}
                            </span>
                          </>
                        )}
                        {(session.totalCostUsd > 0 || session.totalTokens > 0) && (
                          <>
                            <span>·</span>
                            {session.totalCostUsd > 0 && (
                              <span>{formatCost(session.totalCostUsd, t)}</span>
                            )}
                            {session.totalTokens > 0 && (
                              <span>{formatTokens(session.totalTokens, t)}</span>
                            )}
                            {formatDuration(session.createdAt, session.updatedAt) && (
                              <span>· {formatDuration(session.createdAt, session.updatedAt)}</span>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Status indicator */}
                    {streamingSessions.has(session.id) ? (
                      <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" role="status" aria-label={t('status.streaming')} />
                    ) : errorSessions.has(session.id) ? (
                      <div className="w-2 h-2 rounded-full bg-red-400" role="status" aria-label={t('status.error')} />
                    ) : session.status === 'active' ? (
                      <div className="w-2 h-2 rounded-full bg-green-400" role="status" aria-label={t('status.active')} />
                    ) : null}

                    {/* Actions */}
                    <div className="flex-shrink-0 flex items-center gap-0.5">
                      {session.pinned && (
                        <button
                          onClick={(e) => handleTogglePin(session, e)}
                          className="p-1 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded transition-colors"
                          title={t('sidebar.unpin')}
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                          </svg>
                        </button>
                      )}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!session.pinned && (
                          <button
                            onClick={(e) => handleTogglePin(session, e)}
                            className="p-1 text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
                            title={t('sidebar.pin')}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={(e) => handleStartRename(session, e)}
                          className={`p-1 text-gray-500 ${theme === 'dark' ? 'hover:text-white hover:bg-gray-600/50' : 'hover:text-gray-900 hover:bg-gray-200'} rounded transition-colors`}
                          title={t('sidebar.rename')}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTagsSessionId(editingTagsSessionId === session.id ? null : session.id);
                          }}
                          className={`p-1 rounded transition-colors ${
                            editingTagsSessionId === session.id
                              ? 'text-blue-400 bg-blue-500/10'
                              : `text-gray-500 ${theme === 'dark' ? 'hover:text-white hover:bg-gray-600/50' : 'hover:text-gray-900 hover:bg-gray-200'}`
                          }`}
                          title={t('tags.edit')}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingNotesSessionId(session.id);
                          }}
                          className={`p-1 rounded transition-colors ${
                            editingNotesSessionId === session.id
                              ? 'text-yellow-400 bg-yellow-500/10'
                              : `text-gray-500 ${theme === 'dark' ? 'hover:text-white hover:bg-gray-600/50' : 'hover:text-gray-900 hover:bg-gray-200'}`
                          }`}
                          title={t('session.notes.edit')}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => handleDeleteSession(session.id, e)}
                          className="p-1 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                          title={t('sidebar.delete')}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => handleDuplicateSession(session, e)}
                          className={`p-1 text-gray-500 ${theme === 'dark' ? 'hover:text-white hover:bg-gray-600/50' : 'hover:text-gray-900 hover:bg-gray-200'} rounded transition-colors`}
                          title={t('sidebar.duplicate')}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Floating action bar for select mode */}
      {selectMode && (
        <div className={`px-3 py-2 border-t flex items-center gap-2 ${
          theme === 'dark'
            ? 'bg-gray-800 border-gray-700/50 text-gray-300'
            : 'bg-white border-gray-200 text-gray-700'
        }`}>
          <span className="text-xs">{t('sidebar.selectedCount', { count: selectedSessions.size })}</span>
          <button
            onClick={handleSelectAll}
            aria-label={t('sidebar.selectAll')}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              theme === 'dark'
                ? 'text-blue-400 hover:bg-gray-700/50'
                : 'text-blue-600 hover:bg-gray-200'
            }`}
          >
            {t('sidebar.selectAll')}
          </button>
          <button
            onClick={handleBatchTag}
            disabled={selectedSessions.size === 0}
            aria-label={t('sidebar.batchTag')}
            className={`text-xs px-2 py-1 rounded transition-colors disabled:opacity-50 ${
              theme === 'dark'
                ? 'text-yellow-400 hover:bg-gray-700/50'
                : 'text-yellow-600 hover:bg-gray-200'
            }`}
          >
            {t('sidebar.batchTag')}
          </button>
          <button
            onClick={handleBatchDelete}
            disabled={selectedSessions.size === 0}
            aria-label={t('sidebar.batchDelete')}
            className={`text-xs px-2 py-1 rounded transition-colors disabled:opacity-50 ${
              theme === 'dark'
                ? 'text-red-400 hover:bg-gray-700/50'
                : 'text-red-600 hover:bg-gray-200'
            }`}
          >
            {t('sidebar.batchDelete')}
          </button>
        </div>
      )}

      {/* Footer */}
      <div className={`p-3 border-t ${theme === 'dark' ? 'border-gray-700/50' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{t('sidebar.sessionCount', { count: sessions.length })} · {formatCost(totalCost, t)} · {formatTokens(totalTokens, t)}</span>
          <button
            onClick={loadSessions}
            className={`p-1 ${theme === 'dark' ? 'hover:text-gray-300 hover:bg-gray-700/50' : 'hover:text-gray-700 hover:bg-gray-200'} rounded transition-colors`}
            title={t('sidebar.refresh')}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Notes edit dialog */}
      {editingNotesSessionId && (
        <SessionNotesDialog
          sessionId={editingNotesSessionId}
          initialNotes={sessions.find(s => s.id === editingNotesSessionId)?.notes || ''}
          theme={theme}
          onSave={handleSaveNotes}
          onClose={() => setEditingNotesSessionId(null)}
        />
      )}
    </div>
  );
}
