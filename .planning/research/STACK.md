// Track Your Shit - GSD-2 Integration Stack Research
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

# Stack Research: GSD-2 Integration

**Domain:** Brownfield Tauri 2.x desktop app — adding GSD-2 `.gsd/` parsing, health widget, worktrees, visualizer, and headless mode control
**Researched:** 2026-03-20
**Confidence:** HIGH (all recommendations verified against live codebase)

---

## Context: What Already Exists

This is a brownfield addition. The stack is locked. All recommendations are
prescriptions for *how* to use the existing stack correctly for GSD-2 features
— not alternatives to evaluate.

**Locked stack (do not change):**
- Tauri 2.x (`tauri = "2"`)
- Rust backend: `rusqlite 0.32`, `tokio 1`, `serde 1`, `regex 1`, `notify 6`, `portable-pty 0.8`
- Frontend: React 18 + TypeScript, TanStack Query v5, `@tauri-apps/api` v2
- No new npm dependencies required for parsing features (Rust fs reads only)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Rust `std::fs` | stdlib | Read `.gsd/` files | Already used in `gsd.rs` for `.planning/` — same pattern, no new deps. Direct fs reads are the stated constraint ("No GSD-2 dependency"). |
| `regex` crate | 1.x (already in Cargo.toml) | Parse markdown structure in `.gsd/` files | Already used extensively in `gsd.rs` for frontmatter and section extraction. `parse_frontmatter()` and `extract_section()` helpers reuse identically for GSD-2 files. |
| `serde` + `serde_json` | 1.x (already in Cargo.toml) | Deserialize `.gsd/metrics.json` and `.gsd/parallel/*.status.json` | GSD-2 metrics ledger and parallel worker status files are JSON. `serde_json::from_str()` is the correct parse path. |
| `notify` + `notify-debouncer-mini` | 6.x / 0.4 (already in Cargo.toml) | Watch `.gsd/` directory for file changes | `watcher.rs` already watches `.planning/` — extend to also watch `.gsd/` with the same debounce pattern. |
| `tokio::process::Command` | 1.x (already in Cargo.toml) | Run `gsd headless query` to get JSON snapshot | For headless *query* (read-only, no session). Returns JSON synchronously — use `Command::new("gsd").arg("headless").arg("query").output().await`. Does NOT require PTY. |
| `portable-pty` | 0.8 (already in Cargo.toml) | Start/stop `gsd headless` interactive sessions | For headless *start* (long-running agent loop). Reuses existing `TerminalManager` — same pattern as all other terminal sessions. |
| TanStack Query v5 | already in package.json | Poll health widget and visualizer data | `refetchInterval` polling pattern, already used for `useGitStatus` (30s) and `useGitInfo` (60s). Health widget: 30s interval. Visualizer: on-demand with file-watcher invalidation. |
| `@tauri-apps/api/event` `listen()` | 2.x (already in use) | Frontend subscribes to `gsd:file-changed` events | Already used in `use-gsd-file-watcher.ts`. Extend event payload to include `gsd2` change types. |

### New Rust Command Module

| Module | Location | Purpose | Pattern |
|--------|----------|---------|---------|
| `gsd2.rs` | `src-tauri/src/commands/gsd2.rs` | All GSD-2 specific commands | Mirror of `gsd.rs` structure — new module, zero changes to existing `gsd.rs`. GSD-1 commands remain untouched. |

**Why a new module, not extending `gsd.rs`:** `gsd.rs` is 3,604 lines. Adding GSD-2 parsing to it would make maintenance impossible. The GSD-1 commands are stable and should not be touched. A clean `gsd2.rs` module with its own structs and helpers is the correct Rust approach. Register via `mod.rs` and `lib.rs`.

### Supporting Libraries (No New Additions Required)

| Library | Already Present | Purpose in GSD-2 Integration |
|---------|-----------------|-------------------------------|
| `rusqlite 0.32` | Yes | Store detected GSD version per project in existing `projects` table (`gsd_version` column or config field) |
| `chrono 0.4` | Yes | Parse timestamps from `.gsd/metrics.json` ledger entries |
| `uuid 1` | Yes | Generate session IDs for headless PTY sessions |
| `tracing 0.1` | Yes | Log parse errors from malformed `.gsd/` files (non-fatal) |

### Frontend: No New Libraries Required

| Pattern | Library | Existing Usage | GSD-2 Application |
|---------|---------|----------------|-------------------|
| Data polling | TanStack Query `useQuery` + `refetchInterval` | `useGitStatus` at 30s, `useGitInfo` at 60s | Health widget: `refetchInterval: 30_000`. Visualizer: `staleTime: 10_000` + file-watcher invalidation. |
| File-change events | `listen()` from `@tauri-apps/api/event` | `use-gsd-file-watcher.ts` | Extend `GsdFileChangedPayload` with GSD-2 change types: `gsd2_state`, `gsd2_milestone`, `gsd2_slice`, `gsd2_task`, `gsd2_metrics`. |
| PTY sessions | `ptyCreate`, `onPtyOutput`, `onPtyExit` | All terminal tabs | Headless mode: reuse `ptyCreate` with `command: "gsd headless"`. Monitor output for JSON lines. Same session lifecycle as interactive terminals. |
| IPC wrappers | `invoke<T>()` from `@tauri-apps/api/core` | All of `lib/tauri.ts` | Add GSD-2 invoke wrappers to `lib/tauri.ts` — `gsd2DetectVersion`, `gsd2GetHealth`, `gsd2ListWorktrees`, `gsd2GetVisualizerData`, `gsd2StartHeadless`, `gsd2QueryHeadless`. |
| Query keys | `queryKeys` factory in `lib/query-keys.ts` | All existing GSD-1 query keys | Add `gsd2Health`, `gsd2Worktrees`, `gsd2Visualizer`, `gsd2Version` keys using same `["gsd2", projectId, ...]` pattern. |

---

## Architecture Decisions

### 1. GSD Version Detection: Rust, Per-Request

**How:** In `gsd2.rs`, implement `gsd2_detect_version(project_path)` that checks:
1. `path.join(".gsd").exists()` → `"gsd2"`
2. `path.join(".planning").exists()` → `"gsd1"`
3. Neither → `"none"`

**Why not cache in DB:** File presence can change between app sessions. A lightweight `std::path::Path::exists()` call on the project path is sub-millisecond and always accurate. Cache in TanStack Query with `staleTime: 60_000` on the frontend.

**Confidence: HIGH** — verified against `paths.ts` `gsdRoot()` probe logic in GSD-2 source. The `.gsd/` directory is the canonical GSD-2 marker.

### 2. GSD-2 File Parsing: Direct Rust `std::fs` Reads

**How:** The `.gsd/` structure is:
```
.gsd/
  PROJECT.md          ← same key=value frontmatter format as .planning/PROJECT.md
  STATE.md            ← derived state (activeMilestone, activeSlice, activeTask, phase, progress)
  QUEUE.md            ← task queue
  KNOWLEDGE.md        ← knowledge base
  REQUIREMENTS.md     ← requirements
  metrics.json        ← cost/budget ledger (JSON)
  milestones/
    M001/
      M001-ROADMAP.md ← milestone definition, slice list with checkboxes
      M001-CONTEXT.md ← milestone context
      slices/
        S01/
          S01-PLAN.md ← slice plan, task list with checkboxes
          tasks/
            T01-PLAN.md
            T01-SUMMARY.md
  worktrees/
    <name>/           ← git worktree checkout
  parallel/
    M001.status.json  ← parallel worker status (JSON)
```

**Key parsing insight from GSD-2 source code:**
- Directories use bare IDs: `M001/`, `S01/`, `T01/`
- Files use `ID-SUFFIX.md` convention: `M001-ROADMAP.md`, `S01-PLAN.md`, `T01-PLAN.md`
- Legacy support: also accept `M001-DESCRIPTOR-SUFFIX.md` (prefix match)
- The existing `parse_frontmatter()` and `extract_section()` helpers in `gsd.rs` work identically on GSD-2 files — the markdown format is the same

**Implementation pattern for milestone enumeration:**
```rust
// Read milestones
let milestones_dir = path.join(".gsd").join("milestones");
if milestones_dir.exists() {
    for entry in fs::read_dir(&milestones_dir)? {
        let entry = entry?;
        if entry.file_type()?.is_dir() {
            let id = entry.file_name().to_string_lossy().to_string();
            // id is "M001" or "M001-DESCRIPTOR" — extract prefix with regex ^(M\d+)
            let roadmap_file = entry.path().join(format!("{}-ROADMAP.md", id));
            // ...
        }
    }
}
```

**Confidence: HIGH** — verified against `paths.ts` source, `headless-query.test.ts` fixture structure, and `worktree-manager.ts` path constants.

### 3. Health Widget Data: File Reads + JSON Parse

**What to read and how:**

| Field | Source | Parse Method |
|-------|--------|--------------|
| `activeMilestoneId` | `.gsd/STATE.md` frontmatter `active_milestone:` | `parse_frontmatter()` |
| `activeSliceId` | `.gsd/STATE.md` frontmatter `active_slice:` | `parse_frontmatter()` |
| `activeTaskId` | `.gsd/STATE.md` frontmatter `active_task:` | `parse_frontmatter()` |
| `phase` | `.gsd/STATE.md` frontmatter `phase:` | `parse_frontmatter()` |
| `progress.milestones` | `.gsd/STATE.md` body section OR count from `milestones/` dir | `extract_section()` or `read_dir()` |
| `budgetSpent` | `.gsd/metrics.json` → sum `units[].cost` | `serde_json::from_str()` |
| `budgetCeiling` | `.gsd/metrics.json` → `preferences.budget_ceiling` or `null` | `serde_json::from_str()` |
| `blockers` | `.gsd/STATE.md` body `## Blockers` section | `extract_section()` |
| `nextAction` | `.gsd/STATE.md` body `## Next Action` section | `extract_section()` |
| `eta` | `.gsd/STATE.md` body `eta:` frontmatter | `parse_frontmatter()` |
| `projectState` | presence of `.gsd/milestones/` children | `read_dir()` count |

**Why not `gsd headless query` for health widget:** The query command spawns a Node.js process and is async with ~500ms startup cost. Health widget refreshes every 30s and must be lightweight. Direct file reads are synchronous and complete in <5ms. Reserve `gsd headless query` for the explicit "headless query" user action.

**Confidence: HIGH** — verified against `health-widget.ts` source, which reads the same fields from the same files.

### 4. Worktrees: `git worktree list` via `tokio::process::Command`

**How:** Run `git worktree list --porcelain` in the project directory and parse the output. Filter for entries whose path starts with `.gsd/worktrees/` or whose branch starts with `worktree/`.

**Why not read `.gsd/worktrees/` directory directly:** A worktree directory can exist on disk but be unregistered with git (stale), or a worktree can be registered but its directory deleted. The authoritative source is `git worktree list`, which is what `worktree-manager.ts` uses internally (`nativeWorktreeList`).

**Already have the capability:** `git.rs` already runs `git` commands via `std::process::Command`. Reuse the same pattern.

**Confidence: HIGH** — verified against `worktree-manager.ts` `listWorktrees()` implementation.

### 5. Headless Mode: Two Distinct Code Paths

**Path A — Query (read-only snapshot):**
```rust
// tokio::process::Command, no PTY
let output = tokio::process::Command::new("gsd")
    .args(&["headless", "--json", "next"])
    .current_dir(&project_path)
    .output()
    .await?;
let snapshot: HeadlessSnapshot = serde_json::from_slice(&output.stdout)?;
```
Returns `{ state, next, cost }`. Suitable for polling. No interactive session needed.

**Path B — Start/Stop (long-running agent loop):**
Reuse `TerminalManager`/`pty_create` with `command: Some("gsd headless".to_string())`. The frontend subscribes to `pty:output:{session_id}` events and scans output lines for JSON progress markers. Use `pty_close` to stop.

**Why separate paths:** Query is fast (<1s) and stateless — use `tokio::process` for clean async/await. Start/stop is long-running with streaming output — PTY is correct because `gsd headless` is an interactive loop that may need terminal dimensions and writes progress to stdout continuously.

**Confidence: HIGH** — verified against `headless-command.ts` test which spawns `node loader.js headless --json next` as a child process. The `--json` flag makes it output a single JSON object and exit.

### 6. Watcher Extension: Add `.gsd/` to Existing Watcher

**How:** In `watcher.rs`, extend `watch_project_files` to also watch `.gsd/` if it exists:

```rust
let gsd_dir = path.join(".gsd");
if gsd_dir.exists() {
    watcher.watch(&gsd_dir, notify::RecursiveMode::Recursive)?;
}
```

In the event handler, classify `.gsd/` changes with GSD-2 change types:
- `/.gsd/STATE.md` → `"gsd2_state"`
- `/.gsd/milestones/` → `"gsd2_milestone"`
- `/.gsd/metrics.json` → `"gsd2_metrics"`
- `/.gsd/worktrees/` → `"gsd2_worktree"`
- other → `"gsd2_other"`

The frontend `use-gsd-file-watcher.ts` already handles arbitrary `change_type` values — just add new cases to the switch statement.

**Confidence: HIGH** — pattern is identical to existing `.planning/` watcher logic.

### 7. React Polling Intervals for GSD-2 Data

| Data | Pattern | Interval | Rationale |
|------|---------|----------|-----------|
| GSD version detection | `useQuery` + `staleTime: 60_000` | On mount, then 60s | Version rarely changes mid-session |
| Health widget (active project) | `useQuery` + `refetchInterval: 30_000` | 30s | Matches GSD-2 widget's own 60s refresh; 30s gives tighter feedback |
| Health widget (idle project) | `useQuery` + `refetchInterval: false` | File-watcher only | Don't poll projects not currently viewed |
| Worktrees | `useQuery` + `refetchInterval: 10_000` | 10s | Worktrees can be created/removed by CLI while app is open |
| Visualizer | `useQuery` + `staleTime: 5_000` | File-watcher invalidation | Heavy query — let watcher drive, not a timer |
| Headless status | `useQuery` + `refetchInterval: 5_000` (when active session) | 5s | Active sessions need responsive feedback |

**Pattern:** Use `enabled: !!projectId && gsdVersion === 'gsd2'` on all GSD-2 queries to prevent them running on GSD-1 or no-GSD projects.

**Confidence: HIGH** — derived directly from existing `useGitStatus` (30s), `useGitInfo` (60s) patterns in `queries.ts`.

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Importing `gsd-2` npm package in TYS frontend | Stated constraint: "No GSD-2 dependency". The npm package includes Node.js-specific fs modules that don't run in Tauri's WebView. | Rust `std::fs` reads via Tauri commands |
| Parsing GSD-2 `.gsd/` files in frontend JS | GSD-2's `paths.ts` uses `readdirSync`, `existsSync` — Node.js APIs not available in browser context. | Rust backend commands invoked via `invoke<T>()` |
| Extending existing `gsd.rs` with GSD-2 commands | At 3,604 lines it is already at the boundary of reasonable file size. Mixing GSD-1 and GSD-2 parsing creates regression risk for stable features. | New `gsd2.rs` module |
| Polling `gsd headless query` for health widget data | Node.js startup overhead (~500ms). Health widget needs sub-100ms response. | Direct Rust `std::fs` reads of `.gsd/STATE.md` and `.gsd/metrics.json` |
| Polling visualizer data on a timer without file-watcher | Visualizer data changes only when GSD-2 writes files. Timer polling without file events wastes IPC cycles. | File-watcher events → `queryClient.invalidateQueries()` |
| New React state management library (Zustand, Jotai, etc.) | The app already uses TanStack Query + React context for all state. Adding another state manager creates architectural fragmentation. | TanStack Query `useQuery` for server data, React context for UI state |
| Separate "gsd2" event channel (new event name) | Fragmentation. The existing `gsd:file-changed` event and `use-gsd-file-watcher.ts` debouncing/batching infrastructure is already correct. | Extend existing event with `gsd2_*` change_type values |

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| New `gsd2.rs` command module | Extend existing `gsd.rs` | Never for GSD-2 — gsd.rs is already 3,604 lines and GSD-1 is stable |
| `tokio::process::Command` for headless query | PTY session for headless query | Only if `gsd headless --json next` ever requires interactive input (currently it does not) |
| Direct file reads for health data | `gsd headless query` for health data | If GSD-2 ever writes a dedicated machine-readable health file (currently it does not; state must be derived from markdown) |
| Rust `read_dir()` for milestone enumeration | SQLite cache of milestone list | If performance becomes a bottleneck at >50 milestones (unlikely for any individual project) |
| Extending `watch_project_files` | New watch command for `.gsd/` | Never — single watch command per project is simpler |

---

## Version Compatibility

| Package | Current Version | GSD-2 Requirement | Notes |
|---------|-----------------|-------------------|-------|
| `tauri` | 2.x | No change | GSD-2 commands follow existing Tauri 2 command pattern exactly |
| `tokio` | 1.x with `process` feature | `process` feature needed for `tokio::process::Command` | `tokio = { version = "1", features = ["rt-multi-thread", "sync", "time", "macros", "process"] }` — `process` is already listed in Cargo.toml |
| `serde_json` | 1.x | Used for `metrics.json` and headless snapshot | Already present |
| `notify` | 6.x | Used for `.gsd/` file watching | Already present; `RecursiveMode::Recursive` covers entire `.gsd/` subtree |
| `portable-pty` | 0.8 | Used for `gsd headless` sessions | Already present; no changes needed |

---

## Implementation Order Recommendation

Based on dependency analysis:

1. **Version detection** (`gsd2_detect_version`) — gates all other GSD-2 UI rendering. Zero risk, pure `Path::exists()` check. Do first.
2. **Watcher extension** — extend `watch_project_files` to watch `.gsd/` + add `gsd2_*` change types. Enables reactive UI for all subsequent features.
3. **File parsing** (`gsd2.rs` module) — milestones, slices, tasks from markdown. Foundational for health widget and visualizer.
4. **Health widget** — reads STATE.md + metrics.json. Depends on file parsing. Most visible feature.
5. **Worktrees** — `git worktree list` parsing + actions. Depends on version detection.
6. **Visualizer** — aggregation over milestone/slice/task data. Depends on file parsing.
7. **Headless mode** — PTY session + query command. Most complex, build last when other features are stable.

---

## Sources

- `/Users/jeremymcspadden/Github/track-your-shit/src-tauri/src/commands/gsd.rs` — existing GSD-1 parse patterns (parse_frontmatter, extract_section, command structure) — HIGH confidence
- `/Users/jeremymcspadden/Github/track-your-shit/src-tauri/src/commands/watcher.rs` — existing file watcher pattern for `.planning/` extension — HIGH confidence
- `/Users/jeremymcspadden/Github/track-your-shit/src-tauri/Cargo.toml` — confirmed all required crates already present — HIGH confidence
- `/Users/jeremymcspadden/Github/track-your-shit/src/lib/queries.ts` — existing polling intervals and TanStack Query patterns — HIGH confidence
- `/Users/jeremymcspadden/Github/track-your-shit/src/hooks/use-gsd-file-watcher.ts` — existing file-watcher → query invalidation pattern — HIGH confidence
- `/Users/jeremymcspadden/github/gsd-2/dist/resources/extensions/gsd/paths.ts` — authoritative `.gsd/` directory layout, ID naming conventions, legacy prefix-matching — HIGH confidence
- `/Users/jeremymcspadden/github/gsd-2/dist/resources/extensions/gsd/health-widget.ts` — confirmed budget data comes from `metrics.json` ledger — HIGH confidence
- `/Users/jeremymcspadden/github/gsd-2/dist/resources/extensions/gsd/health-widget-core.ts` — confirmed `HealthWidgetData` fields and their semantics — HIGH confidence
- `/Users/jeremymcspadden/github/gsd-2/dist/resources/extensions/gsd/worktree-manager.ts` — confirmed `git worktree list --porcelain` is authoritative source for worktree state — HIGH confidence
- `/Users/jeremymcspadden/github/gsd-2/dist/resources/extensions/gsd/types.ts` — confirmed `GSDState` shape (activeMilestone, activeSlice, activeTask, phase, progress) — HIGH confidence
- `/Users/jeremymcspadden/github/gsd-2/dist/resources/extensions/gsd/tests/headless-query.test.ts` — confirmed `gsd headless --json next` exits with single JSON snapshot `{ state, next, cost }` — HIGH confidence
- `/Users/jeremymcspadden/github/gsd-2/dist/resources/extensions/gsd/tests/integration/headless-command.ts` — confirmed headless command invocation is `node loader.js headless --json next` spawned as child process — HIGH confidence

---
*Stack research for: Track Your Shit GSD-2 integration (Tauri 2.x brownfield)*
*Researched: 2026-03-20*
