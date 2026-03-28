# Pitfalls Research

**Domain:** Brownfield Tauri desktop app — adding GSD-2 support alongside GSD-1
**Researched:** 2026-03-20
**Confidence:** HIGH (all findings verified against actual source code in both repos)

---

## Critical Pitfalls

### Pitfall 1: Hardcoded `.planning/` paths break silently when GSD-2 projects open

**What goes wrong:**
Every existing command in `gsd.rs` constructs paths by joining `.planning` as a literal string segment: `Path::new(&project_path).join(".planning").join("STATE.md")`. If a GSD-2 project is passed to any of these commands, `path.exists()` returns false and the command silently returns an empty/default result. The UI renders as if the project has no GSD data rather than surfacing an error or routing to GSD-2 parsing. Users opening a `.gsd/` project see a blank GSD tab with no warning.

**Why it happens:**
The version detection logic does not exist yet. All existing commands assume GSD-1 unconditionally. Adding GSD-2 commands as siblings without gating the GSD-1 commands causes both code paths to execute, with GSD-1 always silently no-oping on GSD-2 projects.

**How to avoid:**
Implement version detection as the first thing done per project, before any other GSD command is dispatched. Store the detected version (`"gsd2" | "gsd1" | "none"`) in the SQLite `projects` table or as a project-level cached field. All IPC commands — old and new — must read this field and branch accordingly, or return a typed error the frontend can distinguish from "no data." Build the version detector as a standalone utility function that both `gsd1` and `gsd2` command modules import.

**Warning signs:**
- GSD tab renders empty for a project that has a `.gsd/` directory
- No error in the Tauri log, just silent empty results
- `gsd_get_state` returns `Ok(GsdState { ... all empty ... })` for a GSD-2 project

**Phase to address:** Phase 1 (Version Detection) — must be the foundation before any other GSD-2 work.

---

### Pitfall 2: GSD-2 path resolution is prefix-match, not exact — Rust re-implementation must match exactly

**What goes wrong:**
`paths.ts` uses a three-tier resolution order: exact bare ID match (`M001/`), then prefix match (`M001-SOME-DESCRIPTOR/`), then legacy bare suffix (`roadmap.md`). If the Rust implementation uses only exact matches, it will fail to read `.gsd/` projects that were created under older GSD-2 conventions where directories still have descriptors (`M001-FLIGHT-SIMULATOR/`). This is a silent data-loss bug: the Rust code returns empty arrays rather than an error.

The same applies to file resolution — `resolveFile` checks `ID-SUFFIX.md` first, then `ID-DESCRIPTOR-SUFFIX.md`, then `suffix.md`. All three tiers must be replicated in Rust for the milestone, slice, and task levels.

**Why it happens:**
The TypeScript resolver is well-commented about backward compatibility, but developers implementing the Rust equivalent may read only the "current convention" part of the docstring and miss the legacy fallback tiers.

**How to avoid:**
Implement a `resolve_dir_by_id_prefix` and `resolve_file_by_id_prefix` helper in Rust that mirrors the exact same lookup order as `paths.ts`. Write unit tests covering all three tiers for each level (milestone dir, slice dir, task file) with fixture directories representing old-style and new-style layouts. Do not assume clean bare-ID layout.

**Warning signs:**
- `gsd2_list_milestones` returns empty for a project with content, after checking that `.gsd/milestones/` exists
- Directory listing shows `M001-SOMETHING/` but parser looks for `M001/` only
- Tests pass on freshly-initialized GSD-2 projects but fail on imported/migrated ones

**Phase to address:** Phase 2 (GSD-2 File Parsing) — core of the parsing implementation.

---

### Pitfall 3: File watcher does not watch `.gsd/` — GSD-2 data becomes stale silently

**What goes wrong:**
`watch_project_files` in `watcher.rs` watches `path.join(".planning")` only. For GSD-2 projects, changes to `.gsd/STATE.md`, `.gsd/milestones/M001/M001-ROADMAP.md`, or session status files (`.gsd/parallel/*.status.json`) are never emitted as events. The frontend never calls `invalidateQuery` for GSD-2 data, so the UI shows the snapshot from the last explicit fetch until the user manually refreshes.

**Why it happens:**
The watcher setup is straightforward and easy to overlook when adding GSD-2 — it works for GSD-1 projects so no test surfaces the gap.

**How to avoid:**
Update `watch_project_files` to conditionally add a `.gsd/` watch alongside `.planning/` based on the project's detected version. Emit `gsd:file-changed` events with GSD-2-specific `change_type` values: `gsd2_state`, `gsd2_roadmap`, `gsd2_session`, `gsd2_worktree`. On the frontend, add a listener for `gsd:file-changed` in GSD-2 components that calls `queryClient.invalidateQueries` for the relevant GSD-2 query keys.

**Warning signs:**
- Health widget shows stale data after `gsd headless` advances a task
- Progress bars don't update after the GSD session completes work
- No `gsd:file-changed` events in Tauri logs while `.gsd/` files are being written

**Phase to address:** Phase 3 (Health Widget / Polling) — must be addressed before any live-updating UI is built.

---

### Pitfall 4: Headless PTY session leaks when the app is closed or the session crashes

**What goes wrong:**
`gsd headless` is a long-running process. When spawned via Tauri's PTY layer, if the app window closes before `gsd headless stop` is issued, the process orphans. On next app open, the old session's PID is still alive, `gsd headless query` reports a running worker, but the TYS session ID no longer exists in the PTY manager. Attempting to interact with the session produces errors; attempting to start a new headless session may fail because GSD-2's `auto.lock` is still held by the orphaned process.

**Why it happens:**
Tauri app close events do not automatically kill PTY children unless the shutdown hook explicitly iterates and kills them. The existing PTY manager (`TerminalManagerState`) manages interactive terminal sessions for display, not background daemon sessions — shutdown handling may be incomplete for the headless use case.

**How to avoid:**
Track headless sessions separately from interactive terminal sessions — store `{ project_id, pid, session_id }` in a dedicated `HeadlessSessionRegistry` in Rust app state. Register a Tauri `on_window_event` handler for `WindowEvent::CloseRequested` that kills all tracked headless PIDs. On app startup, check `.gsd/auto.lock` existence and PID liveness; if the lock exists but the PID is dead, clean up the lock file before presenting UI controls. Expose an explicit `gsd2_headless_stop` command that sends SIGTERM to the PID and waits for exit before resolving.

**Warning signs:**
- `gsd headless start` fails with "lock file exists" after app crash
- `.gsd/auto.lock` present in the project directory after the app closes
- `gsd headless query` reports a running session that the PTY manager has no record of

**Phase to address:** Phase 4 (Headless Mode) — lock file cleanup and PID tracking must be in the first implementation, not added later.

---

### Pitfall 5: Polling `gsd headless query` spawns a subprocess per poll cycle — this is expensive

**What goes wrong:**
`gsd headless query` is documented as instant (~50ms), but it is invoked as a separate subprocess each time TYS polls for health/visualizer data. If polled every 3 seconds across 10 open projects, that is 200+ subprocesses per minute. Each invocation loads the gsd-2 CLI, initializes jiti, imports the extension modules, and walks the `.gsd/` tree. On constrained hardware or with large `.gsd/` trees (many milestones), this creates visible CPU spikes and battery drain. On some macOS configurations, spawning many node subprocesses triggers Spotlight indexing.

**Why it happens:**
`gsd headless query` appears cheap in isolation (50ms is fast), but the subprocess-spawn overhead is per-invocation. When integrated into a polling loop across multiple projects it multiplies badly. The headless-query.ts source confirms jiti is set up fresh on every invocation.

**How to avoid:**
Use file-based polling instead of subprocess polling for health widget data. GSD-2 writes machine-readable files: `.gsd/STATE.md` (frontmatter with phase/position), `.gsd/parallel/*.status.json` (worker cost/state), `.gsd/metrics.json`. Read these files directly in Rust via `fs::read_to_string` — no subprocess needed. Reserve `gsd headless query` subprocess invocations for explicit user actions (e.g., "Refresh" button) or one-shot startup reads. If subprocess polling is truly needed, poll at a minimum of 10s intervals and only for the active/foreground project.

**Warning signs:**
- CPU usage increases proportionally with number of open projects
- `Activity Monitor` shows `node` processes continuously spawning
- Polling interval of 3s feels sluggish anyway due to per-invocation startup time

**Phase to address:** Phase 3 (Health Widget / Polling) — architecture decision must be made before the first polling loop is written.

---

### Pitfall 6: Worktree path resolution is symlink-aware in TypeScript but may not be in Rust

**What goes wrong:**
`worktree-manager.ts` calls `realpathSync` at every stage of path resolution and comparison — `resolveGitDir`, `listWorktrees`, `removeWorktree` all resolve symlinks before comparing paths. On macOS, `/var` is a symlink to `/private/var`; the project path stored in the SQLite `projects` table may use `/var/...` while `git worktree list` reports `/private/var/...`. If the Rust worktree listing command does a string-prefix comparison without resolving symlinks, no worktrees are ever matched and the worktree panel shows empty.

**Why it happens:**
Path comparison bugs are a classic macOS gotcha. The TypeScript author explicitly added symlink resolution to every comparison point. Rust's `std::fs::canonicalize` does the equivalent but must be called at every comparison site, not just at path construction.

**How to avoid:**
Use `std::fs::canonicalize` on both the stored project path and the git-reported worktree path before any string comparison in the Rust worktree listing command. Add this to the worktree utility module as a normalize-then-compare helper. Test on a macOS system where the project lives under `/var/...` paths (common for temp dirs used in tests).

**Warning signs:**
- Worktree panel is empty even though `.gsd/worktrees/` directory has entries
- `git worktree list` in the terminal shows the worktrees correctly but Rust returns empty
- The discrepancy only manifests on macOS, not on Linux CI

**Phase to address:** Phase 5 (Worktree Panel) — write the test fixture covering symlink paths before implementation.

---

### Pitfall 7: GSD-2 STATE.md frontmatter schema differs from GSD-1 STATE.md — reusing the parser breaks

**What goes wrong:**
GSD-1's `STATE.md` uses `milestone`, `phase`, `plan`, `status`, `last_activity` frontmatter keys. GSD-2's `GSDState` type (from `types.ts`) exposes `activeMilestone.id`, `activeMilestone.title`, `activeSlice`, `activeTask`, `phase` (typed union), `blockers[]`, `nextAction` — derived from file parsing, not read from a single STATE.md frontmatter. The GSD-2 state is computed by `deriveState()` across multiple files. If TYS attempts to run the existing `parse_frontmatter` + `extract_section` logic on `.gsd/STATE.md`, it will get partial or nonsensical results because the file structure is different and the ground truth lives in the roadmap/plan files, not STATE.md.

**Why it happens:**
Both versions have a `STATE.md` file, which creates a false assumption that the parsing logic is portable. GSD-2's STATE.md is a runtime scratch file written by the orchestrator, not the canonical source for structured state.

**How to avoid:**
Implement a dedicated `derive_gsd2_state` function in Rust that reads the source-of-truth files in the correct order: `M001-ROADMAP.md` for milestone/slice progress, slice `S01-PLAN.md` for task progress, and `.gsd/parallel/*.status.json` for worker costs. Use `.gsd/STATE.md` only as a supplemental "last known phase" hint, never as the primary data source. Do not reuse `parse_frontmatter` from the GSD-1 code path for this purpose without an explicit adapter.

**Warning signs:**
- Health widget shows `phase: null` or wrong phase despite active GSD-2 session
- Progress counts are always 0/0 even after tasks complete
- `activeMilestone` is null for a project clearly in the middle of execution

**Phase to address:** Phase 2 (GSD-2 File Parsing) — block out the data model first, before writing any parsers.

---

### Pitfall 8: GSD-1 command module receives a GSD-2 project_id after adaptive routing is added

**What goes wrong:**
If the frontend routing logic routes all GSD commands through a single invoke layer and conditionally picks `gsd_get_state` vs `gsd2_get_state` based on version, a version detection bug or race condition can cause a GSD-2 project to hit the GSD-1 command. Because `.planning/STATE.md` does not exist, the GSD-1 command returns `Ok(GsdState { all empty })`. The UI renders as if GSD data is simply missing. This is particularly insidious because it looks like a rendering bug, not a routing bug.

**Why it happens:**
The version field is read from the database at query time. If the version was not yet stored (project was added before version detection ran), or if a race exists between project addition and detection, the version may be null and the code falls through to GSD-1.

**How to avoid:**
Make version detection synchronous at project open time (not lazy/deferred). Store the version in the DB immediately when a project path is registered. Add a validation check in each GSD-1 command that explicitly returns a typed error (`Err("gsd1_command_on_gsd2_project".to_string())`) if it detects a `.gsd/` directory at the project path. The frontend error boundary must handle this error type and re-route to GSD-2 commands rather than showing empty UI.

**Warning signs:**
- GSD tab shows "no data" for a project that has `.gsd/` but no `.planning/`
- Error log is silent (GSD-1 command returned Ok, not Err)
- The issue is intermittent and correlated with project open timing

**Phase to address:** Phase 1 (Version Detection) — the guard must be built into GSD-1 commands as part of the detection phase, not treated as a later hardening task.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Polling `gsd headless query` subprocess for all data | Simple implementation, no custom file parser | CPU/battery drain at scale, subprocess startup latency | Never — use direct file reads instead |
| Storing GSD version only in memory (not DB) | Avoids a schema migration | Re-detection required on every app restart; race conditions | Never for brownfield feature |
| Reusing GSD-1 `parse_frontmatter` for GSD-2 files | Less new code | Silent wrong results for GSD-2 projects with different schemas | Never without an explicit adapter layer |
| Single watcher covering both `.planning/` and `.gsd/` with generic events | Simpler watcher setup | Frontend cannot distinguish GSD-1 vs GSD-2 event types, causes over-invalidation | Only as a temporary stub during development |
| Checking `.gsd/` existence only at root, not via symlink resolution | Faster detection | Breaks on macOS symlinked paths (/var vs /private/var) | Never |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `gsd headless query` subprocess | Treat it as a polling API; call every 3s | One-shot on startup/user action; use file reads for live updates |
| GSD-2 `.gsd/parallel/*.status.json` | Read via `gsd headless query` | Read directly in Rust using `fs::read_dir` + `serde_json::from_str` |
| git worktree list (Rust) | Compare path strings directly | Canonicalize both sides with `std::fs::canonicalize` before comparison |
| `.gsd/auto.lock` | Ignore on startup | Check PID liveness; clean up stale locks before showing Start button |
| GSD-2 metrics ledger | Assume a single metrics file | GSD-2 stores per-worker costs in `.gsd/parallel/M001.status.json`; aggregate manually |
| Headless session stop | SIGKILL immediately | Send SIGTERM, wait up to 5s for graceful shutdown (GSD-2 writes summary on clean exit) |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Spawning `gsd headless query` per poll cycle | Visible CPU spikes; battery drain | Read `.gsd/` files directly in Rust | Immediately with 3+ open projects |
| Walking entire `.gsd/milestones/` tree synchronously on every state request | UI freezes for 200-500ms on projects with 10+ milestones | Cache parsed state in Rust, invalidate on watcher events | Projects with 5+ milestones |
| Regex compilation on every `parse_frontmatter` call in GSD-2 parser | Cumulative latency in bulk milestone reads | Use `once_cell::sync::Lazy` for compiled Regex instances | Noticeable above 20 files parsed per request |
| Watching `.gsd/worktrees/` recursively when worktrees contain full project copies | Millions of file events per second during compilation | Exclude `.gsd/worktrees/` from file watcher scope | Immediately if a worktree runs a build |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Passing raw project path from frontend directly to PTY spawn for headless mode | Path traversal — attacker could spawn arbitrary process in arbitrary dir | Validate path against stored project paths in DB before using it in spawn |
| Exposing raw `.gsd/parallel/*.status.json` PID to frontend | Enables frontend to interact with arbitrary OS processes | Expose only session metadata (state, cost, milestone ID); never raw PID |
| Cleaning up `.gsd/auto.lock` without verifying PID is not running | Could terminate a running GSD session if PID was reused by OS | Check `/proc/[pid]/cmdline` (Linux) or `kill -0 pid` (macOS) before lock removal |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing GSD-1 terminology (Phase/Plan) for GSD-2 projects | Users of GSD-2 are confused; doesn't match their mental model | Route terminology through a per-project term map: GSD-2 uses Milestone/Slice/Task |
| No visual distinction between "GSD-2 project with headless not running" and "GSD-1 project" | Users can't tell if the feature is unavailable vs. idle | Show version badge on GSD tab; show "Start Headless" button for GSD-2 projects only |
| Health widget polling interval of 3s shown with a spinner | Gives false impression of live data when subprocess polling is used | Use file-based polling with event-driven invalidation; show last-updated timestamp |
| Headless session stop has no confirmation | User accidentally stops a long-running session mid-task | Show estimated time remaining if available from `state.progress`; confirm on stop |
| Worktree merge action available when worktree has uncommitted changes | Merge produces incomplete results | Disable merge button and show warning if diff shows uncommitted files in worktree |

---

## "Looks Done But Isn't" Checklist

- [ ] **Version detection:** Verify detection works when only `.gsd/` exists (no `.planning/`) AND when both directories exist simultaneously (migration in progress)
- [ ] **GSD-1 backward compat:** Open 3 existing `.planning/` projects after GSD-2 code is merged — all GSD tabs must show correct data with zero regressions
- [ ] **Legacy descriptor dirs:** Test milestone parsing against a project with `M001-FLIGHT-SIMULATOR/` directory name, not bare `M001/`
- [ ] **Headless stop on app close:** Verify `.gsd/auto.lock` is absent after force-quitting the app with an active headless session
- [ ] **Symlink path comparison (macOS):** Create a test project in `/tmp/` and verify worktree listing works (macOS `/tmp` → `/private/tmp`)
- [ ] **File watcher for `.gsd/`:** Confirm `gsd:file-changed` is emitted after a manual edit to `.gsd/STATE.md` while a project is open
- [ ] **Polling CPU:** Open 5 GSD-2 projects simultaneously and verify `Activity Monitor` does not show continuous `node` subprocesses

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| GSD-1 commands called on GSD-2 projects (silent empty results) | MEDIUM | Add version guard to all GSD-1 commands; add typed error; add frontend re-routing |
| Stale `.gsd/auto.lock` blocking headless start | LOW | Add lock cleanup to app startup; expose manual "Clear Lock" button in UI |
| Worktree listing empty on macOS | LOW | Add `canonicalize` calls to comparison logic; add macOS-specific test fixture |
| Wrong STATE.md parser for GSD-2 | MEDIUM | Implement `derive_gsd2_state` from roadmap files; can be done without touching GSD-1 |
| Subprocess polling causing CPU drain | HIGH | Requires architectural change from subprocess to file-based polling; plan this correctly upfront |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Hardcoded `.planning/` paths (silent empty on GSD-2) | Phase 1: Version Detection | Open a GSD-2 project; GSD tab shows version badge, not empty state |
| Prefix-match path resolution missing in Rust | Phase 2: GSD-2 File Parsing | Unit test: parse project with legacy `M001-DESCRIPTOR/` dirs |
| File watcher misses `.gsd/` changes | Phase 3: Health Widget | Edit `.gsd/STATE.md` manually; health widget updates without refresh |
| Headless PTY session leak on app close | Phase 4: Headless Mode | Force-quit app; reopen; no stale lock file; Start button enabled |
| Subprocess polling CPU drain | Phase 3: Health Widget | Must be designed out before first polling loop is written |
| Worktree symlink comparison failure | Phase 5: Worktree Panel | Test on macOS with project in `/tmp/`; worktrees listed correctly |
| GSD-2 STATE.md parsed with GSD-1 parser | Phase 2: GSD-2 File Parsing | Health widget shows correct phase for active GSD-2 session |
| GSD-1 commands called on GSD-2 project_id | Phase 1: Version Detection | GSD-1 commands return typed error for GSD-2 project IDs |

---

## Sources

- `/Users/jeremymcspadden/Github/track-your-shit/src-tauri/src/commands/gsd.rs` — all hardcoded `.planning/` path joins, parse_frontmatter logic, parse_milestones regex patterns (direct code inspection)
- `/Users/jeremymcspadden/Github/track-your-shit/src-tauri/src/commands/watcher.rs` — `watch_project_files` only watches `.planning/`, not `.gsd/` (direct code inspection)
- `/Users/jeremymcspadden/Github/track-your-shit/src-tauri/src/commands/pty.rs` — PTY session management, no shutdown hooks for background sessions (direct code inspection)
- `/Users/jeremymcspadden/github/gsd-2/dist/resources/extensions/gsd/paths.ts` — three-tier resolver (exact, prefix, legacy bare); `gsdRoot` symlink resolution via `realpathSync.native` (direct code inspection)
- `/Users/jeremymcspadden/github/gsd-2/dist/resources/extensions/gsd/worktree-manager.ts` — `resolveGitDir`, `listWorktrees`, `removeWorktree` all call `realpathSync`; `SKIP_PATHS` excludes `.gsd/worktrees/` from diff (direct code inspection)
- `/Users/jeremymcspadden/github/gsd-2/src/headless-query.ts` — jiti initialized per-invocation, loads extension modules fresh each call (direct code inspection)
- `/Users/jeremymcspadden/github/gsd-2/src/resources/extensions/gsd/session-status-io.ts` — `.gsd/parallel/*.status.json` file format for worker cost/state (direct code inspection)
- `/Users/jeremymcspadden/github/gsd-2/src/resources/extensions/gsd/types.ts` — `GSDState` interface: derived from multiple files, not a single STATE.md (direct code inspection)
- `/Users/jeremymcspadden/github/gsd-2/src/resources/extensions/gsd/state.ts` — `deriveState()` reads roadmap + plan files, 100ms cache TTL; `invalidateStateCache()` required after file writes (direct code inspection)

---
*Pitfalls research for: GSD-2 integration into Tauri desktop app (brownfield)*
*Researched: 2026-03-20*
