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
  type: 'text' | 'tool_use' | 'tool_result' | 'thinking' | 'error' | 'file' | 'patch' | 'step_start' | 'step_finish';
  content: string | ToolCallContent | ToolResultContent | FileContent | PatchContent;
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

export interface FileContent {
  path: string;
  language?: string;
  content?: string;
}

export interface PatchContent {
  filePath: string;
  diff: string;
  additions: number;
  deletions: number;
}

export interface WebSocketMessage {
  type: string;
  payload: any;
}

export interface StreamEvent {
  sessionId: string;
  event: string;
  data: any;
}
