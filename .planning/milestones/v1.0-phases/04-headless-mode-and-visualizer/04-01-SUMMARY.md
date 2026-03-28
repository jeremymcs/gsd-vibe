---
phase: 04-headless-mode-and-visualizer
plan: 01
subsystem: api
tags: [rust, tauri, headless, pty, visualizer, gsd2]

requires:
  - phase: 03-worktrees-and-gsd2-git
    provides: TerminalManager PTY infrastructure and gsd2.rs command module patterns

provides:
  - HeadlessSessionRegistry struct for tracking active headless GSD sessions
  - gsd2_headless_query command (subprocess, not PTY)
  - gsd2_headless_start command (PTY via TerminalManager)
  - gsd2_headless_stop command (ETX + 5s poll + force-kill)
  - can_safely_close command (terminal + headless count)
  - force_close_all command (graceful shutdown of all sessions)
  - gsd2_get_visualizer_data command (tree + cost breakdowns + timeline)

affects:
  - 04-02 (frontend headless panel uses these commands)
  - 04-03 (visualizer page uses gsd2_get_visualizer_data)

tech-stack:
  added: []
  patterns:
    - HeadlessRegistryState as Arc<Mutex<HeadlessSessionRegistry>> follows same pattern as TerminalManagerState
    - Separate lock scopes for terminal_manager and registry prevent deadlocks
    - Headless query uses std::process::Command subprocess (not PTY) for read-only state inspection
    - ETX byte (0x03) sent via TerminalManager::write for graceful SIGINT before force-kill

key-files:
  created:
    - src-tauri/src/headless.rs
    - (510 new lines in gsd2.rs and lib.rs)
  modified:
    - src-tauri/src/commands/gsd2.rs
    - src-tauri/src/lib.rs

key-decisions:
  - "force_close_all does not need app: AppHandle since close_all() signature takes no AppHandle — plan spec had incorrect signature, prefixed with _app"
  - "get_project_id method in HeadlessSessionRegistry marked dead_code — part of public API but not called internally"

patterns-established:
  - "Headless registry lives in headless.rs as HeadlessSessionRegistry, type alias HeadlessRegistryState"
  - "Commands that need both terminal_manager and registry always acquire locks in separate {} scopes to prevent deadlock"
  - "Visualizer data command uses walk_milestones_with_tasks + get_health_from_dir for status tags without duplicate filesystem walks"

requirements-completed: [HDLS-01, HDLS-02, HDLS-03, HDLS-05, VIZ-01, VIZ-02, VIZ-03]

duration: 25min
completed: 2026-03-20
---

# Phase 04 Plan 01: Headless Session Management and Visualizer Backend Summary

**Rust backend for headless GSD session lifecycle (registry + start/stop/query/force-close) and visualizer data API (milestone tree with status tags, cost by milestone, cost by model, timeline)**

## Performance

- **Duration:** 25 min
- **Started:** 2026-03-20T00:00:00Z
- **Completed:** 2026-03-20T00:25:00Z
- **Tasks:** 2
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments

- Created HeadlessSessionRegistry with full session lifecycle management (register/unregister/session_for_project/all_session_ids/active_count)
- Implemented 6 new Tauri commands: gsd2_headless_query, gsd2_headless_start, gsd2_headless_stop, can_safely_close, force_close_all, gsd2_get_visualizer_data
- All commands registered in lib.rs invoke_handler with HeadlessSessionRegistry managed as Tauri state
- cargo check passes clean with zero errors and zero warnings

## Task Commits

Each task was committed atomically:

1. **Task 1 + Task 2: All headless and visualizer commands** - `acbac65` (feat)

## Files Created/Modified

- `src-tauri/src/headless.rs` - HeadlessSessionRegistry struct and HeadlessRegistryState type alias
- `src-tauri/src/commands/gsd2.rs` - HeadlessSnapshot, ActiveProcessInfo, VisualizerNode, CostByKey, TimelineEntry, VisualizerData structs + 6 new command functions
- `src-tauri/src/lib.rs` - mod headless, HeadlessSessionRegistry::new() state management, 6 new commands in invoke_handler

## Decisions Made

- `force_close_all` signature: the plan spec listed `app: tauri::AppHandle` but `TerminalManager::close_all()` takes no AppHandle parameter (unlike the individual `close()` method). Prefixed with `_app` to satisfy Tauri command parameter requirements without causing unused variable warnings.
- `get_project_id` on HeadlessSessionRegistry is part of the public API for future use but not called internally — marked `#[allow(dead_code)]`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `force_close_all` app parameter unused**
- **Found during:** Task 1 (cargo check verification)
- **Issue:** Plan spec stated `app: tauri::AppHandle` for `force_close_all` but `TerminalManager::close_all()` takes no AppHandle argument (unlike `close(&app, ...)`)
- **Fix:** Prefixed parameter as `_app` to silence compiler warning while keeping the Tauri command signature intact
- **Files modified:** src-tauri/src/commands/gsd2.rs
- **Verification:** cargo check passes with zero warnings
- **Committed in:** acbac65 (Task commit)

---

**Total deviations:** 1 auto-fixed (1 bug in plan spec)
**Impact on plan:** Minimal — parameter preserved for forward compatibility, just silenced the warning. No behavioral change.

## Issues Encountered

None — compilation succeeded on first attempt after the `_app` fix.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 6 Tauri commands are registered and callable from the frontend
- HeadlessSessionRegistry is managed state, accessible by any command
- Frontend (Plan 04-02) can implement headless panel using gsd2_headless_start, gsd2_headless_stop, gsd2_headless_query
- Visualizer (Plan 04-03) can implement the visualization page using gsd2_get_visualizer_data

---
*Phase: 04-headless-mode-and-visualizer*
*Completed: 2026-03-20*
