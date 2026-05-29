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

export interface ToolExecutionContent {
  toolName: string;
  toolUseId: string;
  input: Record<string, unknown>;
  output?: string;
  isError?: boolean;
  status: 'running' | 'completed' | 'error';
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  type: 'text' | 'tool_use' | 'tool_result' | 'tool_execution' | 'thinking' | 'error' | 'file' | 'patch' | 'step_start' | 'step_finish';
  content: string | ToolCallContent | ToolResultContent | ToolExecutionContent | FileContent | PatchContent;
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
  toolName: string;
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
