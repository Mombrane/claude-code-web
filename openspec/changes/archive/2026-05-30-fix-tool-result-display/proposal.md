# Proposal: Fix Tool Result Display

## Problem

claude-code-web 的工具调用（Bash、Read、Edit、Grep 等）结果**完全不显示**。用户看到工具调用卡片（如 "Bash: npm install"），但永远看不到执行结果。这是一个功能性 bug。

根因：`claude-process.ts` 的 `handleClaudeEvent` 只处理 `system`、`assistant`、`result` 三种事件类型，缺少 `case 'user':` 分支。Claude Code stream-json 格式中，工具结果是 `type: 'user'` 事件，被 default 分支静默丢弃。

## Scope

修复 3 个关联问题（同一个功能链路）：

1. **后端事件丢失**：`handleClaudeEvent` 缺少 `user` 事件处理 → 工具结果不发送到前端
2. **类型缺少 toolName**：`ToolResultContent` 没有 `toolName` 字段 → 无法做差异化渲染
3. **工具调用/结果未配对**：`tool_use` 和 `tool_result` 是独立消息 → 视觉上不关联

## Impact

- 修复前：用户看到工具调用但看不到结果，信息严重缺失
- 修复后：工具调用和结果配对显示，不同工具有差异化渲染

## Files Affected

- `server/services/claude-process.ts` — 添加 `user` 事件处理
- `server/types/index.ts` — ToolResultContent 增加 toolName
- `src/types/index.ts` — 前端类型同步
- `server/websocket/handler.ts` — tool_result 事件附带 toolName
- `src/components/chat/ChatPanel.tsx` — tool_use/tool_result 配对逻辑
- `src/components/chat/MessageList.tsx` — 差异化渲染 + 配对 UI
