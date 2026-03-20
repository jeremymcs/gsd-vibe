# Roadmap: Track Your Shit — GSD-2 Integration

## Overview

This milestone adds GSD-2 support to a mature Tauri desktop app that already has complete GSD-1 integration. The work proceeds in dependency order: a Rust backend foundation (version detection + file parsing) gates all UI features, which then build outward from the simplest data reads (health widget) through independent feature panels (worktrees) to the most complex process-management and aggregation features (headless mode, visualizer). GSD-1 projects continue working without any modification throughout.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: GSD-2 Backend Foundation** - Rust version detection, .gsd/ file parsing commands, GSD-1 guard rails, and file watcher extension
- [ ] **Phase 2: Health Widget, Adaptive UI, and Reactive Updates** - Health data command, budget/blocker display, adaptive terminology, GSD version badges, and polling infrastructure
- [ ] **Phase 3: Worktrees Panel** - Worktree listing, diff preview, and remove action with macOS symlink safety
- [ ] **Phase 4: Headless Mode and Visualizer** - Full headless session lifecycle control and milestone-to-task progress visualizer with cost metrics

## Phase Details

### Phase 1: GSD-2 Backend Foundation
**Goal**: The app correctly identifies GSD-2, GSD-1, and unversioned projects and provides Rust command infrastructure for reading all .gsd/ file structures, with GSD-1 commands actively rejecting GSD-2 project IDs
**Depends on**: Nothing (first phase)
**Requirements**: VERS-01, VERS-02, VERS-03, VERS-04, PARS-01, PARS-02, PARS-03, PARS-04, PARS-05
**Success Criteria** (what must be TRUE):
  1. Opening a GSD-2 project shows a "GSD-2" detection result; opening a GSD-1 project shows "GSD-1"; opening an unversioned project shows "none"
  2. Calling any GSD-1 Rust command with a GSD-2 project ID returns a typed error rather than empty data
  3. The `gsd2_list_milestones` command returns milestone directories with correct ID, title, done status, and dependencies by reading .gsd/milestones/
  4. The `gsd2_derive_state` command returns active milestone/slice/task IDs and M/S/T progress counters
  5. File changes inside .gsd/ emit `gsd2:file-changed` events that the frontend can subscribe to
**Plans:** 3 plans

Plans:
- [ ] 01-01-PLAN.md — DB migration, gsd2.rs module creation, version detection command, project import hooks
- [ ] 01-02-PLAN.md — GSD-1 guard rails on 37 existing commands, .gsd/ file watcher extension
- [ ] 01-03-PLAN.md — File parsing commands (list_milestones, get_milestone, get_slice, derive_state, get_roadmap_progress)

### Phase 2: Health Widget, Adaptive UI, and Reactive Updates
**Goal**: GSD-2 projects show a live health widget with budget, blockers, and progress counters; the project detail UI uses correct terminology per version; project list cards show GSD version badges
**Depends on**: Phase 1
**Requirements**: HLTH-01, HLTH-02, HLTH-03, HLTH-04, TERM-01, TERM-02, TERM-03
**Success Criteria** (what must be TRUE):
  1. A GSD-2 project's health widget shows budget spent vs ceiling (from metrics.json), environment error/warning counts, active milestone/slice/task, and any current blocker
  2. The health widget updates within 10 seconds of a .gsd/ file change (either via file watcher event or polling)
  3. A GSD-2 project's detail tabs are labeled "Milestones", "Slices", "Tasks"; a GSD-1 project's tabs remain "Phases", "Plans", "Tasks"
  4. Project list cards and the dashboard show a "GSD-2" or "GSD-1" badge per project
**Plans**: TBD

### Phase 3: Worktrees Panel
**Goal**: Users with GSD-2 worktrees can see all active worktrees per project, preview what changed in each, and remove them safely
**Depends on**: Phase 2
**Requirements**: WORK-01, WORK-02, WORK-03, WORK-04, WORK-05
**Success Criteria** (what must be TRUE):
  1. The Worktrees tab in a GSD-2 project lists all active worktrees with name, branch, and path (canonicalized to handle macOS /var → /private/var symlinks)
  2. Selecting a worktree shows a summary of files added, modified, and removed vs main before any remove action
  3. Clicking Remove on a worktree removes it from the filesystem and deletes the associated branch; the list refreshes to reflect the change
**Plans**: TBD

### Phase 4: Headless Mode and Visualizer
**Goal**: Users can start, monitor, and stop GSD-2 headless sessions from the app and view a full progress tree with cost/token metrics across all milestones and slices
**Depends on**: Phase 3
**Requirements**: HDLS-01, HDLS-02, HDLS-03, HDLS-04, HDLS-05, HDLS-06, VIZ-01, VIZ-02, VIZ-03, VIZ-04
**Success Criteria** (what must be TRUE):
  1. The Headless tab shows session status (idle/running/complete) with Start and Stop controls; tapping Start creates a PTY session and streams JSON output to the panel
  2. Stopping a headless session or closing the app terminates the process and releases the .gsd/auto.lock file with no orphaned processes
  3. The Visualizer tab renders a milestone → slice → task progress tree where each node shows done/active/pending status
  4. The Visualizer tab shows cost and token metrics aggregated by phase (milestone) and by model, plus a chronological execution timeline of completed slices/tasks
  5. The "query snapshot" panel in the Headless tab shows the last { state, next, cost } result from a one-shot gsd headless query
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. GSD-2 Backend Foundation | 0/3 | Planning complete | - |
| 2. Health Widget, Adaptive UI, and Reactive Updates | 0/TBD | Not started | - |
| 3. Worktrees Panel | 0/TBD | Not started | - |
| 4. Headless Mode and Visualizer | 0/TBD | Not started | - |
