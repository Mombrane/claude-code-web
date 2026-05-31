# Tasks: Theme Support Completion & Session Tags

## Task 1: HomePage Theme Support
**Files:** `src/pages/HomePage.tsx`
**Priority:** P0

### Changes:
1. Add `theme` prop to `HomePage` component
2. Convert all hardcoded dark styles to conditional classes
3. Pass theme to AppLayout when calling HomePage

### Style Mappings:
- `bg-gray-900` → `theme === 'dark' ? 'bg-gray-900' : 'bg-white'`
- `bg-gray-800/50` → `theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-50'`
- `text-white` → `theme === 'dark' ? 'text-white' : 'text-gray-900'`
- `border-gray-700/50` → `theme === 'dark' ? 'border-gray-700/50' : 'border-gray-200'`
- `bg-gray-700/80` → `theme === 'dark' ? 'bg-gray-700/80' : 'bg-gray-100'`
- `text-gray-400` → `theme === 'dark' ? 'text-gray-400' : 'text-gray-500'`
- `hover:bg-gray-700/40` → `theme === 'dark' ? 'hover:bg-gray-700/40' : 'hover:bg-gray-100'`
- `bg-blue-600` → `theme === 'dark' ? 'bg-blue-600' : 'bg-blue-500'`
- `bg-gray-700` → `theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'`

---

## Task 2: SettingsPanel Theme Support
**Files:** `src/components/settings/SettingsPanel.tsx`
**Priority:** P0

### Changes:
1. Add `theme` prop to `SettingsPanelProps`
2. Convert all hardcoded dark styles to conditional classes
3. Ensure modal backdrop also responds to theme

---

## Task 3: DiffViewer Theme Support
**Files:** `src/components/git/DiffViewer.tsx`
**Priority:** P1

### Changes:
1. Add `theme` prop to `DiffViewer` component
2. Convert hardcoded dark styles to conditional classes
3. Ensure diff highlighting works in both themes

---

## Task 4: KeyboardShortcutsDialog Theme Support
**Files:** `src/components/chat/KeyboardShortcutsDialog.tsx`
**Priority:** P1

### Changes:
1. Add `theme` prop to `KeyboardShortcutsDialog` component
2. Convert hardcoded dark styles to conditional classes

---

## Task 5: Session Tags - Backend
**Files:** `server/types/index.ts`, `server/services/session-store.ts`, `server/routes/sessions.ts`
**Priority:** P1

### Changes:
1. Add `tags?: string[]` to Session type in `server/types/index.ts`
2. Add `updateSessionTags()` method to session-store
3. Add `getAllTags()` method to session-store
4. Add `PATCH /:id/tags` endpoint to sessions routes
5. Add `GET /tags` endpoint to sessions routes
6. Update `GET /` to support `?tag=xxx` query parameter

---

## Task 6: Session Tags - Frontend Types & API
**Files:** `src/types/index.ts`, `src/api/client.ts`
**Priority:** P1

### Changes:
1. Add `tags?: string[]` to Session type in `src/types/index.ts`
2. Add `updateSessionTags()` method to API client
3. Add `getAllTags()` method to API client

---

## Task 7: Session Tags - UI Components
**Files:** `src/components/ui/TagChip.tsx` (new), `src/components/layout/Sidebar.tsx`
**Priority:** P1

### Changes:
1. Create `TagChip` component for displaying tags
2. Add tag display to session items in Sidebar
3. Add tag filter section to Sidebar
4. Add inline tag editing (click session → edit tags)

---

## Task 8: i18n for Tags
**Files:** `src/i18n/zh.ts`, `src/i18n/en.ts`
**Priority:** P1

### Changes:
1. Add tag-related translation keys
2. Ensure all new UI text is translated

---

## Task 9: Wire Theme Prop Through AppLayout
**Files:** `src/components/layout/AppLayout.tsx`, `src/pages/SessionPage.tsx`
**Priority:** P0

### Changes:
1. Pass `theme` prop to `HomePage` in AppLayout
2. Pass `theme` prop to `SettingsPanel` in AppLayout
3. Pass `theme` prop to `DiffViewer` in AppLayout
4. Pass `theme` prop to `KeyboardShortcutsDialog` in ChatPanel
