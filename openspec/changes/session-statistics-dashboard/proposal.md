# Proposal: Session Statistics Dashboard

## Problem Statement

Users have no way to see an overview of their spending and usage patterns across all sessions. The data (cost, tokens) is already tracked per session, but there's no aggregated view.

## Proposed Solution

Add a statistics summary section to the HomePage that shows:
- Total sessions count
- Total cost across all sessions
- Total tokens used
- Average cost per session
- Most expensive session

## Benefits

- Users can quickly understand their spending patterns
- Helps with budget awareness
- Identifies expensive sessions for optimization

## Scope

- Frontend-only change (no backend modifications needed)
- Data already available from session metadata
- Single file modification: `src/pages/HomePage.tsx`
