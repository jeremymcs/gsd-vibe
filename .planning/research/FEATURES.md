# Feature Research
// Track Your Shit - GSD-2 Integration Feature Landscape
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

**Domain:** Desktop project management app — GSD-2 workflow integration (brownfield)
**Researched:** 2026-03-20
**Confidence:** HIGH — based on direct reading of GSD-2 source (health-widget-core.ts, visualizer-data.ts, worktree-manager.ts, headless-query.ts) and existing app source (gsd.rs, tauri.ts, component files)

---

## Context: What Already Exists (GSD-1)

The app has a fully built GSD-1 integration including:
- `.planning/` file parsing in Rust (`gsd.rs`)
- Tauri commands: `gsd_get_state`, `gsd_list_milestones`, `gsd_list_plans`, `gsd_list_requirements`, `gsd_list_todos`, `gsd_list_summaries`, `gsd_list_debug_sessions`, `gsd_list_validations`, `gsd_list_uat_results`, and more
- UI tabs: Plans, Context, Verification, UAT, Milestones, Debug, Validation
- TanStack Query hooks wrapping all invocations

GSD-2 adds a new `.gsd/` directory structure (milestones → slices → tasks), health widget data, worktrees, visualizer/metrics data, and headless mode. Everything below assumes GSD-1 must continue working unchanged.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that make GSD-2 support feel real and complete. Missing any of these means the GSD-2 project tab feels broken or confusing.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **GSD version detection per project** | Without this, nothing else works — can't show right data or terminology | LOW | Check `.gsd/` dir presence; `.planning/` fallback. Result: `"gsd2" \| "gsd1" \| "none"`. New Rust helper, called on project load. |
| **Adaptive UI terminology** | GSD-2 users see Milestone/Slice/Task; GSD-1 users see Phase/Plan/Task. Mixing them confuses both user groups. | LOW | Version flag propagated to all GSD tab components. Mostly a React context/prop change, not new data loading. |
| **Milestone list with status** | Users need to see the M001/M002/... list, which is active, which is complete. GSD-1 already shows phases — GSD-2 needs its equivalent. | MEDIUM | Parse `.gsd/milestones/` directory, read `STATE.md` or `M001-ROADMAP.md` frontmatter for status. New Rust command `gsd2_list_milestones`. |
| **Active slice and task display** | The current execution unit (which slice, which task) is the primary status users check. They expect to see it immediately. | MEDIUM | Read from `.gsd/STATE.md` (active milestone/slice/task fields). Shown in project header / overview tab. |
| **GSD-2 progress counters (M/S/T)** | Users need M 2/5 · S 3/12 · T 1/4 style progress. This is the core health widget data and the first thing users look for. | LOW | Derived from milestone/slice/task counts parsed during state read. Maps to `GSDState.progress` in `HealthWidgetData`. |
| **Budget/cost display** | Users spending API credits need to see `budgetSpent / budgetCeiling` and the percentage. The health widget in GSD-2 always shows this. | MEDIUM | Read from metrics ledger (`.gsd/metrics.json` or similar). `budgetSpent` is aggregated from `UnitMetrics.cost`. `budgetCeiling` from GSD preferences file. |
| **Environment error/warning counts** | GSD-2 health widget shows env issue counts as a first-class signal. Users need to know if their environment is broken before spending time debugging LLM output. | MEDIUM | Run environment checks against `.gsd/` (equivalent of `runEnvironmentChecks(basePath)`). Requires Rust to either run `gsd headless query` or parse check results from files. |
| **Worktree list** | Users working with worktrees need to see what's active. GSD-2 creates worktrees under `.gsd/worktrees/<name>/`. Not showing them means users lose track of parallel work. | MEDIUM | `listWorktrees()` equivalent in Rust: scan `.gsd/worktrees/`, cross-reference with `git worktree list` output. New Rust command `gsd2_list_worktrees`. |
| **Worktree remove action** | Users need to clean up finished worktrees. Remove without branch delete is a footgun; with it is correct 95% of the time. | MEDIUM | Rust: `git worktree remove` + `git branch -D worktree/<name>`. New command `gsd2_remove_worktree`. Requires confirmation dialog in UI. |
| **Headless query (read-only snapshot)** | `gsd headless query` is a ~50ms read that returns `{ state, next, cost }` JSON without spawning an LLM. The app should be able to poll this to stay current. | MEDIUM | Rust spawns `gsd headless query` in the project dir, captures stdout, parses JSON. `QuerySnapshot` type mirrors the gsd-2 output. New command `gsd2_headless_query`. |
| **Headless session start/stop** | Users explicitly want to start and stop `gsd headless` sessions from the app. This is the main control surface for GSD-2 automation. | HIGH | Rust spawns `gsd headless` as a child process (like existing PTY), streams events, and provides a stop handle. New Rust PTY-style command module. Needs PID tracking and process cleanup. |
| **GSD-2 blocker display** | Blockers in GSD-2 come from `GSDState.nextAction` when phase is not `complete`, and from `HealthWidgetData.blocker`. Users are blocked until they see and clear these. | LOW | Parsed during state read. Surface in health panel alongside progress counters. |
| **Next action indicator** | After every completed unit, `gsd headless query` tells you `next.action` and what it would dispatch. The app should surface this so users understand what the automation will do next. | LOW | Comes from `QuerySnapshot.next`. Show in headless session panel or health widget. |

### Differentiators (Competitive Advantage)

Features that go beyond what any terminal workflow provides and make TYS meaningfully better than running `gsd` directly.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Visual progress tree (Milestone → Slice → Task)** | The `VisualizerData` structure provides the full tree with status, risk, and dependencies. Showing this graphically is something no terminal tool does. Users can see the entire project shape at a glance. | HIGH | New tab ("Visualizer") backed by `gsd2_load_visualizer_data` Rust command. Reads roadmap + plan files, aggregates. The `VisualizerMilestone[]` structure is the tree. |
| **Critical path highlighting** | `computeCriticalPath()` identifies which milestones and slices are on the critical path (zero slack). Highlighting these helps users prioritize. | HIGH | Requires visualizer data to be loaded first. Critical path is `CriticalPathInfo.milestonePath[]` and `slicePath[]`. Display as colored overlay on the tree. |
| **Cost/token metrics by phase and model** | `byPhase`, `bySlice`, `byModel` aggregates give users per-unit cost breakdowns. No terminal dashboard shows this clearly. | MEDIUM | Part of visualizer data load. Table/chart component showing `PhaseAggregate[]` and `ModelAggregate[]`. Answers "which slice cost the most?" |
| **Tier savings display** | GSD-2 tracks token tier usage and computes savings from using smaller models. `tierSavingsLine` is a one-liner. Surfaces the value of the tiered model approach. | LOW | Comes from `formatTierSavings(units)` in the ledger. A single badge or line in the metrics tab. |
| **Agent activity live indicator** | `AgentActivityInfo` exposes whether a unit is actively running, elapsed time, completion rate, and session cost. A live indicator in the project header beats polling the terminal. | MEDIUM | Requires polling `gsd2_headless_query` on a short interval (~5s when active). Feed into a status badge (e.g., "Running: T02 — 3m 12s"). |
| **Worktree diff summary** | Before removing a worktree, show the user which `.gsd/` files changed and what the line stats look like (`WorktreeDiffSummary` + `FileLineStat[]`). Prevents accidental loss of work. | MEDIUM | Rust calls `git diff --name-status` and `git diff --numstat` between worktree branch and main. New command `gsd2_diff_worktree`. |
| **Knowledge base viewer for KNOWLEDGE.md** | GSD-2 maintains a structured `KNOWLEDGE.md` with rules, patterns, and lessons. The app already has a knowledge browser — adding `.gsd/KNOWLEDGE.md` as a source brings it current. | LOW | `KnowledgeInfo` struct already has `rules[]`, `patterns[]`, `lessons[]`. Rust parses the markdown table format. Reuse existing knowledge viewer component. |
| **Changelog tab (slice completions)** | `ChangelogInfo.entries[]` is a list of completed slices with one-liners, files modified, and completion timestamps. A timeline of what got done beats grepping git logs. | MEDIUM | New "Changelog" section in GSD-2 visualizer tab or standalone tab. Backed by parsing `SUMMARY.md` files per completed slice. |
| **Slice verification details** | `SliceVerification` captures `verificationResult`, `keyDecisions[]`, `patternsEstablished[]`, `provides[]`, `requires[]`. Showing this helps users audit quality of completed work. | MEDIUM | Nested under the changelog or slice detail. Parsed from SUMMARY.md frontmatter. |
| **Discussion state tracking** | `VisualizerDiscussionState` shows whether each milestone's CONTEXT.md is `undiscussed`, `draft`, or `discussed`. Users planning next milestones need to know which ones are ready. | LOW | Simple badge overlay on the milestone list. Derived from file presence: `CONTEXT.md` exists = discussed, `CONTEXT-DRAFT.md` exists = draft, neither = undiscussed. |
| **Worker cost summary** | `QuerySnapshot.cost.workers[]` shows per-worker (parallel milestone) costs. When running parallel milestones, this is the only way to see per-stream spend. | LOW | Shown in headless session panel. Small table with milestoneId, state, cost per worker. |
| **Provider health status** | `HealthInfo.providers[]` shows which LLM providers are configured and whether they have issues (auth.json check only, no network calls). Surface this in the health panel. | LOW | Display as small icon grid (green/red per provider). Comes from `ProviderStatusSummary[]`. |
| **Skill health summary** | `SkillSummaryInfo` reports total skills, warnings, and criticals with a `topIssue` string. Surfacing this prevents users from running expensive sessions with broken skill configs. | LOW | One line in the health panel: "Skills: 12 total, 1 critical — [topIssue]". |

### Anti-Features (Deliberately NOT Building)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **LLM orchestration inside TYS** | "Why can't TYS just run the Claude sessions directly?" | TYS is a monitor/controller, not an LLM runtime. Building this would duplicate gsd-2's entire execution engine and create a maintenance nightmare. Scope creep that never stabilizes. | TYS starts/stops `gsd headless` as a subprocess and streams output. LLM work stays in gsd. |
| **Migration wizard (.planning/ → .gsd/)** | Users want to migrate old projects in-app | Migration is a one-time operation that touches project structure. Getting it wrong corrupts projects. This is gsd-2's responsibility to own and test. | Link to `gsd migrate` CLI command in docs or notification. |
| **Real-time file watching for every GSD file** | Seems natural for an always-fresh UI | `.gsd/` has dozens of files that update frequently during active sessions. Watching all of them creates excessive OS watcher overhead and React re-render storms. | Poll via `gsd2_headless_query` (50ms, no LLM) on a 5s interval when a session is active. Watch only STATE.md for change detection. |
| **Worktree merge UI** | Users want to merge worktrees from TYS | Merging `.gsd/` artifacts requires LLM-guided reconciliation (the gsd-2 merge flow). Building this in TYS means re-implementing the merge dispatch, conflict detection, and LLM prompt chain. | Show the merge command to run in terminal (`git worktree merge` or equivalent gsd command). TYS shows diff preview; user runs merge in terminal. |
| **Extension marketplace / registry management** | Power users want to manage gsd-2 extensions from TYS | Extensions are gsd-2 internals. TYS does not import the gsd-2 npm package and has no visibility into extension state. Building this creates a hard dependency on gsd-2 internals. | Not in scope. Extensions managed via gsd CLI. |
| **Snapshot diff between gsd versions** | "Show me what changed between GSD-1 and GSD-2 structure" | Only relevant at migration time; unnecessary complexity for ongoing use. | One-time documentation note in the UI explaining the structure change. |
| **cmux process management** | GSD-2 uses cmux for terminal multiplexing internally | cmux is a gsd-2 internal detail not exposed as a public API. TYS already has PTY/tmux integration — duplicating this for cmux adds a second code path. | TYS uses its own PTY/tmux integration. Headless mode is process-level only. |

---

## Feature Dependencies

```
GSD Version Detection (per project)
    └──required by──> ALL GSD-2 features (nothing else can render without knowing the version)
    └──required by──> Adaptive UI Terminology

GSD-2 State Read (STATE.md + milestones/)
    └──required by──> Active Slice/Task Display
    └──required by──> Progress Counters (M/S/T)
    └──required by──> GSD-2 Blocker Display
    └──required by──> Next Action Indicator

Metrics Ledger Read (.gsd/metrics.json)
    └──required by──> Budget/Cost Display
    └──required by──> Cost/Token Metrics by Phase and Model
    └──required by──> Tier Savings Display
    └──required by──> Agent Activity Live Indicator

Headless Query Command (gsd2_headless_query)
    └──required by──> Agent Activity Live Indicator (polling)
    └──required by──> Worker Cost Summary
    └──required by──> Next Action Indicator (live refresh)

Headless Session Start/Stop
    └──requires──> Headless Query Command (to monitor state while running)

Visualizer Data Load (milestones + slices + tasks + metrics)
    └──requires──> GSD-2 State Read
    └──requires──> Metrics Ledger Read
    └──required by──> Visual Progress Tree
    └──required by──> Critical Path Highlighting
    └──required by──> Changelog Tab
    └──required by──> Slice Verification Details
    └──required by──> Discussion State Tracking

Worktree List (gsd2_list_worktrees)
    └──required by──> Worktree Remove Action
    └──required by──> Worktree Diff Summary
```

### Dependency Notes

- **Version detection is the root dependency.** It must be implemented before any GSD-2 feature can render. A single Rust function that checks `.gsd/` presence and returns a version enum is the minimal first step.
- **GSD-2 state read is the second dependency.** Most UI features — progress, active status, blockers, next action — come from a single `gsd2_get_state` command that reads `STATE.md` and milestone directories. Build this before the health widget or visualizer.
- **Headless query is independent of headless session start.** The query is read-only (~50ms) and should be buildable and testable before implementing the full session lifecycle.
- **Visualizer data depends on both state and metrics.** Don't start the visualizer tab until the state read and metrics ledger commands are stable. The visualizer aggregates everything; it is the last major data command to build.
- **Worktree operations are independent.** They only need git commands and directory checks — no dependency on health widget or visualizer data.

---

## MVP Definition

### Launch With (this milestone)

The features that make GSD-2 support functional for daily use.

- [ ] **GSD version detection** — root dependency; nothing else works without it
- [ ] **Adaptive UI terminology** — GSD-2 users must not see Phase/Plan language
- [ ] **GSD-2 milestone list with status** — replaces GSD-1 milestones tab
- [ ] **Active slice and task display** — primary status check in project header/overview
- [ ] **Progress counters (M/S/T)** — equivalent of GSD-1 roadmap progress bar
- [ ] **Budget/cost display** — low-complexity, high-value; most users have a budget ceiling set
- [ ] **Blocker display** — critical for unblocking stuck sessions
- [ ] **Worktree list** — users with active worktrees need visibility
- [ ] **Worktree remove action** — without remove, the list is read-only and not actionable
- [ ] **Headless query (poll snapshot)** — enables live refresh of all status data
- [ ] **Headless session start/stop** — the primary control users asked for

### Add After Core Is Working (v1.x)

- [ ] **Visual progress tree** — valuable but requires stable visualizer data load first
- [ ] **Cost/token metrics by phase and model** — add to visualizer tab once tree is working
- [ ] **Agent activity live indicator** — needs headless query polling stable first
- [ ] **Changelog tab** — requires SUMMARY.md parsing per completed slice
- [ ] **Worktree diff summary** — nice guard before remove; add after remove is working
- [ ] **Discussion state tracking** — low complexity; add to milestone list as a badge overlay
- [ ] **Knowledge base viewer (KNOWLEDGE.md)** — reuse existing knowledge component, low risk

### Future Consideration (v2+)

- [ ] **Critical path highlighting** — requires visual tree first; complex DAG rendering
- [ ] **Slice verification details** — deep audit feature; useful but not daily-use
- [ ] **Provider health status** — useful, but env checks are expensive without a dedicated cache
- [ ] **Skill health summary** — niche; only relevant for users with custom skill configs
- [ ] **Worker cost summary (per parallel worker)** — only relevant for parallel milestone users (power users)
- [ ] **Tier savings display** — cosmetic; useful data but not decision-driving

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| GSD version detection | HIGH | LOW | P1 |
| Adaptive terminology | HIGH | LOW | P1 |
| GSD-2 milestone list | HIGH | MEDIUM | P1 |
| Active slice/task display | HIGH | LOW | P1 |
| Progress counters (M/S/T) | HIGH | LOW | P1 |
| Budget/cost display | HIGH | MEDIUM | P1 |
| Blocker display | HIGH | LOW | P1 |
| Headless query | HIGH | MEDIUM | P1 |
| Headless session start/stop | HIGH | HIGH | P1 |
| Worktree list | MEDIUM | MEDIUM | P1 |
| Worktree remove action | MEDIUM | MEDIUM | P1 |
| Visual progress tree | HIGH | HIGH | P2 |
| Cost/token metrics | MEDIUM | MEDIUM | P2 |
| Agent activity indicator | MEDIUM | MEDIUM | P2 |
| Changelog tab | MEDIUM | MEDIUM | P2 |
| Worktree diff summary | MEDIUM | MEDIUM | P2 |
| Discussion state | LOW | LOW | P2 |
| Knowledge base (KNOWLEDGE.md) | LOW | LOW | P2 |
| Critical path highlighting | MEDIUM | HIGH | P3 |
| Slice verification details | LOW | MEDIUM | P3 |
| Provider health status | LOW | LOW | P3 |
| Skill health summary | LOW | LOW | P3 |
| Worker cost summary | LOW | LOW | P3 |
| Tier savings display | LOW | LOW | P3 |

**Priority key:**
- P1: Must have for this milestone to be useful
- P2: Should have, add in this milestone if capacity allows
- P3: Defer to next milestone

---

## Implementation Notes by Feature Group

### Group 1: Foundation (build first)
These are pure Rust additions with no new UI — they unlock everything else.
1. `gsd2_detect_version(projectId)` — returns `"gsd2" | "gsd1" | "none"` based on directory presence
2. `gsd2_get_state(projectId)` — reads STATE.md + milestone directories, returns active M/S/T, progress counts, blockers, next action
3. Version flag stored in project context (React) and threaded to all GSD tab renders

### Group 2: Health Widget (second)
The health panel is a dense summary view. Build after state read is working.
- `gsd2_get_health(projectId)` — budget spent/ceiling from metrics ledger, env error/warning counts, provider status
- New "Health" section in project overview (or replace existing GSD state card)

### Group 3: Worktrees (parallel with health)
Independent of metrics. Only needs git + directory access.
- `gsd2_list_worktrees(projectId)` — scan `.gsd/worktrees/`, cross-ref `git worktree list`
- `gsd2_remove_worktree(projectId, name)` — `git worktree remove` + branch delete
- New "Worktrees" tab or panel in project detail

### Group 4: Headless Control (third)
Builds on state read for monitoring.
- `gsd2_headless_query(projectId)` — spawn `gsd headless query`, parse JSON stdout
- `gsd2_headless_start(projectId)` — spawn `gsd headless` as child process, return session handle
- `gsd2_headless_stop(projectId)` — send SIGTERM or close stdin of headless process
- New "Headless" tab or control surface in project detail

### Group 5: Visualizer (last — most complex)
Requires state + metrics stable. New dedicated tab.
- `gsd2_load_visualizer(projectId)` — aggregates milestone tree, metrics, changelog, verifications, knowledge, discussion state
- New "Visualizer" tab with milestone tree, cost charts, changelog section

---

## Sources

- `/Users/jeremymcspadden/github/gsd-2/dist/resources/extensions/gsd/health-widget-core.ts` — `HealthWidgetData` interface, `detectHealthWidgetProjectState()`, `buildHealthLines()`
- `/Users/jeremymcspadden/github/gsd-2/dist/resources/extensions/gsd/visualizer-data.ts` — `VisualizerData`, `VisualizerMilestone`, `VisualizerSlice`, `VisualizerTask`, `CriticalPathInfo`, `AgentActivityInfo`, `ChangelogInfo`, `KnowledgeInfo`, `HealthInfo`, `CapturesInfo`
- `/Users/jeremymcspadden/github/gsd-2/dist/resources/extensions/gsd/worktree-manager.ts` — `WorktreeInfo`, `WorktreeDiffSummary`, `FileLineStat`, `createWorktree()`, `listWorktrees()`, `removeWorktree()`, `diffWorktreeGSD()`, `diffWorktreeNumstat()`
- `/Users/jeremymcspadden/github/gsd-2/src/headless-query.ts` — `QuerySnapshot`, `handleQuery()`, `{ state, next, cost }` output format
- `/Users/jeremymcspadden/Github/track-your-shit/.planning/PROJECT.md` — milestone requirements and out-of-scope decisions
- `/Users/jeremymcspadden/Github/track-your-shit/src-tauri/src/commands/gsd.rs` — existing GSD-1 command surface
- `/Users/jeremymcspadden/Github/track-your-shit/src/lib/tauri.ts` — existing invoke wrappers and GSD-1 type definitions

---
*Feature research for: GSD-2 integration in a Tauri desktop app (brownfield)*
*Researched: 2026-03-20*
