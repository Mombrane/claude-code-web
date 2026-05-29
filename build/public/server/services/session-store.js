import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
export class SessionStore {
    constructor() {
        this.dataDir = config.dataDir;
        this.ensureDataDir();
    }
    async ensureDataDir() {
        try {
            await fs.mkdir(this.dataDir, { recursive: true });
        }
        catch (e) {
            console.error('Failed to create data directory:', e);
        }
    }
    getSessionPath(sessionId) {
        return path.join(this.dataDir, `${sessionId}.json`);
    }
    async createSession(name, cwd) {
        const session = {
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
    async getSession(sessionId) {
        try {
            const data = await fs.readFile(this.getSessionPath(sessionId), 'utf-8');
            return JSON.parse(data);
        }
        catch (e) {
            return null;
        }
    }
    async getAllSessions() {
        try {
            const files = await fs.readdir(this.dataDir);
            const sessions = [];
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const sessionId = file.replace('.json', '');
                    const session = await this.getSession(sessionId);
                    if (session) {
                        sessions.push(session);
                    }
                }
            }
            return sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        }
        catch (e) {
            return [];
        }
    }
    async saveSession(session) {
        const filePath = this.getSessionPath(session.id);
        const tempPath = filePath + '.tmp';
        session.updatedAt = new Date().toISOString();
        try {
            await fs.writeFile(tempPath, JSON.stringify(session, null, 2));
            await fs.rename(tempPath, filePath);
        }
        catch (e) {
            console.error('Failed to save session:', e);
            // Try direct write as fallback
            await fs.writeFile(filePath, JSON.stringify(session, null, 2));
        }
    }
    async addMessage(sessionId, message) {
        const session = await this.getSession(sessionId);
        if (!session)
            return;
        session.messages.push(message);
        // Limit messages to prevent huge files
        if (session.messages.length > config.maxMessages) {
            session.messages = session.messages.slice(-config.maxMessages);
        }
        await this.saveSession(session);
    }
    async updateSessionStats(sessionId, costUsd, tokens) {
        const session = await this.getSession(sessionId);
        if (!session)
            return;
        session.totalCostUsd += costUsd;
        session.totalTokens += tokens;
        await this.saveSession(session);
    }
    async deleteSession(sessionId) {
        try {
            await fs.unlink(this.getSessionPath(sessionId));
            return true;
        }
        catch (e) {
            return false;
        }
    }
    async updateSessionName(sessionId, name) {
        const session = await this.getSession(sessionId);
        if (!session)
            return false;
        session.name = name;
        await this.saveSession(session);
        return true;
    }
}
export const sessionStore = new SessionStore();
//# sourceMappingURL=session-store.js.map