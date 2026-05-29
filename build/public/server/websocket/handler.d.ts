import { WebSocketServer } from 'ws';
import { Server } from 'http';
export declare class WebSocketHandler {
    private wss;
    private clients;
    constructor(server: Server);
    private setupWebSocket;
    private setupClaudeEventHandlers;
    private handleMessage;
    private handleChatMessage;
    private subscribeToSession;
    private unsubscribeFromSession;
    private removeClientFromAll;
    private broadcastToSession;
    private sendError;
    getWSS(): WebSocketServer;
}
//# sourceMappingURL=handler.d.ts.map