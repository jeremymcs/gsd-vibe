# Phase 4: Headless Mode and Visualizer - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Two new GSD-2 sub-tabs on the project detail page:
1. **Headless tab** — Start/stop `gsd headless` PTY sessions, stream and parse JSON output, show a pinned last-snapshot card with `{ state, next, cost }`, manage session lifecycle across navigation
2. **Visualizer tab** — Read `.gsd/` files to render a milestone → slice → task progress tree, horizontal bar charts for cost/token metrics by milestone and by model, and a chronological execution timeline

GSD-1 projects are unaffected. No LLM orchestration — TYS monitors and controls only.

</domain>

<decisions>
## Implementation Decisions

### Tab Ordering
- Updated GSD-2 sub-tab order: **Health | Headless | Worktrees | Visualizer | Milestones | Slices | Tasks**
- Headless at position 2 (primary control surface), Visualizer at position 4 (follows the tree data tabs)
- Both tabs are always visible for GSD-2 projects — not conditional

### Headless — Output Display
- Structured log view, not raw text or xterm.js terminal
- Each JSON line from `gsd headless` is parsed and rendered as a formatted row:
  `[HH:MM:SS]  {state-string}    +${cost-delta}`
- Only `state` and cost delta shown per row — `next` field surfaced in the pinned snapshot card above, not per-line (reduces noise)
- A pinned snapshot card sits above the scrolling log, always showing the latest `{ state, next, cost }` from the most recent `gsd headless query` or streamed output
- Log auto-scrolls to bottom as new output arrives (no smart-scroll — always follow tail)

### Headless — Session Lifecycle
- Sessions run in the background when navigating away from the Headless tab or to a different project
- PTY session keeps running; output buffers and is visible when returning to the tab
- Status indicator: color dot + label inline next to Start/Stop controls
  - ● Idle (gray)
  - ● Running (green, pulsing animation)
  - ● Complete (green, solid)
  - ● Failed (red)
  - Shows cost so far when running; last-run time when idle/complete
- **Stop action**: Send SIGINT to PTY process → wait up to 5s for clean exit (gsd releases auto.lock itself) → SIGKILL if still running (HDLS-03)
- **App close**: Brief "Stopping headless sessions…" inline notice (no dialog), SIGINT all running sessions, wait briefly, then quit. The existing `use-close-warning.ts` hook handles this — extend it

### Headless — Session Registry
- `HeadlessSessionRegistry` tracks session ID → project ID mapping for all active sessions
- Ensures all sessions cleaned up on app close (HDLS-05)
- One session per project at a time (no concurrent multi-headless — that's v2 HDLS-07)

### Visualizer — Layout
- Single scrollable page, stacked vertically:
  1. **Progress Tree** (top) — collapsible milestone nodes, icon + color status per node
  2. **Cost & Tokens** (middle) — horizontal bar charts, no external chart library (CSS-only Tailwind divs)
  3. **Execution Timeline** (bottom) — chronological list of completed slices/tasks with timestamps and cost
- No sub-tabs within the Visualizer tab

### Visualizer — Progress Tree
- Milestone nodes are **collapsible** by default (collapsed), with the active milestone auto-expanded on load
- Node status icons: ✔ green (done), ▶ amber/yellow with pulse (active), ○ gray (pending)
- Three-level hierarchy: Milestone → Slice → Task
- Clicking a milestone header expands/collapses its children

### Visualizer — Cost Metrics
- **Horizontal bar charts** using pure CSS/Tailwind (no recharts, no chart.js — avoids new dependencies)
- Two bar charts side by side or stacked:
  - "By Milestone": M001 ■■■■■■■■■■ $0.12, M002 ■■■■ $0.05, …
  - "By Model": claude-opus ■■■■■■■■ $0.11, claude-sonnet ■■■■■ $0.07, …
- Dollar amounts shown as formatted labels (reuse existing `formatCost()`)

### Claude's Discretion
- Exact Tailwind classes for the pulsing active-state animation
- Whether `HeadlessSessionRegistry` lives in gsd2.rs or a new `headless.rs` sub-module
- Exact layout of the pinned snapshot card (card variant, field arrangement)
- How to handle the Visualizer empty state when no `.gsd/` metrics exist yet
- Execution timeline entry format (relative vs absolute time display)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Frontend — Project Page and Tab Structure
- `src/pages/project.tsx` — GSD-2 tab array (currently: Health, Worktrees, Milestones, Slices, Tasks); insert Headless at index 1, Visualizer at index 3
- `src/components/project/gsd2-health-tab.tsx` — Reference for a GSD-2 tab component structure (pinned card + content body pattern)
- `src/components/project/gsd2-worktrees-tab.tsx` — Reference for accordion/expandable list pattern within a GSD-2 tab

### Frontend — PTY/Terminal Integration
- `src/hooks/use-pty-session.ts` — Existing PTY session hook; understand its API before building headless session hook
- `src-tauri/src/pty/mod.rs` — `TerminalManager` API: `create_session`, `close`, `close_all`, `write`, `list_sessions`; emits `pty:output:{id}` events
- `src-tauri/src/commands/pty.rs` — Existing PTY Tauri commands; headless commands follow same pattern
- `src/hooks/use-close-warning.ts` — App-close cleanup hook; extend to stop headless sessions

### Frontend — Reusable UI
- `src/lib/tauri.ts` — invoke wrapper pattern; add headless and visualizer wrappers here
- `src/lib/queries.ts` — React Query hook pattern; add `useGsd2HeadlessSession`, `useGsd2HeadlessQuery`, `useGsd2VisualizerData`
- `src/lib/query-keys.ts` — Add `gsd2.headless(projectId)`, `gsd2.visualizerData(projectId)` key factory entries
- `src/lib/utils.ts` — `formatCost()` and `formatRelativeTime()` utilities for display

### Rust Backend
- `src-tauri/src/commands/gsd2.rs` — Add `gsd2_headless_query`, `gsd2_headless_start`, `gsd2_headless_stop`, `gsd2_get_visualizer_data` commands here
- `src-tauri/src/lib.rs` — Register new commands in invoke_handler! macro
- `src-tauri/src/pty/mod.rs` — `TerminalManagerState` type alias; reuse for headless session management

### Requirements
- `.planning/REQUIREMENTS.md` — HDLS-01 through HDLS-06 (headless) and VIZ-01 through VIZ-04 (visualizer) — all in scope for this phase

### GSD-2 File Sources for Visualizer Data
- `.gsd/STATE.md` in any GSD-2 project — active milestone/slice/task, phase, blocker
- `.gsd/milestones/M001/M001-ROADMAP.md` — milestone done/active/pending status
- `.gsd/milestones/M001/slices/S01-PLAN.md` — slice-level status and timestamps
- `src-tauri/src/commands/gsd2.rs` lines ~200–360 — existing `gsd2_get_health` parsing of STATE.md; reuse pattern for visualizer data

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `TerminalManager` (`src-tauri/src/pty/mod.rs`) — `create_session(session_id, working_dir, command, cols, rows)` + `close(session_id)` + `close_all()`. Headless uses the same PTY infrastructure — no new process management needed.
- `use-pty-session.ts` — Hook for subscribing to `pty:output:{id}` events. Headless will need a lighter version (parse JSON lines instead of terminal output).
- `use-close-warning.ts` — Existing app-close hook; extend its cleanup callback to call `gsd2_headless_stop` on all active sessions.
- `formatCost()` in `src/lib/utils.ts` — Already formats dollar amounts; use for cost delta per log row and bar chart labels.
- `Gsd2HealthTab` — Pattern for a tab with a pinned info card (snapshot) + scrollable body (log). Headless tab follows the same layout shape.

### Established Patterns
- PTY events: `pty:output:{sessionId}` events stream raw bytes; frontend listens via Tauri event system
- Tauri IPC: `invoke<T>("gsd2_command", { projectId })` → React Query hook → component
- GSD-2 tab insertion: add tab object to the tabs array in `project.tsx` at the desired index
- Rust command pattern: `#[tauri::command] async fn gsd2_*(project_id: i64, pool: State<Arc<DbPool>>, ...) -> Result<T, String>`
- CSS-only progress bars: `<div style={{ width: \`${pct}%\` }} className="h-2 bg-primary rounded" />` — no chart library needed

### Integration Points
- `src/pages/project.tsx` — Insert `Gsd2HeadlessTab` at index 1, `Gsd2VisualizerTab` at index 3 in GSD-2 tabs array
- `src-tauri/src/commands/gsd2.rs` — Four new commands: `gsd2_headless_query`, `gsd2_headless_start`, `gsd2_headless_stop`, `gsd2_get_visualizer_data`
- `src-tauri/src/lib.rs` — Register all new commands in invoke_handler!
- `src/lib/tauri.ts` — TypeScript types (`HeadlessSnapshot`, `HeadlessSession`, `VisualizerData`) + invoke wrappers
- `src-tauri/src/pty/mod.rs` or new `headless.rs` — `HeadlessSessionRegistry` for tracking active sessions by project ID

</code_context>

<specifics>
## Specific Ideas

- Structured log row format: `[HH:MM:SS]  {state}    +$X.XXX` — timestamp left-aligned, state string in the middle, cost delta right-aligned
- Pinned snapshot card shows `state / next / cost` as three clearly labeled fields — cost is the running total, not delta
- Active milestone auto-expands in the tree on tab load; all others start collapsed
- Bar chart uses `formatCost()` for labels; bar width is relative to the max cost in the group (not absolute scale)

</specifics>

<deferred>
## Deferred Ideas

- Multiple concurrent headless sessions (parallel milestone dashboard) — v2 requirement HDLS-07
- Critical path highlighting in the progress tree — v2 requirement VIZ-05
- Pending captures count badge in the visualizer header — v2 requirement VIZ-06

</deferred>

---

*Phase: 04-headless-mode-and-visualizer*
*Context gathered: 2026-03-21*
