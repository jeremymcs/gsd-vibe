---
phase: 05-gsd2-milestones-slices-tasks-ui
plan: 02
subsystem: ui
tags: [react, tauri, tanstack-query, accordion, gsd2]

requires:
  - phase: 05-01
    provides: useGsd2Milestones, useGsd2Milestone, useGsd2Slice, useGsd2DerivedState hooks + Gsd2MilestoneListItem/Gsd2SliceSummary/Gsd2TaskItem/Gsd2DerivedState types

provides:
  - Gsd2MilestonesTab: two-level accordion (milestones -> slices with task counts -> tasks)
  - Gsd2SlicesTab: slices grouped by collapsible milestone sections with task counts
  - Gsd2TasksTab: active+pending tasks only, grouped by slice name, active-first sort
  - All three tabs wired into project.tsx replacing coming-soon placeholders

affects:
  - phase-06-and-later

tech-stack:
  added: []
  patterns:
    - "Inline sub-component pattern: parent controls render, child always enables query (WorktreeDiffSection / MilestoneSlices / SliceTasksSection)"
    - "Two-level accordion using two Set<string> state variables (expandedMilestones + expandedSlices)"
    - "Lazy task count loading: useGsd2Milestone called inside MilestoneSlices sub-component only when milestone is expanded"
    - "SliceTaskGroup sub-component renders per-slice to avoid dynamic hook count issues in loops"

key-files:
  created:
    - src/components/project/gsd2-milestones-tab.tsx
    - src/components/project/gsd2-slices-tab.tsx
    - src/components/project/gsd2-tasks-tab.tsx
  modified:
    - src/components/project/index.ts
    - src/pages/project.tsx

key-decisions:
  - "SliceTaskGroup sub-component in Tasks tab: renders per-slice to avoid dynamic hook count — hooks cannot be called inside loops"
  - "Tasks tab fetches active milestone first via useGsd2Milestone, then renders SliceTaskGroup for each non-done slice — avoids 25+ eager queries"
  - "Gsd2SlicesTab.MilestoneSlicesSection falls back to summary slices (no task counts) while full milestone loads, then replaces with full data"

patterns-established:
  - "StatusIcon: done=text-status-success ✔, active=text-yellow-500 animate-pulse ▶, pending=text-muted-foreground ○"
  - "Badge status classes: done=bg-status-success/10 text-status-success, pending=bg-status-pending/10 text-status-pending, active/warning=bg-status-warning/10 text-status-warning"
  - "Active row highlight: border-l-2 border-primary on milestone rows"
  - "ChevronRight rotation: style transform rotate(90deg) when expanded, rotate(0deg) collapsed"

requirements-completed: [PARS-01, PARS-02, PARS-03, PARS-04, PARS-05]

duration: 6min
completed: 2026-03-21
---

# Phase 05 Plan 02: GSD-2 Milestones, Slices, Tasks UI Summary

**Three accordion-based tab components (Gsd2MilestonesTab, Gsd2SlicesTab, Gsd2TasksTab) wired into project page, connecting Rust GSD-2 parsing commands to visible, navigable milestone/slice/task data with task counts, lazy loading, and status indicators**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-21T14:10:51Z
- **Completed:** 2026-03-21T14:17:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created Gsd2MilestonesTab: two-level accordion where milestones expand to slices (with task counts via useGsd2Milestone), slices expand to tasks via SliceTasksSection using useGsd2Slice
- Created Gsd2SlicesTab: slices grouped by collapsible milestone section headers, task counts on slice rows loaded lazily via MilestoneSlicesSection calling useGsd2Milestone
- Created Gsd2TasksTab: active+pending tasks only filtered from all slices in the active milestone, grouped by slice name with active-first sort order
- Wired all three tabs into project.tsx replacing "coming soon" placeholders; updated barrel exports in index.ts

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Gsd2MilestonesTab component with task counts on slice rows** - `cbcf266` (feat)
2. **Task 2: Create Gsd2SlicesTab and Gsd2TasksTab components, wire all tabs into project.tsx** - `fe1840d` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `src/components/project/gsd2-milestones-tab.tsx` — Two-level accordion: milestones -> slices (task counts) -> tasks; StatusIcon, getStatus, MilestoneSlices, SliceTasksSection sub-components
- `src/components/project/gsd2-slices-tab.tsx` — Slices grouped by milestone sections; MilestoneSlicesSection loads full milestone for task counts; SliceTasksSection for inline task expansion
- `src/components/project/gsd2-tasks-tab.tsx` — Active/pending only, grouped by slice; SliceTaskGroup sub-component per-slice; ActiveMilestoneTasks loads via useGsd2Milestone
- `src/components/project/index.ts` — Added barrel exports for all 3 new tab components
- `src/pages/project.tsx` — Imports Gsd2MilestonesTab/Gsd2SlicesTab/Gsd2TasksTab; replaces coming-soon placeholders; uses Layers icon for Slices tab, CheckSquare for Tasks tab

## Decisions Made
- Gsd2TasksTab uses `SliceTaskGroup` sub-component rendered per-slice to avoid calling hooks inside loops (React rules of hooks constraint)
- Tasks tab fetches only the active milestone first (via `useGsd2Milestone`) instead of all slices eagerly — avoids potentially 25+ parallel queries on tab mount
- Gsd2SlicesTab's `MilestoneSlicesSection` shows summary slice rows (from `useGsd2Milestones` — no task counts) while full milestone loads, then replaces with full data containing task arrays

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused `Flag` import from gsd2-milestones-tab.tsx**
- **Found during:** Task 1 build verification
- **Issue:** TypeScript error TS6133 — `Flag` was imported from lucide-react but never used in the component
- **Fix:** Removed `Flag` from the lucide-react import line
- **Files modified:** src/components/project/gsd2-milestones-tab.tsx
- **Verification:** `pnpm build` exited 0 after fix
- **Committed in:** cbcf266 (Task 1 commit — fixed before committing)

---

**Total deviations:** 1 auto-fixed (1 bug - unused import)
**Impact on plan:** Trivial fix. No scope creep.

## Issues Encountered
None beyond the unused import caught by TypeScript strict mode.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- All three GSD-2 milestone/slice/task tabs are live and functional
- Requirements PARS-01 through PARS-05 fulfilled: Rust parsing commands are connected to visible UI
- Phase 05 complete — no blockers for subsequent phases

## Self-Check: PASSED

- gsd2-milestones-tab.tsx: FOUND
- gsd2-slices-tab.tsx: FOUND
- gsd2-tasks-tab.tsx: FOUND
- 05-02-SUMMARY.md: FOUND
- Commit cbcf266: FOUND
- Commit fe1840d: FOUND

---
*Phase: 05-gsd2-milestones-slices-tasks-ui*
*Completed: 2026-03-21*
