// Track Your Shit - Phase 01 Research: GSD-2 Backend Foundation
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

# Phase 1: GSD-2 Backend Foundation - Research

**Researched:** 2026-03-20
**Domain:** Rust Tauri 2.x backend — GSD-2 version detection, .gsd/ file parsing, GSD-1 guard rails, watcher extension
**Confidence:** HIGH (all findings verified against live codebase and GSD-2 source)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Version Detection Storage**
- Add `gsd_version TEXT` column to the `projects` table via a DB schema migration
- Detection logic: check `{project_path}/.gsd/` existence first (gsd2), then `{project_path}/.planning/` (gsd1), else "none"
- Store on project open/import and on `gsd2_detect_version` command call
- This survives app restart and avoids re-checking disk on every command call

**GSD-1 Guard Rails**
- All existing GSD-1 commands (`gsd_get_state`, `gsd_list_milestones`, `gsd_list_plans`, etc.) should check project's `gsd_version` from DB at the top of the function
- If version is "gsd2", return `Err("This project uses GSD-2. Use gsd2_* commands instead.".to_string())`
- Simple string error — frontend already handles `Err(String)` from Tauri commands
- Do NOT return empty Ok() — that's the silent failure bug we're fixing (VERS-03)

**New gsd2.rs Module**
- Create `src-tauri/src/commands/gsd2.rs` — do NOT extend `gsd.rs` (it's 3,604 lines)
- Add `mod gsd2;` in `lib.rs` and register all new commands in the `invoke_handler!` macro
- Reuse `parse_frontmatter()` helper pattern from `gsd.rs` — copy/adapt, don't import (module boundary)
- Three-tier path resolution for milestones: exact ID match (`M001/`) → ID-prefix match (`M001-FLIGHT-SIMULATOR/`) → return None

**GSD-2 Watcher Events**
- Extend `watch_project_files` in `watcher.rs` to also watch `{project_path}/.gsd/` if it exists
- Emit a NEW event `gsd2:file-changed` (parallel to existing `gsd:file-changed`) — do NOT merge into one event
- Payload matches existing pattern: `{ project_path, file_path, change_type }`
- `change_type` values for `.gsd/`: `"gsd2_milestone"`, `"gsd2_state"`, `"gsd2_metrics"`, `"gsd2_other"`

### Claude's Discretion
- Exact Rust struct field names for `Gsd2Milestone`, `Gsd2Slice`, `Gsd2Task`, `Gsd2State`
- Frontmatter parsing details for `M001-ROADMAP.md` (done/active/pending extraction)
- Whether to use a single `gsd2_detect_version` command or embed version check in `gsd_get_project_info`
- DB migration number (use next available sequential number from existing migrations)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| VERS-01 | App detects whether a project uses `.gsd/` (gsd2), `.planning/` (gsd1), or neither (none) on project load | DB migration pattern verified in `db/mod.rs`; detection via `Path::exists()` |
| VERS-02 | Version detection result returned as typed enum (`"gsd2" | "gsd1" | "none"`) from `gsd2_detect_version` Rust command | Command pattern from `gsd.rs:144`, returns `Result<String, String>` |
| VERS-03 | Existing GSD-1 Rust commands return explicit error when called with gsd2 project ID | 37 GSD-1 commands identified; guard pattern is `pool.read()` → DB lookup → early return Err |
| VERS-04 | File watcher watches `.gsd/` directory, emitting `gsd2:file-changed` events | `watcher.rs` extension point at line ~138; `notify::RecursiveMode::Recursive` |
| PARS-01 | `gsd2_list_milestones` lists milestone directories from `.gsd/milestones/` using three-tier path resolution | Three-tier resolver pattern verified in `paths.js:resolveDir()` |
| PARS-02 | `gsd2_get_milestone` reads `M001-ROADMAP.md` and returns slices with ID, title, done status, dependencies | Slice format verified in `roadmap-slices.js:parseRoadmapSlices()` |
| PARS-03 | `gsd2_get_slice` reads `S01-PLAN.md` and returns tasks with ID, title, done status, estimate | Task format verified in `files.js:_parsePlanImpl()` |
| PARS-04 | `gsd2_derive_state` returns active milestone ID, active slice ID, active task ID, M/S/T progress | State derivation algorithm verified in `state.js:_deriveStateImpl()` |
| PARS-05 | `gsd2_get_roadmap_progress` returns milestone/slice/task completion counts for a progress bar | Derived from same data as PARS-04; counts from read_dir + roadmap parse |

</phase_requirements>

---

## Summary

Phase 1 is purely a Rust backend addition — no frontend changes. The existing codebase provides all necessary primitives: `parse_frontmatter()`, `get_project_path()`, `DbPool`, the `schema_migrations` tracking table, and `watch_project_files`. The work is a controlled expansion following established patterns.

The GSD-2 file format is well-specified in `paths.js` and `files.js`. Milestone directories use bare IDs (`M001/`) with a legacy prefix-match fallback for descriptor-suffixed dirs (`M001-FLIGHT-SIMULATOR/`). Files follow `ID-SUFFIX.md` convention (`M001-ROADMAP.md`, `S01-PLAN.md`). The frontmatter is identical YAML-like format to GSD-1 — `parse_frontmatter()` is directly reusable. Slices are parsed from `## Slices` checkbox sections; tasks from `## Tasks` checkbox sections.

The three critical correctness requirements are: (1) three-tier directory resolution to handle legacy projects without breakage, (2) GSD-1 guard checks that read `gsd_version` from DB to prevent silent empty returns, and (3) watcher exclusion of `.gsd/worktrees/` to prevent recursive file events during compilation in worktrees. All other decisions are straightforward extensions of existing patterns.

**Primary recommendation:** Create `gsd2.rs` as a clean new module following the `gsd.rs` command pattern exactly. Add the DB migration first, then implement in order: detect_version → guard rails on GSD-1 commands → list_milestones → get_milestone → get_slice → derive_state → get_roadmap_progress → watcher extension.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `std::fs` | stdlib | Read `.gsd/` markdown files | Already used in `gsd.rs` for all `.planning/` reads; no deps needed |
| `rusqlite` | 0.32 (Cargo.toml) | DB migration for `gsd_version` column; guard reads | All DB ops in codebase use this |
| `serde` + `serde_json` | 1.x (Cargo.toml) | Serialize `Gsd2Milestone`, `Gsd2Slice`, `Gsd2Task`, `Gsd2State` return types | Standard for all Tauri command return types |
| `regex` | 1.x (Cargo.toml) | Parse slice/task checkbox lines, extract IDs from directory names | Already used in `gsd.rs` throughout |
| `notify` + `notify-debouncer-mini` | 6.x / 0.4 (Cargo.toml) | Watch `.gsd/` directory for file changes | `watcher.rs` uses this already for `.planning/` |
| `tauri` | 2.x (Cargo.toml) | `#[tauri::command]` annotation, `AppHandle::emit()` for events | All commands follow this |

### No New Dependencies Required
This phase requires zero new Cargo dependencies. All required crates are already in `Cargo.toml`.

---

## Architecture Patterns

### Recommended Project Structure Changes

```
src-tauri/src/
├── commands/
│   ├── mod.rs           # ADD: pub mod gsd2;
│   ├── gsd.rs           # MODIFY: add version guard to ~37 commands
│   ├── gsd2.rs          # CREATE: all new GSD-2 commands
│   └── watcher.rs       # MODIFY: add .gsd/ watch + gsd2:file-changed events
└── db/
    └── mod.rs           # MODIFY: add migration "add_gsd_version_to_projects"
```

### Pattern 1: DB Migration (add `gsd_version` column)

The `db/mod.rs` migration pattern is `migration_applied()` guard → `ALTER TABLE` → `record_migration()`. The next migration name should follow the `snake_case` convention.

```rust
// Source: src-tauri/src/db/mod.rs migration pattern (verified at line 259)
if !self.migration_applied("add_gsd_version_to_projects") {
    let has_col: bool = self.conn
        .prepare("SELECT gsd_version FROM projects LIMIT 1")
        .is_ok();
    if !has_col {
        tracing::info!("Running migration: Adding gsd_version column to projects");
        self.conn.execute(
            "ALTER TABLE projects ADD COLUMN gsd_version TEXT",
            [],
        )?;
    }
    self.record_migration("add_gsd_version_to_projects")?;
}
```

The existing `projects` table schema (verified in `db/mod.rs:752`) does NOT have `gsd_version` yet. This migration adds it as nullable TEXT.

### Pattern 2: New gsd2.rs Module Structure

```rust
// Track Your Shit - GSD-2 Commands
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

use crate::db::Database;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use std::sync::Arc;

type DbState = Arc<crate::db::DbPool>;

// --- Helpers (copy from gsd.rs, do not import) ---
fn get_project_path(db: &Database, project_id: &str) -> Result<String, String> { ... }
fn parse_frontmatter(content: &str) -> (HashMap<String, String>, String) { ... }

// --- Structs ---
#[derive(Serialize, Deserialize)]
pub struct Gsd2Milestone { ... }

#[derive(Serialize, Deserialize)]
pub struct Gsd2Slice { ... }

#[derive(Serialize, Deserialize)]
pub struct Gsd2Task { ... }

#[derive(Serialize, Deserialize)]
pub struct Gsd2State { ... }

// --- Commands ---
#[tauri::command]
pub async fn gsd2_detect_version(...) -> Result<String, String> { ... }

#[tauri::command]
pub async fn gsd2_list_milestones(...) -> Result<Vec<Gsd2Milestone>, String> { ... }
// etc.
```

### Pattern 3: GSD-1 Guard Rail

Add at the top of each of the ~37 GSD-1 command functions that access `.planning/` paths:

```rust
// Source: Locked decision from CONTEXT.md; verified pattern from gsd.rs:144
#[tauri::command]
pub async fn gsd_get_state(
    db: tauri::State<'_, DbState>,
    project_id: String,
) -> Result<GsdState, String> {
    // GSD-2 guard: check version stored in DB, return typed error if mismatch
    {
        let reader = db.read().await;
        let version: Option<String> = reader
            .query_row(
                "SELECT gsd_version FROM projects WHERE id = ?1",
                params![&project_id],
                |row| row.get(0),
            )
            .ok();
        if version.as_deref() == Some("gsd2") {
            return Err("This project uses GSD-2. Use gsd2_* commands instead.".to_string());
        }
    }
    // ... existing function body unchanged ...
}
```

**Which GSD-1 commands to guard (verified from gsd.rs):**
All 37 commands listed below read `.planning/` paths and must be guarded:
`gsd_get_project_info`, `gsd_get_state`, `gsd_get_config`, `gsd_list_requirements`,
`gsd_list_milestones`, `gsd_list_todos`, `gsd_create_todo`, `gsd_update_todo`,
`gsd_complete_todo`, `gsd_delete_todo`, `gsd_list_debug_sessions`, `gsd_get_debug_session`,
`gsd_list_research`, `gsd_get_verification`, `gsd_get_phase_context`, `gsd_list_plans`,
`gsd_get_phase_plans`, `gsd_list_summaries`, `gsd_get_phase_summaries`,
`gsd_list_phase_research`, `gsd_get_phase_research`, `gsd_list_milestone_audits`,
`gsd_sync_project`, `gsd_list_uat_results`, `gsd_get_uat_by_phase`,
`gsd_list_validations`, `gsd_get_validation_by_phase`, `gsd_get_roadmap_progress`,
`gsd_update_config`, `gsd_list_all_todos`.

**Note:** `gsd_create_todo`, `gsd_update_todo`, `gsd_complete_todo`, `gsd_delete_todo`,
`gsd_list_debug_sessions`, `gsd_get_debug_session` are DB-only (no path reads) but
must still be guarded to prevent GSD-2 projects polluting GSD-1 todo tables.

### Pattern 4: Three-Tier Directory Resolver (PARS-01)

Verified from `paths.js:resolveDir()` (lines 168-184):

```rust
// Source: paths.js:resolveDir() - exact match first, then prefix match
fn resolve_dir_by_id(parent_dir: &Path, id_prefix: &str) -> Option<String> {
    let entries = fs::read_dir(parent_dir).ok()?;
    let mut prefix_match: Option<String> = None;

    for entry in entries.flatten() {
        let file_type = entry.file_type().ok()?;
        if !file_type.is_dir() {
            continue;
        }
        let name = entry.file_name().to_string_lossy().to_string();
        if name == id_prefix {
            return Some(name); // Tier 1: exact match wins immediately
        }
        if name.starts_with(&format!("{}-", id_prefix)) && prefix_match.is_none() {
            prefix_match = Some(name); // Tier 2: prefix match, keep looking for exact
        }
    }
    prefix_match // Tier 3: return prefix match or None
}
```

### Pattern 5: Three-Tier File Resolver

Verified from `paths.js:resolveFile()` (lines 192-216):

```rust
// Source: paths.js:resolveFile() - direct ID-SUFFIX.md → legacy ID-DESCRIPTOR-SUFFIX.md → legacy suffix.md
fn resolve_file_by_id(dir: &Path, id_prefix: &str, suffix: &str) -> Option<String> {
    let entries = fs::read_dir(dir).ok()?
        .flatten()
        .filter_map(|e| {
            if e.file_type().ok()?.is_file() {
                Some(e.file_name().to_string_lossy().to_string())
            } else {
                None
            }
        })
        .collect::<Vec<_>>();

    let target = format!("{}-{}.md", id_prefix, suffix).to_uppercase();

    // Tier 1: direct match ID-SUFFIX.md (case-insensitive)
    if let Some(f) = entries.iter().find(|e| e.to_uppercase() == target) {
        return Some(f.clone());
    }
    // Tier 2: legacy descriptor match ID-*-SUFFIX.md
    let pattern = regex::Regex::new(
        &format!(r"(?i)^{}-.*-{}\.md$", regex::escape(id_prefix), regex::escape(suffix))
    ).ok()?;
    if let Some(f) = entries.iter().find(|e| pattern.is_match(e)) {
        return Some(f.clone());
    }
    // Tier 3: legacy bare suffix.md
    let bare = format!("{}.md", suffix.to_lowercase());
    entries.into_iter().find(|e| e.to_lowercase() == bare)
}
```

### Pattern 6: Slice Parsing from ROADMAP.md

Verified from `roadmap-slices.js:parseRoadmapSlices()` (lines 47-82):

The `## Slices` section contains checkbox items in this format:
```
- [ ] **S01: Title Here** `risk:low` `depends:[S00]`
  > After this: description of output
- [x] **S02: Done Slice** `risk:medium`
```

Rust parse approach:
- Find `## Slices` heading, extract until next `##` heading
- Match each line against: `^\s*-\s+\[([ xX])\]\s+\*\*([\w.]+):\s+(.+?)\*\*\s*(.*)`
- `depends` extracted from `` `depends:[S01,S02]` `` inline pattern
- `done` = checkbox contains `x` or `X`

### Pattern 7: Task Parsing from PLAN.md

Verified from `files.js:_parsePlanImpl()` (lines 272-316):

The `## Tasks` section format:
```
- [ ] **T01: Task Title** `est:2h`
  description line
  - Files: `src/foo.rs`, `src/bar.rs`
  - Verify: run `cargo test`
- [x] **T02: Done Task** `est:30m`
```

Regex: `^\s*-\s+\[([ xX])\]\s+\*\*([\w.]+):\s+(.+?)\*\*\s*(.*)`
- Group 1: done flag (`" "` or `x`)
- Group 2: ID (`T01`)
- Group 3: title
- Group 4: rest (contains `` `est:2h` ``)

### Pattern 8: Watcher Extension

Extend `watch_project_files` in `watcher.rs` after the existing `.planning/` watch block (line ~143):

```rust
// Source: watcher.rs pattern (verified lines 138-147)
// ADD after planning_dir watch:
let gsd_dir = path.join(".gsd");
if gsd_dir.exists() {
    // Watch .gsd/ but NOT .gsd/worktrees/ (prevents event storm during builds)
    watcher
        .watch(&gsd_dir, notify::RecursiveMode::Recursive)
        .map_err(|e| format!("Failed to watch .gsd: {}", e))?;
}
```

In the event handler closure, add GSD-2 classification BEFORE the existing `.planning/` block:
```rust
// GSD-2 events
if changed_path.contains("/.gsd/") || changed_path.contains("\\.gsd\\") {
    // Skip .gsd/worktrees/ to prevent recursive build events
    if changed_path.contains("/.gsd/worktrees/") || changed_path.contains("\\.gsd\\worktrees\\") {
        // Do not emit events for worktree directory contents
    } else {
        let change_type = if changed_path.contains("/STATE.md") || changed_path.contains("\\STATE.md") {
            "gsd2_state"
        } else if changed_path.contains("/milestones/") || changed_path.contains("\\milestones\\") {
            "gsd2_milestone"
        } else if changed_path.contains("metrics.json") {
            "gsd2_metrics"
        } else {
            "gsd2_other"
        };
        let _ = app_handle.emit(
            "gsd2:file-changed",
            serde_json::json!({
                "project_path": project_path_clone,
                "file_path": changed_path,
                "change_type": change_type,
            }),
        );
    }
}
```

### Anti-Patterns to Avoid

- **Extending `gsd.rs`:** At 3,604 lines it is already very large. Adding GSD-2 content creates maintenance and regression risk for stable GSD-1 functionality.
- **Returning `Ok(empty_default)` for GSD-2 on GSD-1 commands:** This is the exact silent failure bug being fixed. Always return `Err(...)` for version mismatches.
- **Reading `gsd_version` with the write connection:** Use `pool.read()` for the guard check — it is a SELECT query and should not take the writer lock.
- **Watching `.gsd/worktrees/` recursively:** Worktrees contain full project copies. Compilation inside a worktree will generate millions of file events per second, hammering the debouncer.
- **Hardcoding bare-ID directory names:** `M001/` is current convention but `M001-DESCRIPTOR/` is valid for older projects. Always use the three-tier resolver.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Frontmatter parsing | Custom parser | `parse_frontmatter()` copied from `gsd.rs:41` | Already handles mid-file `---` delimiters, edge cases |
| DB migration tracking | Custom migration table | Existing `schema_migrations` table + `migration_applied()` + `record_migration()` | Pattern is established, idempotent, crash-safe |
| File event debouncing | Custom debounce logic | `notify_debouncer_mini` with 2s window (already in `watcher.rs`) | Handles rapid writes from GSD-2 orchestrator |
| Recursive directory walk | Custom walker | `std::fs::read_dir()` + `is_dir()` checks | Sufficient; GSD-2 structure is shallow (3 levels max) |
| Regex compilation per call | Per-invocation `Regex::new()` | `once_cell::sync::Lazy<Regex>` | Avoids recompilation overhead across bulk milestone reads |

**Key insight:** Every parsing primitive needed for Phase 1 already exists in `gsd.rs`. The task is copying/adapting helpers into `gsd2.rs` within a clean module boundary — not building a new parser from scratch.

---

## Common Pitfalls

### Pitfall 1: Three-Tier Resolver Missing → Silent Empty Results
**What goes wrong:** If only exact-ID directory matching is implemented, projects with legacy `M001-DESCRIPTOR/` directory names return empty milestone lists with no error. Very hard to debug because the code path looks correct.
**Why it happens:** Current GSD-2 convention uses bare IDs, so new projects work fine. Only imported/older projects fail.
**How to avoid:** Implement both tiers of `resolve_dir_by_id()` from day one. Test with fixture directories named `M001-FLIGHT-SIMULATOR/`.
**Warning signs:** `gsd2_list_milestones` returns empty array for a project that clearly has `.gsd/milestones/M001-SOMETHING/` on disk.

### Pitfall 2: GSD-1 Guard Using Wrong DB Connection
**What goes wrong:** If the guard uses `pool.write()` for the version SELECT, it serializes all concurrent reads through the writer lock — defeating the read-pool architecture under load.
**Why it happens:** `pool.write()` is a valid lock for DB operations, but not the right one for SELECT queries.
**How to avoid:** Always use `pool.read()` for the version guard. Writer lock is only for INSERT/UPDATE/DELETE.
**Warning signs:** Concurrent GSD-2 queries have higher latency than expected; lock contention visible in Tauri debug logs.

### Pitfall 3: Watcher Watching `.gsd/worktrees/` → Event Storm
**What goes wrong:** Watching `.gsd/worktrees/` recursively causes millions of events per second when a `pnpm install` or `cargo build` runs inside a worktree. The 2-second debouncer fires continuously.
**Why it happens:** `RecursiveMode::Recursive` applied to `.gsd/` catches the worktrees subdirectory. Worktrees contain full project copies with node_modules, target/, etc.
**How to avoid:** In the event handler, skip events whose `changed_path` contains `/.gsd/worktrees/`. Do not try to exclude the directory from the `watcher.watch()` call — the notify crate does not support per-path exclusions; filter in the callback instead.
**Warning signs:** CPU spikes when a worktree is building; `gsd2:file-changed` events emitted at thousands per second.

### Pitfall 4: Migration Not Run Before Guard Reads
**What goes wrong:** If the app starts and a command is called before the migration adds `gsd_version`, the `SELECT gsd_version FROM projects` query fails with "no such column". The `Option<String>` from `query_row().ok()` silently returns `None`, bypassing the guard — GSD-2 projects pass through to GSD-1 commands.
**Why it happens:** Migration runs at startup in `initialize_schema()`. But tests that create projects without going through full app init may miss it.
**How to avoid:** The migration uses the established `migration_applied()` guard pattern which is idempotent — no action needed at runtime. For tests: use `Database::new()` or `DbPool::new()` which both call `initialize_schema()`. Never create test connections without running schema init.
**Warning signs:** Guard never fires in integration tests even with a GSD-2 project.

### Pitfall 5: gsd2_derive_state Returning Wrong Active Milestone
**What goes wrong:** The state derivation logic must walk milestones in directory order, mark each as complete (has SUMMARY or all slices done+validated), and find the first non-complete one as active. If this logic is simplified (e.g., "first milestone is always active"), completed milestones appear active, blocking progress display.
**Why it happens:** The full `deriveState()` logic in `state.js` has many nuances: parked milestones, validation terminal state, dependency resolution. For Phase 1, the requirement is the "active" milestone ID and M/S/T counters — the full complexity is not needed, but the basic completeness check (all slices done) must be correct.
**How to avoid:** Read milestone IDs via `read_dir` on `.gsd/milestones/`. For each milestone directory: resolve `ROADMAP.md` via three-tier resolver, parse slice checkboxes, check all done. First milestone without all slices done = active. Count totals across all milestones for progress.
**Warning signs:** `gsd2_derive_state` reports `activeMilestoneId: "M001"` when M001 has all slices checked `[x]`.

---

## Code Examples

### Verified Command Registration Pattern (lib.rs)
```rust
// Source: src-tauri/src/lib.rs:116-288 (verified)
// ADD to invoke_handler! after the gsd:: block:
// GSD-2 commands
commands::gsd2::gsd2_detect_version,
commands::gsd2::gsd2_list_milestones,
commands::gsd2::gsd2_get_milestone,
commands::gsd2::gsd2_get_slice,
commands::gsd2::gsd2_derive_state,
commands::gsd2::gsd2_get_roadmap_progress,
```

### Verified Module Declaration (commands/mod.rs)
```rust
// Source: src-tauri/src/commands/mod.rs (verified — currently 20 lines)
// ADD:
pub mod gsd2;
```

### Verified DbPool Read Pattern
```rust
// Source: src-tauri/src/db/mod.rs:100-106 (verified)
// Read connection is round-robin from read pool — concurrent, no writer contention
let reader = db.read().await;
let version: Option<String> = reader
    .query_row(
        "SELECT gsd_version FROM projects WHERE id = ?1",
        params![&project_id],
        |row| row.get(0),
    )
    .ok(); // Returns None if column is NULL or row not found
```

### Verified DbPool Write Pattern (for detect_version that stores the result)
```rust
// Source: src-tauri/src/db/mod.rs:94-98 (verified)
// Write connection is serialized — use for UPDATE
let mut db = pool.write().await;
db.conn().execute(
    "UPDATE projects SET gsd_version = ?1 WHERE id = ?2",
    params![version_str, &project_id],
)?;
```

### Verified get_project_path Helper
```rust
// Source: src-tauri/src/commands/gsd.rs:28-36 (verified)
fn get_project_path(db: &Database, project_id: &str) -> Result<String, String> {
    db.conn()
        .query_row(
            "SELECT path FROM projects WHERE id = ?1",
            params![project_id],
            |row| row.get::<_, String>(0),
        )
        .map_err(|e| format!("Project not found: {}", e))
}
```

### Verified parse_frontmatter Helper
```rust
// Source: src-tauri/src/commands/gsd.rs:41-94 (verified)
// Handles: start-of-file --- delimiters AND mid-file --- (after copyright block)
// Returns: (HashMap<String, String>, String) — (frontmatter_map, body_text)
// Key insight: skips list items (starts with '-') and indented continuation lines
fn parse_frontmatter(content: &str) -> (HashMap<String, String>, String) {
    // [copy verbatim from gsd.rs:41-94]
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single `Arc<Mutex<Database>>` serializing all reads | `DbPool` with 1 writer + 4 read connections (round-robin) | Already done (current codebase) | Guard reads MUST use `pool.read()`, not `pool.write()` |
| `.planning/` only file watching | `.planning/` + `.gsd/` dual watching (Phase 1 addition) | This phase | Frontend must listen to BOTH `gsd:file-changed` AND `gsd2:file-changed` |
| All GSD commands assume GSD-1 | GSD-1 commands guard-check DB version; GSD-2 commands in new module | This phase | Zero regressions on GSD-1 projects (guard only fires for `gsd_version = 'gsd2'`) |

**Deprecated/outdated:**
- Silent `Ok(empty_default)` returns from GSD-1 commands on GSD-2 projects: replaced by explicit `Err(...)` (VERS-03)

---

## Open Questions

1. **Regex compilation in gsd2.rs**
   - What we know: `gsd.rs` uses per-call `Regex::new()` in some helpers; `once_cell` is not currently imported in commands modules
   - What's unclear: Whether `once_cell` is in `Cargo.toml` or needs adding
   - Recommendation: Check `Cargo.toml` before planning. If not present, either inline `Regex::new()` (acceptable for Phase 1 call volume) or add `once_cell`. The PITFALLS research flags this as a performance concern at >20 files per request — milestone count in any single project is unlikely to exceed this in Phase 1 testing.

2. **gsd2_detect_version: standalone command vs. embedded in project open**
   - What we know: CONTEXT.md marks this as Claude's Discretion. The DB stores the version for persistent access.
   - What's unclear: Whether the frontend needs to call `gsd2_detect_version` explicitly or if project open already handles it
   - Recommendation: Implement as a standalone `gsd2_detect_version` command (VERS-02 requires this). Also update `import_project` / `import_project_enhanced` in `projects.rs` to detect and store version at import time (VERS-01). This gives both: automatic detection on import and an explicit re-detect command.

3. **projects.rs import flow for version detection**
   - What we know: `import_project` and `import_project_enhanced` exist in `projects.rs` and insert rows into the `projects` table
   - What's unclear: Exact insertion point for `gsd_version` detection within those commands
   - Recommendation: Read `projects.rs` in the planning task that implements VERS-01 to find the right insertion point. The pattern is straightforward: after the project path is validated and before the INSERT, check `.gsd/` and `.planning/` existence, set version string.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest + React Testing Library (frontend); Rust `#[cfg(test)]` inline tests (backend) |
| Config file | `vite.config.ts` (frontend Vitest config); no separate Rust test config |
| Quick run command | `pnpm test` (frontend unit); `cargo test` (backend Rust) |
| Full suite command | `pnpm test && cargo test && pnpm tauri build` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VERS-01 | Detect gsd2/gsd1/none on project load | unit (Rust) | `cargo test -p track-your-shit-lib -- gsd2::tests::test_detect_version` | ❌ Wave 0 |
| VERS-02 | `gsd2_detect_version` returns typed string | unit (Rust) | `cargo test -p track-your-shit-lib -- gsd2::tests::test_detect_version_command` | ❌ Wave 0 |
| VERS-03 | GSD-1 commands return Err for gsd2 projects | unit (Rust) | `cargo test -p track-your-shit-lib -- gsd::tests::test_gsd1_guard` | ❌ Wave 0 |
| VERS-04 | Watcher emits gsd2:file-changed | manual-only | Manual: edit `.gsd/STATE.md`, verify event in Tauri logs | N/A |
| PARS-01 | list_milestones with exact+prefix match | unit (Rust) | `cargo test -p track-your-shit-lib -- gsd2::tests::test_list_milestones` | ❌ Wave 0 |
| PARS-02 | get_milestone parses slices from ROADMAP.md | unit (Rust) | `cargo test -p track-your-shit-lib -- gsd2::tests::test_get_milestone` | ❌ Wave 0 |
| PARS-03 | get_slice parses tasks from PLAN.md | unit (Rust) | `cargo test -p track-your-shit-lib -- gsd2::tests::test_get_slice` | ❌ Wave 0 |
| PARS-04 | derive_state returns correct active IDs | unit (Rust) | `cargo test -p track-your-shit-lib -- gsd2::tests::test_derive_state` | ❌ Wave 0 |
| PARS-05 | get_roadmap_progress returns M/S/T counts | unit (Rust) | `cargo test -p track-your-shit-lib -- gsd2::tests::test_roadmap_progress` | ❌ Wave 0 |

**VERS-04 is manual-only** because Tauri's `AppHandle::emit()` cannot be unit tested without a running Tauri app context. The watcher event emission requires manual verification or E2E testing.

### Sampling Rate
- **Per task commit:** `cargo test -p track-your-shit-lib -- gsd2` (runs all gsd2 module tests)
- **Per wave merge:** `cargo test && pnpm build` (full Rust test suite + frontend TypeScript build)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src-tauri/src/commands/gsd2.rs` — the new module itself with `#[cfg(test)] mod tests` block
- [ ] Test fixtures: temp directory structure with `.gsd/milestones/M001/M001-ROADMAP.md` and `.gsd/milestones/M001-FLIGHT-SIMULATOR/M001-FLIGHT-SIMULATOR-ROADMAP.md` for three-tier resolver tests
- [ ] Test fixture for ROADMAP.md content with checkbox slices (done and pending)
- [ ] Test fixture for PLAN.md content with checkbox tasks (done and pending)
- [ ] No new test infrastructure needed — `#[cfg(test)]` inline Rust tests (same pattern as `gsd.rs:3371`)

---

## Sources

### Primary (HIGH confidence)
- `src-tauri/src/commands/gsd.rs` — verified `parse_frontmatter()` at line 41, `get_project_path()` at line 28, all 37 GSD-1 command names, existing test pattern at line 3371
- `src-tauri/src/commands/watcher.rs` — verified `watch_project_files()` structure, `.planning/` watch at line 143, event handler classification pattern, 2s debounce
- `src-tauri/src/lib.rs` — verified `invoke_handler!` macro registration pattern, `commands::mod.rs` structure
- `src-tauri/src/db/mod.rs` — verified `projects` table schema (no `gsd_version` column), migration pattern at line 259, `pool.read()` / `pool.write()` API
- `src-tauri/src/commands/mod.rs` — verified current module list (no `gsd2` entry yet)
- `/Users/jeremymcspadden/github/gsd-2/dist/resources/extensions/gsd/paths.js` — verified `resolveDir()` three-tier algorithm (exact → prefix → null), `resolveFile()` three-tier algorithm, `GSD_ROOT_FILES` constants
- `/Users/jeremymcspadden/github/gsd-2/dist/resources/extensions/gsd/roadmap-slices.js` — verified slice checkbox format, `depends` extraction, done flag parsing
- `/Users/jeremymcspadden/github/gsd-2/dist/resources/extensions/gsd/files.js` — verified task checkbox format from `_parsePlanImpl()`, `parseRoadmap()` structure (title, slices, boundaryMap)
- `/Users/jeremymcspadden/github/gsd-2/dist/resources/extensions/gsd/state.js` — verified `deriveState()` algorithm for active milestone selection (first non-complete milestone with deps met)
- `.planning/research/STACK.md` — prior stack research (HIGH confidence, same session)
- `.planning/research/PITFALLS.md` — prior pitfalls research (HIGH confidence, same session)

### Secondary (MEDIUM confidence)
- `.planning/phases/01-gsd-2-backend-foundation/01-CONTEXT.md` — locked decisions from discuss-phase session

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all deps verified present in `Cargo.toml` via STACK.md; no new deps needed
- Architecture: HIGH — all patterns verified against live codebase source; GSD-2 file format verified against `paths.js` and `files.js`
- Pitfalls: HIGH — all pitfalls verified against actual code paths that would fail; worktrees exclusion verified against PITFALLS.md which read `worktree-manager.ts` directly

**Research date:** 2026-03-20
**Valid until:** 2026-04-20 (stable Tauri 2.x / rusqlite 0.32 — 30-day window)
