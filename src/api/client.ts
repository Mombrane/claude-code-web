import type { Session, Message, Project } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE || `${window.location.protocol}//${window.location.host}/api`;

export const api = {
  // Projects
  async getProjects(): Promise<Project[]> {
    const res = await fetch(`${API_BASE}/projects`);
    return res.json();
  },

  async addProject(worktree: string, name?: string): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ worktree, name }),
    });
    return res.json();
  },

  async deleteProject(id: string): Promise<void> {
    await fetch(`${API_BASE}/projects/${id}`, { method: 'DELETE' });
  },

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return res.json();
  },

  // Sessions
  async getSessions(options?: {
    projectPath?: string;
    search?: string;
    searchContent?: boolean;
    tag?: string;
    limit?: number;
    offset?: number;
  }): Promise<Session[]> {
    const params = new URLSearchParams();
    if (options?.projectPath) params.set('projectPath', options.projectPath);
    if (options?.search) params.set('search', options.search);
    if (options?.searchContent) params.set('searchContent', 'true');
    if (options?.tag) params.set('tag', options.tag);
    if (options?.limit) params.set('limit', options.limit.toString());
    if (options?.offset) params.set('offset', options.offset.toString());
    const query = params.toString();
    const res = await fetch(`${API_BASE}/sessions${query ? '?' + query : ''}`);
    return res.json();
  },

  async createSession(name?: string, cwd?: string, projectPath?: string): Promise<Session> {
    const res = await fetch(`${API_BASE}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, cwd, projectPath }),
    });
    return res.json();
  },

  async getSession(id: string): Promise<Session> {
    const res = await fetch(`${API_BASE}/sessions/${id}`);
    return res.json();
  },

  async getSessionMessages(id: string): Promise<Message[]> {
    const res = await fetch(`${API_BASE}/sessions/${id}/messages`);
    return res.json();
  },

  async updateSession(id: string, updates: Partial<Session>): Promise<Session> {
    const res = await fetch(`${API_BASE}/sessions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return res.json();
  },

  async togglePin(sessionId: string, pinned: boolean): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/pin`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned }),
    });
    return res.json();
  },

  async deleteSession(id: string): Promise<void> {
    await fetch(`${API_BASE}/sessions/${id}`, { method: 'DELETE' });
  },

  async updateSessionTags(id: string, tags: string[]): Promise<Session> {
    const res = await fetch(`${API_BASE}/sessions/${id}/tags`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags }),
    });
    return res.json();
  },

  async getAllTags(): Promise<string[]> {
    const res = await fetch(`${API_BASE}/sessions/tags`);
    return res.json();
  },

  // Files
  async listDirectory(path: string) {
    const res = await fetch(`${API_BASE}/files/tree?path=${encodeURIComponent(path)}`);
    return res.json();
  },

  async readFile(path: string, start?: number, count?: number) {
    let url = `${API_BASE}/files/content?path=${encodeURIComponent(path)}`;
    if (start) url += `&start=${start}`;
    if (count) url += `&count=${count}`;
    const res = await fetch(url);
    return res.json();
  },

  async writeFile(path: string, content: string) {
    const res = await fetch(`${API_BASE}/files/content`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content }),
    });
    return res.json();
  },

  async searchFiles(query: string, path: string) {
    const res = await fetch(`${API_BASE}/files/search?q=${encodeURIComponent(query)}&path=${encodeURIComponent(path)}`);
    return res.json();
  },

  // Git
  async getGitStatus(cwd: string) {
    const res = await fetch(`${API_BASE}/git/status?cwd=${encodeURIComponent(cwd)}`);
    return res.json();
  },

  async getGitDiff(cwd: string, staged: boolean = false) {
    const res = await fetch(`${API_BASE}/git/diff?cwd=${encodeURIComponent(cwd)}&staged=${staged}`);
    return res.json();
  },

  async getBranchDiff(cwd: string, baseBranch?: string) {
    let url = `${API_BASE}/git/diff/branch?cwd=${encodeURIComponent(cwd)}`;
    if (baseBranch) url += `&base=${encodeURIComponent(baseBranch)}`;
    const res = await fetch(url);
    return res.json();
  },

  async getFileDiff(cwd: string, filePath: string) {
    const res = await fetch(`${API_BASE}/git/diff/file?cwd=${encodeURIComponent(cwd)}&path=${encodeURIComponent(filePath)}`);
    return res.json();
  },

  async getDiffStat(cwd: string) {
    const res = await fetch(`${API_BASE}/git/diff/stat?cwd=${encodeURIComponent(cwd)}`);
    return res.json();
  },

  async getGitLog(cwd: string, count: number = 20) {
    const res = await fetch(`${API_BASE}/git/log?cwd=${encodeURIComponent(cwd)}&count=${count}`);
    return res.json();
  },

  async gitStage(cwd: string, files: string[]) {
    const res = await fetch(`${API_BASE}/git/stage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd, files }),
    });
    return res.json();
  },

  async gitCommit(cwd: string, message: string) {
    const res = await fetch(`${API_BASE}/git/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd, message }),
    });
    return res.json();
  },
};
