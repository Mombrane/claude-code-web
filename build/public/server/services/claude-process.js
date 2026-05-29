import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import readline from 'readline';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
export class ClaudeProcessManager extends EventEmitter {
    constructor() {
        super();
        this.sessions = new Map();
        this.outputBuffers = new Map();
        this.startSessionCleanup();
    }
    startSessionCleanup() {
        setInterval(() => {
            const now = Date.now();
            for (const [id, session] of this.sessions) {
                const lastActivity = new Date(session.lastActivity).getTime();
                if (now - lastActivity > config.sessionTimeout) {
                    console.log(`Session ${id} timed out, closing...`);
                    this.closeSession(id);
                }
            }
        }, 60000); // Check every minute
    }
    async spawnSession(options = {}) {
        const sessionId = options.sessionId || uuidv4();
        const cwd = options.cwd || config.defaultCwd;
        const model = options.model || config.defaultModel;
        const args = [
            '-p', '--verbose',
            '--output-format', 'stream-json',
            '--input-format', 'stream-json',
            '--session-id', sessionId,
            '--permission-mode', options.permissionMode || 'auto',
            '--model', model,
            '--cwd', cwd,
        ];
        if (options.allowedTools) {
            args.push('--allowedTools', options.allowedTools.join(','));
        }
        console.log(`Spawning Claude session ${sessionId} with args:`, args);
        const proc = spawn(config.claudePath, args, {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env },
        });
        const session = {
            sessionId,
            process: proc,
            status: 'active',
            lastActivity: new Date().toISOString(),
        };
        this.sessions.set(sessionId, session);
        this.outputBuffers.set(sessionId, '');
        this.setupProcessHandlers(sessionId, proc);
        return session;
    }
    setupProcessHandlers(sessionId, proc) {
        const rl = readline.createInterface({ input: proc.stdout });
        rl.on('line', (line) => {
            try {
                const event = JSON.parse(line);
                this.handleClaudeEvent(sessionId, event);
            }
            catch (e) {
                // Non-JSON output, might be debug info
                console.log(`[${sessionId}] stdout:`, line);
            }
        });
        proc.stderr?.on('data', (data) => {
            console.error(`[${sessionId}] stderr:`, data.toString());
        });
        proc.on('close', (code) => {
            console.log(`[${sessionId}] process closed with code ${code}`);
            const session = this.sessions.get(sessionId);
            if (session) {
                session.status = 'closed';
                this.emit('session:closed', sessionId, code);
            }
        });
        proc.on('error', (error) => {
            console.error(`[${sessionId}] process error:`, error);
            this.emit('error', sessionId, error);
        });
    }
    handleClaudeEvent(sessionId, event) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.lastActivity = new Date().toISOString();
        }
        switch (event.type) {
            case 'system':
                this.emit('system:init', sessionId, event);
                break;
            case 'assistant':
                if (event.message?.content) {
                    for (const block of event.message.content) {
                        if (block.type === 'text') {
                            this.emit('assistant:text', sessionId, {
                                text: block.text,
                                sessionId,
                            });
                        }
                        else if (block.type === 'tool_use') {
                            this.emit('assistant:tool_use', sessionId, {
                                toolName: block.name,
                                toolUseId: block.id,
                                input: block.input,
                                sessionId,
                            });
                        }
                        else if (block.type === 'thinking') {
                            this.emit('assistant:thinking', sessionId, {
                                text: block.text,
                                sessionId,
                            });
                        }
                    }
                }
                break;
            case 'user':
                if (event.content_block) {
                    this.emit('user:tool_result', sessionId, {
                        toolUseId: event.content_block.id,
                        output: event.content_block.text || '',
                        isError: false,
                        sessionId,
                    });
                }
                break;
            case 'result':
                this.emit('result:complete', sessionId, {
                    result: event.message?.content?.[0]?.text || '',
                    costUsd: event.result?.cost_usd || 0,
                    usage: event.result?.usage || { input_tokens: 0, output_tokens: 0 },
                    sessionId,
                });
                break;
            default:
                console.log(`[${sessionId}] Unknown event type:`, event.type);
        }
    }
    sendMessage(sessionId, prompt) {
        const session = this.sessions.get(sessionId);
        if (!session || session.status === 'closed') {
            return false;
        }
        const message = JSON.stringify({
            type: 'user_message',
            content: prompt,
        }) + '\n';
        session.process.stdin.write(message);
        session.lastActivity = new Date().toISOString();
        return true;
    }
    closeSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.process.kill();
            session.status = 'closed';
            this.sessions.delete(sessionId);
            this.outputBuffers.delete(sessionId);
        }
    }
    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }
    getActiveSessions() {
        return Array.from(this.sessions.values()).filter(s => s.status === 'active');
    }
    isSessionActive(sessionId) {
        const session = this.sessions.get(sessionId);
        return session?.status === 'active';
    }
}
export const claudeProcessManager = new ClaudeProcessManager();
//# sourceMappingURL=claude-process.js.map