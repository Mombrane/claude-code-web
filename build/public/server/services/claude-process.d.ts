import { EventEmitter } from 'events';
import type { ClaudeSession, SpawnOptions } from '../types';
export declare class ClaudeProcessManager extends EventEmitter {
    private sessions;
    private outputBuffers;
    constructor();
    private startSessionCleanup;
    spawnSession(options?: SpawnOptions): Promise<ClaudeSession>;
    private setupProcessHandlers;
    private handleClaudeEvent;
    sendMessage(sessionId: string, prompt: string): boolean;
    closeSession(sessionId: string): void;
    getSession(sessionId: string): ClaudeSession | undefined;
    getActiveSessions(): ClaudeSession[];
    isSessionActive(sessionId: string): boolean;
}
export declare const claudeProcessManager: ClaudeProcessManager;
//# sourceMappingURL=claude-process.d.ts.map