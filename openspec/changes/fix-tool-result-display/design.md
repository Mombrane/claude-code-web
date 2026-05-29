# Design: Fix Tool Result Display

## Architecture

### 数据流（修复后）

```
Claude CLI (stream-json)
  → type: 'user' 事件（含 tool_result）
  → handleClaudeEvent: case 'user' → emit('user:tool_result', { toolUseId, output, isError, toolName })
  → handler.ts: broadcast { event: 'tool_result', data: { toolUseId, output, isError, toolName } }
  → ChatPanel.tsx: 匹配 toolUseId → 合并为 ToolExecution 消息
  → MessageList.tsx: ToolExecutionCard（配对显示 + 差异化渲染）
```

### 方案 1: 后端修复 — 事件处理

**文件**: `server/services/claude-process.ts`

在 `handleClaudeEvent` 的 switch 中添加 `case 'user':` 分支：
- 遍历 `event.message.content` 数组
- 找到 `type === 'tool_result'` 的块
- 提取 `tool_use_id`、`content`（输出）、`is_error`
- 同时维护一个 `pendingToolNames: Map<string, string>` 缓存，从 `tool_use` 事件中记录 toolUseId → toolName 的映射
- emit 时附带 `toolName`

### 方案 2: 类型扩展

**文件**: `server/types/index.ts` + `src/types/index.ts`

```typescript
export interface ToolResultContent {
  toolUseId: string;
  toolName: string;    // 新增
  output: string;
  isError: boolean;
}
```

### 方案 3: 前端配对 + 差异化渲染

**文件**: `src/components/chat/ChatPanel.tsx`

收到 `tool_result` 事件时：
- 通过 `toolUseId` 在 messages 中找到对应的 `tool_use` 消息
- 合并为一条 `ToolExecution` 消息（新 type），包含 { toolName, input, output, isError, status: 'completed' }
- 移除原来独立的 `tool_use` 和 `tool_result` 消息

**文件**: `src/components/chat/MessageList.tsx`

新增 `ToolExecutionCard` 组件，替代原有的 `ToolCallCard` + `ToolResultCard`：
- 头部：工具图标 + 工具名 + 输入摘要（如文件路径、命令）
- 身体：根据 toolName 做差异化渲染
  - `Bash` → 终端样式输出（monospace, 状态灯）
  - `Read` → 代码块（语法高亮）
  - `Edit` → diff 视图（红删绿增）
  - `Grep/Glob` → 搜索结果列表
  - 其他 → 纯文本
- 状态灯：✅ 成功 / ❌ 失败 / ⏳ 运行中

### Message type 扩展

在 `Message` 接口中添加 `'tool_execution'` 类型：

```typescript
export interface ToolExecutionContent {
  toolName: string;
  toolUseId: string;
  input: Record<string, unknown>;
  output?: string;
  isError?: boolean;
  status: 'running' | 'completed' | 'error';
}
```

## Edge Cases

1. **tool_result 先于 tool_use 到达**：用 Map 缓存，等配对成功后再渲染
2. **tool_result 缺失**：tool_use 显示为 "running" 状态，超时后标记为 "timeout"
3. **超长输出**：Bash 输出超过 500 字符时默认折叠，带渐变遮罩
4. **tool_use 没有配对的 result**：保持为独立的 ToolCallCard（兼容）
