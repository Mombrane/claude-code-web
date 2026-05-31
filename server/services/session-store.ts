import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import type { Session } from '../types';

/**
 * Session metadata store.
 * Only stores session metadata (name, cwd, model, status, costs).
 * Message history is read from Claude Code's native .jsonl transcripts.
 */
export class SessionStore {
  private dataDir: string;

  constructor() {
    this.dataDir = config.dataDir;
    this.ensureDataDir();
  }

  private async ensureDataDir() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
    } catch (e) {
      console.error('Failed to create data directory:', e);
    }
  }

  private getSessionPath(sessionId: string): string {
    return path.join(this.dataDir, `${sessionId}.json`);
  }

  async createSession(name?: string, cwd?: string, projectPath?: string): Promise<Session> {
    const session: Session = {
      id: uuidv4(),
      name: name || `Session ${new Date().toLocaleString()}`,
      cwd: cwd || config.defaultCwd,
      projectPath: projectPath || cwd || config.defaultCwd,
      model: config.defaultModel,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
      totalCostUsd: 0,
      totalTokens: 0,
      pinned: false,
    };

    await this.saveSession(session);
    return session;
  }

  async getSession(sessionId: string): Promise<Session | null> {
    try {
      const data = await fs.readFile(this.getSessionPath(sessionId), 'utf-8');
      return JSON.parse(data);
    } catch (e) {
      return null;
    }
  }

  async getAllSessions(options?: {
    projectPath?: string;
    search?: string;
    tag?: string;
    limit?: number;
    offset?: number;
  }): Promise<Session[]> {
    try {
      const files = await fs.readdir(this.dataDir);
      let sessions: Session[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const sessionId = file.replace('.json', '');
          const session = await this.getSession(sessionId);
          if (session) {
            sessions.push(session);
          }
        }
      }

      // Filter by project path
      if (options?.projectPath) {
        sessions = sessions.filter(s =>
          s.projectPath === options.projectPath || s.cwd === options.projectPath
        );
      }

      // Filter by search query (name only, since messages are no longer stored here)
      if (options?.search) {
        const query = options.search.toLowerCase();
        sessions = sessions.filter(s =>
          s.name.toLowerCase().includes(query)
        );
      }

      // Filter by tag
      if (options?.tag) {
        sessions = sessions.filter(s =>
          s.tags && s.tags.includes(options.tag!)
        );
      }

      // Sort: pinned sessions first, then by updated time
      sessions.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });

      // Apply pagination
      if (options?.offset) {
        sessions = sessions.slice(options.offset);
      }
      if (options?.limit) {
        sessions = sessions.slice(0, options.limit);
      }

      return sessions;
    } catch (e) {
      return [];
    }
  }

  async saveSession(session: Session): Promise<void> {
    const filePath = this.getSessionPath(session.id);
    const tempPath = filePath + '.tmp';

    session.updatedAt = new Date().toISOString();

    try {
      await fs.writeFile(tempPath, JSON.stringify(session, null, 2));
      await fs.rename(tempPath, filePath);
    } catch (e) {
      console.error('Failed to save session:', e);
      await fs.writeFile(filePath, JSON.stringify(session, null, 2));
    }
  }

  async updateSessionStats(sessionId: string, costUsd: number, tokens: number): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;

    session.totalCostUsd += costUsd;
    session.totalTokens += tokens;
    await this.saveSession(session);
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      await fs.unlink(this.getSessionPath(sessionId));
      return true;
    } catch (e) {
      return false;
    }
  }

  async updateSession(sessionId: string, updates: Partial<Pick<Session, 'name' | 'cwd' | 'model' | 'status' | 'lastUserMessage' | 'pinned' | 'tags'>>): Promise<boolean> {
    const session = await this.getSession(sessionId);
    if (!session) return false;

    Object.assign(session, updates);
    await this.saveSession(session);
    return true;
  }

  async updateSessionName(sessionId: string, name: string): Promise<boolean> {
    const session = await this.getSession(sessionId);
    if (!session) return false;

    session.name = name;
    await this.saveSession(session);
    return true;
  }

  async updateSessionTags(sessionId: string, tags: string[]): Promise<boolean> {
    const session = await this.getSession(sessionId);
    if (!session) return false;

    session.tags = tags;
    await this.saveSession(session);
    return true;
  }

  async getAllTags(): Promise<string[]> {
    const sessions = await this.getAllSessions();
    const tagSet = new Set<string>();
    for (const session of sessions) {
      if (session.tags) {
        for (const tag of session.tags) {
          tagSet.add(tag);
        }
      }
    }
    return Array.from(tagSet).sort();
  }

  async resetActiveSessions(): Promise<void> {
    try {
      const sessions = await this.getAllSessions();
      let count = 0;
      for (const session of sessions) {
        if (session.status === 'active') {
          session.status = 'idle';
          // Write directly to file without updating updatedAt
          const filePath = this.getSessionPath(session.id);
          const tempPath = filePath + '.tmp';
          try {
            await fs.writeFile(tempPath, JSON.stringify(session, null, 2));
            await fs.rename(tempPath, filePath);
          } catch (e) {
            await fs.writeFile(filePath, JSON.stringify(session, null, 2));
          }
          count++;
        }
      }
      console.log(`Reset ${count} stale active sessions to idle`);
    } catch (e) {
      console.error('Failed to reset active sessions:', e);
    }
  }
}

export const sessionStore = new SessionStore();

