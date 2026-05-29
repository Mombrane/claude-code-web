# Changelog: Code Quality Fix Round 1

**Date:** 2026-05-30
**Commit:** 4d61015
**Files:** 8 files, +268/-41 lines

## Summary

First round of code quality fixes for claude-code-web, addressing accumulated technical debt from rapid feature development.

## Changes

### P0 — Critical Fixes

1. **Backend TypeScript Errors (12 → 0)**
   - Added `total_cost_usd` and `usage` fields to `StreamEvent` type
   - Fixed `ClaudeSession.process` from `any` to `ChildProcess | null`
   - Added missing `ClaudeSession` fields (cwd, model, permissionMode, allowedTools)
   - Fixed `projects.ts` Express type casting

2. **Ctrl+Enter Double Send**
   - Added `!e.ctrlKey && !e.metaKey` to Enter key handler
   - Removed redundant Ctrl+Enter handler

3. **Frontend/Backend Type Sync**
   - Added `tool_execution`, `file`, `patch`, `step_start`, `step_finish` to server Message type
   - Added `ToolExecutionContent`, `FileContent`, `PatchContent` interfaces
   - Synced `ToolResultContent.toolName` field

### P1 — Quality Improvements

4. **Message Deduplication**
   - Replaced weak cost+tokens hash with monotonic counter per session

5. **Memory Leak Fix**
   - Added 5-minute timeout for unpaired tool_use/tool_result entries
   - Periodic cleanup every 60 seconds

6. **Clipboard Error Handling**
   - Wrapped `navigator.clipboard.writeText()` in try/catch

7. **React Keys**
   - Replaced all `key={i}` with stable keys using content hash

## Verification

- ✅ `npx tsc --noEmit` — 0 errors (frontend)
- ✅ `npx tsc --noEmit -p tsconfig.server.json` — 0 errors (backend)
- ✅ `npm run build` — success
- ✅ Browser: HomePage loads, zero console errors
- ✅ Browser: Chat page renders 94 tool cards, zero JS errors

## Known Remaining Issues

- WebSocket disconnects on page load (pre-existing, not from this change)
- No WebSocket authentication (requires architecture discussion)
- Diff highlighting false positives for non-diff +/- lines
- ReactMarkdown XSS risk (no rehype-sanitize)
