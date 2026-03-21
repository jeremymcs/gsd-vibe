---
phase: 04-headless-mode-and-visualizer
plan: 02
subsystem: ui
tags: [typescript, react, tanstack-query, tauri, pty, headless, visualizer]

# Dependency graph
requires:
  - phase: 04-01
    provides: Rust commands gsd2_headless_query, gsd2_headless_start, gsd2_headless_stop, gsd2_get_visualizer_data in gsd2.rs
provides:
  - HeadlessSnapshot, VisualizerNode, CostByKey, TimelineEntry, VisualizerData TypeScript interfaces in tauri.ts
  - gsd2HeadlessQuery, gsd2HeadlessStart, gsd2HeadlessStop, gsd2GetVisualizerData invoke wrappers in tauri.ts
  - gsd2HeadlessQuery, gsd2VisualizerData query key factories in query-keys.ts
  - useGsd2HeadlessQuery, useGsd2HeadlessStart, useGsd2HeadlessStop, useGsd2VisualizerData React Query hooks in queries.ts
  - useHeadlessSession hook with JSON line buffering and session status tracking in hooks/use-headless-session.ts
affects:
  - 04-03 (headless and visualizer tab UI components consume all of these)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "JSON line accumulation via bufferRef.current + split('\n') for PTY output that arrives in arbitrary-sized chunks"
    - "PTY event listeners cleaned up on unmount without closing PTY session — session survives navigation"
    - "HeadlessStatus type union: idle | running | complete | failed"
    - "Headless query hook polls at 10s interval; visualizer polls at 30s interval"

key-files:
  created:
    - src/hooks/use-headless-session.ts
  modified:
    - src/lib/tauri.ts
    - src/lib/query-keys.ts
    - src/lib/queries.ts

key-decisions:
  - "VisualizerNode uses children[] array (not slices/tasks) to match Rust struct shape exactly"
  - "TimelineEntry uses entry_type string field (not type) to avoid JS reserved word conflicts with Rust serde naming"
  - "useGsd2HeadlessStop does not use queryClient — stopping a session does not invalidate headless query directly"
  - "useHeadlessSession does not close PTY session on unmount to survive tab navigation"

patterns-established:
  - "Pattern: JSON line streaming from PTY — accumulate in bufferRef, split on newline, process complete lines only"
  - "Pattern: HeadlessStatus state machine driven by PTY exit event (exit_code == 0 → complete, else → failed)"
  - "Pattern: wrappedSetSessionId records startedAt/clears completedAt when a new session ID is provided"

requirements-completed:
  - HDLS-04

# Metrics
duration: 9min
completed: 2026-03-20
---

# Phase 04 Plan 02: Frontend Data Layer Summary

**Type-safe frontend data layer for headless session streaming and visualizer — 5 TypeScript interfaces, 4 invoke wrappers, 2 query keys, 4 React Query hooks, and a JSON-line-buffering PTY hook**

## Performance

- **Duration:** 9 min
- **Started:** 2026-03-20T23:05:00Z
- **Completed:** 2026-03-20T23:14:03Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added HeadlessSnapshot, VisualizerData, VisualizerNode, CostByKey, TimelineEntry TypeScript interfaces matching Rust struct shapes
- Added 4 invoke wrappers for gsd2_headless_query, gsd2_headless_start, gsd2_headless_stop, gsd2_get_visualizer_data
- Added gsd2HeadlessQuery and gsd2VisualizerData query key factories
- Created useHeadlessSession hook with JSON line buffering, cost delta calculation, and session lifecycle tracking that survives navigation
- Added useGsd2HeadlessQuery (10s polling), useGsd2HeadlessStart mutation, useGsd2HeadlessStop mutation, useGsd2VisualizerData (30s polling)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add TypeScript types, invoke wrappers, and query keys** - `ca304f6` (feat)
2. **Task 2: Create useHeadlessSession hook and React Query hooks** - `a45da93` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `src/lib/tauri.ts` - Added 5 interfaces and 4 invoke wrappers for headless and visualizer Rust commands
- `src/lib/query-keys.ts` - Added gsd2HeadlessQuery and gsd2VisualizerData query key factories
- `src/lib/queries.ts` - Added 4 React Query hooks (2 queries + 2 mutations) for headless and visualizer data
- `src/hooks/use-headless-session.ts` - New hook: JSON line accumulation from PTY output, status state machine, log rows with cost delta

## Decisions Made
- `VisualizerNode.children[]` array used instead of `slices/tasks` split — matches Rust struct shape exactly as serialized
- `TimelineEntry.entry_type` string field instead of `type` to avoid reserved-word conflicts with serde camelCase
- `useGsd2HeadlessStop` does not invalidate any query — stopping a session is fire-and-forget; UI updates via PTY exit event
- Session survives navigation: `useHeadlessSession` cleanup removes event listeners only, never calls close/kill on unmount

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered
- 4 pre-existing test failures in `projects.test.tsx` and `main-layout.test.tsx` (UI element text not found). Confirmed pre-existing by stashing changes and running tests — same failures exist on base commit. Out of scope for this plan.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness
- All frontend data layer complete. Plan 04-03 can immediately consume:
  - `useHeadlessSession` from `@/hooks/use-headless-session`
  - `useGsd2HeadlessQuery`, `useGsd2HeadlessStart`, `useGsd2HeadlessStop` from `@/lib/queries`
  - `useGsd2VisualizerData` from `@/lib/queries`
  - All TypeScript interfaces from `@/lib/tauri`
- No blockers for 04-03

---
*Phase: 04-headless-mode-and-visualizer*
*Completed: 2026-03-20*

## Self-Check: PASSED

- FOUND: src/hooks/use-headless-session.ts
- FOUND: src/lib/tauri.ts
- FOUND: src/lib/queries.ts
- FOUND: src/lib/query-keys.ts
- FOUND commit: ca304f6
- FOUND commit: a45da93
