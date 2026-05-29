import type { Session, Message } from '../types';
export declare class SessionStore {
    private dataDir;
    constructor();
    private ensureDataDir;
    private getSessionPath;
    createSession(name?: string, cwd?: string): Promise<Session>;
    getSession(sessionId: string): Promise<Session | null>;
    getAllSessions(): Promise<Session[]>;
    saveSession(session: Session): Promise<void>;
    addMessage(sessionId: string, message: Message): Promise<void>;
    updateSessionStats(sessionId: string, costUsd: number, tokens: number): Promise<void>;
    deleteSession(sessionId: string): Promise<boolean>;
    updateSessionName(sessionId: string, name: string): Promise<boolean>;
}
export declare const sessionStore: SessionStore;
//# sourceMappingURL=session-store.d.ts.map