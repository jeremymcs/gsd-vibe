# Track Your Shit — GSD-2 Integration

## What This Is

Track Your Shit is a native desktop app (Tauri 2.x / Rust + React) for managing Claude Code projects. It supports both GSD-1 (`.planning/` directory) and GSD-2 (`.gsd/` directory) projects, detected per-project at import time. GSD-2 projects surface a health widget, worktrees panel, headless session control, visualizer, and reactive Milestones/Slices/Tasks tabs — all updating within 2 seconds of `.gsd/` file changes.

## Core Value

Per-project version detection drives everything — the app correctly identifies whether a project uses `.gsd/` (GSD-2) or `.planning/` (GSD-1) and renders appropriate data, UI terminology, and features for each.

## Current State

v1.0 shipped 2026-03-21. All 7 phases complete, 14 plans executed. GSD-2 integration is fully functional: version detection, file parsing, health widget, worktrees, headless sessions, visualizer, and reactive tab invalidation all wired end-to-end.

**Remaining tech debt (low priority):**
- `gsd2_detect_version` registered as Tauri command but not called post-import (version set at import time only)
- `gsd2_get_roadmap_progress` command + hook exist but no dedicated UI consumer (data partially surfaced via health M/S/T counts)

## Requirements

### Validated — v1.0

- ✓ .planning/ file parsing for GSD-1 projects — existing
- ✓ Rust backend commands: gsd_get_state, gsd_list_milestones, gsd_list_plans, gsd_list_requirements, etc. — existing
- ✓ Tauri IPC command layer (invoke wrappers in lib/tauri.ts) — existing
- ✓ GSD tab UI components (plans, context, verification, UAT, debug, validation) — existing
- ✓ GSD version detection per project (.gsd/ vs .planning/ → "gsd2" | "gsd1" | "none") — v1.0
- ✓ GSD-2 .gsd/ file structure parsing in Rust (milestones, slices, tasks) — v1.0
- ✓ Adaptive terminology in UI (Milestone/Slice/Task for gsd2, Phase/Plan/Task for gsd1) — v1.0
- ✓ Health widget: budget spent/ceiling, env check counts, active M/S/T, blockers — v1.0
- ✓ Worktrees panel: list active worktrees, branch/path, diff preview, remove action — v1.0
- ✓ Visualizer tab: progress tree (milestones → slices → tasks), cost/token metrics — v1.0
- ✓ Headless mode: start/stop `gsd headless` sessions, stream JSON output — v1.0
- ✓ Milestones/Slices/Tasks tabs: real data from Rust parsing commands — v1.0
- ✓ Reactive file-change invalidation: all 7 GSD-2 query families refresh within 2s — v1.0

### Active (v1.1 candidates)

- [ ] Post-import version re-detection (if .gsd/ appears/disappears after project added)
- [ ] Roadmap progress dedicated UI consumer (currently accessible only via health M/S/T counts)
- [ ] Fix pre-existing test failures in projects.test.tsx and main-layout.test.tsx (4 tests)

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
- Health widget data is read from `.gsd/` files (STATE.md, QUEUE.md, metrics ledger)
- Worktrees live at `.gsd/worktrees/<name>/` with `worktree/<name>` branches
- Visualizer aggregates: VisualizerMilestone → VisualizerSlice → VisualizerTask

## Constraints

- **Tech Stack**: Tauri 2.x, Rust backend, React 18 + TypeScript frontend — no framework changes
- **Compatibility**: GSD-1 projects (.planning/) must continue working without modification
- **IPC Pattern**: New features follow existing invoke<T>() pattern from lib/tauri.ts
- **No GSD-2 dependency**: TYS reads files directly (Rust fs), does not import gsd-2 npm package

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Detect version per project via directory presence | Supports both gsd1 and gsd2 users without forcing migration | ✓ Implemented — gsd2.rs gsd2_detect_version + DB column |
| Headless mode = start/stop/monitor (full control) | User wants full session control, not just read-only | ✓ Implemented — HeadlessSessionRegistry + PTY-based start/stop + ETX graceful stop |
| New Rust command module for gsd2 parsing | Keeps gsd1 commands untouched, clean separation | ✓ Implemented — `gsd2.rs` module with 6 commands, GSD-1 guard rails on 29 existing commands |
| Adaptive UI terminology per detected version | Most honest representation of actual structure | ✓ Implemented — Milestones/Slices/Tasks for gsd2, Phases/Plans/Tasks for gsd1 |
| Lift headless session state to ProjectPage scope | Log rows must survive tab navigation | ✓ Implemented in Phase 06 — session state prop-drilled from project.tsx |
| Prefix-array invalidation for per-item queries | gsd2Milestone/gsd2Slice keys take extra args beyond projectId | ✓ Implemented in Phase 07 — `['gsd2', 'milestone', projectId]` catches all accordion-expanded queries |

---
*Last updated: 2026-03-21 after v1.0 milestone*
