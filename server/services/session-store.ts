import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import type { Session, Message } from '../types';

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

  async createSession(name?: string, cwd?: string): Promise<Session> {
    const session: Session = {
      id: uuidv4(),
      name: name || `Session ${new Date().toLocaleString()}`,
      cwd: cwd || config.defaultCwd,
      model: config.defaultModel,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
      messages: [],
      totalCostUsd: 0,
      totalTokens: 0,
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

  async getAllSessions(): Promise<Session[]> {
    try {
      const files = await fs.readdir(this.dataDir);
      const sessions: Session[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const sessionId = file.replace('.json', '');
          const session = await this.getSession(sessionId);
          if (session) {
            sessions.push(session);
          }
        }
      }

      return sessions.sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
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
      // Try direct write as fallback
      await fs.writeFile(filePath, JSON.stringify(session, null, 2));
    }
  }

  async addMessage(sessionId: string, message: Message): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;

    session.messages.push(message);

    // Limit messages to prevent huge files
    if (session.messages.length > config.maxMessages) {
      session.messages = session.messages.slice(-config.maxMessages);
    }

    await this.saveSession(session);
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

  async updateSessionName(sessionId: string, name: string): Promise<boolean> {
    const session = await this.getSession(sessionId);
    if (!session) return false;

    session.name = name;
    await this.saveSession(session);
    return true;
  }
}

export const sessionStore = new SessionStore();
