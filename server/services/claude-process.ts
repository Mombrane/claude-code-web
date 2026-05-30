import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import readline from 'readline';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import type { ClaudeSession, SpawnOptions, StreamEvent } from '../types';
import { sessionStore } from './session-store';

export class ClaudeProcessManager extends EventEmitter {
  private sessions: Map<string, ClaudeSession> = new Map();
  private activeProcesses: Map<string, ChildProcess> = new Map();
  private processTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();
  // Track toolUseId -> toolName so tool_result events can include the tool name
  private pendingToolNames: Map<string, string> = new Map();
  // Reverse map: sessionId -> Set<toolUseId> for cleanup on session close
  private sessionToolUseIds: Map<string, Set<string>> = new Map();

  constructor() {
    super();
  }

  async spawnSession(options: SpawnOptions = {}): Promise<ClaudeSession> {
    const sessionId = options.sessionId || uuidv4();
    const cwd = options.cwd || config.defaultCwd;
    const model = options.model || config.defaultModel;

    const session: ClaudeSession = {
      sessionId,
      process: null,
      status: 'active',
      lastActivity: new Date().toISOString(),
      cwd,
      model,
      permissionMode: options.permissionMode || 'auto',
      allowedTools: options.allowedTools,
    };

    this.sessions.set(sessionId, session);
    // Persist active status to disk
    sessionStore.updateSession(sessionId, { status: 'active' }).catch(err => {
      console.error(`Failed to persist session active status:`, err);
    });
    return session;
  }

  async sendMessage(sessionId: string, prompt: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session || session.status === 'closed') {
      return false;
    }

    // Check if there's an active process for this session
    const existingProc = this.activeProcesses.get(sessionId);
    if (existingProc && !existingProc.killed) {
      // Kill existing process before starting new one
      await this.killProcess(sessionId);
    }

    const args = [
      '-p', '--verbose',
      '--output-format', 'stream-json',
      '--session-id', sessionId,
      '--continue',
      '--fork-session',
      '--permission-mode', session.permissionMode || 'auto',
    ];

    const model = session.model || config.defaultModel;
    if (model) {
      args.push('--model', model);
    }

    if (session.allowedTools) {
      args.push('--allowedTools', session.allowedTools.join(','));
    }

    // Add the prompt as the last argument
    args.push(prompt);


    const proc = spawn(config.claudePath, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: session.cwd || config.defaultCwd,
      env: { ...process.env },
    });

    this.activeProcesses.set(sessionId, proc);
    session.lastActivity = new Date().toISOString();

    const timeout = setTimeout(async () => {
      if (this.activeProcesses.has(sessionId)) {
        console.error(`[${sessionId}] Process timeout after 5 minutes`);
        await this.killProcess(sessionId);
        this.emit('process:closed', sessionId, -1);
      }
    }, 5 * 60 * 1000);
    this.processTimeouts.set(sessionId, timeout);

    this.setupProcessHandlers(sessionId, proc);

    return true;
  }

  private killProcess(sessionId: string): Promise<void> {
    return new Promise((resolve) => {
      const proc = this.activeProcesses.get(sessionId);
      if (!proc || proc.killed) {
        resolve();
        return;
      }
      const onClose = () => {
        this.activeProcesses.delete(sessionId);
        resolve();
      };
      proc.once('close', onClose);
      proc.kill();
      // Safety timeout — don't wait forever
      setTimeout(() => {
        proc.removeListener('close', onClose);
        this.activeProcesses.delete(sessionId);
        resolve();
      }, 3000);
    });
  }

  private setupProcessHandlers(sessionId: string, proc: ChildProcess) {
    const rl = readline.createInterface({ input: proc.stdout! });

    rl.on('line', (line) => {
      try {
        const event: StreamEvent = JSON.parse(line);
        this.handleClaudeEvent(sessionId, event);
      } catch (e) {
        // Non-JSON output, might be debug info
        if (process.env.DEBUG) console.log(`[${sessionId}] stdout:`, line);
      }
    });

    proc.stderr?.on('data', (data) => {
      console.error(`[${sessionId}] stderr:`, data.toString());
    });

    proc.on('close', (code) => {
      this.activeProcesses.delete(sessionId);
      const t = this.processTimeouts.get(sessionId);
      if (t) {
        clearTimeout(t);
        this.processTimeouts.delete(sessionId);
      }
      // Clean up pendingToolNames entries for this session to prevent leaks
      const toolUseIds = this.sessionToolUseIds.get(sessionId);
      if (toolUseIds) {
        for (const toolUseId of toolUseIds) {
          this.pendingToolNames.delete(toolUseId);
        }
        this.sessionToolUseIds.delete(sessionId);
      }
      this.emit('process:closed', sessionId, code);
    });

    proc.on('error', (error) => {
      console.error(`[${sessionId}] process error:`, error);
      this.activeProcesses.delete(sessionId);
      const t = this.processTimeouts.get(sessionId);
      if (t) {
        clearTimeout(t);
        this.processTimeouts.delete(sessionId);
      }
      this.emit('error', sessionId, error);
    });
  }

  private handleClaudeEvent(sessionId: string, event: StreamEvent) {
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
            } else if (block.type === 'tool_use') {
              // Cache toolUseId -> toolName for matching tool_result later
              if (block.id && block.name) {
                this.pendingToolNames.set(block.id, block.name);
                // Track toolUseId -> sessionId mapping for cleanup
                if (!this.sessionToolUseIds.has(sessionId)) {
                  this.sessionToolUseIds.set(sessionId, new Set());
                }
                this.sessionToolUseIds.get(sessionId)!.add(block.id);
              }
              this.emit('assistant:tool_use', sessionId, {
                toolName: block.name,
                toolUseId: block.id,
                input: block.input,
                sessionId,
              });
            } else if (block.type === 'thinking') {
              this.emit('assistant:thinking', sessionId, {
                text: block.text,
                sessionId,
              });
            }
          }
        }
        break;

      case 'result':
        this.emit('result:complete', sessionId, {
          result: event.result || '',
          costUsd: event.total_cost_usd || 0,
          usage: event.usage || { input_tokens: 0, output_tokens: 0 },
          sessionId,
        });
        break;

      case 'user':
        if (event.message?.content) {
          for (const block of event.message.content) {
            if (block.type === 'tool_result') {
              // Extract content: may be string or array of content blocks
              let output = '';
              if (typeof block.content === 'string') {
                output = block.content;
              } else if (Array.isArray(block.content)) {
                output = block.content
                  .map((c: any) => c.text || '')
                  .filter(Boolean)
                  .join('\n');
              }

              const toolName = this.pendingToolNames.get(block.tool_use_id) || 'unknown';
              // Clean up the cached entry
              this.pendingToolNames.delete(block.tool_use_id);

              this.emit('user:tool_result', sessionId, {
                toolUseId: block.tool_use_id,
                toolName,
                output,
                isError: block.is_error || false,
                sessionId,
              });
            }
          }
        }
        break;

      default:
        // Ignore unknown event types
        break;
    }
}

  async stopProcess(sessionId: string): Promise<void> {
    await this.killProcess(sessionId);
    const t = this.processTimeouts.get(sessionId);
    if (t) {
      clearTimeout(t);
      this.processTimeouts.delete(sessionId);
    }
    // Don't delete from this.sessions — keep session alive
    // Persist idle status to disk
    sessionStore.updateSession(sessionId, { status: 'idle' }).catch(err => {
      console.error(`Failed to persist session idle status:`, err);
    });
  }

  async closeSession(sessionId: string): Promise<void> {
    await this.killProcess(sessionId);
    const t = this.processTimeouts.get(sessionId);
    if (t) {
      clearTimeout(t);
      this.processTimeouts.delete(sessionId);
    }
    // Clean up pendingToolNames entries for this session
    const toolUseIds = this.sessionToolUseIds.get(sessionId);
    if (toolUseIds) {
      for (const toolUseId of toolUseIds) {
        this.pendingToolNames.delete(toolUseId);
      }
      this.sessionToolUseIds.delete(sessionId);
    }
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'closed';
      // Persist closed status to disk
      sessionStore.updateSession(sessionId, { status: 'closed' }).catch(err => {
        console.error(`Failed to persist session closed status:`, err);
      });
      this.sessions.delete(sessionId);
    }
  }

  getSession(sessionId: string): ClaudeSession | undefined {
    return this.sessions.get(sessionId);
  }

  getActiveSessions(): ClaudeSession[] {
    return Array.from(this.sessions.values()).filter(s => s.status === 'active');
  }

  isSessionActive(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    return session?.status === 'active';
  }
}

export const claudeProcessManager = new ClaudeProcessManager();
