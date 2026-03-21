---
phase: 10-dead-code-removal-and-quality
plan: "01"
subsystem: api
tags: [rust, tauri, typescript, dead-code, cleanup]

requires: []
provides:
  - "Dead gsd2_detect_version and gsd2_get_roadmap_progress Rust commands removed from full stack"
  - "lib.rs generate_handler![] contains only commands with frontend callers"
  - "tauri.ts contains no invoke wrappers for non-existent commands"
affects:
  - "10-02 (quality): command registry baseline is clean for further audit"

tech-stack:
  added: []
  patterns:
    - "Full-stack dead code removal: Rust fn + lib.rs registration + TS interface + TS wrapper + test case"

key-files:
  created: []
  modified:
    - src-tauri/src/commands/gsd2.rs
    - src-tauri/src/lib.rs
    - src/lib/tauri.ts
    - src/lib/__tests__/tauri-gsd2.test.ts

key-decisions:
  - "Kept Gsd2RoadmapProgress struct and get_roadmap_progress_from_dir helper function — still used by Rust unit tests even though command is removed"
  - "Pre-existing cargo check icon error (32x32.png not RGBA) confirmed pre-existing via stash test — not caused by these changes"
  - "Audit found additional lib.rs-registered commands with no frontend callers (pty_list_sessions, pty_active_count, pty_close_all, detect_docs_available, get_decisions, get_all_decisions, get_decision_categories, check_claude_status, run_dependency_audit, get_outdated_packages, rotate_app_logs) — deferred to plan 10-02 as out-of-scope for DEAD-01/DEAD-04"

patterns-established:
  - "Full-stack dead code removal: delete in order — Rust fn body, lib.rs registration, TS interface, TS wrapper, test"

requirements-completed:
  - DEAD-01
  - DEAD-04

duration: 12min
completed: "2026-03-21"
---

# Phase 10 Plan 01: Dead GSD-2 Command Removal Summary

**Removed gsd2_detect_version and gsd2_get_roadmap_progress across the full stack — Rust functions deleted from gsd2.rs, unregistered from lib.rs generate_handler!, TypeScript interface and invoke wrapper deleted from tauri.ts, and test case removed from tauri-gsd2.test.ts.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-03-21T20:00:00Z
- **Completed:** 2026-03-21T20:12:00Z
- **Tasks:** 2 of 2
- **Files modified:** 4

## Accomplishments

- Deleted `gsd2_detect_version` function (~37 lines) from gsd2.rs — version detection happens at import time, command was never called post-import
- Deleted `gsd2_get_roadmap_progress` function (~9 lines) from gsd2.rs — no UI consumer existed
- Removed both registrations from `generate_handler![]` in lib.rs
- Removed `Gsd2RoadmapProgressData` interface and `gsd2GetRoadmapProgress` wrapper from tauri.ts
- Removed dead test case from tauri-gsd2.test.ts
- Ran full audit of all lib.rs registered commands vs tauri.ts wrappers — found 11 additional potentially-orphaned commands, deferred to 10-02

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove dead Rust commands and lib.rs registrations** - `5b1a56b` (chore)
2. **Task 2: Remove dead frontend wrappers, query keys, hooks, and tests** - `ae8d109` (chore)

## Files Created/Modified

- `src-tauri/src/commands/gsd2.rs` — deleted gsd2_detect_version and gsd2_get_roadmap_progress functions
- `src-tauri/src/lib.rs` — removed two entries from generate_handler![] macro
- `src/lib/tauri.ts` — deleted Gsd2RoadmapProgressData interface and gsd2GetRoadmapProgress export
- `src/lib/__tests__/tauri-gsd2.test.ts` — removed import and test case for gsd2GetRoadmapProgress

## Decisions Made

- Kept `Gsd2RoadmapProgress` struct and `get_roadmap_progress_from_dir` helper — still used by Rust unit tests at lines 2287 and 2301. Removing these would have broken tests without a plan mandate.
- Did NOT remove the 11 additional potentially-orphaned commands found in audit (pty_list_sessions, pty_active_count, pty_close_all, detect_docs_available, get_decisions, get_all_decisions, get_decision_categories, check_claude_status, run_dependency_audit, get_outdated_packages, rotate_app_logs). These require broader investigation (some may be called from component files via patterns other than tauri.ts wrappers). Deferred to plan 10-02.
- The cargo check icon error (32x32.png not RGBA) is pre-existing — confirmed by stash test. Not in scope.

## Deviations from Plan

None — plan executed exactly as written for the two targeted commands.

## Issues Encountered

- `cargo check` fails with icon format error (`32x32.png is not RGBA`) — confirmed pre-existing via `git stash` verification before changes. This is unrelated to any code changes. The `pnpm build` TypeScript build (the plan's primary verification) passes cleanly.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Plan 10-01 clean: two known dead commands fully removed across all layers
- 11 additional potentially-orphaned Rust commands discovered during audit — deferred to plan 10-02 for investigation and cleanup
- pnpm build: clean (exit 0)
- cargo check: pre-existing icon issue blocks verification (not related to code changes)

## Self-Check: PASSED

- SUMMARY.md exists at `.planning/phases/10-dead-code-removal-and-quality/10-01-SUMMARY.md`
- Commit 5b1a56b exists (Task 1: Rust dead command removal)
- Commit ae8d109 exists (Task 2: Frontend dead wrapper removal)

---
*Phase: 10-dead-code-removal-and-quality*
*Completed: 2026-03-21*
