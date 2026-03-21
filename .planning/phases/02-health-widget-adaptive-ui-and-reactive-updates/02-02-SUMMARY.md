---
phase: 02-health-widget-adaptive-ui-and-reactive-updates
plan: 02
subsystem: ui
tags: [react, tauri, tanstack-query, gsd2, health-widget, adaptive-tabs, badges]

requires:
  - phase: 02-01
    provides: useGsd2Health hook, gsd2GetHealth invoke wrapper, queryKeys.gsd2Health key, gsd_version on ProjectWithStats

provides:
  - Gsd2HealthTab component with budget bar, blocker row, active unit, env counts, M/S/T counters
  - Adaptive GSD tab set in project.tsx — GSD-2 gets Health/Milestones/Slices/Tasks; GSD-1 unchanged
  - GSD version badges (subtle-cyan / secondary) on both project list and dashboard cards
  - useGsdFileWatcher extended to also listen to gsd2:file-changed and invalidate gsd2Health query
  - gsd_version field added to Project type (Rust struct + TypeScript interface + SQL queries)

affects:
  - phase 03 (if it builds on health widget or adds more GSD-2 tabs)
  - any future plan that constructs Project structs in Rust (now requires gsd_version field)

tech-stack:
  added: []
  patterns:
    - "Adaptive tab branching: single showGsdTab guard, isGsd2 branch inside TabsContent"
    - "Dual event listener pattern in useGsdFileWatcher: gsd1 events debounced, gsd2 events immediate"
    - "gsd_version propagated on Project (not just ProjectWithStats) for project detail page use"

key-files:
  created:
    - src/components/project/gsd2-health-tab.tsx
  modified:
    - src/components/project/index.ts
    - src/hooks/use-gsd-file-watcher.ts
    - src/pages/project.tsx
    - src/components/projects/project-card.tsx
    - src/components/dashboard/project-card.tsx
    - src/lib/tauri.ts
    - src-tauri/src/models/mod.rs
    - src-tauri/src/commands/projects.rs

key-decisions:
  - "Added gsd_version to Project (not just ProjectWithStats) — project detail page uses useProject which returns Project, so the field is required there for adaptive tab logic"
  - "GSD-2 file-changed listener fires immediately (no debounce) — health data is a single-file read, no batching needed"
  - "Milestones/Slices/Tasks tabs are placeholder stubs — correct tab IDs established now, content deferred"

patterns-established:
  - "Adaptive tab set pattern: const isGsd2 = project?.gsd_version === 'gsd2'; const showGsdTab = isGsd2 || isGsd1"
  - "Version badge pattern: variant={gsd_version === 'gsd2' ? 'subtle-cyan' : 'secondary'}"

requirements-completed: [HLTH-03, HLTH-04, TERM-01, TERM-02, TERM-03]

duration: 8min
completed: 2026-03-21
---

# Phase 02 Plan 02: Health Widget Adaptive UI and Reactive Updates Summary

**GSD-2 health widget with budget/blocker/progress display, adaptive tab branching on gsd_version, version badges on all project cards, and reactive file watcher extension**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-21T00:34:36Z
- **Completed:** 2026-03-21T00:42:43Z
- **Tasks:** 2
- **Files modified:** 8 (+ 1 created)

## Accomplishments

- Created `Gsd2HealthTab` with all five sections: budget bar (warning at >80%), conditional blocker row, active unit info (milestone/slice/phase), env error/warning counts, M/S/T progress counters — plus loading, error, and locked empty-state copy
- Adaptive GSD tab set in `project.tsx`: GSD-2 projects get Health/Milestones/Slices/Tasks with Health as default; GSD-1 projects show unchanged Plans/Context/Todos/Validation/UAT/Verification/Milestones/Debug tabs
- GSD version badges using `subtle-cyan` (GSD-2) and `secondary` (GSD-1) on both the project list card and dashboard card; non-GSD shows no badge
- Extended `useGsdFileWatcher` with a second `gsd2:file-changed` listener that immediately invalidates the `gsd2Health` query key

## Task Commits

1. **Task 1: Health widget component + file watcher extension** - `93b4efb` (feat)
2. **Task 2: Adaptive GSD tab set + version badges on project cards** - `7270de3` (feat)

**Plan metadata:** (created in final commit below)

## Files Created/Modified

- `src/components/project/gsd2-health-tab.tsx` — GSD-2 health widget with all display states
- `src/components/project/index.ts` — Added Gsd2HealthTab export
- `src/hooks/use-gsd-file-watcher.ts` — Added gsd2:file-changed listener with immediate gsd2Health invalidation
- `src/pages/project.tsx` — Adaptive tab branching (isGsd2/isGsd1/showGsdTab), Gsd2HealthTab import
- `src/components/projects/project-card.tsx` — GSD version badge in Row 4 tech stack area
- `src/components/dashboard/project-card.tsx` — GSD version badge in GSD stats row, Badge import added
- `src/lib/tauri.ts` — Added gsd_version to Project interface (Rule 1 fix)
- `src-tauri/src/models/mod.rs` — Added gsd_version field to Project struct (Rule 1 fix)
- `src-tauri/src/commands/projects.rs` — Updated list_projects and get_project SQL to SELECT gsd_version (Rule 1 fix)

## Decisions Made

- Used `gsd_version` on `Project` (not just `ProjectWithStats`) because the project detail page calls `useProject` which returns `Project`, and the adaptive tab logic needs version info at that level
- GSD-2 listener fires immediately without debounce — the health endpoint reads a single file, no multi-file batch needed
- Milestones/Slices/Tasks tabs created as placeholder stubs with correct IDs — infrastructure established, content deferred

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] gsd_version missing from Project type used by useProject hook**
- **Found during:** Task 2 (adaptive GSD tab set implementation)
- **Issue:** Plan expected `project?.gsd_version` in `project.tsx`, but `useProject` returns the `Project` type which lacks `gsd_version` — field only existed on `ProjectWithStats`. TypeScript error: `Property 'gsd_version' does not exist on type 'Project'`
- **Fix:** Added `gsd_version: Option<String>` to Rust `Project` struct; updated `list_projects` and `get_project` SQL queries to SELECT the column; added `gsd_version: string | null` to TypeScript `Project` interface in tauri.ts
- **Files modified:** src-tauri/src/models/mod.rs, src-tauri/src/commands/projects.rs, src/lib/tauri.ts
- **Verification:** `pnpm build` exits 0 after fix
- **Committed in:** 7270de3 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — type gap between Project and ProjectWithStats)
**Impact on plan:** Fix required for correctness — plan assumed gsd_version was available on the Project type returned by useProject. No scope creep; the field already existed in the database, only the struct/query/interface needed updating.

## Issues Encountered

None beyond the Rule 1 type fix above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Health widget fully functional; reactive to file changes via gsd2:file-changed
- Tab IDs for gsd2-milestones, gsd2-slices, gsd2-tasks established and ready for future content
- GSD version badge displayed consistently across list and dashboard views
- Phase 02 complete — all planned deliverables shipped

---
*Phase: 02-health-widget-adaptive-ui-and-reactive-updates*
*Completed: 2026-03-21*
