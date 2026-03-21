# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

---

## Milestone: v1.0 — GSD-2 Integration

**Shipped:** 2026-03-21
**Phases:** 7 | **Plans:** 14 | **Commits:** ~123

### What Was Built

- Rust `gsd2.rs` module — version detection, .gsd/ file parsing (5 commands), GSD-1 guard rails on 29 existing commands, .gsd/ file watcher with classified event emission
- Health widget — Gsd2HealthTab with budget/blockers/progress counters; adaptive GSD tab set (Milestones/Slices/Tasks vs Phases/Plans/Tasks); version badges on project cards
- Worktrees panel — accordion list with diff preview, AlertDialog remove confirmation, macOS symlink canonicalization
- Headless mode — HeadlessSessionRegistry, PTY-based start/stop with ETX graceful termination, JSON log stream, one-shot query panel
- Visualizer — collapsible milestone → slice → task tree with CSS cost bars and execution timeline
- Milestones/Slices/Tasks tabs — three-level data display with accordion hierarchy, loading/error/empty states
- Full reactive file-change invalidation — all 7 GSD-2 query families refresh within 2 seconds of any `.gsd/` file change

### What Worked

- **Dependency-ordered phases** — wiring Rust commands first (Phase 01) before any UI work meant every subsequent phase had a stable foundation; zero rework of Rust layer
- **GSD-1 guard rails first** — adding guard rails before building GSD-2 features meant incompatibility bugs couldn't hide; caught at the boundary, not the symptom
- **Plan executor quality gate** — plan-checker caught shallow task descriptions before execution, resulting in first-pass execution success on most plans
- **Prefix-array invalidation** — using `['gsd2', 'milestone', projectId]` as a prefix key array was the right call for queries with variable extra arguments; clean and future-proof

### What Was Inefficient

- **Reactive invalidation split across two phases** — Phase 06 added invalidation for Worktrees/Visualizer; Phase 07 added it for Milestones/Slices/Tasks. These should have been a single phase; the gap was caught by the v1.0 audit and required a dedicated gap-closure phase.
- **Pre-existing test failures** — 4 tests in `projects.test.tsx` and `main-layout.test.tsx` were failing before this milestone and remained unaddressed. Tech debt that inflates test noise.
- **ROADMAP.md checkbox not auto-updated** — the Phase 06 plan checkbox was left as `[ ]` after execution; required a dedicated fix in Phase 07. gsd-tools' `roadmap update-plan-progress` should be more reliably called at plan completion.

### Patterns Established

- **`gsd2.rs` pattern**: All GSD-2 Rust commands live in a dedicated module with `resolve_dir_by_id` / `resolve_file_by_id` three-tier file resolvers. New GSD-2 commands follow this pattern.
- **Adaptive tab set**: `gsd_version === 'gsd2'` gates which tab set renders. This is the canonical branch point for version-specific UI.
- **Lift-to-page for session state**: PTY session state that must survive tab navigation gets lifted to the page-level component (`project.tsx`) and prop-drilled, not stored in the tab component.
- **7-tab GSD-2 order**: Health → Headless → Worktrees → Visualizer → Milestones → Slices → Tasks. Future tabs insert at the appropriate position.

### Key Lessons

1. **Plan reactive invalidation as a single unit** — if a feature emits events (like `gsd2:file-changed`), all query invalidations should be wired in the same phase. Splitting across phases creates audit gaps.
2. **Audit before milestone completion** — the `/gsd:audit-milestone` step caught the reactive invalidation gap and the ROADMAP.md checkbox issue before archiving. Run it every time.
3. **Guard rails before features** — adding GSD-1 rejection guards before building GSD-2 features was the right order. Always protect the existing interface first.
4. **Prefix invalidation is the right default for per-item queries** — any query factory that takes `(projectId, itemId)` should be invalidated via prefix `[namespace, type, projectId]` not exact match.

### Cost Observations

- Model mix: predominantly sonnet for executors; opus for planners; sonnet for checkers/verifiers
- 7 phases, 14 plans, ~123 commits in 28 days
- Notable: gap-closure phases (5, 6, 7) were efficient — small scopes with clear specs executed in <10 minutes each

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 | 7 | 14 | Initial GSD-2 integration; established reactive invalidation pattern |

### Cumulative Quality

| Milestone | Commits | Build | Pre-existing Failures |
|-----------|---------|-------|----------------------|
| v1.0 | ~123 | ✓ Clean | 4 tests (projects, main-layout) |
