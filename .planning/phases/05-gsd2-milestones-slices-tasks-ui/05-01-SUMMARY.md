---
phase: 05-gsd2-milestones-slices-tasks-ui
plan: 01
subsystem: data-layer
tags: [tauri-invoke, react-query, typescript-interfaces, gsd2, tdd]
dependency_graph:
  requires: []
  provides:
    - "5 GSD-2 invoke wrappers (gsd2ListMilestones, gsd2GetMilestone, gsd2GetSlice, gsd2DeriveState, gsd2GetRoadmapProgress)"
    - "5 TypeScript interfaces (Gsd2MilestoneListItem, Gsd2SliceSummary, Gsd2TaskItem, Gsd2DerivedState, Gsd2RoadmapProgressData)"
    - "4 query key factory entries (gsd2Milestones, gsd2Milestone, gsd2Slice, gsd2DerivedState)"
    - "4 React Query hooks (useGsd2Milestones, useGsd2Milestone, useGsd2Slice, useGsd2DerivedState)"
  affects:
    - "Plan 02 tab components that consume data from these hooks"
tech_stack:
  added: []
  patterns:
    - "Wave 0 TDD: tests written first (RED), then implementation makes them GREEN"
    - "invoke wrappers as single-line arrow functions matching existing gsd2 pattern"
    - "useGsd2Milestone/useGsd2Slice accept enabled flag for lazy accordion loading"
key_files:
  created:
    - src/lib/__tests__/tauri-gsd2.test.ts
    - src/lib/__tests__/queries-gsd2.test.ts
  modified:
    - src/lib/tauri.ts
    - src/lib/query-keys.ts
    - src/lib/queries.ts
decisions:
  - "gsd2GetSlice takes THREE parameters (projectId, milestoneId, sliceId) — milestone_id required to locate slice directory in Rust"
  - "gsd2GetMilestone return type is Gsd2MilestoneListItem — same struct as list items (Rust returns Gsd2Milestone which maps to same TS shape)"
  - "No useGsd2RoadmapProgress hook — data derivable from milestones list, no UI component needs it"
  - "useGsd2Milestones/useGsd2DerivedState poll every 30s matching worktrees pattern for filesystem-backed data"
metrics:
  duration_minutes: 7
  completed_date: "2026-03-21"
  tasks_completed: 3
  files_created: 2
  files_modified: 3
---

# Phase 5 Plan 1: GSD-2 Data Layer (Invoke Wrappers, Interfaces, Query Hooks) Summary

**One-liner:** Complete GSD-2 data layer with 5 invoke wrappers, 5 TypeScript interfaces mirroring Rust structs, 4 query key entries, and 4 React Query hooks — all test-driven from Wave 0 scaffolds.

## What Was Built

The complete TypeScript/React Query data layer for all 5 GSD-2 parsing commands (PARS-01 through PARS-05). This is the foundation that Plan 02 tab components will consume to display milestone, slice, and task data from the Rust backend.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 0 | Wave 0 test scaffolds (RED) | cc52048 | tauri-gsd2.test.ts, queries-gsd2.test.ts |
| 1 | TypeScript interfaces + invoke wrappers | 39a860f | src/lib/tauri.ts |
| 2 | Query key entries + React Query hooks | 710a6ee | src/lib/query-keys.ts, src/lib/queries.ts |

## Interfaces Added (tauri.ts)

- `Gsd2MilestoneListItem` — mirrors `Gsd2Milestone` Rust struct (id, title, dir_name, done, slices[], dependencies[])
- `Gsd2SliceSummary` — mirrors `Gsd2Slice` Rust struct (id, title, done, risk: string|null, dependencies[], tasks[])
- `Gsd2TaskItem` — mirrors `Gsd2Task` Rust struct (id, title, done, estimate: string|null, files[], verify: string|null)
- `Gsd2DerivedState` — mirrors `Gsd2State` Rust struct (active_*_id fields + done/total counters for M/S/T)
- `Gsd2RoadmapProgressData` — mirrors `Gsd2RoadmapProgress` Rust struct (done/total counters for M/S/T)

## Invoke Wrappers Added (tauri.ts)

- `gsd2ListMilestones(projectId)` → `Gsd2MilestoneListItem[]`
- `gsd2GetMilestone(projectId, milestoneId)` → `Gsd2MilestoneListItem`
- `gsd2GetSlice(projectId, milestoneId, sliceId)` → `Gsd2SliceSummary` (THREE args — milestone_id required by Rust)
- `gsd2DeriveState(projectId)` → `Gsd2DerivedState`
- `gsd2GetRoadmapProgress(projectId)` → `Gsd2RoadmapProgressData`

## Query Keys Added (query-keys.ts)

- `gsd2Milestones(projectId)` → `['gsd2', 'milestones', projectId]`
- `gsd2Milestone(projectId, milestoneId)` → `['gsd2', 'milestone', projectId, milestoneId]`
- `gsd2Slice(projectId, milestoneId, sliceId)` → `['gsd2', 'slice', projectId, milestoneId, sliceId]`
- `gsd2DerivedState(projectId)` → `['gsd2', 'derived-state', projectId]`

## Hooks Added (queries.ts)

- `useGsd2Milestones(projectId)` — polls every 30s, staleTime 15s
- `useGsd2Milestone(projectId, milestoneId, enabled)` — lazy load on accordion expand, staleTime 15s
- `useGsd2Slice(projectId, milestoneId, sliceId, enabled)` — lazy load with 3-arg backing command, staleTime 15s
- `useGsd2DerivedState(projectId)` — polls every 30s, staleTime 10s (active task ID for status indicators)

## Verification

- `pnpm build` exits 0 (no TypeScript errors)
- `pnpm test --run src/lib/__tests__/tauri-gsd2.test.ts` — 5/5 pass
- `pnpm test --run src/lib/__tests__/queries-gsd2.test.ts` — 7/7 pass
- All 12 new tests GREEN

## Deviations from Plan

None — plan executed exactly as written.

## Deferred Issues (Pre-existing, Out of Scope)

Two pre-existing test file failures unrelated to this plan's changes:
- `src/pages/projects.test.tsx` — 2 dialog interaction tests failing (pre-existing before this plan)
- `src/components/layout/main-layout.test.tsx` — 2 sidebar navigation tests failing (pre-existing)

These were confirmed by git stash verification — failures exist before any Task 2 changes.

## Self-Check: PASSED
