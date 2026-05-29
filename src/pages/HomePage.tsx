import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useSessionStore } from '../stores/sessionStore';
import type { Project, Session } from '../types';

function groupSessionsByTime(sessions: Session[]): { label: string; sessions: Session[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);

  const groups: Record<string, Session[]> = {
    'Today': [],
    'Yesterday': [],
    'Older': [],
  };

  for (const session of sessions) {
    const updated = new Date(session.updatedAt);
    if (updated >= today) {
      groups['Today'].push(session);
    } else if (updated >= yesterday) {
      groups['Yesterday'].push(session);
    } else {
      groups['Older'].push(session);
    }
  }

  return Object.entries(groups)
    .filter(([, sessions]) => sessions.length > 0)
    .map(([label, sessions]) => ({ label, sessions }));
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatCost(cost: number): string {
  if (cost < 0.01) return '<$0.01';
  return `$${cost.toFixed(2)}`;
}

function formatTokens(tokens: number): string {
  if (tokens < 1000) return `${tokens} tokens`;
  if (tokens < 1000000) return `${(tokens / 1000).toFixed(1)}k tokens`;
  return `${(tokens / 1000000).toFixed(1)}M tokens`;
}

export function HomePage() {
  const navigate = useNavigate();
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
    if (!confirm('Remove this project from the list?')) return;
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
    groupSessionsByTime(filteredSessions),
    [filteredSessions]
  );

  const selectedProjectData = projects.find(p => p.worktree === selectedProject);

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Left sidebar - Projects */}
      <div className="w-70 border-r border-gray-700/50 flex flex-col bg-gray-800/50">
        {/* Logo */}
        <div className="p-4 border-b border-gray-700/50">
          <div className="flex items-center gap-2">
            <span className="text-xl"> </span>
            <h1 className="text-sm font-semibold text-gradient">Claude Code Web</h1>
          </div>
        </div>

        {/* Project list */}
        <div className="flex-1 overflow-y-auto py-2">
          <div className="px-3 py-1.5 text-[10px] font-medium text-gray-500 uppercase tracking-wider">
            Projects
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
                  ? 'bg-gray-700/80 text-white'
                  : 'text-gray-400 hover:bg-gray-700/40 hover:text-white'
              }`}
            >
              <div className={`w-7 h-7 rounded-md flex items-center justify-center text-sm ${
                selectedProject === project.worktree
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-gray-700/50 text-gray-500'
              }`}>
                {project.icon?.override || ' '}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{project.name}</div>
                <div className="text-[11px] text-gray-500 truncate">{project.worktree}</div>
              </div>
              <button
                onClick={(e) => handleDeleteProject(project.id, e)}
                className="p-1 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all"
                title="Remove project"
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
            className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-500 hover:text-white hover:bg-gray-700/40 transition-all duration-200"
          >
            <div className="w-7 h-7 rounded-md flex items-center justify-center bg-gray-700/30">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className="text-sm">Add Project</span>
          </button>
        </div>
      </div>

      {/* Right panel - Sessions */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700/50 bg-gray-800/30">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-semibold">
                {selectedProjectData?.name || 'Select a project'}
              </h2>
              {selectedProjectData && (
                <p className="text-xs text-gray-500 mt-0.5">{selectedProjectData.worktree}</p>
              )}
            </div>
            <button
              onClick={handleNewSession}
              disabled={!selectedProject}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Session
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sessions..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-700/50 text-sm text-white placeholder-gray-500 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:bg-gray-700/70 transition-all"
            />
          </div>
        </div>

        {/* Statistics */}
        {!isLoading && sessions.length > 0 && (
          <div className="px-6 py-4 border-b border-gray-700/50">
            <h3 className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-3">Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-gray-800/60 rounded-lg px-4 py-3">
                <div className="text-[11px] text-gray-500 mb-1">Sessions</div>
                <div className="text-lg font-semibold text-white">{stats.totalSessions}</div>
              </div>
              <div className="bg-gray-800/60 rounded-lg px-4 py-3">
                <div className="text-[11px] text-gray-500 mb-1">Total Cost</div>
                <div className="text-lg font-semibold text-white">{formatCost(stats.totalCost)}</div>
              </div>
              <div className="bg-gray-800/60 rounded-lg px-4 py-3">
                <div className="text-[11px] text-gray-500 mb-1">Total Tokens</div>
                <div className="text-lg font-semibold text-white">{formatTokens(stats.totalTokens)}</div>
              </div>
              <div className="bg-gray-800/60 rounded-lg px-4 py-3">
                <div className="text-[11px] text-gray-500 mb-1">Avg Cost</div>
                <div className="text-lg font-semibold text-white">{formatCost(stats.avgCost)}</div>
              </div>
            </div>
            {stats.mostExpensive && (stats.mostExpensive.totalCostUsd ?? 0) > 0 && (
              <div className="mt-2 text-[11px] text-gray-500">
                Most expensive: <span className="text-gray-300">"{stats.mostExpensive.name}"</span>{' '}
                <span className="text-gray-400">({formatCost(stats.mostExpensive.totalCostUsd)})</span>
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
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <svg className="w-12 h-12 mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <p className="text-sm mb-2">
                {searchQuery ? `No sessions matching "${searchQuery}"` : 'No sessions yet'}
              </p>
              {!searchQuery && selectedProject && (
                <button
                  onClick={handleNewSession}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Create your first session
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {groupedSessions.map(({ label, sessions }) => (
                <div key={label}>
                  <h3 className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">
                    {label}
                  </h3>
                  <div className="space-y-1">
                    {sessions.map(session => (
                      <button
                        key={session.id}
                        onClick={() => handleOpenSession(session)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-gray-700/50 transition-all group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-gray-700/50 flex items-center justify-center text-gray-500 group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-200 truncate group-hover:text-white transition-colors">
                            {session.name}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-gray-500">
                            <span>{formatDate(session.updatedAt)}</span>
                            {session.totalCostUsd > 0 && (
                              <>
                                <span className="text-gray-600">·</span>
                                <span>{formatCost(session.totalCostUsd)}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <div className="w-full max-w-md bg-gray-800 border border-gray-700 rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-gray-700">
              <h3 className="text-sm font-semibold text-white">Add Project</h3>
            </div>
            <div className="p-4">
              <label className="block text-xs text-gray-400 mb-2">Project Directory Path</label>
              <input
                type="text"
                value={newProjectPath}
                onChange={(e) => setNewProjectPath(e.target.value)}
                placeholder="/home/user/my-project"
                className="w-full px-3 py-2.5 bg-gray-700/50 text-sm text-white placeholder-gray-500 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleAddProject()}
              />
            </div>
            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-700">
              <button
                onClick={() => setShowAddProject(false)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddProject}
                disabled={!newProjectPath.trim()}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors"
              >
                Add Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
