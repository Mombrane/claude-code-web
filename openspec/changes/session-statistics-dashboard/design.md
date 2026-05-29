# Design: Session Statistics Dashboard

## Technical Approach

### Data Source
- Use the existing `sessions` state in HomePage component
- Compute statistics from `session.totalCostUsd` and `session.totalTokens`

### UI Design
Add a statistics summary section between the project header and session list:

```
┌─────────────────────────────────────────────────────────┐
│  📊 Statistics                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Sessions │ │   Cost   │ │  Tokens  │ │ Avg Cost │  │
│  │    24    │ │  $12.50  │ │  150k    │ │  $0.52   │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│  Most expensive: "Fix auth bug" ($2.15)                 │
└─────────────────────────────────────────────────────────┘
```

### Implementation

1. Compute statistics using `useMemo`:
   ```typescript
   const stats = useMemo(() => {
     const totalCost = sessions.reduce((sum, s) => sum + s.totalCostUsd, 0);
     const totalTokens = sessions.reduce((sum, s) => sum + s.totalTokens, 0);
     const avgCost = sessions.length > 0 ? totalCost / sessions.length : 0;
     const mostExpensive = sessions.reduce((max, s) => 
       s.totalCostUsd > max.totalCostUsd ? s : max, sessions[0]);
     return { totalCost, totalTokens, avgCost, mostExpensive };
   }, [sessions]);
   ```

2. Add statistics section in JSX with card-based layout

### Files to Modify
- `src/pages/HomePage.tsx` — Add statistics computation and UI

### Edge Cases
- Empty sessions list: show zeros
- Sessions with zero cost: exclude from average calculation
