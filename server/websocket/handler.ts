import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';
import { claudeProcessManager } from '../services/claude-process';
import { sessionStore } from '../services/session-store';
import type { WebSocketMessage, Message } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class WebSocketHandler {
  private wss: WebSocketServer;
  private clients: Map<string, Set<WebSocket>> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.setupWebSocket();
    this.setupClaudeEventHandlers();
  }

  private setupWebSocket() {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('Client connected');

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
        console.log('Client disconnected');
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
      // Save assistant message
      const message: Message = {
        id: uuidv4(),
        role: 'assistant',
        type: 'text',
        content: data.result,
        timestamp: new Date().toISOString(),
        sessionId,
      };
      await sessionStore.addMessage(sessionId, message);
      await sessionStore.updateSessionStats(sessionId, data.costUsd, data.usage?.input_tokens + data.usage?.output_tokens || 0);

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

      default:
        this.sendError(ws, `Unknown message type: ${message.type}`);
    }
  }

  private async handleChatMessage(ws: WebSocket, payload: { sessionId: string; message: string }) {
    const { sessionId, message: userMessage } = payload;

    // Save user message
    const messageObj: Message = {
      id: uuidv4(),
      role: 'user',
      type: 'text',
      content: userMessage,
      timestamp: new Date().toISOString(),
      sessionId,
    };
    await sessionStore.addMessage(sessionId, messageObj);

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
    }
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
