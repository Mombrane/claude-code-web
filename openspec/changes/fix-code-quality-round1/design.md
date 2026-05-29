# Design: Code Quality Fix Round 1

## Approach

Each fix is isolated to specific files. No architectural changes.

## Fix Details

### 1. Backend TypeScript Errors (claude-process.ts + types)

**Root cause:** `StreamEvent` type doesn't have `total_cost_usd` and `usage` fields, but code accesses them directly.

**Fix:** Add `total_cost_usd?: number` and `usage?: { input_tokens: number; output_tokens: number }` to `StreamEvent` type. These are top-level fields emitted by Claude CLI's stream-json format.

### 2. Ctrl+Enter Double Send (InputBar.tsx)

**Root cause:** `e.key === 'Enter' && !e.shiftKey` matches both Enter and Ctrl+Enter. Both code paths call `handleSend()`.

**Fix:** Add `&& !e.ctrlKey && !e.metaKey` to the plain Enter condition.

### 3. Type Synchronization (types/index.ts × 2)

**Root cause:** Frontend `Message.type` includes `tool_execution`, `file`, `patch`, `step_start`, `step_finish` that backend doesn't know about.

**Fix:** Add these types to server `Message.type` union. Also sync `ToolResultContent.toolName` field.

### 4. Deduplication (handler.ts)

**Root cause:** `${sessionId}-${costUsd}-${input_tokens}` can collide for different messages with same cost.

**Fix:** Use a monotonic counter per session: `${sessionId}-${counter++}`.

### 5. Memory Leak (ChatPanel.tsx)

**Root cause:** `toolExecutionIdMap` and `pendingResults` refs grow unbounded if tool_result never arrives.

**Fix:** Add 5-minute timeout for unpaired entries. On timeout, clean up the entry.

### 6. Clipboard Error Handling (MessageList.tsx)

**Root cause:** `navigator.clipboard.writeText()` throws in non-secure contexts.

**Fix:** Wrap in try/catch, show fallback (select text) or silent fail.

### 7. React Keys (MessageList.tsx)

**Root cause:** `key={i}` causes reconciliation issues on list reorder.

**Fix:** Use message ID or content hash as key where available.

## Files Modified

| File | Fixes |
|------|-------|
| `server/types/index.ts` | #1, #3 |
| `server/services/claude-process.ts` | #1 |
| `server/websocket/handler.ts` | #4 |
| `src/types/index.ts` | #3 |
| `src/components/chat/InputBar.tsx` | #2 |
| `src/components/chat/ChatPanel.tsx` | #5 |
| `src/components/chat/MessageList.tsx` | #6, #7 |
