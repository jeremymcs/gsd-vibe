---
phase: 03-worktrees-panel
plan: "01"
subsystem: worktrees-backend
tags: [rust, typescript, tauri, react-query, gsd2, worktrees]
dependency_graph:
  requires: []
  provides: [gsd2-worktree-commands, gsd2-worktree-types, gsd2-worktree-hooks]
  affects: [src-tauri/src/commands/gsd2.rs, src-tauri/src/lib.rs, src/lib/tauri.ts, src/lib/query-keys.ts, src/lib/queries.ts]
tech_stack:
  added: []
  patterns: [db-guard-then-drop, optimistic-mutation-with-rollback, tauri-invoke-wrapper]
key_files:
  created: []
  modified:
    - src-tauri/src/commands/gsd2.rs
    - src-tauri/src/lib.rs
    - src/lib/tauri.ts
    - src/lib/query-keys.ts
    - src/lib/queries.ts
decisions:
  - "DB guard is dropped before git subprocess calls to avoid holding the lock during potentially slow git operations"
  - "parse_worktree_porcelain skips the first block (always main worktree) and derives name from worktree/ branch prefix"
  - "gsd2_remove_worktree: worktree removal failure returns Err, branch deletion failure logs warning and returns Ok"
  - "useGsd2RemoveWorktree uses optimistic update: filters locally, rolls back with setQueryData on error, invalidates on settled"
metrics:
  duration_minutes: 5
  completed_date: "2026-03-21"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 5
requirements-completed: [WORK-01, WORK-02, WORK-03, WORK-04]
---

# Phase 03 Plan 01: Worktree Backend Commands Summary

**One-liner:** Three Tauri Rust commands for worktree list/remove/diff wired to TypeScript invoke wrappers, query keys, and optimistic React Query hooks.

## What Was Built

Full data pipeline for the worktrees panel backend:

- **Rust structs**: `WorktreeInfo` (name, branch, path, exists, change counts) and `WorktreeDiff` (added/modified/removed file lists + counts)
- **Parse helpers**: `parse_worktree_porcelain` parses `git worktree list --porcelain` blocks, `parse_diff_name_status` maps git status chars to categories, `canonicalize_path` resolves symlinks
- **Three Tauri commands**: `gsd2_list_worktrees`, `gsd2_remove_worktree`, `gsd2_get_worktree_diff` — all follow the db-guard-then-drop pattern
- **TypeScript types**: `WorktreeInfo` and `WorktreeDiff` interfaces mirroring Rust structs (snake_case throughout)
- **Invoke wrappers**: `gsd2ListWorktrees`, `gsd2RemoveWorktree`, `gsd2GetWorktreeDiff`
- **Query key factory**: `gsd2Worktrees` and `gsd2WorktreeDiff` entries
- **React Query hooks**: `useGsd2Worktrees` (15s stale, 30s refetch), `useGsd2WorktreeDiff` (30s stale, enabled flag), `useGsd2RemoveWorktree` (optimistic removal with rollback + sonner toast on error)

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Rust backend — structs, commands, parse helpers | d230a4d | gsd2.rs, lib.rs |
| 2 | TypeScript types, invoke wrappers, query keys, hooks | 3beddc9 | tauri.ts, query-keys.ts, queries.ts |

## Decisions Made

1. **DB guard dropped before git subprocess**: `let project_path = { let db_guard = db.write().await; get_project_path(...)?; }` — guard releases before any `Command::new("git")` call, preventing DB lock contention during slow git operations.

2. **parse_worktree_porcelain skips first block**: `git worktree list --porcelain` always emits the main worktree as the first block. The parser skips it with `.iter().skip(1)` to return only linked worktrees.

3. **Name derivation from branch**: If branch is `worktree/S01-auth`, name becomes `S01-auth`. If branch has no `worktree/` prefix, branch name is used as-is. Fallback to last path component if branch is empty.

4. **Non-fatal branch deletion in gsd2_remove_worktree**: `git worktree remove --force` failing returns `Err`. `git branch -D` failing logs a `tracing::warn!` and returns `Ok(())` — the worktree directory is already gone, the dangling branch reference is non-critical.

5. **useGsd2RemoveWorktree optimistic update**: On mutation start, cancels in-flight queries, snapshots current data, filters out removed worktree locally. On error, restores snapshot and shows sonner toast. On settled (success or error), invalidates queries to sync with actual backend state.

## Verification Results

- `cargo build` (src-tauri): exit 0, compiled in 35.26s
- `pnpm build` (frontend): exit 0, 3260 modules transformed, no TypeScript errors
- All 22 acceptance criteria checks passed

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `d230a4d` — feat(03-01): add worktree Rust commands and register in invoke handler: FOUND
- `3beddc9` — feat(03-01): add TypeScript types, invoke wrappers, query keys, and React Query hooks: FOUND
- `src-tauri/src/commands/gsd2.rs` — FOUND (WorktreeInfo, WorktreeDiff, 3 commands, 4 helpers)
- `src/lib/tauri.ts` — FOUND (WorktreeInfo, WorktreeDiff, 3 invoke wrappers)
- `src/lib/query-keys.ts` — FOUND (gsd2Worktrees, gsd2WorktreeDiff)
- `src/lib/queries.ts` — FOUND (useGsd2Worktrees, useGsd2WorktreeDiff, useGsd2RemoveWorktree)
