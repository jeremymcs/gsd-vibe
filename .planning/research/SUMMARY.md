// Track Your Shit - GSD-2 Integration Research Summary
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

# Project Research Summary

**Project:** Track Your Shit — GSD-2 Integration
**Domain:** Brownfield Tauri 2.x desktop app — adding GSD-2 `.gsd/` workflow support alongside existing GSD-1 `.planning/` integration
**Researched:** 2026-03-20
**Confidence:** HIGH (all findings verified against live codebase and GSD-2 source)

## Executive Summary

This is a brownfield addition to a mature Tauri 2.x desktop application that already has complete GSD-1 support. The goal is to add first-class GSD-2 workflow integration — version detection, health widget, worktree management, a progress visualizer, and headless mode control — without breaking any existing GSD-1 functionality. Every technology required is already present in the codebase; no new dependencies are needed. The integration is pure implementation work within an established, well-understood architecture.

The recommended approach is strict module isolation: a new `gsd2.rs` Rust command module handles all `.gsd/` file parsing and GSD-2 commands, while the existing `gsd.rs` (3,604 lines of stable GSD-1 logic) remains completely untouched. GSD-2 state is derived by reading source-of-truth files directly from disk on every command invocation — no SQLite caching — mirroring the same architectural choice GSD-2 itself makes in `deriveState()`. The file watcher is extended to cover `.gsd/` alongside `.planning/`, and TanStack Query polling intervals (5–15s depending on data type) provide the safety net for reactive UI updates.

The primary risks are all well-understood and addressable upfront: (1) version detection must be implemented first and enforced by GSD-1 commands returning typed errors for GSD-2 project IDs; (2) the Rust path resolution must replicate GSD-2's three-tier prefix-matching logic exactly; (3) headless PTY sessions require a `HeadlessSessionRegistry` with app-close cleanup to prevent orphaned processes and stale `.gsd/auto.lock` files; and (4) health data must come from direct file reads, never from polling the `gsd headless query` subprocess, to avoid CPU drain proportional to the number of open projects.

---

## Key Findings

### Recommended Stack

The stack is fully locked — this is a brownfield integration that requires zero new dependencies. All needed Rust crates (`rusqlite`, `tokio`, `serde_json`, `notify`, `regex`, `portable-pty`) and all frontend libraries (TanStack Query v5, `@tauri-apps/api` v2) are already present. The only structural addition is a new `gsd2.rs` Rust module and three new frontend components. Implementation follows existing patterns exactly: `invoke<T>()` IPC wrappers in `lib/tauri.ts`, `useQuery` hooks with `refetchInterval` in `lib/queries.ts`, and `listen()` event subscriptions in a new `use-gsd2-file-watcher.ts` hook that mirrors the existing `use-gsd-file-watcher.ts`.

**Core technologies:**
- `Rust std::fs` — direct `.gsd/` file reads; already used in `gsd.rs`, same pattern, no subprocess overhead
- `serde_json` — parse `metrics.json` and `.status.json` worker files; already in Cargo.toml
- `tokio::process::Command` — one-shot `gsd headless query` invocations; `process` feature already enabled
- `portable-pty` — headless session start/stop; reuses existing `TerminalManager` unchanged
- `notify` + debouncer — extend existing watcher to cover `.gsd/` directory recursively
- TanStack Query `refetchInterval` — polling backbone: 5s health, 10s visualizer, 15s worktrees
- `@tauri-apps/api/event` `listen()` — reactive invalidation via `gsd2:file-changed` events

**Not to use:**
- GSD-2 npm package in frontend — Node.js-specific APIs don't run in Tauri WebView
- `gsd headless query` subprocess for health polling — 500ms startup overhead multiplies with open projects
- Extending `gsd.rs` in-place — at 3,604 lines it is at the maintenance boundary; GSD-1 is stable and must stay untouched
- SQLite cache for parsed GSD-2 state — GSD-2's own `deriveState()` explicitly avoids this due to staleness

### Expected Features

**Must have (table stakes — GSD-2 support is broken without these):**
- GSD version detection per project — root dependency; gates all other GSD-2 rendering
- Adaptive UI terminology — GSD-2 users must see Milestone/Slice/Task, not Phase/Plan
- GSD-2 milestone list with status — replaces GSD-1 milestones tab for GSD-2 projects
- Active slice and task display — primary status check users make when opening a project
- Progress counters (M X/Y · S X/Y · T X/Y) — equivalent of GSD-1 roadmap progress bar
- Budget/cost display from `metrics.json` ledger — most users have a budget ceiling set
- Blocker display from STATE.md — critical for unblocking stuck sessions
- Worktree list — users with parallel work need visibility into active worktrees
- Worktree remove action — list without remove is read-only and not actionable
- Headless query (poll snapshot) — enables live refresh of all status data
- Headless session start/stop — the primary control surface users asked for

**Should have (competitive differentiators — add in v1.x after core is stable):**
- Visual progress tree (Milestone → Slice → Task) — unique visualization no terminal tool provides
- Cost/token metrics by phase and model — answers "which slice cost the most?"
- Agent activity live indicator — live badge beats polling the terminal
- Changelog tab (slice completions with file stats)
- Worktree diff summary before remove — prevents accidental work loss
- Discussion state tracking on milestone list
- Knowledge base viewer for `.gsd/KNOWLEDGE.md`

**Defer to v2+:**
- Critical path highlighting — requires visual tree + complex DAG rendering
- Provider health status — env checks are expensive without a dedicated cache
- Skill health summary — niche; only relevant for users with custom skill configs
- Worker cost summary per parallel worker — power user feature
- Tier savings display — cosmetic, not decision-driving

### Architecture Approach

The architecture adds GSD-2 support as a strict sibling to the existing GSD-1 integration with zero cross-contamination. A new `gsd2.rs` Rust module handles all `.gsd/` parsing; `gsd.rs` is unchanged. The project detail page uses a version gate (`if gsdVersion === "gsd2"`) to conditionally render GSD-2 tab components instead of GSD-1 tabs. File-change reactive updates use a dedicated `gsd2:file-changed` event emitted by an extended `watcher.rs`. The GSD-2 state model is a derived computation across multiple roadmap and plan files — never a single STATE.md parse — mirroring how GSD-2's own `deriveState()` works. Headless sessions reuse the existing PTY stack entirely; there are no new backend process management primitives.

**Major components:**

1. `gsd2.rs` (new) — version detection, `.gsd/` file parsing, health data assembly, worktree listing, visualizer data aggregation
2. `watcher.rs` (extended ~15 lines) — add `.gsd/` directory watch, emit `gsd2:file-changed` events with typed change types
3. `lib/tauri.ts` + `lib/queries.ts` (extended) — GSD-2 invoke wrappers and TanStack Query hooks with appropriate polling intervals
4. `use-gsd2-file-watcher.ts` (new) — mirrors `use-gsd-file-watcher.ts`; receives `gsd2:file-changed` events and invalidates GSD-2 query keys
5. `gsd2-health-widget.tsx`, `gsd2-worktree-panel.tsx`, `gsd2-visualizer-tab.tsx`, `gsd2-headless-panel.tsx` (new) — GSD-2 UI components replacing GSD-1 equivalents when version is detected

**Key architectural patterns:**
- File-reading state derivation with no DB cache (matches GSD-2's own `deriveState()` pattern)
- Dual invalidation: polling interval as safety net + file-watcher events for immediate reactivity
- Headless sessions as plain PTY sessions managed entirely at the frontend layer
- Version detection as synchronous gate on project open, stored in DB to prevent race conditions

### Critical Pitfalls

1. **Hardcoded `.planning/` paths silently return empty for GSD-2 projects** — implement version detection first and add a typed error guard to every GSD-1 command that detects `.gsd/` presence; the frontend must re-route on this error, not render empty UI

2. **GSD-2 path resolution is three-tier prefix-match (not exact match)** — implement `resolve_dir_by_id_prefix` and `resolve_file_by_id_prefix` Rust helpers mirroring `paths.ts` exact logic; test against legacy `M001-DESCRIPTOR/` directory names or migrated projects will silently return empty

3. **Polling `gsd headless query` subprocess per poll cycle** — each invocation starts a new Node.js process with 500ms startup cost; with 5+ open projects and 3s polling this creates visible CPU spikes; use direct Rust `fs::read_to_string` for health data instead and reserve subprocess invocations for explicit user actions

4. **Headless PTY session leaks on app close** — `gsd headless` holds `.gsd/auto.lock`; if the app is force-quit without SIGTERM the lock orphans and prevents future session starts; requires a `HeadlessSessionRegistry` in Rust app state with `on_window_event` CloseRequested shutdown hook

5. **Worktree path comparisons fail on macOS due to symlinks** — macOS `/var` → `/private/var` symlink causes string-prefix comparison failures between stored project path and `git worktree list` output; use `std::fs::canonicalize` on both sides before any path comparison

6. **GSD-2 STATE.md schema differs from GSD-1 STATE.md** — GSD-2 state is a derived computation across roadmap and plan files; using `parse_frontmatter` directly on STATE.md gives partial/incorrect results; implement `derive_gsd2_state` that reads source-of-truth files (ROADMAP.md for milestone/slice progress, PLAN.md for task progress)

---

## Implications for Roadmap

Based on combined research, all four files agree on the same build order driven by dependency analysis. The phase structure below follows that consensus directly.

### Phase 1: Version Detection and GSD-1 Guard Rails

**Rationale:** Version detection is the root dependency. Nothing else can render correctly without knowing whether a project is GSD-2, GSD-1, or neither. GSD-1 commands must actively return typed errors for GSD-2 project IDs — not silently return empty results — or the entire GSD tab looks broken for any new project. This must be the foundation before any other GSD-2 work starts.

**Delivers:** Per-project GSD version detection stored in DB; adaptive UI terminology switching; GSD-1 command guard that returns a typed error when a GSD-2 project is passed; frontend error boundary that re-routes to GSD-2 commands on that error; version badge on project header.

**Addresses (from FEATURES.md):** GSD version detection, adaptive UI terminology.

**Avoids (from PITFALLS.md):** Pitfall 1 (hardcoded paths silently empty), Pitfall 8 (GSD-1 commands called with GSD-2 project IDs).

**Research flag:** Skip — well-established pattern, pure `Path::exists()` check with DB storage.

### Phase 2: GSD-2 File Parsing Core

**Rationale:** The Rust file parsing utilities (`gsd2.rs` module, `resolve_dir_by_id_prefix`, `derive_gsd2_state`) are the shared foundation for health widget, visualizer, and worktrees. Building them once with correct prefix-matching before any consumer feature avoids parallel implementations diverging. The STATE.md schema pitfall is most likely to surface here.

**Delivers:** `gsd2.rs` module with: frontmatter/section helpers imported from `gsd.rs`, three-tier prefix-matching path resolution, `gsd2_list_milestones` command, `gsd2_get_state` command (reads ROADMAP.md + PLAN.md for derived state, not STATE.md frontmatter alone). Unit tests covering bare-ID and descriptor-ID directory layouts.

**Addresses (from FEATURES.md):** Milestone list with status, active slice/task display, progress counters (M/S/T), blocker display.

**Avoids (from PITFALLS.md):** Pitfall 2 (prefix-match path resolution), Pitfall 7 (GSD-2 STATE.md schema mismatch).

**Research flag:** Skip — GSD-2 `paths.ts` source is verified and fully mapped; the Rust implementation is a straightforward translation.

### Phase 3: Health Widget and Reactive Polling

**Rationale:** The health widget is the highest-user-value visible feature and validates the end-to-end IPC + polling pattern before building more complex features. The watcher extension and TanStack Query polling intervals must both be established here — these are the reactive backbone for all subsequent GSD-2 data. The CPU drain pitfall (subprocess polling) must be designed out before the first polling loop is written.

**Delivers:** `gsd2_get_health` command (STATE.md + metrics.json reads); budget/cost display; extended `watch_project_files` to watch `.gsd/` with `gsd2:file-changed` events; `use-gsd2-file-watcher.ts` hook; TanStack Query hooks for GSD-2 health data (5s polling); `gsd2-health-widget.tsx` component; health visible in project overview.

**Addresses (from FEATURES.md):** Budget/cost display, blocker display, next action indicator, environment error/warning counts (from file reads).

**Avoids (from PITFALLS.md):** Pitfall 3 (file watcher misses `.gsd/` changes), Pitfall 5 (subprocess polling CPU drain).

**Research flag:** Skip — polling patterns and watcher extension are both directly derived from existing working implementations.

### Phase 4: Worktree Panel

**Rationale:** Worktrees are independent of the health widget and visualizer — they only need git subprocess calls and directory listing, both of which are established patterns in `git.rs`. Building them before the visualizer keeps phase complexity low. The macOS symlink pitfall is highest risk here.

**Delivers:** `gsd2_list_worktrees` command (`git worktree list --porcelain` + canonicalized path comparison); `gsd2_remove_worktree` command (git worktree remove + branch delete); `gsd2-worktree-panel.tsx` component with confirmation dialog; 15s polling; worktree diff summary (git diff numstat) before remove.

**Addresses (from FEATURES.md):** Worktree list, worktree remove action, worktree diff summary.

**Avoids (from PITFALLS.md):** Pitfall 6 (symlink path comparison on macOS).

**Research flag:** Skip — `git worktree list --porcelain` parsing and the `canonicalize` fix are well-documented.

### Phase 5: Headless Mode Control

**Rationale:** Headless mode is the most complex feature (PID tracking, lock file management, session lifecycle, PTY output parsing). It should be built after all read-only features are stable and validated so there is a working health/visualizer display to show refreshed state post-query. The PTY session leak pitfall requires first-implementation attention — it cannot be retrofitted later.

**Delivers:** `HeadlessSessionRegistry` in Rust app state; `on_window_event` CloseRequested handler killing registered headless PIDs; startup `.gsd/auto.lock` liveness check with stale lock cleanup; `gsd2_headless_start` command (PTY session creation); `gsd2_headless_stop` command (SIGTERM + wait); `gsd2_headless_query` one-shot command; `gsd2-headless-panel.tsx` component with start/stop UI and JSON output display; next action indicator; worker cost summary.

**Addresses (from FEATURES.md):** Headless session start/stop, headless query, next action indicator, worker cost summary.

**Avoids (from PITFALLS.md):** Pitfall 4 (PTY session leak on app close), Pitfall 5 (subprocess CPU drain — by limiting to explicit user actions).

**Research flag:** May benefit from phase research — headless session lifecycle edge cases (parallel milestone workers, crash recovery, lock file race conditions) are complex enough that a targeted research pass before implementation would reduce risk.

### Phase 6: Visualizer Tab

**Rationale:** The visualizer aggregates data across all milestones, slices, tasks, and metrics — it depends on all file parsing utilities being stable. Building it last ensures the foundational parsers are battle-tested before adding the heavier tree-walking command. This is a new dedicated tab with the highest implementation complexity.

**Delivers:** `gsd2_get_visualizer` command (full `.gsd/milestones/` tree walk with cost aggregation); visual milestone → slice → task progress tree; cost/token metrics by phase and model; changelog tab (completed slice summaries); discussion state tracking badges; knowledge base viewer for `KNOWLEDGE.md`. Agent activity live indicator (polls `gsd2_headless_query` at 5s when a session is active).

**Addresses (from FEATURES.md):** Visual progress tree, critical path highlighting (future), cost/token metrics, changelog tab, slice verification details, discussion state tracking, knowledge base viewer.

**Avoids (from PITFALLS.md):** Walking the milestone tree synchronously on every request — use TanStack Query `staleTime: 5000` with file-watcher invalidation rather than aggressive polling.

**Research flag:** Consider phase research for the cost aggregation model — `metrics.json` ledger structure and per-worker cost from `parallel/*.status.json` need careful mapping before building the aggregation query.

---

### Phase Ordering Rationale

- **Version detection first** is non-negotiable — all four research files agree it is the root dependency with no exceptions.
- **File parsing before consumers** avoids building health, worktrees, and visualizer with duplicate ad-hoc parsers that diverge; one shared `gsd2.rs` utility layer serves all three.
- **Health widget before worktrees and headless** validates the full IPC + polling + reactive-watcher chain on the simplest data shape before adding process management complexity.
- **Worktrees before headless** keeps each phase's complexity budget low; worktrees are independent and git-only, while headless requires process lifecycle management.
- **Visualizer last** is driven by pure dependency order — it aggregates everything; building it before the parsers stabilize would require constant rework.

### Research Flags

**Phases needing `/gsd:research-phase` during planning:**
- **Phase 5 (Headless Mode):** Session lifecycle edge cases — parallel milestone workers, crash recovery, lock file race conditions under concurrent CLI usage — are complex enough to warrant a targeted research pass before writing implementation.
- **Phase 6 (Visualizer — cost aggregation):** The `metrics.json` ledger format and per-worker cost aggregation from `parallel/*.status.json` need precise mapping before the aggregation query is designed; the STACK.md research covered the parse path but not the full schema for multi-worker scenarios.

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Version Detection):** Pure `Path::exists()` check with DB write — zero ambiguity.
- **Phase 2 (File Parsing):** GSD-2 `paths.ts` source fully maps the resolver logic; Rust translation is mechanical.
- **Phase 3 (Health Widget):** Polling/watcher patterns are direct replicas of existing GSD-1 implementations.
- **Phase 4 (Worktrees):** `git worktree list --porcelain` + canonicalize fix — well-documented, no unknowns.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All required crates confirmed present in Cargo.toml; all frontend libraries confirmed in package.json; no new dependencies needed. Verified against live files. |
| Features | HIGH | Feature list derived directly from GSD-2 source (`health-widget-core.ts`, `visualizer-data.ts`, `worktree-manager.ts`, `headless-query.ts`). MVP scope aligns with PROJECT.md requirements. |
| Architecture | HIGH | All patterns verified against existing working implementations in this codebase. The `gsd2.rs` module separation and no-DB-cache decisions confirmed against GSD-2's own `deriveState()` design rationale. |
| Pitfalls | HIGH | All pitfalls identified from direct code inspection of both repos — no inference. Every warning includes the specific source file and line pattern that causes the problem. |

**Overall confidence:** HIGH

### Gaps to Address

- **Metrics ledger full schema for parallel workers:** STACK.md confirms `serde_json` for `.gsd/parallel/*.status.json` but the full field mapping for multi-worker cost aggregation in the visualizer is only partially characterized. Address during Phase 6 planning.
- **`gsd headless` lock file behavior under simultaneous CLI + TYS use:** The `.gsd/auto.lock` race condition when a user runs `gsd headless` in terminal while TYS tries to start a session is noted in PITFALLS.md but the exact lock protocol is not fully specified. Address during Phase 5 planning research.
- **GSD-1 backward compatibility regression scope:** Research confirms GSD-1 commands must remain untouched, but a formal regression test list for GSD-1 features was not produced. The planning phase should enumerate the GSD-1 command surface and write regression tests before any GSD-2 code merges.

---

## Sources

### Primary (HIGH confidence — direct source inspection)

- `/Users/jeremymcspadden/Github/track-your-shit/src-tauri/src/commands/gsd.rs` — existing GSD-1 parse patterns, 3,604 lines confirmed as baseline
- `/Users/jeremymcspadden/Github/track-your-shit/src-tauri/src/commands/watcher.rs` — file watcher `.planning/` scope confirmed; extension pattern verified
- `/Users/jeremymcspadden/Github/track-your-shit/src-tauri/src/commands/pty.rs` — PTY session management; no shutdown hooks for background sessions confirmed
- `/Users/jeremymcspadden/Github/track-your-shit/src-tauri/Cargo.toml` — all required crates confirmed present
- `/Users/jeremymcspadden/Github/track-your-shit/src/lib/queries.ts` — existing polling intervals confirmed (30s git status, 60s git info)
- `/Users/jeremymcspadden/Github/track-your-shit/src/lib/tauri.ts` — IPC wrapper patterns confirmed
- `/Users/jeremymcspadden/Github/track-your-shit/src/hooks/use-gsd-file-watcher.ts` — file-watcher → query invalidation pattern confirmed
- `/Users/jeremymcspadden/github/gsd-2/dist/resources/extensions/gsd/paths.ts` — `.gsd/` directory layout, three-tier ID resolution, symlink handling via `realpathSync`
- `/Users/jeremymcspadden/github/gsd-2/dist/resources/extensions/gsd/health-widget.ts` — confirmed budget data from `metrics.json` ledger
- `/Users/jeremymcspadden/github/gsd-2/dist/resources/extensions/gsd/health-widget-core.ts` — `HealthWidgetData` fields confirmed
- `/Users/jeremymcspadden/github/gsd-2/dist/resources/extensions/gsd/worktree-manager.ts` — `git worktree list --porcelain` as authoritative source; `realpathSync` at every comparison; `SKIP_PATHS` excludes `.gsd/worktrees/` from diff
- `/Users/jeremymcspadden/github/gsd-2/dist/resources/extensions/gsd/visualizer-data.ts` — `VisualizerData`, `VisualizerMilestone`, `CriticalPathInfo`, `AgentActivityInfo`, `ChangelogInfo` interfaces confirmed
- `/Users/jeremymcspadden/github/gsd-2/dist/resources/extensions/gsd/types.ts` — `GSDState` derived structure confirmed (not a single STATE.md parse)
- `/Users/jeremymcspadden/github/gsd-2/src/headless-query.ts` — jiti initialized per-invocation; `{ state, next, cost }` output format confirmed
- `/Users/jeremymcspadden/github/gsd-2/dist/resources/extensions/gsd/tests/headless-query.test.ts` — confirmed `gsd headless --json next` exits with single JSON snapshot
- `/Users/jeremymcspadden/github/gsd-2/src/resources/extensions/gsd/session-status-io.ts` — `.gsd/parallel/*.status.json` file format for worker cost/state
- `/Users/jeremymcspadden/github/gsd-2/src/resources/extensions/gsd/state.ts` — `deriveState()` reads roadmap + plan files; explicit DB cache avoidance rationale confirmed
- `/Users/jeremymcspadden/Github/track-your-shit/.planning/PROJECT.md` — milestone requirements and key decisions (new gsd2.rs module, no GSD-2 npm dependency)

---
*Research completed: 2026-03-20*
*Ready for roadmap: yes*
