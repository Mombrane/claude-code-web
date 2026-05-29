# Tasks — Round 3

## Task 1: Error Boundary (🔴 Fix)
- [ ] Create `src/components/chat/MessageErrorBoundary.tsx` — class component with fallback UI
- [ ] Wrap each message in `MessageList.tsx` with `<MessageErrorBoundary>`
- [ ] Test: verify that a malformed message shows fallback instead of crashing

**Files**: `src/components/chat/MessageErrorBoundary.tsx` (new), `src/components/chat/MessageList.tsx`

## Task 2: Fix handlePaste (🔴 Fix)
- [ ] Fix `handlePaste` in `InputBar.tsx` — insert text at cursor position
- [ ] Single-line: use `setRangeText` to insert at cursor
- [ ] Multi-line: wrap in code block fence

**Files**: `src/components/chat/InputBar.tsx`

## Task 3: Await clipboard.writeText (🔴 Fix)
- [ ] Make copy handlers async in `MessageList.tsx`
- [ ] Add try/catch with console.warn on failure
- [ ] Add copied state to CopyButton (icon toggle for 2s)

**Files**: `src/components/chat/MessageList.tsx`

## Task 4: CommandPalette i18n (🔴 Fix)
- [ ] Replace hardcoded strings with `t()` calls in `AppLayout.tsx` CommandPalette section
- [ ] Verify i18n keys exist in both `en.ts` and `zh.ts`

**Files**: `src/components/layout/AppLayout.tsx`, `src/i18n/locales/en.ts`, `src/i18n/locales/zh.ts`

## Task 5: Conversation Export (🟢 Innovation)
- [ ] Create `src/components/chat/ExportButton.tsx`
- [ ] Add export button to chat header in `ChatPanel.tsx`
- [ ] Implement markdown generation from messages array
- [ ] Implement file download via Blob API

**Files**: `src/components/chat/ExportButton.tsx` (new), `src/components/chat/ChatPanel.tsx`

## Dependencies
- Tasks 1, 2, 3, 4, 5 are all independent (different files)
- Task 2 and Task 3 modify different files (InputBar vs MessageList)
- All tasks can run in parallel
