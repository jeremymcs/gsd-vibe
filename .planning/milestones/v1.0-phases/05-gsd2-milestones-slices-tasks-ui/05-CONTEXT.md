# Phase 5: GSD-2 Milestones, Slices, and Tasks UI - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the three "coming soon" placeholder divs in `project.tsx` (gsd2-milestones, gsd2-slices, gsd2-tasks tabs) with real data tab components. This requires:
1. TypeScript invoke wrappers in `tauri.ts` for the 5 existing Rust commands
2. React Query hooks in `queries.ts` + query keys in `query-keys.ts`
3. Three new React components: `Gsd2MilestonesTab`, `Gsd2SlicesTab`, `Gsd2TasksTab`
4. Wire up in `project.tsx`

The Rust parsing commands (PARS-01–05) are already implemented and verified in Phase 1. This phase is purely frontend wiring + UI implementation.

</domain>

<decisions>
## Implementation Decisions

### Milestone expand behavior
- Milestones tab uses a **two-level accordion**: click a milestone row → expands inline to show its slices; click a slice row → expands further to show that slice's tasks
- No tab navigation on click — everything drill-downs within the Milestones tab itself
- Slice rows inside an expanded milestone show: slice ID, title, task count (e.g. "3/5 tasks"), done/pending badge
- Task rows inside an expanded slice show: task ID, title, status indicator (see Tasks section below)
- Pattern: same `expandedRows: Set<string>` approach used in Worktrees tab

### Slices tab — grouping
- Slices tab shows slices **grouped by milestone** with collapsible milestone-section headers
- Each milestone section header shows milestone ID + title and is collapsible
- Each slice row shows: slice ID, title, task count, done/pending badge
- Clicking a slice row **expands inline** to show that slice's tasks (same accordion pattern)

### Tasks tab — data strategy and display
- Walk all milestones → fetch each slice via `gsd2_get_slice` to build a complete task list
- Show **active + pending tasks only** (filter out done tasks) — actionable focus
- Group tasks by slice name
- Status indicators: icon + badge
  - Active task: `▶` icon with pulsing amber animation + "Active" badge
  - Pending task: `○` icon (gray) + "Pending" badge
- Consistent with Visualizer node status icons from Phase 4

### Tab differentiation from Visualizer
- **Milestones tab = interactive navigation hub**: drill-down accordion into slices and tasks
- **Visualizer tab = read-only progress overview**: static tree with cost charts and execution timeline
- Different purpose, different interaction model — not redundant

### Empty states
- All three tabs: simple text message when no data
  - Milestones: "No milestones yet — run a GSD-2 session to get started"
  - Slices: "No slices yet — run a GSD-2 session to get started"
  - Tasks: "No active or pending tasks — all done, or no GSD-2 session has run yet"
- Same pattern as Health tab empty state (Phase 2: no skeleton, no hiding the tab, just the message)
- Tabs remain visible even when empty (do NOT hide tabs for GSD-2 projects)

### Loading states
- Skeleton rows while data is fetching — placeholder rows matching the list structure
- Consistent with how other tabs handle loading in the app

### Claude's Discretion
- Exact Tailwind classes for the accordion open/close animation
- Whether slice tasks are loaded eagerly (on milestone expand) or lazily (on slice expand)
- Exact skeleton row count and shape
- Error state copy and styling

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Frontend — Project Page and Tab Structure
- `src/pages/project.tsx` — GSD-2 tab array (lines 247–292); replace "coming soon" placeholders for gsd2-milestones, gsd2-slices, gsd2-tasks
- `src/components/project/gsd2-health-tab.tsx` — Reference for GSD-2 tab component structure and empty state pattern
- `src/components/project/gsd2-worktrees-tab.tsx` — Reference for accordion/expandable row pattern (`expandedRows: Set<string>`) within a GSD-2 tab

### Frontend — Hooks and Queries
- `src/lib/tauri.ts` — invoke wrapper pattern; add `gsd2ListMilestones`, `gsd2GetMilestone`, `gsd2GetSlice`, `gsd2DeriveState`, `gsd2GetRoadmapProgress` wrappers; add TypeScript types for return shapes
- `src/lib/queries.ts` — React Query hook pattern; add `useGsd2Milestones`, `useGsd2Milestone`, `useGsd2Slice`, `useGsd2DerivedState` hooks
- `src/lib/query-keys.ts` — Add `gsd2.milestones(projectId)`, `gsd2.milestone(projectId, milestoneId)`, `gsd2.slice(projectId, sliceId)`, `gsd2.derivedState(projectId)` key factory entries

### Frontend — Existing GSD-1 Milestones Tab (DO NOT modify)
- `src/components/project/gsd-milestones-tab.tsx` — GSD-1 milestones tab; reference for milestone list patterns but do NOT modify this file

### Rust Backend — Commands to Wire
- `src-tauri/src/commands/gsd2.rs` lines ~900–1065 — `gsd2_list_milestones`, `gsd2_get_milestone`, `gsd2_get_slice`, `gsd2_derive_state`, `gsd2_get_roadmap_progress` command signatures and return types

### Requirements
- `.planning/REQUIREMENTS.md` — PARS-01 through PARS-05 (the 5 commands being wired in this phase)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `expandedRows: Set<string>` pattern in `gsd2-worktrees-tab.tsx` — use same approach for two-level accordion state in Milestones tab
- `Badge` component (`src/components/ui/badge.tsx`) — use for done/pending/active status badges
- `gsd2-health-tab.tsx` — empty state pattern: plain message, no skeleton, tab stays visible
- Visualizer node status icons (Phase 4): `▶` amber pulsing (active), `○` gray (pending), `✔` green (done) — reuse same icon pattern in Tasks tab

### Established Patterns
- All GSD-2 Tauri commands: `invoke<T>("gsd2_command_name", { projectId })` in `lib/tauri.ts`, then React Query hook in `lib/queries.ts`
- GSD-2 tab components: file naming `gsd2-{tab-name}-tab.tsx` in `src/components/project/`
- Query key factory: `gsd2.featureName(projectId)` entries in `query-keys.ts`
- Tab registration: add tab object to GSD-2 tabs array in `project.tsx` at the desired index (no structural change needed — just replace placeholder content)

### Integration Points
- `src/pages/project.tsx` — Import and render `Gsd2MilestonesTab`, `Gsd2SlicesTab`, `Gsd2TasksTab` in place of "coming soon" divs (lines 277, 283, 289)
- `src/components/project/index.ts` — Export new tab components
- `src/lib/tauri.ts` — Add 5 invoke wrappers + TypeScript interface types for `Gsd2MilestoneListItem`, `Gsd2MilestoneDetail`, `Gsd2SliceDetail`, `Gsd2DerivedState`
- `src/lib/queries.ts` — Add React Query hooks for the new wrappers
- `src/lib/query-keys.ts` — Add query key entries

</code_context>

<specifics>
## Specific Ideas

- Two-level accordion in Milestones tab: milestone → slices → tasks all within the same tab, no navigation away
- Tasks tab groups active/pending tasks by slice name — slice name acts as a section header
- Active task row gets a pulsing `▶` icon consistent with Phase 4 Visualizer active node styling

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 05-gsd2-milestones-slices-tasks-ui*
*Context gathered: 2026-03-21*
