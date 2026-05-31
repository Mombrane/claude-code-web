# Proposal: Theme Support Completion & Session Tags

## Why

The claude-code-web application has inconsistent theme support. While some components (Sidebar, ChatPanel, FilePickerModal) properly respond to theme changes, critical pages like HomePage and SettingsPanel are hardcoded dark-mode only. This creates a broken user experience when switching to light theme.

Additionally, as users accumulate many sessions, they need a way to organize and categorize them beyond just status filtering. A lightweight tagging system would help users quickly find relevant sessions.

## What

### Theme Support Completion
1. **HomePage.tsx** - Add theme prop, convert all hardcoded dark styles to theme-aware
2. **SettingsPanel.tsx** - Add theme prop, convert all hardcoded dark styles to theme-aware  
3. **DiffViewer.tsx** - Add theme prop for consistency
4. **KeyboardShortcutsDialog.tsx** - Add theme prop for consistency

### Session Tags System
1. **Backend** - Add tags field to Session type, API endpoints for tag management
2. **Frontend** - Tag display in sidebar, tag filtering, tag editing UI

## Scope

- Files: ~15 files modified
- Estimated effort: Medium
- Risk: Low (mostly style changes + new feature addition)
