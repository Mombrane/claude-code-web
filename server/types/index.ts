export interface Session {
  id: string;
  name: string;
  cwd: string;
  projectPath?: string;
  model: string;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'idle' | 'closed';
  totalCostUsd: number;
  totalTokens: number;
}

export interface Project {
  id: string;
  worktree: string;
  name: string;
  icon?: {
    url?: string;
    override?: string;
    color?: string;
  };
  time: {
    created: string;
    updated: string;
  };
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  type: 'text' | 'tool_use' | 'tool_result' | 'thinking' | 'error';
  content: string | ToolCallContent | ToolResultContent;
  timestamp: string;
  sessionId: string;
}

export interface ToolCallContent {
  toolName: string;
  toolUseId: string;
  input: Record<string, unknown>;
}

export interface ToolResultContent {
  toolUseId: string;
  output: string;
  isError: boolean;
}

export interface ClaudeSession {
  sessionId: string;
  process: any;
  status: 'active' | 'idle' | 'closed';
  lastActivity: string;
}

export interface SpawnOptions {
  sessionId?: string;
  cwd?: string;
  model?: string;
  permissionMode?: 'default' | 'auto';
  allowedTools?: string[];
}

export interface WebSocketMessage {
  type: string;
  payload: any;
}

export interface StreamEvent {
  type: string;
  session_id?: string;
  message?: {
    role: string;
    content: any[];
  };
  content_block?: {
    type: string;
    id?: string;
    name?: string;
    input?: any;
    text?: string;
  };
  result?: {
    cost_usd: number;
    usage: {
      input_tokens: number;
      output_tokens: number;
      cache_read_input_tokens: number;
    };
  };
}
