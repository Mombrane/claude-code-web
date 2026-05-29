# 消息存储去重：App 层退化为元数据层

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** 消除 Claude Code Web 与 Claude Code CLI 之间的对话历史重复存储，让 App 层只保留会话元数据，消息统一从 Claude Code 的 .jsonl 文件读取。

**Architecture:** 
- App 层（`session-store`）只存储会话元数据（名称、路径、模型、费用统计）
- 对话消息统一从 Claude Code 原生的 `.jsonl` transcript 文件读取
- 新增 `claude-transcript` 服务负责解析 `.jsonl` 格式

**Tech Stack:** TypeScript, Express, WebSocket, Zustand (前端状态管理)

---

## 问题分析

### 当前架构（重复存储）

```
┌─────────────────────────────────────────────────────────┐
│                    Web UI (前端)                          │
│         从 App 层读取 session.messages                    │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│              App 层 (session-store.ts)                    │
│   data/sessions/*.json                                  │
│   ┌─────────────────────────────────────────────┐       │
│   │ {                                           │       │
│   │   id, name, cwd, model, status,            │       │
│   │   messages: [...],  ← ❌ 重复存储消息        │       │
│   │   totalCostUsd, totalTokens                │       │
│   │ }                                           │       │
│   └─────────────────────────────────────────────┘       │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│           Claude Code CLI (底层引擎)                      │
│   ~/.claude/projects/<project-path>/*.jsonl             │
│   ┌─────────────────────────────────────────────┐       │
│   │ 完整对话记录：                                │       │
│   │ - user messages                              │       │
│   │ - assistant responses (text/thinking/tool)   │       │
│   │ - tool calls & results                       │       │
│   │ - hook events, skill listings               │       │
│   └─────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────┘
```

**问题：**
1. 数据冗余 — 同一段对话存了两遍
2. 不一致风险 — App 层只存了最终文本，丢失了 thinking、tool_use 等细节
3. 存储浪费 — `.jsonl` 已包含完整记录

---

## 目标架构（单源真相）

```
┌─────────────────────────────────────────────────────────┐
│                    Web UI (前端)                          │
│    从 API 按需加载 messages (GET /api/sessions/:id/messages) │
└────────────────────────┬────────────────────────────────┘
                         │
          ┌──────────────┴──────────────┐
          ▼                             ▼
┌──────────────────────┐    ┌──────────────────────────────┐
│   App 层 (元数据)     │    │   claude-transcript 服务      │
│   data/sessions/*.json│    │   读取 .jsonl 文件            │
│   ┌────────────────┐ │    │   解析 user/assistant 消息    │
│   │ id, name, cwd, │ │    └──────────────────────────────┘
│   │ model, status, │ │               │
│   │ totalCostUsd,  │ │               ▼
│   │ totalTokens    │ │    ┌──────────────────────────────┐
│   └────────────────┘ │    │   Claude Code CLI            │
│   ✅ 只存元数据       │    │   ~/.claude/projects/*.jsonl │
└──────────────────────┘    │   ✅ 唯一消息源               │
                            └──────────────────────────────┘
```

---

## 实现任务

### Task 1: 新建 claude-transcript 服务

**Objective:** 创建一个服务来读取 Claude Code 的 .jsonl transcript 文件

**Files:**
- Create: `server/services/claude-transcript.ts`

**Step 1: 创建服务文件**

```typescript
// server/services/claude-transcript.ts
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import type { Message } from '../types';

const CLAUDE_PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');

/**
 * 将项目路径转换为 Claude Code 的目录名格式
 * 例如: /home/user/project -> -home-user-project
 */
function projectPathToDirName(projectPath: string): string {
  return projectPath.replace(/\//g, '-');
}

/**
 * 获取 session 对应的 .jsonl 文件路径
 */
function getTranscriptPath(sessionId: string, projectPath: string): string {
  const dirName = projectPathToDirName(projectPath);
  return path.join(CLAUDE_PROJECTS_DIR, dirName, `${sessionId}.jsonl`);
}

/**
 * 解析 .jsonl 的单行为 Message
 */
function parseLine(line: string, sessionId: string): Message | null {
  try {
    const entry = JSON.parse(line);

    // 用户消息
    if (entry.type === 'user' && entry.message?.content) {
      return {
        id: entry.uuid || `user-${entry.timestamp}`,
        role: 'user',
        type: 'text',
        content: typeof entry.message.content === 'string'
          ? entry.message.content
          : JSON.stringify(entry.message.content),
        timestamp: entry.timestamp,
        sessionId,
      };
    }

    // 助手消息
    if (entry.type === 'assistant' && entry.message?.content) {
      const blocks = entry.message.content;
      
      // 提取文本内容
      const textBlocks = blocks
        .filter((b: any) => b.type === 'text')
        .map((b: any) => b.text);

      if (textBlocks.length > 0) {
        return {
          id: entry.uuid || `assistant-${entry.timestamp}`,
          role: 'assistant',
          type: 'text',
          content: textBlocks.join('\n'),
          timestamp: entry.timestamp,
          sessionId,
        };
      }

      // 提取 thinking 内容
      const thinkingBlocks = blocks
        .filter((b: any) => b.type === 'thinking')
        .map((b: any) => b.thinking);

      if (thinkingBlocks.length > 0) {
        return {
          id: entry.uuid || `thinking-${entry.timestamp}`,
          role: 'assistant',
          type: 'thinking',
          content: thinkingBlocks.join('\n'),
          timestamp: entry.timestamp,
          sessionId,
        };
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * 读取 Claude Code transcript 文件中的所有消息
 */
export async function readTranscript(
  sessionId: string,
  projectPath: string
): Promise<Message[]> {
  const filePath = getTranscriptPath(sessionId, projectPath);

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());

    const messages: Message[] = [];
    for (const line of lines) {
      const msg = parseLine(line, sessionId);
      if (msg) {
        messages.push(msg);
      }
    }

    return messages;
  } catch (e) {
    return [];
  }
}
```

**Step 2: 验证服务可编译**

Run: `npx tsc --noEmit server/services/claude-transcript.ts`
Expected: 无错误输出

---

### Task 2: 修改 Session 类型定义

**Objective:** 从 Session 接口移除 messages 字段

**Files:**
- Modify: `server/types/index.ts`
- Modify: `src/types/index.ts`

**Step 1: 修改后端类型**

```typescript
// server/types/index.ts
export interface Session {
  id: string;
  name: string;
  cwd: string;
  projectPath?: string;
  model: string;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'idle' | 'closed';
  // ❌ 移除: messages: Message[];
  totalCostUsd: number;
  totalTokens: number;
}
```

**Step 2: 修改前端类型**

```typescript
// src/types/index.ts
export interface Session {
  id: string;
  name: string;
  cwd: string;
  projectPath?: string;
  model: string;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'idle' | 'closed';
  // ❌ 移除: messages: Message[];
  totalCostUsd: number;
  totalTokens: number;
}
```

---

### Task 3: 修改 session-store 服务

**Objective:** 移除消息存储逻辑，只保留元数据管理

**Files:**
- Modify: `server/services/session-store.ts`

**Step 1: 移除 addMessage 和 deleteMessage 方法**

删除以下方法：
- `addMessage(sessionId, message)`
- `deleteMessage(sessionId, messageId)`

**Step 2: 修改 createSession**

```typescript
async createSession(name?: string, cwd?: string, projectPath?: string): Promise<Session> {
  const session: Session = {
    id: uuidv4(),
    name: name || `Session ${new Date().toLocaleString()}`,
    cwd: cwd || config.defaultCwd,
    projectPath: projectPath || cwd || config.defaultCwd,
    model: config.defaultModel,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'active',
    // ❌ 移除: messages: [],
    totalCostUsd: 0,
    totalTokens: 0,
  };

  await this.saveSession(session);
  return session;
}
```

**Step 3: 修改 getAllSessions 的搜索逻辑**

```typescript
// 搜索只按名称过滤（不再搜索消息内容）
if (options?.search) {
  const query = options.search.toLowerCase();
  sessions = sessions.filter(s =>
    s.name.toLowerCase().includes(query)
  );
}
```

---

### Task 4: 添加消息读取 API

**Objective:** 新增 GET /api/sessions/:id/messages 接口

**Files:**
- Modify: `server/routes/sessions.ts`

**Step 1: 导入 claude-transcript 服务**

```typescript
import { readTranscript } from '../services/claude-transcript';
```

**Step 2: 添加消息读取路由**

```typescript
// Get messages for a session (read from Claude Code's .jsonl transcript)
router.get('/:id/messages', async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const session = await sessionStore.getSession(id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const projectPath = session.projectPath || session.cwd;
    const messages = await readTranscript(id, projectPath);
    res.json(messages);
  } catch (e) {
    res.status(500).json({ error: 'Failed to get messages' });
  }
});
```

**Step 3: 移除旧的消息删除路由**

删除 `DELETE /:id/messages/:messageId` 路由

---

### Task 5: 修改 WebSocket Handler

**Objective:** 移除冗余的消息保存逻辑

**Files:**
- Modify: `server/websocket/handler.ts`

**Step 1: 修改 result:complete 处理器**

```typescript
claudeProcessManager.on('result:complete', async (sessionId, data) => {
  // 只更新费用统计，不再保存消息
  // Claude Code 已经在 .jsonl 中保存了完整记录
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
```

**Step 2: 修改 handleChatMessage**

```typescript
private async handleChatMessage(ws: WebSocket, payload: { sessionId: string; message: string }) {
  const { sessionId, message: userMessage } = payload;

  // ❌ 移除: 不再保存用户消息到 App 层
  // Claude Code 会在 .jsonl 中保存

  // 检查会话是否存在...
  // 发送消息到 Claude...
}
```

---

### Task 6: 修改前端状态管理

**Objective:** 消息改为按需加载，不随 Session 对象一起获取

**Files:**
- Modify: `src/stores/sessionStore.ts`
- Modify: `src/api/client.ts`

**Step 1: 更新 sessionStore**

```typescript
interface SessionState {
  sessions: Session[];
  currentSessionId: string | null;
  currentMessages: Message[];  // ✅ 新增：独立管理消息
  isLoadingMessages: boolean;  // ✅ 新增：消息加载状态
  
  // ... 其他状态
  
  // 新增方法
  loadMessages: (sessionId: string) => Promise<void>;
  addMessage: (message: Message) => void;
  clearMessages: () => void;
}
```

**Step 2: 更新 API 客户端**

```typescript
// src/api/client.ts
export const api = {
  // ... 其他方法
  
  async getSessionMessages(id: string): Promise<Message[]> {
    const res = await fetch(`${API_BASE}/sessions/${id}/messages`);
    return res.json();
  },
  
  // ❌ 移除: deleteMessage 方法
};
```

---

### Task 7: 修改前端组件

**Objective:** 更新组件使用新的消息加载方式

**Files:**
- Modify: `src/components/chat/ChatPanel.tsx`
- Modify: `src/components/chat/MessageList.tsx`
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/pages/HomePage.tsx`

**Step 1: ChatPanel 使用 currentMessages**

```typescript
export function ChatPanel() {
  const { sessions, currentSessionId, currentMessages, addMessage } = useSessionStore();
  
  // ... 其他逻辑
  
  return (
    <div>
      {/* 消息计数 */}
      <span>{currentMessages.length} messages</span>
      
      {/* 消息列表 */}
      <MessageList messages={currentMessages} ... />
    </div>
  );
}
```

**Step 2: 移除消息删除功能**

- MessageList 移除 `onDeleteMessage` prop
- ChatPanel 移除 `handleDeleteMessage` 函数

**Step 3: 移除消息计数显示**

Sidebar 和 HomePage 中移除 `session.messages.length` 相关代码

---

### Task 8: 构建验证

**Objective:** 确保所有修改后项目可正常构建

**Step 1: 运行 TypeScript 编译检查**

Run: `npm run build`
Expected: 构建成功，无错误

**Step 2: 启动开发服务器测试**

Run: `npm run dev`
Expected: 服务器正常启动，可访问 Web UI

**Step 3: 测试消息加载**

1. 打开 Web UI
2. 选择一个已有会话
3. 验证消息能从 .jsonl 正确加载
4. 发送新消息，验证实时流式响应正常

---

## .jsonl 格式参考

Claude Code 的 transcript 文件每行一个 JSON 对象：

```jsonl
// 用户消息
{"type":"user","message":{"role":"user","content":"Hello"},"uuid":"xxx","timestamp":"2024-01-01T00:00:00Z"}

// 助手消息（含 thinking + text）
{"type":"assistant","message":{"role":"assistant","content":[{"type":"thinking","thinking":"..."},{"type":"text","text":"Hello!"}]},"uuid":"xxx","timestamp":"2024-01-01T00:00:01Z"}

// 其他事件（可忽略）
{"type":"queue-operation","operation":"enqueue",...}
{"type":"attachment","hookName":"SessionStart",...}
```

**解析规则：**
- 只处理 `type === "user"` 和 `type === "assistant"` 的行
- `message.content` 是用户消息的文本内容
- `message.content` 是数组时，提取 `type === "text"` 或 `type === "thinking"` 的块

---

## 注意事项

1. **Session ID 映射** — App 层的 session ID 与 Claude Code 的 .jsonl 文件名相同，可直接映射
2. **项目路径转换** — `/home/user/project` → `-home-user-project`（`/` 替换为 `-`）
3. **消息顺序** — .jsonl 文件中的消息按时间顺序排列，无需额外排序
4. **错误处理** — .jsonl 文件不存在时返回空数组（新会话或文件被清理）

---

## 验证清单

- [ ] `npm run build` 构建成功
- [ ] 会话列表正常显示
- [ ] 点击会话可加载历史消息
- [ ] 发送新消息可正常流式响应
- [ ] 费用统计正常更新
- [ ] 搜索功能只按会话名称过滤
