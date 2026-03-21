---
phase: 02-health-widget-adaptive-ui-and-reactive-updates
plan: 01
subsystem: gsd2-data-pipeline
tags: [rust, typescript, tauri-ipc, tanstack-query, gsd2, health-data]
dependency_graph:
  requires: []
  provides: [gsd2_get_health command, Gsd2Health type, useGsd2Health hook, gsd_version in ProjectWithStats]
  affects: [src/lib/tauri.ts, src/lib/queries.ts, src/lib/query-keys.ts, src-tauri/src/commands/gsd2.rs, src-tauri/src/models/mod.rs, src-tauri/src/commands/projects.rs]
tech_stack:
  added: []
  patterns: [tauri-command, tanstack-query-polling, rust-file-parsing]
key_files:
  created: []
  modified:
    - src-tauri/src/commands/gsd2.rs
    - src-tauri/src/models/mod.rs
    - src-tauri/src/commands/projects.rs
    - src-tauri/src/lib.rs
    - src/lib/tauri.ts
    - src/lib/query-keys.ts
    - src/lib/queries.ts
decisions:
  - "STATE.md parsed with dedicated parse_gsd2_state_md — markdown body sections, not YAML frontmatter"
  - "Active milestone/slice/task stored as full string then split_id_and_title parses ID and title from em-dash separator"
  - "env_error_count and env_warning_count default to 0 — no confirmed storage location in GSD-2 file schema"
  - "get_health_from_dir reuses derive_state_from_dir for M/S/T counts — avoids duplicating filesystem walk logic"
metrics:
  duration: "~30 minutes"
  completed_date: "2026-03-21"
  tasks_completed: 2
  files_modified: 7
---

# Phase 02 Plan 01: GSD-2 Data Pipeline (Health Command + gsd_version) Summary

**One-liner:** Complete data pipeline for gsd2_get_health: Gsd2Health Rust struct with STATE.md + metrics.json parsing, gsd_version threaded through ProjectWithStats SQL/model/TypeScript, and useGsd2Health hook with 10s polling.

## What Was Built

### Task 1: Rust Backend

Added the complete backend data pipeline for GSD-2 health data:

1. **`Gsd2Health` struct** in `src-tauri/src/commands/gsd2.rs` — 19-field struct covering budget, active unit (milestone/slice/task with titles), phase, blocker, next action, M/S/T progress counters, and env counts.

2. **`sum_costs_from_metrics`** helper — reads `.gsd/metrics.json`, sums all `units[].cost` values as f64. Returns 0.0 gracefully if file is missing or malformed.

3. **`parse_gsd2_state_md`** helper — parses GSD-2 STATE.md markdown body sections (not YAML frontmatter). Extracts `**Active Milestone:**`, `**Active Slice:**`, `**Active Task:**`, `**Phase:**`, `**Budget Ceiling:**` bold-key lines, plus `## Blockers` and `## Next Action` section content.

4. **`split_id_and_title`** helper — splits "M001 — Title" or "M001 - Title" strings into (id, title) parts for the active milestone/slice/task fields.

5. **`get_health_from_dir`** public helper — combines costs, STATE.md parse, and `derive_state_from_dir` M/S/T counts into a `Gsd2Health` struct. Fully testable without DB access.

6. **`gsd2_get_health`** Tauri command — looks up project path from DB, calls `get_health_from_dir`, registered in `lib.rs` invoke handler.

7. **`gsd_version: Option<String>`** added to `ProjectWithStats` Rust struct and threaded through the `get_projects_with_stats` SQL query as column index 17.

### Task 2: Frontend TypeScript

1. **`gsd_version: string | null`** added to `ProjectWithStats` TypeScript interface in `tauri.ts`.

2. **`Gsd2Health` interface** added to `tauri.ts` — 19 fields matching Rust struct exactly.

3. **`gsd2GetHealth`** invoke wrapper added to `tauri.ts`.

4. **`gsd2Health` query key** added to `query-keys.ts` factory.

5. **`useGsd2Health` hook** added to `queries.ts` with `refetchInterval: 10_000` and `staleTime: 5_000`.

## Verification

- `cargo check` (from src-tauri/): ✅ Finished with 0 errors
- `pnpm build`: ✅ Built in 10.26s, exit 0
- All acceptance criteria verified via grep

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

### Additional Work

Added `Gsd2StateParsed` struct (private to gsd2.rs) to give named fields to the `parse_gsd2_state_md` return value instead of a bare tuple. This makes the code cleaner without changing the external interface. The plan example showed a tuple return; the struct approach is strictly better.

Added `split_id_and_title` helper that was implied by the plan's description of "split on ' — ' or ' - '" but not explicitly named. Necessary for extracting separate `active_milestone_id` and `active_milestone_title` fields.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| `Gsd2StateParsed` named struct over tuple | Named fields are self-documenting and extend more easily when new STATE.md fields are parsed |
| `split_id_and_title` handles both em-dash and ASCII dash | STATE.md format uses em-dash but defensive handling of ASCII dash prevents parse failures |
| `env_error_count` / `env_warning_count` default 0 | No confirmed storage location in GSD-2 file schema; follow-up when source is identified |
| `get_health_from_dir` reuses `derive_state_from_dir` | Single filesystem walk for M/S/T counts, consistent with existing architecture |

## Self-Check: PASSED

All modified files exist on disk. Both task commits (223f9ca, 32d85a8) exist in git history. `cargo check` and `pnpm build` both exit 0.
