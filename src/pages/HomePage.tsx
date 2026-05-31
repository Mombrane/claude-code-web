import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useSessionStore } from '../stores/sessionStore';
import { useI18n } from '../i18n';
import { formatCost, formatTokens, formatDate, groupSessionsByTime } from '../utils/format';
import type { Project, Session } from '../types';

interface HomePageProps {
  theme?: 'dark' | 'light';
}

export function HomePage({ theme = 'dark' }: HomePageProps) {
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const { setSessions, setCurrentSession } = useSessionStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [sessions, setSessionsState] = useState<Session[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showAddProject, setShowAddProject] = useState(false);
  const [newProjectPath, setNewProjectPath] = useState('');

  // Load projects
  useEffect(() => {
    loadProjects();
  }, []);

  // Load sessions when project changes
  useEffect(() => {
    loadSessions();
  }, [selectedProject]);

  const loadProjects = async () => {
    try {
      const data = await api.getProjects();
      setProjects(data);
      if (data.length > 0 && !selectedProject) {
        setSelectedProject(data[0].worktree);
      }
    } catch (e) {
      console.error('Failed to load projects:', e);
    }
  };

  const loadSessions = async () => {
    setIsLoading(true);
    try {
      const data = await api.getSessions({
        projectPath: selectedProject,
        limit: 50,
      });
      setSessionsState(data);
      setSessions(data);
    } catch (e) {
      console.error('Failed to load sessions:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddProject = async () => {
    if (!newProjectPath.trim()) return;
    try {
      const project = await api.addProject(newProjectPath.trim());
      setProjects(prev => [...prev, project]);
      setSelectedProject(project.worktree);
      setShowAddProject(false);
      setNewProjectPath('');
    } catch (e) {
      console.error('Failed to add project:', e);
    }
  };

  const handleDeleteProject = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(t('home.confirmRemove'))) return;
    try {
      await api.deleteProject(projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
      if (selectedProject === projects.find(p => p.id === projectId)?.worktree) {
        setSelectedProject(projects[0]?.worktree);
      }
    } catch (e) {
      console.error('Failed to delete project:', e);
    }
  };

  const handleOpenSession = (session: Session) => {
    setCurrentSession(session.id);
    const dir = btoa(session.projectPath || session.cwd);
    navigate(`/${dir}/session/${session.id}`);
  };

  const handleNewSession = async () => {
    if (!selectedProject) return;
    try {
      const session = await api.createSession(undefined, selectedProject, selectedProject);
      setCurrentSession(session.id);
      const dir = btoa(selectedProject);
      navigate(`/${dir}/session/${session.id}`);
    } catch (e) {
      console.error('Failed to create session:', e);
    }
  };

  // Compute session statistics
  const stats = useMemo(() => {
    if (sessions.length === 0) {
      return { totalSessions: 0, totalCost: 0, totalTokens: 0, avgCost: 0, mostExpensive: null };
    }
    const totalCost = sessions.reduce((sum, s) => sum + (s.totalCostUsd ?? 0), 0);
    const totalTokens = sessions.reduce((sum, s) => sum + (s.totalTokens ?? 0), 0);
    const paidSessions = sessions.filter(s => (s.totalCostUsd ?? 0) > 0);
    const avgCost = paidSessions.length > 0
      ? paidSessions.reduce((sum, s) => sum + s.totalCostUsd, 0) / paidSessions.length
      : 0;
    const mostExpensive = sessions.reduce((max, s) =>
      (s.totalCostUsd ?? 0) > (max.totalCostUsd ?? 0) ? s : max
    , sessions[0]);
    return { totalSessions: sessions.length, totalCost, totalTokens, avgCost, mostExpensive };
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    if (!searchQuery) return sessions;
    const query = searchQuery.toLowerCase();
    return sessions.filter(s =>
      s.name.toLowerCase().includes(query)
    );
  }, [sessions, searchQuery]);

  const groupedSessions = useMemo(() =>
    groupSessionsByTime(filteredSessions, t, { today: 'home.today', yesterday: 'home.yesterday', older: 'home.older' }),
    [filteredSessions, t]
  );

  const selectedProjectData = projects.find(p => p.worktree === selectedProject);

  return (
    <div className={`flex h-screen ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      {/* Left sidebar - Projects */}
      <div className={`w-70 border-r flex flex-col ${theme === 'dark' ? 'border-gray-700/50 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
        {/* Logo */}
        <div className={`p-4 border-b ${theme === 'dark' ? 'border-gray-700/50' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2">
            <span className="text-xl"> </span>
            <h1 className="text-sm font-semibold text-gradient">{t('app.name')}</h1>
          </div>
        </div>

        {/* Project list */}
        <div className="flex-1 overflow-y-auto py-2">
          <div className={`px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider ${'text-gray-500'}`}>
            {t('home.projects')}
          </div>
          {projects.map(project => (
            <div
              key={project.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedProject(project.worktree)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedProject(project.worktree);
                }
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-all duration-200 group cursor-pointer ${
                selectedProject === project.worktree
                  ? theme === 'dark'
                    ? 'bg-gray-700/80 text-white'
                    : 'bg-gray-100 text-gray-900'
                  : theme === 'dark'
                    ? 'text-gray-400 hover:bg-gray-700/40 hover:text-white'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <div className={`w-7 h-7 rounded-md flex items-center justify-center text-sm ${
                selectedProject === project.worktree
                  ? 'bg-blue-500/20 text-blue-400'
                  : theme === 'dark'
                    ? 'bg-gray-700/50 text-gray-500'
                    : 'bg-gray-200 text-gray-500'
              }`}>
                {project.icon?.override || ' '}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{project.name}</div>
                <div className={`text-[11px] truncate ${'text-gray-500'}`}>{project.worktree}</div>
              </div>
              <button
                onClick={(e) => handleDeleteProject(project.id, e)}
                className="p-1 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all"
                title={t('home.removeProject')}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}

          {/* Add project button */}
          <button
            onClick={() => setShowAddProject(true)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 transition-all duration-200 ${
              theme === 'dark'
                ? 'text-gray-500 hover:text-white hover:bg-gray-700/40'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <div className={`w-7 h-7 rounded-md flex items-center justify-center ${
              theme === 'dark' ? 'bg-gray-700/30' : 'bg-gray-200'
            }`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className="text-sm">{t('home.addProject')}</span>
          </button>
        </div>
      </div>

      {/* Right panel - Sessions */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-700/50 bg-gray-800/30' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-semibold">
                {selectedProjectData?.name || t('home.selectProject')}
              </h2>
              {selectedProjectData && (
                <p className={`text-xs mt-0.5 ${'text-gray-500'}`}>{selectedProjectData.worktree}</p>
              )}
            </div>
            <button
              onClick={handleNewSession}
              disabled={!selectedProject}
              className={`flex items-center gap-2 px-4 py-2 text-white text-sm rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500'
                  : 'bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 disabled:text-gray-500'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('home.newSession')}
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('home.searchSessions')}
              className={`w-full pl-10 pr-4 py-2.5 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all ${
                theme === 'dark'
                  ? 'bg-gray-700/50 text-white placeholder-gray-500 focus:bg-gray-700/70'
                  : 'bg-gray-100 text-gray-900 placeholder-gray-400 focus:bg-gray-50'
              }`}
            />
          </div>
        </div>

        {/* Statistics */}
        {!isLoading && sessions.length > 0 && (
          <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-700/50' : 'border-gray-200'}`}>
            <h3 className={`text-[11px] font-medium uppercase tracking-wider mb-3 ${'text-gray-500'}`}>{t('home.statistics')}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className={`rounded-lg px-4 py-3 ${theme === 'dark' ? 'bg-gray-800/60' : 'bg-gray-50'}`}>
                <div className={`text-[11px] mb-1 ${'text-gray-500'}`}>{t('home.sessions')}</div>
                <div className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{stats.totalSessions}</div>
              </div>
              <div className={`rounded-lg px-4 py-3 ${theme === 'dark' ? 'bg-gray-800/60' : 'bg-gray-50'}`}>
                <div className={`text-[11px] mb-1 ${'text-gray-500'}`}>{t('home.totalCost')}</div>
                <div className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{formatCost(stats.totalCost, t)}</div>
              </div>
              <div className={`rounded-lg px-4 py-3 ${theme === 'dark' ? 'bg-gray-800/60' : 'bg-gray-50'}`}>
                <div className={`text-[11px] mb-1 ${'text-gray-500'}`}>{t('home.totalTokens')}</div>
                <div className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{formatTokens(stats.totalTokens, t)}</div>
              </div>
              <div className={`rounded-lg px-4 py-3 ${theme === 'dark' ? 'bg-gray-800/60' : 'bg-gray-50'}`}>
                <div className={`text-[11px] mb-1 ${'text-gray-500'}`}>{t('home.avgCost')}</div>
                <div className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{formatCost(stats.avgCost, t)}</div>
              </div>
            </div>
            {stats.mostExpensive && (stats.mostExpensive.totalCostUsd ?? 0) > 0 && (
              <div className={`mt-2 text-[11px] ${'text-gray-500'}`}>
                {t('home.mostExpensive')} <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>"{stats.mostExpensive.name}"</span>{' '}
                <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>({formatCost(stats.mostExpensive.totalCostUsd, t)})</span>
              </div>
            )}
          </div>
        )}

        {/* Session list */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
          ) : groupedSessions.length === 0 ? (
            <div className={`flex flex-col items-center justify-center h-full ${'text-gray-500'}`}>
              <svg className={`w-12 h-12 mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <p className="text-sm mb-2">
                {searchQuery ? t('home.noSessionsMatch', { query: searchQuery }) : t('home.noSessions')}
              </p>
              {!searchQuery && selectedProject && (
                <button
                  onClick={handleNewSession}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {t('home.createFirst')}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {groupedSessions.map(({ label, sessions }) => (
                <div key={label}>
                  <h3 className={`text-[11px] font-medium uppercase tracking-wider mb-2 ${'text-gray-500'}`}>
                    {label}
                  </h3>
                  <div className="space-y-1">
                    {sessions.map(session => (
                      <button
                        key={session.id}
                        onClick={() => handleOpenSession(session)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group ${
                          theme === 'dark'
                            ? 'hover:bg-gray-700/50'
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-colors ${
                          theme === 'dark'
                            ? 'bg-gray-700/50 text-gray-500'
                            : 'bg-gray-200 text-gray-500'
                        }`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium truncate transition-colors ${
                            theme === 'dark'
                              ? 'text-gray-200 group-hover:text-white'
                              : 'text-gray-700 group-hover:text-gray-900'
                          }`}>
                            {session.name}
                          </div>
                          <div className={`flex items-center gap-2 text-[11px] ${'text-gray-500'}`}>
                            <span>{formatDate(session.updatedAt, locale, t)}</span>
                            {session.totalCostUsd > 0 && (
                              <>
                                <span className={theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}>·</span>
                                <span>{formatCost(session.totalCostUsd, t)}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <svg className={`w-4 h-4 transition-colors ${
                          theme === 'dark'
                            ? 'text-gray-600 group-hover:text-gray-400'
                            : 'text-gray-400 group-hover:text-gray-600'
                        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Project Dialog */}
      {showAddProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowAddProject(false)}>
          <div className={`w-full max-w-md border rounded-xl shadow-2xl overflow-hidden ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200'
          }`} onClick={e => e.stopPropagation()}>
            <div className={`px-4 py-3 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{t('home.addProject')}</h3>
            </div>
            <div className="p-4">
              <label className={`block text-xs mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{t('home.projectPath')}</label>
              <input
                type="text"
                value={newProjectPath}
                onChange={(e) => setNewProjectPath(e.target.value)}
                placeholder={t('home.projectPathPlaceholder')}
                className={`w-full px-3 py-2.5 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all ${
                  theme === 'dark'
                    ? 'bg-gray-700/50 text-white placeholder-gray-500'
                    : 'bg-gray-100 text-gray-900 placeholder-gray-400'
                }`}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleAddProject()}
              />
            </div>
            <div className={`flex items-center justify-end gap-2 px-4 py-3 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <button
                onClick={() => setShowAddProject(false)}
                className={`px-4 py-2 text-sm transition-colors ${
                  theme === 'dark'
                    ? 'text-gray-400 hover:text-white'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleAddProject}
                disabled={!newProjectPath.trim()}
                className={`px-4 py-2 text-sm text-white rounded-lg transition-colors ${
                  theme === 'dark'
                    ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500'
                    : 'bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 disabled:text-gray-500'
                }`}
              >
                {t('home.addProject')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
