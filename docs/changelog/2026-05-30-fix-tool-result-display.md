# Fix Tool Result Display — Tool Execution Pairing & Differentiated Rendering

**Date:** 2026-05-30
**Commit:** 7909327
**Cost:** ~$0.50 (2 Claude Code calls)
**Duration:** ~15 minutes

## Requirement

claude-code-web 的工具调用结果完全不显示。用户看到工具调用卡片（如 "Bash: npm install"），但永远看不到执行结果。需要修复并实现差异化渲染。

## Analysis

通过对比 OpenCode/Crush 的源码和 claude-code-web 的源码，发现 3 个关联问题：

1. **后端事件丢失**：`claude-process.ts` 的 `handleClaudeEvent` 只处理 `system`、`assistant`、`result` 三种事件类型，缺少 `case 'user':` 分支。Claude Code stream-json 格式中工具结果是 `type: 'user'` 事件，被 default 分支静默丢弃。
2. **类型缺少 toolName**：`ToolResultContent` 没有 `toolName` 字段，无法做差异化渲染。
3. **工具调用/结果未配对**：`tool_use` 和 `tool_result` 是独立消息，视觉上不关联。

## Sub-tasks

| # | Description | Files | Status |
|---|-------------|-------|--------|
| 1 | 后端：添加 `user` 事件处理 + pendingToolNames 缓存 | `server/services/claude-process.ts` | ✅ |
| 2 | 后端：ToolResultContent 增加 toolName | `server/types/index.ts` | ✅ |
| 3 | 前端：ToolExecutionContent 类型 + tool_execution 消息类型 | `src/types/index.ts` | ✅ |
| 4 | 前端：tool_use/tool_result 配对逻辑 + pendingResults Map | `src/components/chat/ChatPanel.tsx` | ✅ |
| 5 | 前端：updateMessage 方法 | `src/stores/sessionStore.ts` | ✅ |
| 6 | 前端：ToolExecutionCard + 5 种差异化渲染器 | `src/components/chat/MessageList.tsx` | ✅ |

## Changes

```diff
# Backend: claude-process.ts — Add 'user' event handling
+ case 'user':
+   if (event.message?.content) {
+     for (const block of event.message.content) {
+       if (block.type === 'tool_result') {
+         const toolName = this.pendingToolNames.get(block.tool_use_id) || 'unknown';
+         this.emit('user:tool_result', sessionId, { toolUseId, toolName, output, isError });
+       }
+     }
+   }

# Frontend: ChatPanel.tsx — Pair tool_use and tool_result
- case 'tool_use': addMessage({ type: 'tool_use', ... })
+ case 'tool_use': addMessage({ type: 'tool_execution', status: 'running', ... })
- case 'tool_result': addMessage({ type: 'tool_result', ... })
+ case 'tool_result': updateMessage(existing.msgId, { output, status: 'completed' })

# Frontend: MessageList.tsx — Differentiated renderers
+ BashResult — terminal style, green monospace, exit code badge
+ ReadResult — file header + code block
+ EditResult — diff view with red/green line coloring
+ GrepGlobResult — file list with blue-highlighted paths
+ PlainTextResult — fallback
```

## Review Findings

无严重问题。代码结构清晰，向后兼容旧的 tool_use/tool_result 消息格式。

## Verification

- [x] TypeScript compiles
- [x] Build succeeds (`npm run build` — 432ms)
- [x] Browser renders correctly (session list + old messages)
- [x] New session created and executed ($0.28, 50.4k tokens)
- [x] Backward compatibility: old tool_use/tool_result messages still render

## Learnings

- Claude Code stream-json 的 `user` 事件类型容易被忽略（switch default 静默丢弃）
- 工具调用配对需要处理乱序到达的 edge case（pendingResults Map）
- Crush 的 FileTracker 设计值得参考——per-session 追踪文件读写

## Related

- Skill: `claude-code-web-optimization` (analysis framework)
- Skill: `hermes-technical-lead-workflow` (execution workflow)
- OpenSpec: `openspec/changes/fix-tool-result-display/`
