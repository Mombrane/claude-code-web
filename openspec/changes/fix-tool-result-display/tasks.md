# Tasks: Fix Tool Result Display

## Task 1: 后端 — 修复 tool_result 事件处理

**文件**: `server/services/claude-process.ts`, `server/types/index.ts`

- [ ] 1.1 在 `handleClaudeEvent` 的 switch 中添加 `case 'user':` 分支，遍历 `event.message.content`，提取 `tool_result` 块
- [ ] 1.2 添加 `pendingToolNames: Map<string, string>` 缓存，在 `tool_use` 事件中记录 `toolUseId → toolName`
- [ ] 1.3 emit `user:tool_result` 时附带 `toolName`（从缓存中取）
- [ ] 1.4 更新 `server/types/index.ts` 的 `StreamEvent` 或相关类型，确保 user 事件结构被正确解析
- [ ] 1.5 在 `handleClaudeEvent` 中也处理 `user` 事件中的 `tool_result` 的 `content` 字段（可能是 string 或数组）

## Task 2: 后端 — WebSocket 事件传递 toolName

**文件**: `server/websocket/handler.ts`

- [ ] 2.1 修改 `user:tool_result` 事件的 broadcast，确保 `toolName` 字段被传递到前端
- [ ] 2.2 在 `setupClaudeEventHandlers` 中确保事件名一致（`user:tool_result` → `tool_result` stream event）

## Task 3: 前端类型 + 配对逻辑

**文件**: `src/types/index.ts`, `src/components/chat/ChatPanel.tsx`

- [ ] 3.1 在 `src/types/index.ts` 中添加 `ToolExecutionContent` 接口
- [ ] 3.2 在 `Message` type 联合类型中添加 `'tool_execution'`
- [ ] 3.3 在 `ChatPanel.tsx` 中修改 `tool_use` 事件处理：创建 `tool_execution` 消息（status: 'running'）
- [ ] 3.4 在 `ChatPanel.tsx` 中修改 `tool_result` 事件处理：通过 `toolUseId` 找到对应的 `tool_execution` 消息，更新 output/isError/status
- [ ] 3.5 处理 edge case：如果 tool_result 先到达（找不到配对的 tool_execution），缓存到 pendingResults Map

## Task 4: 前端 — 差异化渲染

**文件**: `src/components/chat/MessageList.tsx`

- [ ] 4.1 新增 `ToolExecutionCard` 组件：头部（图标+工具名+输入摘要）+ 身体（结果）+ 状态灯
- [ ] 4.2 Bash 结果渲染：monospace 终端样式，绿色文字，exit code 状态灯
- [ ] 4.3 Read 结果渲染：代码块 + 语法高亮（复用现有的 rehype-highlight）
- [ ] 4.4 Edit 结果渲染：diff 视图（复用现有的 PatchContent 渲染逻辑）
- [ ] 4.5 Grep/Glob 结果渲染：文件列表，每行显示文件路径 + 匹配行
- [ ] 4.6 默认渲染：纯文本（fallback）
- [ ] 4.7 在 `renderMessage` 的 switch 中添加 `case 'tool_execution':` 路由到 ToolExecutionCard
- [ ] 4.8 保留原有的 `tool_use` 和 `tool_result` case 作为向后兼容（未配对的情况）

## Dependencies

```
Task 1 (后端事件) → Task 2 (WebSocket 传递) → Task 3 (前端配对) → Task 4 (差异化渲染)
```

所有任务有依赖关系，需按顺序执行。但 Task 1-2（后端）和 Task 3-4（前端）可以在确认接口后并行。

## Verification

- [ ] `npm run build` 编译通过
- [ ] `npm run dev` 启动后，在浏览器中发送一个会触发工具调用的消息（如 "列出当前目录的文件"）
- [ ] 确认工具调用和结果配对显示
- [ ] 确认 Bash 结果有终端样式
- [ ] 确认 Read 结果有代码高亮
