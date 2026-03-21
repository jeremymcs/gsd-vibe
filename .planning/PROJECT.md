# Track Your Shit — GSD-2 Integration

## What This Is

Track Your Shit is a native desktop app (Tauri 2.x / Rust + React) for managing Claude Code projects. It currently integrates with GSD v1 via `.planning/` directory parsing. This milestone adds GSD-2 support — detecting and reading the new `.gsd/` structure while preserving GSD-1 compatibility, and surfacing GSD-2's new runtime features (health widget, worktrees, visualizer, headless mode) in the app UI.

## Core Value

Per-project version detection drives everything — the app must correctly identify whether a project uses `.gsd/` (GSD-2) or `.planning/` (GSD-1) and render appropriate data and terminology for each.

## Requirements

### Validated

- ✓ .planning/ file parsing for GSD-1 projects — existing
- ✓ Rust backend commands: gsd_get_state, gsd_list_milestones, gsd_list_plans, gsd_list_requirements, etc. — existing
- ✓ Tauri IPC command layer (invoke wrappers in lib/tauri.ts) — existing
- ✓ GSD tab UI components (plans, context, verification, UAT, debug, validation) — existing

### Active

- [x] GSD version detection per project (.gsd/ vs .planning/ → "gsd2" | "gsd1" | "none") — Validated in Phase 01: gsd-2-backend-foundation
- [x] GSD-2 .gsd/ file structure parsing in Rust (milestones dir, M001-ROADMAP.md, slices, tasks) — Validated in Phase 01: gsd-2-backend-foundation
- [ ] Adaptive terminology in UI (Milestone/Slice/Task for gsd2, Phase/Plan/Task for gsd1)
- [x] Health widget: budget spent/ceiling, env check counts, active milestone/slice/task, progress M/S/T, ETA, blockers — Validated in Phase 02: health-widget-adaptive-ui-and-reactive-updates
- [ ] Worktree panel: list active worktrees per project, branch name, path, merge/remove actions
- [ ] Visualizer data tab: progress tree (milestones → slices → tasks), cost/token metrics by phase/model
- [ ] Headless mode: start/stop `gsd headless` sessions, stream JSON output, detect completion, show next action

### Out of Scope

- GSD-2 LLM orchestration itself — TYS monitors/controls; it does not replace the gsd CLI
- Migration tooling (.planning/ → .gsd/) — not a TYS responsibility
- VS Code extension features — separate product
- cmux integration — gsd-2 internal detail, not surfaced in TYS
- Extension marketplace / registry management — too deep into gsd-2 internals

## Context

- gsd-2 stores project state in `.gsd/milestones/M001/` with files like `M001-ROADMAP.md`, `S01-PLAN.md`, `T01-PLAN.md`
- gsd-2 has legacy fallback: projects with `.planning/` still work via prefix matching in paths.ts
- `gsd headless query` emits a JSON snapshot: `{ state, next, cost }` — can be polled without spawning LLM
- Health widget data lives in-process in gsd-2 but can be read from `.gsd/` files (STATE.md, QUEUE.md, KNOWLEDGE.md, metrics ledger)
- Worktrees live at `.gsd/worktrees/<name>/` with `worktree/<name>` branches
- Visualizer aggregates: VisualizerMilestone → VisualizerSlice → VisualizerTask, plus CriticalPathInfo and AgentActivityInfo
- Current Rust gsd.rs commands parse `.planning/` — new commands needed for `.gsd/` alongside

## Constraints

- **Tech Stack**: Tauri 2.x, Rust backend, React 18 + TypeScript frontend — no framework changes
- **Compatibility**: GSD-1 projects (.planning/) must continue working without modification
- **IPC Pattern**: New features follow existing invoke<T>() pattern from lib/tauri.ts
- **No GSD-2 dependency**: TYS reads files directly (Rust fs), does not import gsd-2 npm package

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Detect version per project via directory presence | Supports both gsd1 and gsd2 users without forcing migration | — Pending |
| Headless mode = start/stop/monitor (full control) | User wants full session control, not just read-only | — Pending |
| New Rust command module for gsd2 parsing | Keeps gsd1 commands untouched, clean separation | Implemented in Phase 01 — `gsd2.rs` module with 6 commands |
| Adaptive UI terminology (detect and render per project) | Most honest representation of actual structure | — Pending |

---
*Last updated: 2026-03-21
