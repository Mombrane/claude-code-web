# Proposal: Code Quality Fix Round 1

## Why

claude-code-web has accumulated technical debt from rapid feature development:
- Backend has 12 TypeScript compilation errors (type mismatches)
- InputBar has a double-send bug on Ctrl+Enter
- Frontend/backend type definitions are out of sync
- Several code quality issues (memory leaks, weak dedup, missing error handling)

These issues affect type safety, reliability, and maintainability.

## What

Fix P0 (critical bugs) and P1 (important quality) issues:

1. **Backend TypeScript errors** — Align `StreamEvent` type with actual Claude CLI output format
2. **Ctrl+Enter double send** — Fix InputBar keyboard handler to not fire `handleSend()` twice
3. **Type synchronization** — Align frontend and backend `Message`/`StreamEvent` types
4. **Deduplication improvement** — Use monotonic counter instead of cost+tokens hash
5. **Memory leak fix** — Add timeout cleanup for unpaired tool_use entries
6. **Clipboard error handling** — Wrap `navigator.clipboard` in try/catch
7. **React key fix** — Replace `key={i}` with stable keys

## Scope

- **In scope:** 7 files across frontend and backend
- **Out of scope:** New features, P2 items, WebSocket auth (requires architecture discussion)
