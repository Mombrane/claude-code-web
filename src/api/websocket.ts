import type { WebSocketMessage } from '../types';

type MessageHandler = (message: WebSocketMessage) => void;

const MAX_RECONNECT_DELAY = 30000;
const BASE_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_ATTEMPTS = 10;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private reconnectAttempts = 0;
  private reconnectDelay = BASE_RECONNECT_DELAY;
  private sessionId: string | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private isConnected = false;
  private isReconnecting = false;
  private intentionalDisconnect = false;
  private statusCallbacks: Set<(status: { connected: boolean; reconnecting: boolean; attempts: number; maxAttempts: number }) => void> = new Set();

  connect() {
    // Guard against duplicate connections
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    this.intentionalDisconnect = false;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.isConnected = true;
      this.isReconnecting = false;
      this.fireStatusChange();

      // Send queued messages
      while (this.messageQueue.length > 0) {
        const msg = this.messageQueue.shift();
        if (msg) {
          this.ws?.send(JSON.stringify(msg));
        }
      }

      // Subscribe to current session if any
      if (this.sessionId) {
        this.subscribe(this.sessionId);
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.notifyHandlers(message.type, message);
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    };

    this.ws.onclose = () => {
      this.isConnected = false;
      this.isReconnecting = false;
      this.fireStatusChange();
      this.notifyHandlers('disconnected', { type: 'disconnected', payload: {} });
      this.tryReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  private tryReconnect() {
    if (this.intentionalDisconnect) return;
    if (this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      this.reconnectAttempts++;
      this.isReconnecting = true;
      this.fireStatusChange();
      // Exponential backoff with jitter: min(base * 2^attempt + random(0,1000), 30000)
      const jitter = Math.random() * 1000;
      const delay = Math.min(BASE_RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts) + jitter, MAX_RECONNECT_DELAY);
      setTimeout(() => this.connect(), delay);
    } else {
      // Max attempts reached — stop reconnecting, mark as disconnected
      this.isReconnecting = false;
      this.fireStatusChange();
    }
  }

  private fireStatusChange() {
    const status = this.getStatus();
    for (const cb of this.statusCallbacks) {
      cb(status);
    }
  }

  getStatus(): { connected: boolean; reconnecting: boolean; attempts: number; maxAttempts: number } {
    return {
      connected: this.isConnected,
      reconnecting: this.isReconnecting,
      attempts: this.reconnectAttempts,
      maxAttempts: MAX_RECONNECT_ATTEMPTS,
    };
  }

  onStatusChange(callback: (status: { connected: boolean; reconnecting: boolean; attempts: number; maxAttempts: number }) => void): () => void {
    this.statusCallbacks.add(callback);
    return () => {
      this.statusCallbacks.delete(callback);
    };
  }

  private notifyHandlers(type: string, message: WebSocketMessage) {
    const handlers = this.handlers.get(type);
    if (handlers) {
      for (const handler of handlers) {
        handler(message);
      }
    }

    // Also notify wildcard handlers
    const wildcardHandlers = this.handlers.get('*');
    if (wildcardHandlers) {
      for (const handler of wildcardHandlers) {
        handler(message);
      }
    }
  }

  on(type: string, handler: MessageHandler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);

    return () => {
      this.handlers.get(type)?.delete(handler);
    };
  }

  off(type: string, handler: MessageHandler) {
    this.handlers.get(type)?.delete(handler);
  }

  send(message: WebSocketMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue message for when connection is established
      this.messageQueue.push(message);
    }
  }

  subscribe(sessionId: string) {
    this.sessionId = sessionId;
    this.send({ type: 'subscribe', payload: { sessionId } });
  }

  unsubscribe(sessionId: string) {
    this.send({ type: 'unsubscribe', payload: { sessionId } });
    if (this.sessionId === sessionId) {
      this.sessionId = null;
    }
  }

  sendChat(sessionId: string, message: string) {
    this.send({
      type: 'chat',
      payload: { sessionId, message },
    });
  }

  sendTerminalInput(sessionId: string, data: string) {
    this.send({
      type: 'terminal:input',
      payload: { sessionId, data },
    });
  }

  sendTerminalResize(sessionId: string, cols: number, rows: number) {
    this.send({
      type: 'terminal:resize',
      payload: { sessionId, cols, rows },
    });
  }

  disconnect() {
    this.intentionalDisconnect = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.isReconnecting = false;
    this.fireStatusChange();
  }
}

export const wsClient = new WebSocketClient();
