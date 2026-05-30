import type { WebSocketMessage } from '../types';

type MessageHandler = (message: WebSocketMessage) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private sessionId: string | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private isConnected = false;
  private isReconnecting = false;
  private statusCallbacks: Set<(status: { connected: boolean; reconnecting: boolean }) => void> = new Set();

  connect() {
    // Guard against duplicate connections
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
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
      console.log('WebSocket disconnected');
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
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.isReconnecting = true;
      this.fireStatusChange();
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      setTimeout(() => this.connect(), this.reconnectDelay * this.reconnectAttempts);
    }
  }

  private fireStatusChange() {
    const status = this.getStatus();
    for (const cb of this.statusCallbacks) {
      cb(status);
    }
  }

  getStatus(): { connected: boolean; reconnecting: boolean } {
    return { connected: this.isConnected, reconnecting: this.isReconnecting };
  }

  onStatusChange(callback: (status: { connected: boolean; reconnecting: boolean }) => void): () => void {
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
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const wsClient = new WebSocketClient();
