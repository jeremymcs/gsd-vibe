# Phase 1: GSD-2 Backend Foundation - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Pure Rust backend work. Deliver: per-project GSD version detection, a new `gsd2.rs` command module with all `.gsd/` file parsing commands, GSD-1 command guard rails, and a watcher extension for `.gsd/` directory. No frontend UI changes in this phase — that's Phase 2.

</domain>

<decisions>
## Implementation Decisions

### Version Detection Storage
- Add `gsd_version TEXT` column to the `projects` table via a DB schema migration
- Detection logic: check `{project_path}/.gsd/` existence first (gsd2), then `{project_path}/.planning/` (gsd1), else "none"
- Store on project open/import and on `gsd2_detect_version` command call
- This survives app restart and avoids re-checking disk on every command call

### GSD-1 Guard Rails
- All existing GSD-1 commands (`gsd_get_state`, `gsd_list_milestones`, `gsd_list_plans`, etc.) should check project's `gsd_version` from DB at the top of the function
- If version is "gsd2", return `Err("This project uses GSD-2. Use gsd2_* commands instead.".to_string())`
- Simple string error — frontend already handles `Err(String)` from Tauri commands
- Do NOT return empty Ok() — that's the silent failure bug we're fixing (VERS-03)

### New gsd2.rs Module
- Create `src-tauri/src/commands/gsd2.rs` — do NOT extend `gsd.rs` (it's 3,604 lines)
- Add `mod gsd2;` in `lib.rs` and register all new commands in the `invoke_handler!` macro
- Reuse `parse_frontmatter()` helper pattern from `gsd.rs` — copy/adapt, don't import (module boundary)
- Three-tier path resolution for milestones: exact ID match (`M001/`) → ID-prefix match (`M001-FLIGHT-SIMULATOR/`) → return None

### GSD-2 Watcher Events
- Extend `watch_project_files` in `watcher.rs` to also watch `{project_path}/.gsd/` if it exists
- Emit a NEW event `gsd2:file-changed` (parallel to existing `gsd:file-changed`) — do NOT merge into one event
- Payload matches existing pattern: `{ project_path, file_path, change_type }`
- `change_type` values for `.gsd/`: `"gsd2_milestone"`, `"gsd2_state"`, `"gsd2_metrics"`, `"gsd2_other"`

### Claude's Discretion
- Exact Rust struct field names for `Gsd2Milestone`, `Gsd2Slice`, `Gsd2Task`, `Gsd2State`
- Frontmatter parsing details for `M001-ROADMAP.md` (done/active/pending extraction)
- Whether to use a single `gsd2_detect_version` command or embed version check in `gsd_get_project_info`
- DB migration number (use next available sequential number from existing migrations)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Rust Backend
- `src-tauri/src/commands/gsd.rs` — Full GSD-1 command list to add guards to; `parse_frontmatter()` helper pattern to reuse
- `src-tauri/src/commands/watcher.rs` — Existing watcher structure to extend for `.gsd/`
- `src-tauri/src/lib.rs` — Command registration pattern (invoke_handler! macro)
- `src-tauri/src/db/mod.rs` — DB schema and migration pattern (add `gsd_version` column)

### GSD-2 File Structure (Source of Truth)
- `/Users/jeremymcspadden/github/gsd-2/dist/resources/extensions/gsd/paths.ts` — Three-tier path resolution logic to replicate in Rust
- `/Users/jeremymcspadden/github/gsd-2/dist/resources/extensions/gsd/state.ts` — State derivation logic (active milestone/slice/task)

### Project Context
- `.planning/REQUIREMENTS.md` — Requirements VERS-01–04 and PARS-01–05 (all in scope for this phase)
- `.planning/research/STACK.md` — Stack recommendations (no new deps, Rust patterns)
- `.planning/research/PITFALLS.md` — Three-tier resolver, silent empty results, watcher gap (all directly relevant)

No external specs beyond the above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `parse_frontmatter()` in `gsd.rs:41` — YAML-like frontmatter parser, handles both start-of-file and mid-file `---` delimiters. Copy into `gsd2.rs` with same signature.
- `get_project_path()` in `gsd.rs:28` — DB lookup helper, reuse exact pattern in `gsd2.rs`
- `DbPool` / `DbState` type alias — same pattern in `gsd2.rs`

### Established Patterns
- All Tauri commands are `#[tauri::command] async fn` returning `Result<T, String>`
- DB reads use `pool.read()`, writes use `pool.write()`
- Command registration in `lib.rs` via `invoke_handler!` macro listing

### Integration Points
- `watcher.rs:watch_project_files` — add `.gsd/` watch after existing `.planning/` watch block (line ~144)
- `db/mod.rs` — add migration for `gsd_version TEXT` column on `projects` table
- `lib.rs` — add `mod gsd2;` and register new commands in invoke_handler
- Frontend `lib/tauri.ts` — new typed invoke wrappers needed (Phase 2 concern, not Phase 1)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-gsd-2-backend-foundation*
*Context gathered: 2026-03-20*
