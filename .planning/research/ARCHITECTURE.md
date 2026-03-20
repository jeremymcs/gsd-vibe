# Architecture Research

// Track Your Shit - GSD-2 Integration Architecture Research
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

**Domain:** Tauri 2.x desktop app — brownfield GSD-2 feature integration
**Researched:** 2026-03-20
**Confidence:** HIGH — all conclusions drawn from direct source inspection of this codebase and gsd-2 source files

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        React 18 Frontend (src/)                      │
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │  GSD-2 UI    │  │  Worktree    │  │  Headless    │               │
│  │  Components  │  │  Panel       │  │  Session UI  │               │
│  │  (health,    │  │  (list,      │  │  (start/stop │               │
│  │  visualizer) │  │  merge/rm)   │  │  output)     │               │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘               │
│         │                 │                  │                       │
│         └─────────────────┴──────────────────┘                      │
│                           │                                          │
│                    lib/tauri.ts (invoke wrappers)                    │
│                    lib/queries.ts (TanStack Query hooks)             │
│                    hooks/use-gsd2-file-watcher.ts                    │
├───────────────────────────┴──────────────────────────────────────────┤
│                        Tauri IPC Bridge                               │
│                    invoke() / emit() / listen()                      │
├──────────────────────────────────────────────────────────────────────┤
│                     Rust Backend (src-tauri/src/)                     │
│                                                                       │
│  ┌───────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  gsd2.rs      │  │  watcher.rs  │  │  pty.rs      │              │
│  │  (new module) │  │  (extended)  │  │  (reused)    │              │
│  │  version det. │  │  .gsd/ watch │  │  headless    │              │
│  │  file parsing │  │  events      │  │  sessions    │              │
│  └──────┬────────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                  │                  │                      │
│  ┌──────┴────────┐         │                  │                      │
│  │  gsd.rs       │         │                  │                      │
│  │  (unchanged)  │         │                  │                      │
│  │  .planning/   │         │                  │                      │
│  └───────────────┘         │                  │                      │
│                             │                  │                     │
├─────────────────────────────┴──────────────────┴─────────────────────┤
│                        File System / OS                               │
│  .gsd/milestones/M001/   .gsd/worktrees/   .gsd/STATE.md            │
│  .planning/ (GSD-1, unchanged)                                       │
└──────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Communicates With |
|-----------|----------------|-------------------|
| `gsd2.rs` | GSD version detection, `.gsd/` file parsing, health data assembly, worktree listing, visualizer data | DbPool (project path lookup), fs (file reads) |
| `gsd.rs` (existing) | All existing `.planning/` parsing — no changes | DbPool, fs |
| `watcher.rs` (extended) | Add `.gsd/` directory watching alongside existing `.planning/` watching; emit `gsd2:file-changed` events | AppHandle (emit), notify crate |
| `pty.rs` (reused as-is) | Create/manage PTY sessions for headless `gsd headless query` subprocess | TerminalManagerState |
| `HeadlessSessionPanel` | Start/stop headless sessions, stream JSON output, show next action parsed from snapshot | ptyCreate, ptyWrite, onPtyOutput |
| `GsdHealthWidget` | Display budget/cost, env checks, active M/S/T position, ETA, blockers | useGsd2Health hook → gsd2_get_health |
| `WorktreePanel` | List worktrees, trigger merge/remove via git commands | useGsd2Worktrees hook → gsd2_list_worktrees |
| `VisualizerTab` | Render milestone → slice → task progress tree with cost/token metrics | useGsd2Visualizer hook → gsd2_get_visualizer |
| `GsdVersionBadge` | Show "GSD-2" or "GSD-1" label; drives adaptive terminology | gsd2_detect_version (via project state) |
| `lib/tauri.ts` | Typed invoke wrappers for all new gsd2_* commands | invoke() |
| `lib/queries.ts` | TanStack Query hooks for gsd2 data with appropriate stale/refetch times | lib/tauri.ts wrappers |
| `use-gsd2-file-watcher.ts` | New hook, mirrors use-gsd-file-watcher.ts but listens for `gsd2:file-changed` events | listen(), queryClient invalidation |

---

## Recommended Project Structure

```
src-tauri/src/commands/
├── gsd.rs                      # UNCHANGED — all .planning/ logic stays here
├── gsd2.rs                     # NEW — all .gsd/ logic: version detect, parse, health, worktrees, visualizer
├── watcher.rs                  # EXTENDED — add .gsd/ dir watching, emit gsd2:file-changed
└── pty.rs                      # UNCHANGED — headless sessions reuse existing PTY primitives

src/
├── lib/
│   ├── tauri.ts                # EXTENDED — add Gsd2* types + gsd2_* invoke wrappers
│   ├── queries.ts              # EXTENDED — add useGsd2* hooks
│   └── query-keys.ts          # EXTENDED — add gsd2 query key namespace
├── hooks/
│   ├── use-gsd-file-watcher.ts # UNCHANGED
│   └── use-gsd2-file-watcher.ts  # NEW — mirrors GSD-1 watcher for .gsd/ changes
└── components/project/
    ├── gsd-*.tsx               # EXISTING GSD-1 components — unchanged
    ├── gsd2-health-widget.tsx  # NEW
    ├── gsd2-worktree-panel.tsx # NEW
    ├── gsd2-visualizer-tab.tsx # NEW
    └── gsd2-headless-panel.tsx # NEW
```

### Structure Rationale

- **`gsd2.rs` as a new module, not extending `gsd.rs`:** gsd.rs is 42k tokens (the read failed due to size), contains deeply path-coupled `.planning/` parsing logic. Adding `.gsd/` parsing into the same file creates divergent path logic with high collision risk. A clean `gsd2.rs` module means: GSD-1 can be changed independently, gsd2 work is isolated, and the separation matches the "Pending" decision in PROJECT.md ("New Rust command module for gsd2 parsing").
- **`watcher.rs` extended (not replaced):** The watcher already handles `.planning/` and dep files. Adding `.gsd/` watch alongside is a small addition (10-15 lines). A new `watcher2.rs` would require new state types and lib.rs plumbing for marginal benefit.
- **`pty.rs` reused as-is:** Headless sessions are just PTY sessions running `gsd headless query`. The frontend creates a PTY with `command: "gsd headless query"`, reads `pty:output:{sessionId}` events, and parses JSON from the stream. No backend changes needed.
- **New components in `components/project/`:** The existing `gsd-*.tsx` components serve GSD-1. New `gsd2-*.tsx` components serve GSD-2. The project detail page tab group conditionally renders the right set based on detected version.

---

## Architectural Patterns

### Pattern 1: New Module With Shared Helpers

**What:** `gsd2.rs` imports shared helpers from `gsd.rs` (frontmatter parser, section extractor) via `pub fn` or a shared `helpers.rs` extract.
**When to use:** When file parsing logic is identical between GSD-1 and GSD-2 (YAML frontmatter, markdown sections). Avoids duplication.
**Trade-offs:** Small coupling between modules; acceptable since the helpers are stable utility functions, not business logic.

**Example:**
```rust
// In gsd.rs — expose the helper
pub fn parse_frontmatter(content: &str) -> (HashMap<String, String>, String) { ... }

// In gsd2.rs — import and reuse
use crate::commands::gsd::parse_frontmatter;
```

### Pattern 2: File-Reading State Derivation (No DB Cache)

**What:** gsd2.rs reads `.gsd/` files directly from disk (via `std::fs`) to derive health, worktree list, and visualizer data on each invocation. No SQLite caching for these parsed structures.
**When to use:** This matches how gsd-2's own `deriveState()` works — it explicitly comments out DB usage because DB content becomes stale relative to file changes. TYS must follow the same pattern to avoid showing stale progress.
**Trade-offs:** Slightly higher I/O per request vs. a cached approach. Mitigated by TanStack Query's client-side caching with appropriate `staleTime`. The Rust fs reads for a handful of markdown files are sub-millisecond on local disk.

**Example data sources per feature:**
```
Health widget:
  .gsd/STATE.md → activeMilestone, activeSlice, activeTask, phase, blockers
  .gsd/milestones/M001/M001-ROADMAP.md → slice progress count
  .gsd/milestones/M001/S01/S01-PLAN.md → task progress count
  .gsd/QUEUE.md → ETA / budget data (if present)

Worktrees:
  git worktree list --porcelain (subprocess call, like existing git commands)
  .gsd/worktrees/ directory listing (if present)

Visualizer:
  Walk .gsd/milestones/ → for each milestone parse ROADMAP.md
  For each slice parse PLAN.md + SUMMARY.md (if present)
  Cost data: .gsd/QUEUE.md or metrics ledger files (TBD — needs phase research)
```

### Pattern 3: Polling via TanStack Query refetchInterval

**What:** Health widget data uses `refetchInterval: 5000` (5s). Visualizer uses `refetchInterval: 10000` (10s). Worktrees use `refetchInterval: 15000` (15s). File watcher events trigger immediate invalidation on top of polling.
**When to use:** GSD-2 state changes when gsd CLI writes files. The file watcher catches these changes reactively; polling is the safety net when the watcher misses an event.
**Trade-offs:** Two invalidation paths (watcher + polling) means the UI is never more than 5s stale even if watcher is not running. Avoid polling shorter than 3s to prevent IPC flooding.

**Example hook:**
```typescript
export const useGsd2Health = (projectId: string) =>
  useQuery({
    queryKey: queryKeys.gsd2Health(projectId),
    queryFn: () => api.gsd2GetHealth(projectId),
    enabled: !!projectId,
    staleTime: 3000,
    refetchInterval: 5000,
  });
```

### Pattern 4: Headless Sessions as Plain PTY Sessions

**What:** The frontend calls `ptyCreate({ workingDirectory: projectPath, command: "gsd headless query", ... })`, listens on `pty:output:{sessionId}`, accumulates raw bytes, decodes UTF-8, and parses lines as JSON (`{ state, next, cost }`). Session lifecycle (start/stop/detect-completion) is managed entirely in the frontend component.
**When to use:** `gsd headless query` emits a JSON snapshot and exits — it does not need a long-running session. The PTY wrapping is needed because it requires a proper tty environment.
**Trade-offs:** Frontend must handle JSON parsing from a byte stream (line-buffered). The `pty:exit:{sessionId}` event signals completion. No new backend commands needed — this reuses 100% of the existing PTY stack.

**Headless flow:**
```
User clicks "Run Headless Query"
  → ptyCreate({ command: "gsd headless query", workingDirectory })
  → listen(pty:output:{id}) — accumulate bytes, decode UTF-8
  → listen(pty:exit:{id}) — parse final accumulated output as JSON
  → display { state.phase, next, cost } in HeadlessSessionPanel
  → invalidate gsd2 health/visualizer queries
```

---

## Data Flow

### GSD-2 Read Flow (Health / Visualizer / Worktrees)

```
User navigates to project detail (GSD-2 project)
    ↓
ProjectPage detects gsd_version = "gsd2" (from useGsd2DetectVersion hook)
    ↓
Renders <Gsd2HealthWidget projectId={id} />
    ↓
useGsd2Health(projectId) → TanStack Query
    ↓
invoke("gsd2_get_health", { projectId })
    ↓
gsd2.rs: get_project_path(db) → project.path
    ↓
gsd2.rs: read .gsd/STATE.md, parse frontmatter
    ↓
gsd2.rs: read active milestone ROADMAP.md, active slice PLAN.md
    ↓
Returns Gsd2HealthData struct (JSON-serialized)
    ↓
TanStack Query caches, component renders
    ↓
5s later: refetchInterval fires OR gsd2:file-changed event fires
    ↓
Query invalidated → re-fetch
```

### GSD-2 File Change Reactive Flow

```
gsd CLI writes to .gsd/milestones/M001/S01/S01-PLAN.md
    ↓
notify debouncer fires in watcher.rs (2s debounce)
    ↓
Path contains "/.gsd/" → emit "gsd2:file-changed" event
    ↓
  { project_path, file_path, change_type: "gsd2_plan" }
    ↓
use-gsd2-file-watcher.ts receives event
    ↓
Batches change_type (500ms trailing debounce)
    ↓
Calls queryClient.invalidateQueries({ queryKey: queryKeys.gsd2Health(projectId) })
         + queryClient.invalidateQueries({ queryKey: queryKeys.gsd2Visualizer(projectId) })
    ↓
Fresh data fetched immediately
```

### Headless Session Flow

```
User clicks "Run gsd headless query"
    ↓
HeadlessSessionPanel calls ptyCreate({ command: "gsd headless query" })
    ↓
Returns { sessionId }
    ↓
Component registers onPtyOutput(sessionId) listener
Component registers onPtyExit(sessionId) listener
    ↓
Rust PTY: spawns "gsd headless query" subprocess
    ↓
JSON output streams via pty:output:{sessionId} events
    ↓
pty:exit:{sessionId} fires (gsd headless query is not long-lived)
    ↓
Component parses final JSON: { state, next, cost }
Component displays result
    ↓
Component calls queryClient.invalidateQueries(gsd2Health, gsd2Visualizer)
```

### Key Data Flows Summary

1. **Version detection:** Single `gsd2_detect_version(projectId)` call returns `"gsd2" | "gsd1" | "none"`. Called once per project load, result stored in TanStack Query with `staleTime: Infinity` (directory presence does not change during a session). This gates all GSD-2 component rendering.
2. **Health data:** File-read on every query — no DB. `gsd2_get_health` reads STATE.md + active ROADMAP.md + active PLAN.md. Polling at 5s interval.
3. **Worktrees:** `gsd2_list_worktrees` runs `git worktree list --porcelain` via subprocess (same pattern as existing git commands) and cross-references `.gsd/worktrees/` directory. 15s polling.
4. **Visualizer:** `gsd2_get_visualizer` walks the entire `.gsd/milestones/` tree. Heavier read — 10s polling, not on every focus.
5. **Headless sessions:** Frontend-managed PTY lifecycle. No dedicated Rust commands beyond existing PTY primitives.

---

## Anti-Patterns

### Anti-Pattern 1: Extending gsd.rs In-Place

**What people do:** Add GSD-2 parsing into the existing `gsd.rs` file with `if gsd_version == "gsd2" { ... } else { ... }` branching throughout.
**Why it's wrong:** gsd.rs is already very large (42k tokens). Adding branching interleaves `.gsd/` path logic with `.planning/` path logic throughout. GSD-1 commands become fragile — any change to shared helpers can break existing functionality. The PROJECT.md "Key Decisions" table explicitly lists "New Rust command module for gsd2 parsing / Keeps gsd1 commands untouched" as the chosen direction.
**Do this instead:** Create `gsd2.rs` as a clean separate module. Expose any needed helper functions from `gsd.rs` as `pub fn`. Register `gsd2_*` commands separately in `lib.rs`.

### Anti-Pattern 2: Caching GSD-2 Parsed State in SQLite

**What people do:** Parse GSD-2 files on sync and store parsed data in new DB tables. Serve future requests from DB.
**Why it's wrong:** GSD-2's own `deriveState()` contains a comment explicitly warning against this: "The DB's artifacts table is populated once during migrateFromMarkdown and is never updated when files change on disk... Using stale DB content causes deriveState to return incorrect phase/slice state." The same applies to TYS — if TYS caches parsed GSD-2 state in SQLite, it will show stale progress that diverges from what gsd CLI reads. TanStack Query client-side caching is sufficient.
**Do this instead:** Read files directly on every `gsd2_*` command invocation. Use TanStack Query `staleTime` + `refetchInterval` for client-side freshness control.

### Anti-Pattern 3: Building a New PTY Infrastructure for Headless

**What people do:** Create a new `headless.rs` command module with its own process management, output buffering, and session state.
**Why it's wrong:** The existing PTY system (`pty.rs`, `TerminalManagerState`) already handles process lifecycle, byte streaming via events, and session management. `gsd headless query` is just a command that exits after emitting JSON — it needs nothing the PTY system doesn't already provide. Duplicating process management creates two code paths to maintain.
**Do this instead:** The frontend calls `ptyCreate({ command: "gsd headless query", workingDirectory: projectPath })` and manages session lifecycle entirely in the React component.

### Anti-Pattern 4: Polling Too Aggressively

**What people do:** Set `refetchInterval: 1000` on health/visualizer queries to get "live" updates.
**Why it's wrong:** Each poll is a Tauri IPC call that triggers Rust file reads. At 1s intervals with multiple GSD-2 projects open, this creates significant I/O pressure and IPC queue contention. The file watcher already provides sub-2s reactive updates for actual file changes.
**Do this instead:** Use 5s polling for health (most user-visible), 10s for visualizer (tree traversal is heavier), 15s for worktrees (rarely changes). Let the file watcher handle immediate invalidation.

### Anti-Pattern 5: Using gsd-2 npm Package in Rust

**What people do:** Shell out to Node.js or call gsd-2 TypeScript functions from Rust to parse files.
**Why it's wrong:** PROJECT.md explicitly states "No GSD-2 dependency: TYS reads files directly (Rust fs), does not import gsd-2 npm package." The gsd-2 path resolution logic (prefix matching, legacy fallback, git root discovery) must be reimplemented in Rust. This is straightforward — `paths.ts` shows the logic is directory listing + prefix matching, which is trivial in Rust.
**Do this instead:** Implement a `resolve_gsd_dir`, `resolve_gsd_file` pair in `gsd2.rs` that mirrors the exact prefix-matching logic from gsd-2's `paths.ts`.

---

## Integration Points

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `gsd2.rs` ↔ `gsd.rs` | `pub fn` helper reuse | Only parse_frontmatter and extract_section need sharing; consider extracting to `gsd_helpers.rs` if both modules grow |
| `gsd2.rs` ↔ `pty.rs` | None | Headless sessions managed entirely at frontend layer |
| `watcher.rs` ↔ frontend | Tauri events (`gsd2:file-changed`) | New event name to avoid mixing with existing `gsd:file-changed` handler |
| `gsd2.rs` ↔ DbPool | Read-only: project path lookup only | Same pattern as gsd.rs `get_project_path()` |
| Frontend GSD-2 components ↔ GSD-1 components | None — version gate in ProjectPage | `if gsdVersion === "gsd2"` renders GSD-2 tabs; else GSD-1 tabs |
| `use-gsd2-file-watcher.ts` ↔ TanStack Query | `queryClient.invalidateQueries()` | Same debounce pattern as use-gsd-file-watcher.ts (500ms trailing) |

### Key GSD-2 File Paths (from paths.ts source inspection)

```
.gsd/                         — root (gsdRoot())
.gsd/STATE.md                 — current phase, active M/S/T, blockers
.gsd/QUEUE.md                 — budget / ETA data
.gsd/KNOWLEDGE.md             — knowledge base summary
.gsd/REQUIREMENTS.md          — requirement counts
.gsd/milestones/              — milestonesDir()
.gsd/milestones/M001/         — resolveMilestonePath()
.gsd/milestones/M001/M001-ROADMAP.md    — roadmap + slice list + done markers
.gsd/milestones/M001/M001-CONTEXT.md   — milestone context + depends_on frontmatter
.gsd/milestones/M001/slices/S01/       — resolveSlicePath()
.gsd/milestones/M001/slices/S01/S01-PLAN.md  — task list + done markers
.gsd/milestones/M001/slices/S01/tasks/T01-PLAN.md  — per-task plan
.gsd/worktrees/<name>/        — worktree directories
```

Legacy path handling: All directory lookups use prefix matching (M001 → M001 exact OR M001-SOMETHING). Rust `gsd2.rs` must implement the same two-step: exact match first, then `starts_with(id + "-")` fallback.

---

## Build Order Implications

Based on component dependencies, the phases should build in this order:

1. **Version detection first** — `gsd2_detect_version` is the gate for all other GSD-2 features. The adaptive terminology UI depends on it. Must land in Phase 1.
2. **Core file parsing second** — `gsd2.rs` parse utilities (frontmatter, roadmap, plan files) are shared by health, visualizer, and worktrees. Build once, reuse.
3. **Health widget third** — Highest user value, depends only on STATE.md and ROADMAP.md parsing. Validates the core file-read pattern before building more complex walkers.
4. **Watcher extension alongside health** — The reactive update path (watcher → event → cache invalidation) should be built at the same time as the first data feature so the pattern is established.
5. **Worktrees fourth** — Depends on git subprocess pattern (already established in git.rs) + basic `.gsd/` directory reading.
6. **Visualizer fifth** — Most complex: full tree walk across milestones/slices/tasks. Depends on all file parsing utilities being stable.
7. **Headless sessions last** — Depends on visualizer being available (to show refreshed state post-query) and is the only feature requiring PTY wiring in the frontend.

---

## Sources

- Direct inspection: `/Users/jeremymcspadden/Github/track-your-shit/src-tauri/src/commands/gsd.rs` (existing GSD-1 command module)
- Direct inspection: `/Users/jeremymcspadden/Github/track-your-shit/src-tauri/src/commands/pty.rs` (PTY command module)
- Direct inspection: `/Users/jeremymcspadden/Github/track-your-shit/src-tauri/src/commands/watcher.rs` (file watcher)
- Direct inspection: `/Users/jeremymcspadden/Github/track-your-shit/src/lib/tauri.ts` (IPC layer)
- Direct inspection: `/Users/jeremymcspadden/Github/track-your-shit/src/lib/queries.ts` (TanStack Query hooks)
- Direct inspection: `/Users/jeremymcspadden/Github/track-your-shit/src/hooks/use-gsd-file-watcher.ts` (file watcher hook)
- Direct inspection: `/Users/jeremymcspadden/github/gsd-2/dist/resources/extensions/gsd/paths.ts` (GSD-2 path resolution)
- Direct inspection: `/Users/jeremymcspadden/github/gsd-2/dist/resources/extensions/gsd/state.ts` (GSD-2 state derivation)
- Direct inspection: `/Users/jeremymcspadden/Github/track-your-shit/.planning/PROJECT.md` (project requirements and key decisions)

---
*Architecture research for: GSD-2 integration into Track Your Shit (Tauri 2.x)*
*Researched: 2026-03-20*
