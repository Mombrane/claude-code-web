import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';
import { claudeProcessManager } from '../services/claude-process';
import { sessionStore } from '../services/session-store';
import { terminalService } from '../services/terminal-service';
import type { WebSocketMessage } from '../types';

export class WebSocketHandler {
  private wss: WebSocketServer;
  private clients: Map<string, Set<WebSocket>> = new Map();
  private processedResults = new Set<string>();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws', maxPayload: 1024 * 1024 }); // 1MB limit
    this.setupWebSocket();
    this.setupClaudeEventHandlers();
    this.setupTerminalEventHandlers();
  }

  private setupWebSocket() {
    this.wss.on('connection', (ws: WebSocket) => {

      ws.on('message', (data: Buffer) => {
        try {
          const message: WebSocketMessage = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (e) {
          console.error('Failed to parse message:', e);
          this.sendError(ws, 'Invalid message format');
        }
      });

      ws.on('close', () => {
        this.removeClientFromAll(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });
  }

  private setupClaudeEventHandlers() {
    claudeProcessManager.on('system:init', (sessionId, event) => {
      this.broadcastToSession(sessionId, {
        type: 'stream',
        payload: {
          sessionId,
          event: 'init',
          data: event,
        },
      });
    });

    claudeProcessManager.on('assistant:text', (sessionId, data) => {
      this.broadcastToSession(sessionId, {
        type: 'stream',
        payload: {
          sessionId,
          event: 'assistant_text',
          data,
        },
      });
    });

    claudeProcessManager.on('assistant:tool_use', (sessionId, data) => {
      this.broadcastToSession(sessionId, {
        type: 'stream',
        payload: {
          sessionId,
          event: 'tool_use',
          data,
        },
      });
    });

    claudeProcessManager.on('assistant:thinking', (sessionId, data) => {
      this.broadcastToSession(sessionId, {
        type: 'stream',
        payload: {
          sessionId,
          event: 'thinking',
          data,
        },
      });
    });

    claudeProcessManager.on('user:tool_result', (sessionId, data) => {
      this.broadcastToSession(sessionId, {
        type: 'stream',
        payload: {
          sessionId,
          event: 'tool_result',
          data,
        },
      });
    });

    claudeProcessManager.on('result:complete', async (sessionId, data) => {
      // Generate content-based dedup key from sessionId + cost + tokens
      const totalTokens = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);
      const resultKey = `${sessionId}-${data.costUsd}-${totalTokens}-${(data.result || "").slice(0, 80)}`;

      if (this.processedResults.has(resultKey)) {
        // Already processed this result, skip to avoid double-counting costs
        // but still broadcast to clients
        this.broadcastToSession(sessionId, {
          type: 'result',
          payload: data,
        });
        return;
      }
      this.processedResults.add(resultKey);

      // Cleanup: keep only the most recent 500 entries when exceeding 1000
      if (this.processedResults.size > 1000) {
        const entries = Array.from(this.processedResults);
        this.processedResults.clear();
        entries.slice(-500).forEach((id) => this.processedResults.add(id));
      }

      // Only update stats (cost, tokens) - no need to save message
      // Claude Code already saves the full transcript in its .jsonl files
      await sessionStore.updateSessionStats(
        sessionId,
        data.costUsd,
        (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
      );

      this.broadcastToSession(sessionId, {
        type: 'result',
        payload: data,
      });
    });

    claudeProcessManager.on('error', (sessionId, error) => {
      this.broadcastToSession(sessionId, {
        type: 'error',
        payload: {
          sessionId,
          error: error.message,
        },
      });
    });

    claudeProcessManager.on('process:closed', (sessionId: string, code: number | null) => {
      if (code !== 0 && code !== null) {
        this.broadcastToSession(sessionId, {
          type: 'error',
          payload: {
            sessionId,
            error: 'Claude process exited unexpectedly (code ' + code + '). This may be due to a session lock conflict or API error.',
          },
        });
      }
    });
  }

  private setupTerminalEventHandlers() {
    terminalService.on('output', (sessionId: string, data: string) => {
      this.broadcastToSession(sessionId, {
        type: 'terminal:output',
        payload: {
          sessionId,
          data,
        },
      });
    });
  }

  private async handleMessage(ws: WebSocket, message: WebSocketMessage) {
    const payload = message.payload as Record<string, unknown>;
    switch (message.type) {
      case 'chat':
        await this.handleChatMessage(ws, payload as { sessionId: string; message: string });
        break;

      case 'subscribe':
        this.subscribeToSession(ws, payload.sessionId as string);
        break;

      case 'unsubscribe':
        this.unsubscribeFromSession(ws, payload.sessionId as string);
        break;

      case 'terminal:start':
        this.handleTerminalStart(ws, payload as { sessionId: string });
        break;

      case 'terminal:input':
        this.handleTerminalInput(payload as { sessionId: string; data: string });
        break;

      case 'terminal:resize':
        this.handleTerminalResize(payload as { sessionId: string; cols: number; rows: number });
        break;

      case 'terminal:kill':
        this.handleTerminalKill(payload as { sessionId: string });
        break;

      case 'stop': {
        const sessionId = payload.sessionId as string;
        await claudeProcessManager.stopProcess(sessionId);
        this.broadcastToSession(sessionId, {
          type: 'result',
          payload: {
            sessionId,
            result: '[Generation stopped by user]',
            costUsd: 0,
            usage: { input_tokens: 0, output_tokens: 0 },
          },
        });
        break;
      }

      default:
        this.sendError(ws, `Unknown message type: ${message.type}`);
    }
  }

  private async handleChatMessage(ws: WebSocket, payload: { sessionId: string; message: string }) {
    const { sessionId, message: userMessage } = payload;

    // Check if session exists in process manager
    if (!claudeProcessManager.isSessionActive(sessionId)) {
      // Try to resume session
      const session = await sessionStore.getSession(sessionId);
      if (session) {
        // Spawn new process for existing session
        await claudeProcessManager.spawnSession({
          sessionId,
          cwd: session.cwd,
          model: session.model,
        });
      } else {
        this.sendError(ws, 'Session not found');
        return;
      }
    }

    // Send message to Claude
    const sent = await claudeProcessManager.sendMessage(sessionId, userMessage);
    if (!sent) {
      this.sendError(ws, 'Failed to send message to Claude');
      return;
    }

    // Auto-name session from first user message if it still has the default name
    // Matches both "Session 2026/5/30 ..." (zh locale) and "Session 5/30/2026 ..." (en locale)
    try {
      const sessionForRename = await sessionStore.getSession(sessionId);
      if (sessionForRename && /^Session \d/.test(sessionForRename.name)) {
        const newName = userMessage.split('\n')[0].slice(0, 50).trim() || sessionForRename.name;
        if (newName !== sessionForRename.name) {
          await sessionStore.updateSession(sessionId, { name: newName });
        }
      }
    } catch {
      // Non-critical: don't let rename failure break message sending
    }

    // Save last user message preview for sidebar display (fire-and-forget)
    sessionStore.updateSession(sessionId, { lastUserMessage: userMessage.slice(0, 100) }).catch(() => {});
  }

  private handleTerminalStart(ws: WebSocket, payload: { sessionId: string }) {
    const { sessionId } = payload;
    terminalService.startSession(sessionId);
  }

  private handleTerminalInput(payload: { sessionId: string; data: string }) {
    const { sessionId, data } = payload;
    terminalService.writeToSession(sessionId, data);
  }

  private handleTerminalResize(payload: { sessionId: string; cols: number; rows: number }) {
    const { sessionId, cols, rows } = payload;
    terminalService.resizeSession(sessionId, cols, rows);
  }

  private handleTerminalKill(payload: { sessionId: string }) {
    const { sessionId } = payload;
    terminalService.killSession(sessionId);
  }

  private subscribeToSession(ws: WebSocket, sessionId: string) {
    if (!this.clients.has(sessionId)) {
      this.clients.set(sessionId, new Set());
    }
    this.clients.get(sessionId)!.add(ws);
  }

  private unsubscribeFromSession(ws: WebSocket, sessionId: string) {
    this.clients.get(sessionId)?.delete(ws);
  }

  private removeClientFromAll(ws: WebSocket) {
    for (const [sessionId, clients] of this.clients) {
      clients.delete(ws);
      if (clients.size === 0) {
        this.clients.delete(sessionId);
      }
    }
  }

  private broadcastToSession(sessionId: string, message: WebSocketMessage) {
    const clients = this.clients.get(sessionId);
    if (clients) {
      const data = JSON.stringify(message);
      for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
          try {
            client.send(data);
          } catch (err) {
            // Remove dead client from all sessions
            this.clients.forEach((clientSet, sid) => {
              clientSet.delete(client);
              if (clientSet.size === 0) this.clients.delete(sid);
            });
          }
        }
      }
    }
  }

  private sendError(ws: WebSocket, error: string) {
    if (ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({
      type: 'error',
      payload: { error },
    }));
  }

  getWSS(): WebSocketServer {
    return this.wss;
  }
}

export const websocketHandler = WebSocketHandler;
