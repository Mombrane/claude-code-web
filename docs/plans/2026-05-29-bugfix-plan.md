# Bug Fix Implementation Plan (2026-05-29)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 4 bugs: message loading failure (critical), file editor failure (high), HTML button nesting (medium), and session naming (low).

**Architecture:** Each bug is isolated to a single file or small set of files. Bug #1 is server-side (CLI args), Bug #2 is frontend (Monaco fallback), Bug #3 is frontend (HTML validity), Bug #4 is server-side (session metadata). No dependencies between bugs — they can be fixed in any order or in parallel.

**Tech Stack:** TypeScript, React, Node.js, Monaco Editor, Claude Code CLI

---

## Bug Dependency Graph

```
Bug #1 (CRITICAL) ─── no dependencies ─── can fix independently
Bug #2 (HIGH)     ─── no dependencies ─── can fix independently
Bug #3 (MEDIUM)   ─── no dependencies ─── can fix independently
Bug #4 (LOW)      ─── no dependencies ─── can fix independently
```

All 4 bugs are independent. They can be fixed in any order or in parallel.

---

### Task 1: Fix Message Loading Failure (Bug #1 — CRITICAL)

**Root Cause:** The Claude Code CLI is invoked without `--session-id`, so it generates its own UUID internally. The Web UI tracks a different UUID. When the UI tries to read `.jsonl` transcripts using its UUID as the filename, the file doesn't exist because the CLI wrote to a different filename.

**Files:**
- Modify: `server/services/claude-process.ts:50-56`

- [ ] **Step 1: Add `--session-id` to CLI args**

In `server/services/claude-process.ts`, the `sendMessage()` method builds the CLI args array at line 50. Add `'--session-id', sessionId` to ensure the CLI uses the same UUID as the Web UI.

Change this:
```typescript
    const args = [
      '-p', '--verbose',
      '--output-format', 'stream-json',
      '--continue',
      '--fork-session',
      '--permission-mode', session.permissionMode || 'auto',
    ];
```

To this:
```typescript
    const args = [
      '-p', '--verbose',
      '--output-format', 'stream-json',
      '--session-id', sessionId,
      '--continue',
      '--fork-session',
      '--permission-mode', session.permissionMode || 'auto',
    ];
```

- [ ] **Step 2: Verify the fix**

1. Start the dev server: `npm run dev`
2. Create a new session from the Web UI
3. Send a message
4. Check that a `.jsonl` file exists in `~/.claude/projects/*/sessions/` with the session ID from the Web UI
5. Refresh the page — the conversation history should load correctly

- [ ] **Step 3: Commit**

```bash
git add server/services/claude-process.ts
git commit -m "fix: pass --session-id to Claude CLI so .jsonl filenames match Web UI session UUID"
```

---

### Task 2: Fix File Editor (Monaco) Failure (Bug #2 — HIGH)

**Root Cause:** Monaco Editor loads from a CDN. If the CDN is unreachable (firewall, offline, slow network), the component shows nothing — no loading indicator, no fallback, no error. The existing `error` state only catches file read/write errors, not Monaco load failures.

**Files:**
- Modify: `src/components/files/FileEditor.tsx`

- [ ] **Step 1: Add loading state and error boundary for Monaco**

In `FileEditor.tsx`, the `<Editor>` component from `@monaco-editor/react` supports `loading` and `onValidate` props, but does NOT have a built-in timeout or error callback for CDN failures. We need to:

1. Add a `monacoLoadError` state
2. Add a loading fallback UI
3. Add a timeout that triggers the fallback if Monaco doesn't load within 10 seconds
4. Add a textarea fallback for basic editing

Replace the entire `FileEditor.tsx` with the following. The key changes are:
- New `monacoLoaded` and `monacoLoadError` states (lines 17-18)
- A `useEffect` with a 10-second timeout to detect Monaco load failure (lines 22-34)
- A loading spinner shown while Monaco loads (lines 196-210)
- A textarea fallback if Monaco fails to load (lines 212-230)
- The original Monaco Editor wrapped in an error boundary (lines 232-255)

```typescript
import { useState, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { api } from '../../api/client';

interface FileEditorProps {
  filePath: string;
  onClose: () => void;
}

export function FileEditor({ filePath, onClose }: FileEditorProps) {
  const [content, setContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [language, setLanguage] = useState<string>('plaintext');
  const [totalLines, setTotalLines] = useState(0);
  const [isModified, setIsModified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [monacoLoaded, setMonacoLoaded] = useState(false);
  const [monacoLoadError, setMonacoLoadError] = useState(false);

  useEffect(() => {
    loadFile();
  }, [filePath]);

  // Timeout: if Monaco doesn't load within 10s, switch to textarea fallback
  useEffect(() => {
    if (monacoLoaded || monacoLoadError) return;
    const timer = setTimeout(() => {
      if (!monacoLoaded) {
        setMonacoLoadError(true);
      }
    }, 10000);
    return () => clearTimeout(timer);
  }, [monacoLoaded, monacoLoadError]);

  const loadFile = async () => {
    try {
      setError(null);
      const data = await api.readFile(filePath);
      setContent(data.content);
      setOriginalContent(data.content);
      setLanguage(data.language);
      setTotalLines(data.totalLines);
      setIsModified(false);
    } catch (e: any) {
      setError(e.message || 'Failed to load file');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.writeFile(filePath, content);
      setOriginalContent(content);
      setIsModified(false);
    } catch (e: any) {
      setError(e.message || 'Failed to save file');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevert = useCallback(() => {
    if (isModified) {
      setContent(originalContent);
      setIsModified(false);
    }
  }, [isModified, originalContent]);

  const handleChange = (value: string | undefined) => {
    if (value !== undefined) {
      setContent(value);
      setIsModified(value !== originalContent);
    }
  };

  const handleEditorMount = (editor: any) => {
    setMonacoLoaded(true);
    editor.onDidChangeCursorPosition((e: any) => {
      setCursorPosition({
        line: e.position.lineNumber,
        column: e.position.column,
      });
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      // Let Monaco handle undo
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  // Parse file path for breadcrumbs
  const pathParts = filePath.split('/').filter(Boolean);
  const fileName = pathParts.pop() || '';
  const directory = pathParts.join('/');

  // File size
  const fileSize = new Blob([content]).size;
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex flex-col h-full bg-gradient-subtle">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800/60 border-b border-gray-700/50">
        <div className="flex items-center gap-3">
          {/* File icon */}
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-white text-sm font-medium">{fileName}</span>
            {isModified && (
              <span className="w-2 h-2 rounded-full bg-yellow-400" title="Modified" />
            )}
          </div>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <span>{directory}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* File info */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>{language}</span>
            <span>{totalLines} lines</span>
            <span>{formatSize(fileSize)}</span>
          </div>

          {/* Separator */}
          <div className="w-px h-4 bg-gray-700/50" />

          {/* Actions */}
          {isModified && (
            <button
              onClick={handleRevert}
              className="px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-700/50 rounded transition-colors"
              title="Revert changes"
            >
              Revert
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!isModified || isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600/80 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isSaving ? (
              <>
                <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Save
                <kbd className="ml-1 px-1 py-0.5 bg-blue-700/50 rounded text-[10px]">⌘S</kbd>
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-md transition-colors"
            title="Close (Esc)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Editor */}
      {error ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <svg className="w-12 h-12 mx-auto mb-4 text-red-400/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-red-400 mb-2">{error}</p>
            <button
              onClick={loadFile}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      ) : monacoLoadError ? (
        // Textarea fallback when Monaco fails to load
        <div className="flex-1 flex flex-col" onKeyDown={handleKeyDown}>
          <div className="px-4 py-1.5 bg-yellow-900/20 border-b border-yellow-700/30 text-[11px] text-yellow-400">
            Monaco Editor failed to load. Using basic editor. Check your network connection.
          </div>
          <textarea
            className="flex-1 w-full bg-[#1e1e1e] text-gray-200 p-4 font-mono text-sm resize-none focus:outline-none"
            value={content}
            onChange={(e) => handleChange(e.target.value)}
            spellCheck={false}
          />
        </div>
      ) : !monacoLoaded ? (
        // Loading spinner while Monaco loads
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <svg className="w-8 h-8 mx-auto mb-3 animate-spin text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <p className="text-gray-400 text-sm">Loading editor...</p>
          </div>
        </div>
      ) : null}

      {/* Monaco Editor (always rendered, hidden when fallback is shown) */}
      <div className={`flex-1 ${error || monacoLoadError ? 'hidden' : ''}`} onKeyDown={handleKeyDown}>
        <Editor
          height="100%"
          language={language}
          value={content}
          onChange={handleChange}
          onMount={handleEditorMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            renderWhitespace: 'selection',
            tabSize: 2,
            wordWrap: 'on',
            automaticLayout: true,
            scrollBeyondLastLine: false,
            padding: { top: 12, bottom: 12 },
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            bracketPairColorization: { enabled: true },
            guides: {
              bracketPairs: true,
              indentation: true,
            },
          }}
        />
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-gray-800/60 border-t border-gray-700/50 text-[11px] text-gray-500">
        <div className="flex items-center gap-4">
          <span>Ln {cursorPosition.line}, Col {cursorPosition.column}</span>
          <span>{language}</span>
          <span>UTF-8</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Spaces: 2</span>
          <span>{formatSize(fileSize)}</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the fix**

1. Start the dev server: `npm run dev`
2. Open a file in the editor — verify Monaco loads with a spinner
3. To test the fallback: block the CDN (`monaco-editor` loads from `cdn.jsdelivr.net`) or set a slow network in DevTools
4. After 10 seconds, the textarea fallback should appear with a yellow warning banner
5. Verify Ctrl+S still works in the textarea fallback

- [ ] **Step 3: Commit**

```bash
git add src/components/files/FileEditor.tsx
git commit -m "fix: add loading spinner and textarea fallback for Monaco Editor CDN failures"
```

---

### Task 3: Fix HTML Button Nesting (Bug #3 — MEDIUM)

**Root Cause:** The project list in `HomePage.tsx` renders a `<button>` (line 174) wrapping each project item, and inside it there's another `<button>` (line 194) for the delete action. Nested `<button>` elements are invalid HTML. Browsers auto-close the outer button when encountering the inner one, breaking layout and click behavior.

**Files:**
- Modify: `src/pages/HomePage.tsx:173-203`

- [ ] **Step 1: Replace outer `<button>` with `<div>` and fix nesting**

In `HomePage.tsx`, replace the project list rendering (lines 173-203). The outer `<button>` becomes a `<div role="button" tabIndex={0}>` with keyboard event handling. The inner `<button>` stays as-is since it's now properly nested inside a `<div>`.

Change this (lines 173-203):
```tsx
          {projects.map(project => (
            <button
              key={project.id}
              onClick={() => setSelectedProject(project.worktree)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-all duration-200 group ${
                selectedProject === project.worktree
                  ? 'bg-gray-700/80 text-white'
                  : 'text-gray-400 hover:bg-gray-700/40 hover:text-white'
              }`}
            >
              <div className={`w-7 h-7 rounded-md flex items-center justify-center text-sm ${
                selectedProject === project.worktree
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-gray-700/50 text-gray-500'
              }`}>
                {project.icon?.override || ' '}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{project.name}</div>
                <div className="text-[11px] text-gray-500 truncate">{project.worktree}</div>
              </div>
              <button
                onClick={(e) => handleDeleteProject(project.id, e)}
                className="p-1 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all"
                title="Remove project"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </button>
          ))}
```

To this:
```tsx
          {projects.map(project => (
            <div
              key={project.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedProject(project.worktree)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedProject(project.worktree);
                }
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-all duration-200 group cursor-pointer ${
                selectedProject === project.worktree
                  ? 'bg-gray-700/80 text-white'
                  : 'text-gray-400 hover:bg-gray-700/40 hover:text-white'
              }`}
            >
              <div className={`w-7 h-7 rounded-md flex items-center justify-center text-sm ${
                selectedProject === project.worktree
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-gray-700/50 text-gray-500'
              }`}>
                {project.icon?.override || ' '}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{project.name}</div>
                <div className="text-[11px] text-gray-500 truncate">{project.worktree}</div>
              </div>
              <button
                onClick={(e) => handleDeleteProject(project.id, e)}
                className="p-1 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all"
                title="Remove project"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
```

Changes:
- Outer `<button>` → `<div role="button" tabIndex={0}>`
- Added `onKeyDown` handler for Enter/Space keyboard accessibility
- Added `cursor-pointer` to maintain the clickable cursor style
- Inner `<button>` unchanged (now valid HTML since parent is `<div>`)

- [ ] **Step 2: Verify the fix**

1. Start the dev server: `npm run dev`
2. Navigate to the home page with projects listed
3. Click on a project — should navigate to it
4. Hover over a project — the X delete button should appear
5. Click the X — should trigger delete (not break the layout)
6. Tab to a project and press Enter — should select it
7. Run browser DevTools Lighthouse accessibility audit — no more nested button warning

- [ ] **Step 3: Commit**

```bash
git add src/pages/HomePage.tsx
git commit -m "fix: replace outer button with div to resolve invalid HTML button nesting"
```

---

### Task 4: Fix Session Naming (Bug #4 — LOW)

**Root Cause:** Sessions are created with a generic name like `"Session 5/29/2026, 10:30:00 AM"`. The `handleChatMessage` handler in `handler.ts` sends messages to Claude but never updates the session name based on the conversation content.

**Files:**
- Modify: `server/websocket/handler.ts:266-293`

- [ ] **Step 1: Auto-generate session name from first user message**

In `handler.ts`, after successfully sending the first message to Claude, check if the session has a generic name (starts with "Session ") and update it with a truncated version of the user's message.

Change the `handleChatMessage` method (lines 266-293):
```typescript
  private async handleChatMessage(ws: WebSocket, payload: { sessionId: string; message: string }) {
    const { sessionId, message: userMessage } = payload;

    // No need to save user message here - Claude Code handles that in its .jsonl transcript

    // Check if session exists in process manager
    if (!claudeProcessManager.isSessionActive(sessionId)) {
      // Try to resume session
      const session = await sessionStore.getSession(sessionId);
      if (session) {
        // Spawn new process for existing session
        await claudeProcessManager.spawnSession({
          sessionId,
          cwd: session.cwd,
          model: session.model,
        });
      } else {
        this.sendError(ws, 'Session not found');
        return;
      }
    }

    // Send message to Claude
    const sent = await claudeProcessManager.sendMessage(sessionId, userMessage);
    if (!sent) {
      this.sendError(ws, 'Failed to send message to Claude');
    }
  }
```

To this:
```typescript
  private async handleChatMessage(ws: WebSocket, payload: { sessionId: string; message: string }) {
    const { sessionId, message: userMessage } = payload;

    // No need to save user message here - Claude Code handles that in its .jsonl transcript

    // Check if session exists in process manager
    if (!claudeProcessManager.isSessionActive(sessionId)) {
      // Try to resume session
      const session = await sessionStore.getSession(sessionId);
      if (session) {
        // Spawn new process for existing session
        await claudeProcessManager.spawnSession({
          sessionId,
          cwd: session.cwd,
          model: session.model,
        });
      } else {
        this.sendError(ws, 'Session not found');
        return;
      }
    }

    // Send message to Claude
    const sent = await claudeProcessManager.sendMessage(sessionId, userMessage);
    if (!sent) {
      this.sendError(ws, 'Failed to send message to Claude');
      return;
    }

    // Auto-name session from first user message if it still has the default name
    const session = await sessionStore.getSession(sessionId);
    if (session && session.name.startsWith('Session ')) {
      const autoName = userMessage.length > 50
        ? userMessage.slice(0, 50).trim() + '...'
        : userMessage.trim();
      await sessionStore.updateSessionName(sessionId, autoName);
    }
  }
```

Changes:
- Added `return` after the send error to avoid running the naming logic on failure
- After sending, fetch the session and check if it still has the default `"Session "` prefix
- If so, truncate the user message to 50 chars and update the session name
- Uses the existing `sessionStore.updateSessionName()` method (already defined at line 146 of session-store.ts)

- [ ] **Step 2: Verify the fix**

1. Start the dev server: `npm run dev`
2. Create a new session (it will have a name like "Session 5/29/2026, ...")
3. Send a message like "Help me fix the authentication bug in my Express app"
4. Check the session list — the session name should now be "Help me fix the authentication bug in my Express app"
5. Send another message — the name should NOT change (it only auto-names once)
6. Test with a very long message (>50 chars) — verify it truncates with "..."

- [ ] **Step 3: Commit**

```bash
git add server/websocket/handler.ts
git commit -m "feat: auto-generate session name from first user message (truncated to 50 chars)"
```

---

## Verification Checklist

After all 4 tasks are complete:

- [ ] Message loading works — send a message, refresh the page, history loads
- [ ] File editor works — open a file, Monaco loads with spinner, edit and save
- [ ] File editor fallback works — block CDN, textarea fallback appears after 10s
- [ ] No nested button warnings — DevTools console clean, Lighthouse audit passes
- [ ] Session auto-naming works — first message becomes session name
- [ ] No regressions — chat, terminal, session management all still work
- [ ] All 4 commits are clean and atomic
