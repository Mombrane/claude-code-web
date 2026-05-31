# Proposal: Code Block Language Label, Ctrl+R Retry, Input Draft Persistence

## Summary
Three user experience improvements:
1. Show language badge on code blocks (e.g., "typescript", "bash")
2. Ctrl+R keyboard shortcut to retry the last message
3. Persist partially-typed input to localStorage to prevent data loss

## Motivation
- Code blocks lack language identification — users can't quickly tell what language a snippet is in
- Retry requires mouse click — keyboard-only users need a shortcut
- Pressing Escape or switching sessions loses typed text — frustrating for long messages

## Impact
- Frontend only (src/components/chat/MessageList.tsx, InputBar.tsx, AppLayout.tsx, i18n)
- No backend changes
- No breaking changes
