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
    this.wss = new WebSocketServer({ server, path: '/ws' });
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
      const resultKey = `${sessionId}-${data.costUsd}-${totalTokens}`;

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
    switch (message.type) {
      case 'chat':
        await this.handleChatMessage(ws, message.payload);
        break;

      case 'subscribe':
        this.subscribeToSession(ws, message.payload.sessionId);
        break;

      case 'unsubscribe':
        this.unsubscribeFromSession(ws, message.payload.sessionId);
        break;

      case 'terminal:start':
        this.handleTerminalStart(ws, message.payload);
        break;

      case 'terminal:input':
        this.handleTerminalInput(message.payload);
        break;

      case 'terminal:resize':
        this.handleTerminalResize(message.payload);
        break;

      case 'terminal:kill':
        this.handleTerminalKill(message.payload);
        break;

      case 'stop': {
        const { sessionId } = message.payload;
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

    // No need to save user message here - Claude Code handles that in its .jsonl transcript

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
    const session = await sessionStore.getSession(sessionId);
    if (session && session.name.startsWith('Session ')) {
      const autoName = userMessage.length > 50
        ? userMessage.slice(0, 50).trim() + '...'
        : userMessage.trim();
      await sessionStore.updateSessionName(sessionId, autoName);
    }
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
          client.send(data);
        }
      }
    }
  }

  private sendError(ws: WebSocket, error: string) {
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
