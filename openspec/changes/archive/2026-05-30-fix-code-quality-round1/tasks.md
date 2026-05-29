# Tasks: Code Quality Fix Round 1

## Task 1: Fix Backend TypeScript Errors
**Files:** `server/types/index.ts`, `server/services/claude-process.ts`
**Dependency:** None

- [ ] Add `total_cost_usd?: number` and `usage?: { input_tokens: number; output_tokens: number }` to `StreamEvent` in `server/types/index.ts`
- [ ] Verify `claude-process.ts` lines 189-190 now type-check
- [ ] Fix `ClaudeSession.process` type from `any` to `ChildProcess | null`
- [ ] Run `npx tsc --noEmit -p tsconfig.server.json` — expect 0 errors

## Task 2: Fix Ctrl+Enter Double Send
**Files:** `src/components/chat/InputBar.tsx`
**Dependency:** None

- [ ] In the keyDown handler, add `&& !e.ctrlKey && !e.metaKey` to the plain Enter condition
- [ ] Verify Ctrl+Enter only fires once (add console.log temporarily if needed)

## Task 3: Sync Frontend/Backend Types
**Files:** `server/types/index.ts`, `src/types/index.ts`
**Dependency:** Task 1

- [ ] Add `tool_execution`, `file`, `patch`, `step_start`, `step_finish` to server `Message.type`
- [ ] Add `toolName?: string` to server `ToolResultContent`
- [ ] Verify both frontend and backend `tsc --noEmit` pass

## Task 4: Improve Message Deduplication
**Files:** `server/websocket/handler.ts`
**Dependency:** None

- [ ] Replace cost+tokens hash with monotonic counter per session
- [ ] Keep `processedResults` cleanup logic (threshold 1000, keep 500)

## Task 5: Fix Tool Pairing Memory Leak
**Files:** `src/components/chat/ChatPanel.tsx`
**Dependency:** None

- [ ] Add timeout (5 minutes) for entries in `toolExecutionIdMap` and `pendingResults`
- [ ] On timeout, remove the entry and log a warning

## Task 6: Add Clipboard Error Handling
**Files:** `src/components/chat/MessageList.tsx`
**Dependency:** None

- [ ] Wrap all `navigator.clipboard.writeText()` calls in try/catch
- [ ] On error, silently fail (no crash)

## Task 7: Fix React Keys
**Files:** `src/components/chat/MessageList.tsx`
**Dependency:** None

- [ ] Replace `key={i}` with stable keys (message ID, content hash, or tool_use_id)
- [ ] Check all `.map()` calls in the file

## Verification

- [ ] `npx tsc --noEmit` — 0 errors (frontend)
- [ ] `npx tsc --noEmit -p tsconfig.server.json` — 0 errors (backend)
- [ ] `npm run build` — success
- [ ] Browser: open session, check console — no errors
- [ ] Browser: verify tool cards render correctly
