# Fix: ChatPanel Streaming Text Stale Closure Bug

## Problem
`src/components/chat/ChatPanel.tsx` has a React stale closure bug in the streaming text handling. The `streamingText` state variable is captured in WebSocket event handler closures, but the effect re-runs on every character received (because `streamingText` is in the dependency array).

**Symptoms:**
1. Assistant messages may be saved with empty/stale content
2. WebSocket event listeners are destroyed and recreated on every streaming character
3. Events during the unsubscribe-resubscribe window may be lost
4. `handleStopStreaming` may capture stale `streamingText`

## Solution
Use `useRef` to store the latest streaming text value for closures to read, removing `streamingText` from the effect's dependency array.

## Specific Changes

### File: `src/components/chat/ChatPanel.tsx`

1. Add a ref to track streaming text:
   - Add `useRef` to the import from 'react'
   - Add `const streamingTextRef = useRef<string>('');` after the existing state declarations
   - Add a sync effect: `useEffect(() => { streamingTextRef.current = streamingText; }, [streamingText]);`

2. In the main WebSocket effect (the one with `wsClient.on('stream', ...)`):
   - In the `result` handler: replace `if (streamingText)` with `const text = streamingTextRef.current; if (text)` and use `text` instead of `streamingText` in the `addMessage` call
   - After saving the message, also set `streamingTextRef.current = '';`
   - **Remove `streamingText` from the dependency array** — it should only depend on `[currentSessionId, addMessage]`

3. Fix `handleStopStreaming`:
   - Replace `if (streamingText && currentSessionId)` with reading from ref: `const text = streamingTextRef.current; if (text && currentSessionId)`
   - Use `text` instead of `streamingText` in the `addMessage` call
   - After saving, set `streamingTextRef.current = '';`
   - Remove `streamingText` from the `useCallback` dependency array

## Constraints
- Do NOT modify any other files
- Do NOT change the WebSocket protocol or message format
- Do NOT change the state management approach (keep Zustand store as-is)
- Preserve all existing functionality (streaming display, tool_use, thinking, error handling)
