# S06: Rust Backend Cleanup

**Goal:** `cargo check --lib` produces zero warnings — all 4 dead-code items resolved.
**Demo:** Running `cd src-tauri && cargo check --lib 2>&1 | grep "^warning:"` produces no output.

## Must-Haves

- `Gsd2RoadmapProgress` struct warning eliminated (suppressed — used by tests)
- `get_roadmap_progress_from_dir` function warning eliminated (suppressed — used by tests)
- `Decision` struct warning eliminated (deleted — zero usages anywhere)
- `list_sessions` method warning eliminated (deleted — zero callers anywhere)
- Existing Rust tests still pass (the two `get_roadmap_progress_*` tests depend on the suppressed items)

## Verification

- `cd src-tauri && cargo check --lib 2>&1 | grep "^warning:" | wc -l` returns 0
- `cd src-tauri && cargo test -- get_roadmap_progress 2>&1 | grep "test result"` shows 2 tests passed

## Tasks

- [x] **T01: Suppress and delete 4 dead-code items across 3 Rust files** `est:15m`
  - Why: All 4 warnings are independent edits across 3 files — no dependencies between them, no design decisions to make. The research already specifies exactly which items to suppress vs. delete.
  - Files: `src-tauri/src/commands/gsd2.rs`, `src-tauri/src/models/mod.rs`, `src-tauri/src/pty/mod.rs`
  - Do: (1) Add `#[allow(dead_code)]` above `Gsd2RoadmapProgress` struct at line 209 and above `get_roadmap_progress_from_dir` fn at line 887 in gsd2.rs. (2) Delete the `Decision` struct (lines 67–84) in models/mod.rs. (3) Delete the `list_sessions` method and its doc comment (lines 838–841) in pty/mod.rs. Do NOT add file-level `#![allow(dead_code)]`.
  - Verify: `cd src-tauri && cargo check --lib 2>&1 | grep "^warning:" | wc -l` returns 0; `cd src-tauri && cargo test -- get_roadmap_progress 2>&1 | grep "test result"` shows 2 passed
  - Done when: `cargo check --lib` emits zero warnings and all existing tests pass

## Files Likely Touched

- `src-tauri/src/commands/gsd2.rs`
- `src-tauri/src/models/mod.rs`
- `src-tauri/src/pty/mod.rs`
