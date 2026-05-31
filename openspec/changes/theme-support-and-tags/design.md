# Design: Theme Support Completion & Session Tags

## Theme Support Architecture

### Current State
- `AppLayout` holds `settings.theme` state
- Theme is passed as prop to `Sidebar`, `ChatPanel`
- `FilePickerModal` already accepts theme prop
- `HomePage`, `SettingsPanel`, `DiffViewer`, `KeyboardShortcutsDialog` are hardcoded dark

### Design Decision
Continue the existing pattern: pass `theme` as a prop from parent to child components. This is simpler than Context for this use case since the component tree is shallow.

### Theme Class Mapping
```typescript
// Dark theme classes
bg-gray-900 → bg-gray-900 dark:bg-gray-900
bg-gray-800 → bg-gray-800 dark:bg-gray-800  
text-white → text-white dark:text-white

// Light theme equivalents
bg-gray-900 → bg-white (light)
bg-gray-800 → bg-gray-50 (light)
text-white → text-gray-900 (light)
border-gray-700 → border-gray-200 (light)
```

### Implementation Pattern
```typescript
// Conditional class helper
const themeClasses = theme === 'dark' 
  ? 'bg-gray-900 text-white border-gray-700'
  : 'bg-white text-gray-900 border-gray-200';
```

## Session Tags Architecture

### Data Model
```typescript
interface Session {
  // ... existing fields
  tags?: string[];  // Optional array of tag strings
}
```

### API Endpoints
- `PATCH /api/sessions/:id/tags` - Set tags for a session
- `GET /api/sessions/tags` - Get all unique tags across sessions
- `GET /api/sessions?tag=xxx` - Filter sessions by tag

### UI Components
1. **TagChip** - Small pill component for displaying a tag
2. **TagEditor** - Inline tag editing (click to add/remove)
3. **TagFilter** - Dropdown or sidebar section for filtering by tag

### Tag Storage
Tags stored directly in session JSON file (alongside other session metadata). No separate database needed.

### Tag Color Assignment
Simple hash-based color assignment from a predefined palette:
```typescript
const TAG_COLORS = [
  'bg-blue-500/20 text-blue-400',
  'bg-green-500/20 text-green-400',
  'bg-purple-500/20 text-purple-400',
  'bg-orange-500/20 text-orange-400',
  'bg-pink-500/20 text-pink-400',
];

function getTagColor(tag: string): string {
  let hash = 0;
  for (const char of tag) hash = ((hash << 5) - hash) + char.charCodeAt(0);
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}
```
