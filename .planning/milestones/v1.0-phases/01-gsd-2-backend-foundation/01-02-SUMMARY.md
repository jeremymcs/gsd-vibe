---
phase: 01-gsd-2-backend-foundation
plan: 02
subsystem: gsd
tags: [rust, tauri, sqlite, file-watcher, version-detection]

requires:
  - phase: 01-01
    provides: gsd2.rs module with version detection and .gsd/ file parsing

provides:
  - GSD-1 guard rails on all 29 project-scoped GSD-1 commands
  - .gsd/ directory watcher with classified event emission (gsd2:file-changed)

affects: [gsd-ui, project-detail, gsd-panel, frontend-gsd-hooks]

tech-stack:
  added: []
  patterns:
    - "GSD-2 guard pattern: db.read().await version check before any GSD-1 command body"
    - "Watcher event classification: .gsd/ path prefix check with worktrees exclusion"

key-files:
  created: []
  modified:
    - src-tauri/src/commands/gsd.rs
    - src-tauri/src/commands/watcher.rs

key-decisions:
  - "Guard uses db.read() (not write) — SELECT only, no writer lock contention"
  - "GSD-2 block placed BEFORE .planning/ check in watcher — explicit ordering, no ambiguity"
  - ".gsd/worktrees/ excluded from watcher events — prevents event storm during cargo/npm builds"
  - "gsd_list_all_todos has no project_id param so cannot be guarded — documented with comment"

patterns-established:
  - "Guard block: scoped { let reader = db.read().await; ... } then drop before write lock"
  - "Watcher classification: path substring matching for gsd2_state/milestone/metrics/other"

requirements-completed:
  - VERS-03
  - VERS-04

duration: 20min
completed: 2026-03-20
---

# Phase 01 Plan 02: GSD-2 Guard Rails and Watcher Extension Summary

**GSD-1 version guard on all 29 project-scoped commands and .gsd/ file watcher with classified gsd2:file-changed events**

## Performance

- **Duration:** 20 min
- **Started:** 2026-03-20T22:00:00Z
- **Completed:** 2026-03-20T22:20:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added GSD-2 guard blocks to all 29 GSD-1 commands that accept a project_id parameter
- All guards use db.read().await (never write lock) for the SELECT gsd_version query
- Extended watcher.rs to monitor .gsd/ directory recursively when it exists
- Watcher classifies .gsd/ events as gsd2_state, gsd2_milestone, gsd2_metrics, or gsd2_other
- .gsd/worktrees/ excluded from event emission to prevent event storms

## Task Commits

Each task was committed atomically:

1. **Task 1: Add GSD-2 guard rails to all GSD-1 commands** - `c8867ce` (feat)
2. **Task 2: Extend file watcher for .gsd/ directory monitoring** - `7e04387` (feat)

## Files Created/Modified

- `src-tauri/src/commands/gsd.rs` - Added 29 guard blocks (409 lines inserted), comment on gsd_list_all_todos
- `src-tauri/src/commands/watcher.rs` - Added .gsd/ watch setup + GSD-2 event classification block (40 lines)

## Decisions Made

- Guard uses `db.read().await` not `db.write().await` — it is a SELECT-only check and must not block the writer
- GSD-2 block placed BEFORE the .planning/ check in the watcher event handler for clarity (paths are mutually exclusive but ordering makes intent explicit)
- .gsd/worktrees/ excluded because worktrees contain full project copies; cargo/npm builds inside them would emit millions of events per second
- `gsd_list_all_todos` iterates all projects and has no project_id parameter — guard is impossible; GSD-2 projects naturally lack .planning/todos/ so their todos are absent from results

## Deviations from Plan

None - plan executed exactly as written. The actual command count in gsd.rs is 30 (not 37 as estimated in the plan); 29 were guardable (all except gsd_list_all_todos which has no project_id).

## Issues Encountered

None. The `cargo check -p track-your-shit-lib` target specified in the plan does not exist; used `cargo check` directly which covers the lib target. Build passed cleanly on first attempt.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- GSD-1 commands now explicitly reject GSD-2 projects — no silent data corruption
- .gsd/ watcher ready to drive reactive UI updates when GSD-2 files change
- Ready for Plan 03 (frontend version detection and conditional rendering)

---
*Phase: 01-gsd-2-backend-foundation*
*Completed: 2026-03-20*
