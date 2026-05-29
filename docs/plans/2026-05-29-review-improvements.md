# 消息存储去重方案 - Review 改进说明

> **Review by:** Claude Code (mimo-v2.5-pro)
> **Date:** 2026-05-29
> **Original Plan:** `docs/plans/2026-05-29-message-storage-dedup.md`

---

##   Review 评分总览

| 维度 | 原始评分 | 主要问题 |
|------|----------|----------|
| 完整性 | 7/10 | tool_use 处理缺失、流式消息拼接未描述 |
| 风险 | 6/10 | 路径映射假设、大文件读取、并发竞争 |
| 正确性 | 7/10 | assistant 消息解析逻辑有 bug |
| 架构 | 8/10 | 方向正确，缺缓存和分页支持 |

---

##   问题清单与改进方案

### 问题 1：`parseLine` 解析逻辑有 bug ⚠️ 高优先级

**问题描述：**

Claude Code 的一条 assistant 消息可以**同时包含** text 和 thinking 块：

```jsonl
{"type":"assistant","message":{"content":[{"type":"thinking","thinking":"让我思考..."},{"type":"text","text":"答案是 42"}]}}
```

但原方案的 `parseLine` 逻辑是：先找 text → 找到就返回 → 没找到才找 thinking

这会导致 thinking 内容被丢弃。

**改进方案：**

```typescript
function parseLine(line: string, sessionId: string): Message[] {
  // ← 注意：返回类型从 Message | null 改为 Message[]
  try {
    const entry = JSON.parse(line);
    const messages: Message[] = [];

    if (entry.type === 'user' && entry.message?.content) {
      messages.push({
        id: entry.uuid || `user-${entry.timestamp}`,
        role: 'user',
        type: 'text',
        content: typeof entry.message.content === 'string'
          ? entry.message.content
          : JSON.stringify(entry.message.content),
        timestamp: entry.timestamp,
        sessionId,
      });
    }

    if (entry.type === 'assistant' && entry.message?.content) {
      const blocks = entry.message.content;

      // 先提取 thinking（如果有的话）
      const thinkingBlocks = blocks.filter((b: any) => b.type === 'thinking');
      for (const block of thinkingBlocks) {
        messages.push({
          id: `thinking-${entry.uuid || entry.timestamp}-${messages.length}`,
          role: 'assistant',
          type: 'thinking',
          content: block.thinking,
          timestamp: entry.timestamp,
          sessionId,
        });
      }

      // 再提取 text
      const textBlocks = blocks.filter((b: any) => b.type === 'text');
      for (const block of textBlocks) {
        messages.push({
          id: `text-${entry.uuid || entry.timestamp}-${messages.length}`,
          role: 'assistant',
          type: 'text',
          content: block.text,
          timestamp: entry.timestamp,
          sessionId,
        });
      }
    }

    return messages;
  } catch {
    return [];
  }
}
```

---

### 问题 2：tool_use/tool_result 完全未处理 ⚠️ 高优先级

**问题描述：**

原方案只解析了 `text` 和 `thinking` 类型，但 `.jsonl` 中还有：
- `tool_use` — 工具调用记录（如读文件、执行命令）
- `tool_result` — 工具执行结果

这些记录对调试和审计非常重要。

**改进方案：**

在 `parseLine` 中添加 tool_use 处理：

```typescript
// 在 assistant 消息处理中添加
if (entry.type === 'assistant' && entry.message?.content) {
  const blocks = entry.message.content;

  for (const block of blocks) {
    switch (block.type) {
      case 'thinking':
        messages.push({
          id: `thinking-${entry.uuid}-${messages.length}`,
          role: 'assistant',
          type: 'thinking',
          content: block.thinking,
          timestamp: entry.timestamp,
          sessionId,
        });
        break;

      case 'text':
        messages.push({
          id: `text-${entry.uuid}-${messages.length}`,
          role: 'assistant',
          type: 'text',
          content: block.text,
          timestamp: entry.timestamp,
          sessionId,
        });
        break;

      case 'tool_use':
        messages.push({
          id: block.id || `tool-${entry.uuid}-${messages.length}`,
          role: 'assistant',
          type: 'tool_use',
          content: {
            toolName: block.name,
            toolUseId: block.id,
            input: block.input,
          },
          timestamp: entry.timestamp,
          sessionId,
        });
        break;
    }
  }
}
```

---

### 问题 3：流式消息与历史消息合并策略未描述 ⚠️ 中优先级

**问题描述：**

场景：
1. 用户发送消息 → WebSocket 推送流式事件 → `addMessage` 追加到 `currentMessages`
2. 用户刷新页面 → `loadMessages` 从 `.jsonl` 重新加载
3. **问题：** 流式消息已经在 `currentMessages` 中，刷新后会出现重复

**改进方案：**

**策略 A：刷新时清空流式消息（推荐）**

```typescript
// sessionStore.ts
setCurrentSession: async (sessionId) => {
  set({ 
    currentSessionId: sessionId, 
    currentMessages: [],  // ← 清空，包括流式消息
    streamingText: '',    // ← 清空流式状态
  });
  if (sessionId) {
    await get().loadMessages(sessionId);
  }
},
```

**策略 B：基于时间戳去重**

```typescript
loadMessages: async (sessionId) => {
  const messages = await api.getSessionMessages(sessionId);
  const existingIds = new Set(get().currentMessages.map(m => m.id));
  
  // 只添加不存在的消息
  const newMessages = messages.filter(m => !existingIds.has(m.id));
  
  set(state => ({ 
    currentMessages: [...state.currentMessages, ...newMessages],
    isLoadingMessages: false 
  }));
},
```

**推荐策略 A**，因为更简单、更可靠。

---

### 问题 4：大文件读取性能 ⚠️ 中优先级

**问题描述：**

`readTranscript` 用 `fs.readFile` 一次性读取整个 `.jsonl` 到内存，然后 `split('\n')`。长时间会话的文件可能达到几十 MB。

**改进方案：**

**方案 1：支持分页读取（推荐）**

```typescript
export async function readTranscript(
  sessionId: string,
  projectPath: string,
  options?: {
    offset?: number;  // 跳过前 N 条消息
    limit?: number;   // 最多返回 N 条
    reverse?: boolean; // 是否倒序（最新的在前）
  }
): Promise<Message[]> {
  const filePath = getTranscriptPath(sessionId, projectPath);

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());

    let messages: Message[] = [];
    for (const line of lines) {
      const msgs = parseLine(line, sessionId);  // ← 注意这里返回数组
      messages.push(...msgs);
    }

    // 倒序（最新的在前）
    if (options?.reverse) {
      messages.reverse();
    }

    // 分页
    if (options?.offset) {
      messages = messages.slice(options.offset);
    }
    if (options?.limit) {
      messages = messages.slice(0, options.limit);
    }

    return messages;
  } catch (e) {
    return [];
  }
}
```

**方案 2：流式读取（复杂，暂不推荐）**

使用 `readline` 接口逐行读取，适合超大文件（>100MB），但实现复杂度高。

---

### 问题 5：并发读写竞争 ⚠️ 低优先级

**问题描述：**

Claude Code CLI 在写 `.jsonl` 的同时，Web API 在读同一个文件。可能读到不完整的最后一行。

**改进方案：**

`parseLine` 的 try-catch 已经能处理这种情况（不完整的 JSON 会解析失败，返回 null）。只需确保：

```typescript
function parseLine(line: string, sessionId: string): Message[] {
  try {
    // ... 解析逻辑
    return messages;
  } catch {
    // 不完整的 JSON 会走到这里，安全忽略
    return [];
  }
}
```

**不需要额外改动**，当前设计已能处理。

---

### 问题 6：路径映射假设 ⚠️ 低优先级

**问题描述：**

方案假设 App 层的 `projectPath` 与 Claude Code 写入 `.jsonl` 时使用的路径完全一致。如果用户在 CLI 和 Web UI 之间使用了不同的 cwd，映射会失败。

**改进方案：**

**在文档中明确说明这个约束：**

```markdown
## 前置条件

1. Web UI 创建会话时使用的 `projectPath` 必须与 Claude Code CLI 的工作目录一致
2. 如果用户在 CLI 中使用了不同的目录，需要在 Web UI 中手动指定相同的路径
3. 未来可以考虑通过 Claude Code 的 API 查询实际的项目路径
```

---

### 问题 7：费用统计幂等性 ⚠️ 低优先级

**问题描述：**

`result:complete` 中调用 `updateSessionStats` 做的是 `+=` 累加。如果 WebSocket 重连导致事件重复投递，费用会被重复累加。

**改进方案：**

使用消息 ID 去重：

```typescript
// sessionStore.ts
const processedResults = new Set<string>();

claudeProcessManager.on('result:complete', async (sessionId, data) => {
  // 基于 timestamp 和 costUsd 生成唯一标识
  const resultKey = `${sessionId}-${data.costUsd}-${data.usage?.input_tokens}`;
  
  if (processedResults.has(resultKey)) {
    return; // 已处理过，跳过
  }
  processedResults.add(resultKey);
  
  // 清理旧的记录（保留最近 1000 条）
  if (processedResults.size > 1000) {
    const entries = Array.from(processedResults);
    processedResults.clear();
    entries.slice(-500).forEach(id => processedResults.add(id));
  }
  
  await sessionStore.updateSessionStats(...);
});
```

---

### 问题 8：搜索功能降级 ⚠️ 已知限制

**问题描述：**

原方案移除了消息内容搜索，只按会话名称过滤。这是一个功能降级。

**改进方案：**

**在文档中明确标注：**

```markdown
## 已知功能变化

| 功能 | 变化 | 原因 |
|------|------|------|
| 消息内容搜索 | ❌ 移除 | 消息不再存储在 App 层 |
| 会话名称搜索 | ✅ 保留 | 名称仍在 App 层 |
```

**未来可选恢复方案：**
- 方案 A：加载消息后做客户端搜索（适合小会话）
- 方案 B：在 App 层维护消息索引（复杂）
- 方案 C：使用 SQLite 或 Elasticsearch 做全文搜索（重量级）

---

##   改进后的实现任务清单

### 原始任务

| Task | 描述 | 状态 |
|------|------|------|
| 1 | 新建 claude-transcript 服务 | ✅ 需改进 parseLine |
| 2 | 修改 Session 类型定义 | ✅ 无需改动 |
| 3 | 修改 session-store 服务 | ✅ 无需改动 |
| 4 | 添加消息读取 API | ✅ 需添加分页参数 |
| 5 | 修改 WebSocket Handler | ✅ 需添加幂等性 |
| 6 | 修改前端状态管理 | ✅ 需明确流式消息策略 |
| 7 | 修改前端组件 | ✅ 无需改动 |
| 8 | 构建验证 | ✅ 无需改动 |

### 新增任务

| Task | 描述 | 优先级 |
|------|------|--------|
| 9 | 实现 tool_use/tool_result 解析 | 高 |
| 10 | 实现分页读取支持 | 中 |
| 11 | 实现流式消息清空策略 | 中 |
| 12 | 实现费用统计幂等性 | 低 |

---

## ✅ 最终验证清单

- [ ] `parseLine` 能正确处理同时包含 text 和 thinking 的消息
- [ ] `parseLine` 能正确解析 tool_use/tool_result
- [ ] `readTranscript` 支持 offset/limit 分页
- [ ] 切换会话时清空流式消息状态
- [ ] `npm run build` 构建成功
- [ ] 会话列表正常显示
- [ ] 点击会话可加载历史消息（包含工具调用记录）
- [ ] 发送新消息可正常流式响应
- [ ] 刷新页面不会出现消息重复
- [ ] 费用统计不会因重连而重复累加

---

##   相关文档

- 原始方案：`docs/plans/2026-05-29-message-storage-dedup.md`
- 本文档：`docs/plans/2026-05-29-review-improvements.md`
