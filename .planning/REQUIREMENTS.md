# Requirements: Track Your Shit — GSD-2 Integration

**Defined:** 2026-03-20
**Core Value:** Per-project version detection drives everything — correctly identify .gsd/ vs .planning/ and render the right data and terminology for each project.

## v1 Requirements

### Version Detection

- [x] **VERS-01**: App detects whether a project uses `.gsd/` (gsd2), `.planning/` (gsd1), or neither (none) on project load
- [x] **VERS-02**: Version detection result is returned as a typed enum (`"gsd2" | "gsd1" | "none"`) from a new `gsd2_detect_version` Rust command
- [x] **VERS-03**: Existing GSD-1 Rust commands return an explicit error when called with a gsd2 project ID (no more silent empty results)
- [x] **VERS-04**: File watcher (`watcher.rs`) watches `.gsd/` directory in addition to existing `.planning/` watch, emitting `gsd2:file-changed` events

### File Parsing

- [x] **PARS-01**: `gsd2_list_milestones` lists milestone directories from `.gsd/milestones/` using three-tier path resolution (exact ID match → ID-prefix match → legacy bare suffix)
- [x] **PARS-02**: `gsd2_get_milestone` reads a milestone's `M001-ROADMAP.md` and returns slices with ID, title, done status, and dependencies
- [x] **PARS-03**: `gsd2_get_slice` reads a slice's `S01-PLAN.md` and returns tasks with ID, title, done status, and estimate
- [x] **PARS-04**: `gsd2_derive_state` returns the active milestone ID, active slice ID, active task ID, overall progress (M/S/T done/total), and current phase
- [x] **PARS-05**: `gsd2_get_roadmap_progress` returns milestone/slice/task completion counts suitable for a progress bar

### Health Widget

- [x] **HLTH-01**: `gsd2_get_health` returns budget spent, budget ceiling (if set), environment error count, environment warning count, active milestone/slice/task, phase, blocker (if any), ETA (if available), and next action
- [x] **HLTH-02**: Health data is read directly from `.gsd/STATE.md` frontmatter and `.gsd/metrics.json` (never via subprocess)
- [x] **HLTH-03**: A new Health tab (or widget within the project overview) renders health data with budget bar, env status, active unit display, and M/S/T progress counters
- [x] **HLTH-04**: Health display auto-refreshes on `.gsd/` file changes (via watcher) and on a 10s polling interval

### Adaptive Terminology

- [x] **TERM-01**: Project detail tabs show "Milestones", "Slices", "Tasks" terminology for gsd2 projects
- [x] **TERM-02**: Project detail tabs show existing "Phases", "Plans", "Tasks" terminology for gsd1 projects (unchanged behavior)
- [x] **TERM-03**: Project list / dashboard cards show a "GSD-2" badge for gsd2 projects and "GSD-1" badge for gsd1 projects

### Worktrees Panel

- [x] **WORK-01**: `gsd2_list_worktrees` lists active git worktrees for a project (name, branch, path, exists)
- [x] **WORK-02**: Worktree paths are canonicalized via `std::fs::canonicalize` before comparison to handle macOS symlinks
- [x] **WORK-03**: `gsd2_remove_worktree` removes a worktree (git worktree remove + branch cleanup)
- [x] **WORK-04**: `gsd2_get_worktree_diff` returns a summary of files added/modified/removed in a worktree vs main `.gsd/` (for merge preview)
- [x] **WORK-05**: A new Worktrees tab in the project detail view renders the worktree list with name, branch, diff summary, and remove button

### Headless Mode

- [ ] **HDLS-01**: `gsd2_headless_query` runs `gsd headless --json next` as a child process (not PTY), parses the JSON snapshot, and returns `{ state, next, cost }`
- [ ] **HDLS-02**: `gsd2_headless_start` starts a full `gsd headless` session via PTY (reuses existing `TerminalManager`), returning a session ID
- [ ] **HDLS-03**: `gsd2_headless_stop` sends interrupt to a running headless PTY session and waits for it to exit
- [ ] **HDLS-04**: Headless session output (JSON lines) streams to the frontend via existing `pty:output:{id}` events
- [ ] **HDLS-05**: A HeadlessSessionRegistry tracks active sessions and ensures all sessions are cleaned up on app close
- [ ] **HDLS-06**: A new Headless tab in the project detail view shows session status (idle/running/complete), start/stop controls, streamed output, and the last query snapshot (state/next/cost)

### Visualizer

- [ ] **VIZ-01**: `gsd2_get_visualizer_data` returns the full milestone → slice → task progress tree with done/active/pending status per node
- [ ] **VIZ-02**: Visualizer data includes cost/token metrics aggregated by phase (milestone) and by model
- [ ] **VIZ-03**: Visualizer data includes a chronological timeline of execution history (completed slices/tasks with timestamps)
- [ ] **VIZ-04**: A new Visualizer tab in the project detail view renders the progress tree, cost/token bar charts by phase and model, and the execution timeline

## v2 Requirements

### Visualizer Enhancements

- **VIZ-05**: Critical path highlighting in the progress tree
- **VIZ-06**: Pending captures count badge in the visualizer header

### Headless Enhancements

- **HDLS-07**: Multiple concurrent headless sessions (parallel milestone execution dashboard)

### Worktree Enhancements

- **WORK-06**: Inline diff viewer for worktree files (before remove/merge)

## Out of Scope

| Feature | Reason |
|---------|--------|
| GSD-2 LLM orchestration | TYS monitors and controls; it does not replace the gsd CLI |
| `.planning/` → `.gsd/` migration tooling | Not TYS's responsibility |
| VS Code extension features | Separate product |
| cmux integration | gsd-2 internal detail, not surfaced in TYS |
| Extension marketplace / registry management | Too deep into gsd-2 internals |
| Worktree LLM-guided merge | gsd-2's job; TYS shows diff and tells user to run merge command |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| VERS-01 | Phase 1 | Complete |
| VERS-02 | Phase 1 | Complete |
| VERS-03 | Phase 1 | Complete |
| VERS-04 | Phase 1 | Complete |
| PARS-01 | Phase 1 | Complete |
| PARS-02 | Phase 1 | Complete |
| PARS-03 | Phase 1 | Complete |
| PARS-04 | Phase 1 | Complete |
| PARS-05 | Phase 1 | Complete |
| HLTH-01 | Phase 2 | Complete |
| HLTH-02 | Phase 2 | Complete |
| HLTH-03 | Phase 2 | Complete |
| HLTH-04 | Phase 2 | Complete |
| TERM-01 | Phase 2 | Complete |
| TERM-02 | Phase 2 | Complete |
| TERM-03 | Phase 2 | Complete |
| WORK-01 | Phase 3 | Complete |
| WORK-02 | Phase 3 | Complete |
| WORK-03 | Phase 3 | Complete |
| WORK-04 | Phase 3 | Complete |
| WORK-05 | Phase 3 | Complete |
| HDLS-01 | Phase 4 | Pending |
| HDLS-02 | Phase 4 | Pending |
| HDLS-03 | Phase 4 | Pending |
| HDLS-04 | Phase 4 | Pending |
| HDLS-05 | Phase 4 | Pending |
| HDLS-06 | Phase 4 | Pending |
| VIZ-01 | Phase 4 | Pending |
| VIZ-02 | Phase 4 | Pending |
| VIZ-03 | Phase 4 | Pending |
| VIZ-04 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 31 total
- Mapped to phases: 31
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-20*
*Last updated: 2026-03-20 — traceability updated after roadmap creation (coarse compression: 6 research phases → 4 delivery phases)*
