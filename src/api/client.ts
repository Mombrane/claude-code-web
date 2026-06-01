import type { Session, Message, Project, FileEntry, GitStatus, CommitInfo } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE || `${window.location.protocol}//${window.location.host}/api`;

async function checkResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

export const api = {
  // Projects
  async getProjects(): Promise<Project[]> {
    const res = await fetch(`${API_BASE}/projects`);
    return checkResponse<Project[]>(res);
  },

  async addProject(worktree: string, name?: string): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ worktree, name }),
    });
    return checkResponse<Project>(res);
  },

  async deleteProject(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/projects/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || `HTTP ${res.status}: ${res.statusText}`);
    }
  },

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return checkResponse<Project>(res);
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
    return checkResponse<Session[]>(res);
  },

  async createSession(name?: string, cwd?: string, projectPath?: string): Promise<Session> {
    const res = await fetch(`${API_BASE}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, cwd, projectPath }),
    });
    return checkResponse<Session>(res);
  },

  async getSession(id: string): Promise<Session> {
    const res = await fetch(`${API_BASE}/sessions/${id}`);
    return checkResponse<Session>(res);
  },

  async getSessionMessages(id: string): Promise<Message[]> {
    const res = await fetch(`${API_BASE}/sessions/${id}/messages`);
    return checkResponse<Message[]>(res);
  },

  async getTranscript(id: string): Promise<string> {
    const res = await fetch(`${API_BASE}/sessions/${id}/transcript`);
    if (!res.ok) throw new Error('Failed to fetch transcript');
    return res.text();
  },

  async updateSession(id: string, updates: Partial<Session>): Promise<Session> {
    const res = await fetch(`${API_BASE}/sessions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return checkResponse<Session>(res);
  },

  async togglePin(sessionId: string, pinned: boolean): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/pin`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned }),
    });
    return checkResponse<{ success: boolean }>(res);
  },

  async deleteSession(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/sessions/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || `HTTP ${res.status}: ${res.statusText}`);
    }
  },

  async duplicateSession(id: string): Promise<Session> {
    const res = await fetch(`${API_BASE}/sessions/${id}/duplicate`, {
      method: 'POST',
    });
    return checkResponse<Session>(res);
  },

  async updateSessionTags(id: string, tags: string[]): Promise<Session> {
    const res = await fetch(`${API_BASE}/sessions/${id}/tags`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags }),
    });
    return checkResponse<Session>(res);
  },

  async getAllTags(): Promise<string[]> {
    const res = await fetch(`${API_BASE}/sessions/tags`);
    return checkResponse<string[]>(res);
  },

  async batchDeleteSessions(sessionIds: string[]): Promise<{ deleted: number; failed: string[] }> {
    const res = await fetch(`${API_BASE}/sessions/batch-delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionIds }),
    });
    return checkResponse<{ deleted: number; failed: string[] }>(res);
  },

  // Files
  async listDirectory(path: string): Promise<FileEntry[]> {
    const res = await fetch(`${API_BASE}/files/tree?path=${encodeURIComponent(path)}`);
    return checkResponse<FileEntry[]>(res);
  },

  async readFile(path: string, start?: number, count?: number): Promise<{ content: string; language: string; totalLines: number }> {
    let url = `${API_BASE}/files/content?path=${encodeURIComponent(path)}`;
    if (start) url += `&start=${start}`;
    if (count) url += `&count=${count}`;
    const res = await fetch(url);
    return checkResponse<{ content: string; language: string; totalLines: number }>(res);
  },

  async writeFile(path: string, content: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/files/content`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content }),
    });
    return checkResponse<{ success: boolean }>(res);
  },

  async searchFiles(query: string, path: string): Promise<FileEntry[]> {
    const res = await fetch(`${API_BASE}/files/search?q=${encodeURIComponent(query)}&path=${encodeURIComponent(path)}`);
    return checkResponse<FileEntry[]>(res);
  },

  // Git
  async getGitStatus(cwd: string): Promise<GitStatus> {
    const res = await fetch(`${API_BASE}/git/status?cwd=${encodeURIComponent(cwd)}`);
    return checkResponse<GitStatus>(res);
  },

  async getGitDiff(cwd: string, staged: boolean = false): Promise<{ diff: string }> {
    const res = await fetch(`${API_BASE}/git/diff?cwd=${encodeURIComponent(cwd)}&staged=${staged}`);
    return checkResponse<{ diff: string }>(res);
  },

  async getBranchDiff(cwd: string, baseBranch?: string): Promise<{ diff: string }> {
    let url = `${API_BASE}/git/diff/branch?cwd=${encodeURIComponent(cwd)}`;
    if (baseBranch) url += `&base=${encodeURIComponent(baseBranch)}`;
    const res = await fetch(url);
    return checkResponse<{ diff: string }>(res);
  },

  async getFileDiff(cwd: string, filePath: string): Promise<{ diff: string }> {
    const res = await fetch(`${API_BASE}/git/diff/file?cwd=${encodeURIComponent(cwd)}&path=${encodeURIComponent(filePath)}`);
    return checkResponse<{ diff: string }>(res);
  },

  async getDiffStat(cwd: string): Promise<{ additions: number; deletions: number; files: number }> {
    const res = await fetch(`${API_BASE}/git/diff/stat?cwd=${encodeURIComponent(cwd)}`);
    return checkResponse<{ additions: number; deletions: number; files: number }>(res);
  },

  async getGitLog(cwd: string, count: number = 20): Promise<CommitInfo[]> {
    const res = await fetch(`${API_BASE}/git/log?cwd=${encodeURIComponent(cwd)}&count=${count}`);
    return checkResponse<CommitInfo[]>(res);
  },

  async gitStage(cwd: string, files: string[]): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/git/stage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd, files }),
    });
    return checkResponse<{ success: boolean }>(res);
  },

  async gitCommit(cwd: string, message: string): Promise<{ success: boolean; hash: string }> {
    const res = await fetch(`${API_BASE}/git/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd, message }),
    });
    return checkResponse<{ success: boolean; hash: string }>(res);
  },
};
