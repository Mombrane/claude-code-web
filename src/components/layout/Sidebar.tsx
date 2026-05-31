import { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '../../stores/sessionStore';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';
import { formatCost, formatTokens, formatTime, groupSessionsByTime } from '../../utils/format';
import { TagChip } from '../ui/TagChip';
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
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'idle' | 'closed'>('all');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [editingTagsSessionId, setEditingTagsSessionId] = useState<string | null>(null);
  const [newTagInput, setNewTagInput] = useState('');
  const tagInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSessions();
  }, [projectPath]);

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
      const dir = btoa(projectPath || session.cwd);
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
    setCurrentSession(session.id);
    const dir = btoa(session.projectPath || session.cwd);
    navigate(`/${dir}/session/${session.id}`);
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
    return result;
  }, [sessions, searchQuery, statusFilter, tagFilter]);

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


  return (
    <div className={`w-64 flex flex-col h-full ${theme === 'dark' ? 'bg-gray-800/80' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`p-3 border-b ${theme === 'dark' ? 'border-gray-700/50' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg"> </span>
            <h1 className="text-sm font-semibold text-gradient">{t('app.name')}</h1>
          </div>
          <button
            onClick={handleCreateSession}
            disabled={isCreating}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-md transition-all duration-200"
            title={t('sidebar.newSessionTooltip')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
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
            className={`w-full pl-8 pr-3 py-1.5 text-sm rounded-md focus:outline-none focus:ring-1 transition-all ${
              theme === 'dark'
                ? 'bg-gray-700/50 text-white placeholder-gray-500 focus:ring-blue-500/50 focus:bg-gray-700/70'
                : 'bg-gray-100 text-gray-800 placeholder-gray-400 focus:ring-blue-500/50 focus:bg-gray-200/70'
            }`}
          />
        </div>
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
                  ? 'bg-gray-600 text-gray-300'
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
                    className={`group relative flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-all duration-200 ${
                      currentSessionId === session.id
                        ? 'bg-gray-700/80 text-white shadow-sm'
                        : 'text-gray-400 hover:bg-gray-700/40 hover:text-white'
                    }`}
                  >
                    {/* Session icon */}
                    <div className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center ${
                      currentSessionId === session.id
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-gray-700/50 text-gray-500'
                    }`}>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                    </div>

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
                          className="w-full bg-gray-600 text-white text-sm px-1 py-0.5 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                          {/* Tags display */}
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
                          className="p-1 text-gray-500 hover:text-white hover:bg-gray-600/50 rounded transition-colors"
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
                              : 'text-gray-500 hover:text-white hover:bg-gray-600/50'
                          }`}
                          title={t('tags.edit')}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
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
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-700/50">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{t('sidebar.sessionCount', { count: sessions.length })} · {formatCost(totalCost, t)} · {formatTokens(totalTokens, t)}</span>
          <button
            onClick={loadSessions}
            className="p-1 hover:text-gray-300 hover:bg-gray-700/50 rounded transition-colors"
            title={t('sidebar.refresh')}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
