---
estimated_steps: 5
estimated_files: 3
skills_used: []
---

# T01: Suppress and delete 4 dead-code items across 3 Rust files

**Slice:** S06 — Rust Backend Cleanup
**Milestone:** M005

## Description

`cargo check --lib` produces 4 dead-code warnings. Two items (`Gsd2RoadmapProgress` struct and `get_roadmap_progress_from_dir` function) are used only by tests and should be suppressed with `#[allow(dead_code)]`. Two items (`Decision` struct and `list_sessions` method) have zero usages anywhere and should be deleted outright.

## Steps

1. **Suppress `Gsd2RoadmapProgress` in `src-tauri/src/commands/gsd2.rs`:** Add `#[allow(dead_code)]` on the line immediately before `pub struct Gsd2RoadmapProgress {` (currently line 209). Place it between the `#[derive(...)]` line and the `pub struct` line.

2. **Suppress `get_roadmap_progress_from_dir` in `src-tauri/src/commands/gsd2.rs`:** Add `#[allow(dead_code)]` on the line immediately before `pub fn get_roadmap_progress_from_dir(project_path: &str) -> Gsd2RoadmapProgress {` (currently line 887). Place it between the doc comment and the `pub fn` line.

3. **Delete `Decision` struct in `src-tauri/src/models/mod.rs`:** Remove the entire `#[derive(Debug, Clone, Serialize, Deserialize)]` line and `pub struct Decision { ... }` block (lines 67–84, which includes the derive attribute, the struct keyword line, 13 fields, and the closing brace). Also remove the blank line before the derive if it creates a double blank line after deletion. Do NOT delete `DecisionSearchResult` or `GsdSummaryDecision` — those are different structs that are actively used.

4. **Delete `list_sessions` method in `src-tauri/src/pty/mod.rs`:** Remove the doc comment `/// List all active session IDs` and the method body `pub fn list_sessions(&self) -> Vec<String> { self.sessions.keys().cloned().collect() }` (lines 838–841). Also remove the trailing blank line if it creates a double blank line.

5. **Verify:** Run `cargo check --lib` and confirm zero warnings. Run `cargo test -- get_roadmap_progress` and confirm both tests pass.

## Must-Haves

- [ ] `#[allow(dead_code)]` added to `Gsd2RoadmapProgress` struct (item-level, NOT file-level)
- [ ] `#[allow(dead_code)]` added to `get_roadmap_progress_from_dir` function (item-level, NOT file-level)
- [ ] `Decision` struct fully deleted from `models/mod.rs`
- [ ] `list_sessions` method fully deleted from `pty/mod.rs`
- [ ] `cargo check --lib` produces 0 warnings
- [ ] Existing `get_roadmap_progress_*` tests still pass

## Verification

- `cd src-tauri && cargo check --lib 2>&1 | grep "^warning:" | wc -l` returns `0`
- `cd src-tauri && cargo test -- get_roadmap_progress 2>&1 | grep "test result"` shows `test result: ok. 2 passed`

## Inputs

- `src-tauri/src/commands/gsd2.rs` — contains `Gsd2RoadmapProgress` struct at line 209 and `get_roadmap_progress_from_dir` function at line 887
- `src-tauri/src/models/mod.rs` — contains unused `Decision` struct at line 68
- `src-tauri/src/pty/mod.rs` — contains unused `list_sessions` method at line 839

## Expected Output

- `src-tauri/src/commands/gsd2.rs` — two `#[allow(dead_code)]` annotations added
- `src-tauri/src/models/mod.rs` — `Decision` struct deleted
- `src-tauri/src/pty/mod.rs` — `list_sessions` method deleted
