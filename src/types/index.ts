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
  lastUserMessage?: string;
  pinned?: boolean;
  tags?: string[];
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
  costUsd?: number;
  tokens?: number;
  inputTokens?: number;
  outputTokens?: number;
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

// Stream event data types
export interface StreamTextData {
  text: string;
}

export interface StreamToolUseData {
  toolName: string;
  toolUseId: string;
  input: Record<string, unknown>;
}

export interface StreamToolResultData {
  toolUseId: string;
  toolName: string;
  output: string;
  isError: boolean;
}

// Typed payloads for incoming WebSocket messages
export interface StreamEventData {
  sessionId: string;
  event: 'assistant_text' | 'tool_use' | 'tool_result' | 'thinking' | 'init';
  data: StreamTextData | StreamToolUseData | StreamToolResultData | Record<string, unknown>;
}

export interface ResultPayload {
  sessionId: string;
  result: string;
  costUsd: number;
  usage?: { input_tokens: number; output_tokens: number };
}

export interface ErrorPayload {
  sessionId?: string;
  error: string;
}

// WebSocketMessage payload can be any structured data (incoming typed, outgoing flexible)
export type WebSocketPayload = StreamEventData | ResultPayload | ErrorPayload | Record<string, unknown>;

export interface WebSocketMessage {
  type: string;
  payload: WebSocketPayload;
}

// Legacy alias — prefer StreamEventData
export type StreamEvent = StreamEventData;
