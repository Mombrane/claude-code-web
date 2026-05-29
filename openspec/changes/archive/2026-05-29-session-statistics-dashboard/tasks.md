# Tasks: Session Statistics Dashboard

## Implementation Tasks

### Task 1: Add Statistics Computation [独立]
**File:** `src/pages/HomePage.tsx`

**Description:** Add a `useMemo` hook to compute session statistics:
- Total sessions count
- Total cost (sum of `totalCostUsd`)
- Total tokens (sum of `totalTokens`)
- Average cost per session (exclude sessions with 0 cost)
- Most expensive session (name + cost)

**Acceptance Criteria:**
- [ ] Statistics update when sessions change
- [ ] Handles empty sessions list (shows zeros)
- [ ] Average excludes zero-cost sessions

### Task 2: Add Statistics UI [依赖: Task 1]
**File:** `src/pages/HomePage.tsx`

**Description:** Add a statistics summary section to the HomePage:
- Card-based layout with 4 metrics (sessions, cost, tokens, avg cost)
- Most expensive session shown below cards
- Responsive design (4 columns on desktop, 2 on mobile)
- Uses existing `formatCost` and `formatTokens` functions

**Acceptance Criteria:**
- [ ] Statistics section appears between header and session list
- [ ] Cards use consistent styling with existing UI
- [ ] Most expensive session shows name and cost
- [ ] Responsive layout works on different screen sizes

## Dependencies
```
Task 1 → Task 2 (Task 2 depends on Task 1's computation)
```

## Files Modified
- `src/pages/HomePage.tsx` (both tasks modify this file, so they must be sequential)
