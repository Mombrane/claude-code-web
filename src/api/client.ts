import type { Session } from '../types';

const API_BASE = 'http://localhost:3001/api';

export const api = {
  // Sessions
  async getSessions(): Promise<Session[]> {
    const res = await fetch(`${API_BASE}/sessions`);
    return res.json();
  },

  async createSession(name?: string, cwd?: string): Promise<Session> {
    const res = await fetch(`${API_BASE}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, cwd }),
    });
    return res.json();
  },

  async getSession(id: string): Promise<Session> {
    const res = await fetch(`${API_BASE}/sessions/${id}`);
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

  async deleteSession(id: string): Promise<void> {
    await fetch(`${API_BASE}/sessions/${id}`, { method: 'DELETE' });
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
