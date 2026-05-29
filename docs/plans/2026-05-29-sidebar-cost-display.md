# Feature: Display Session Cost and Token Usage in Sidebar

## Context
SessionStore already tracks `totalCostUsd` and `totalTokens` for each session (updated on every `result:complete` event). The data exists in the `Session` type but is not displayed in the sidebar UI.

## Goal
Show cost and token usage below each session name in the sidebar, similar to how OpenCode displays session statistics.

## Design

### Display Format
```
  Session Name
  14:30  ·  $0.35  ·  12.5k tokens
```

### Token Formatting
- < 1000: show as-is (e.g., "850 tokens")
- 1000-999999: show as "N.Nk tokens" (e.g., "12.5k tokens")
- >= 1000000: show as "N.NM tokens"

### Cost Formatting
- $0: hide cost entirely
- < $0.01: show "<$0.01"
- >= $0.01: show "$N.NN"

### Conditional Display
- If both cost and tokens are 0, show only the time (existing behavior)
- If cost > 0 or tokens > 0, show: `time  ·  $cost  ·  tokens`

## File to Modify
- `src/components/layout/Sidebar.tsx` — line ~261, the session info section

## Specific Change
In the session info `<div>`, after the existing time display:
```tsx
<div className="flex items-center gap-2 text-[11px] text-gray-500">
  <span>{formatTime(session.updatedAt)}</span>
  {(session.totalCostUsd > 0 || session.totalTokens > 0) && (
    <>
      <span>·</span>
      {session.totalCostUsd > 0 && (
        <span>{formatCost(session.totalCostUsd)}</span>
      )}
      {session.totalTokens > 0 && (
        <span>{formatTokens(session.totalTokens)}</span>
      )}
    </>
  )}
</div>
```

## Constraints
- Do NOT modify any other files
- Do NOT change the Session type or store logic
- Pure UI addition only
