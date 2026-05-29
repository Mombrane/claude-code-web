# Technical Design — Round 3

## 1. Error Boundary for MessageList

### Architecture
- New file: `src/components/chat/MessageErrorBoundary.tsx`
- Class component (React requires class components for Error Boundaries)
- Wraps each message in MessageList.tsx with `<MessageErrorBoundary>`
- Fallback UI: red-tinted card with error message + "Retry" button
- Retry clears the error state, triggering re-render

### Key Decisions
- Wrap per-message (not whole list) — one bad message shouldn't hide all others
- Log errors to console for debugging
- Show truncated error message in fallback (not full stack)

## 2. Fix handlePaste

### Architecture
- In `InputBar.tsx`, `handlePaste` currently reads clipboard data but returns early for multi-line and does nothing for single-line
- Fix: Insert pasted text at cursor position using `textarea.setRangeText()`
- For multi-line: wrap in code block (``` fenced block)
- Update the ref's value and trigger onChange

### Key Decisions
- Use `setRangeText` for proper cursor position handling
- Multi-line → code block wrapping follows markdown convention
- Don't prevent default for single-line (let React handle it naturally after insertion)

## 3. Await clipboard.writeText

### Architecture
- In `MessageList.tsx`, `CopyButton` and per-message copy button both use `navigator.clipboard.writeText()` without await
- Fix: Make handlers async, add try/catch, toggle icon (copy → check) for 2 seconds on success
- Add a `copied` state to CopyButton component

### Key Decisions
- 2-second timeout to reset icon back to copy
- On error: console.warn + show brief error state (red icon)
- HTTP context: clipboard API may fail — the try/catch handles this

## 4. CommandPalette i18n

### Architecture
- `CommandPalette` is inline in `AppLayout.tsx` (lines 387-506)
- i18n keys exist in `en.ts` and `zh.ts` but aren't used
- Fix: Replace hardcoded English strings with `t('command.xxx')` calls

### Key Decisions
- Only replace display strings, not keyboard shortcut labels (those are universal)
- Ensure all i18n keys are actually defined in both locale files

## 5. Conversation Export (Markdown)

### Architecture
- New file: `src/components/chat/ExportButton.tsx`
- Button in chat header (next to status indicator)
- Generates markdown from `messages` array:
  - User messages: `## User\n\n<content>`
  - Assistant messages: `## Assistant\n\n<content>`
  - Tool executions: `### Tool: <name>\n\n```json\n<input>\n```\n\n<result>`
  - Thinking blocks: `<details><summary>Thinking</summary>\n\n<content>\n</details>`
- Triggers browser download via `URL.createObjectURL` + `<a>` click
- Filename: `session-<id>-<date>.md`

### Key Decisions
- Pure client-side (no server needed)
- Use Blob API for file generation
- Include session metadata (date, cost, tokens) as frontmatter
