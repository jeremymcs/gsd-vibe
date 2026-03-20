# Phase 2: Health Widget, Adaptive UI, and Reactive Updates - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Frontend work: add the GSD-2 health widget (new Health sub-tab in the GSD tab group), adapt the GSD tab's sub-tab set based on gsd_version (GSD-2 sees Health/Milestones/Slices/Tasks; GSD-1 sees existing tabs unchanged), and show GSD-1/GSD-2 version badges on project list cards and dashboard. Requires one Rust command (`gsd2_get_health`) and exposing `gsd_version` in `ProjectWithStats`. No new structural GSD-2 parsing — that's Phase 1 (done).

</domain>

<decisions>
## Implementation Decisions

### Health Widget Placement
- New "Health" sub-tab inside the existing GSD tab group (not on Overview tab)
- Health is the FIRST sub-tab and default landing for GSD-2 projects
- Health tab is only visible for GSD-2 projects (`gsd_version === 'gsd2'`) — hidden entirely for GSD-1 projects

### Health Data Display
- Budget displayed as a progress bar with dollar amounts: "spent / ceiling" using the existing `formatCost()` utility
- Blockers displayed as a prominent highlighted row with an alert icon (red/amber style) — row is hidden entirely when no blocker exists
- Empty state when no health data: show message "No health data yet — run a GSD-2 session to populate metrics." (no skeleton, no hiding the tab)

### Adaptive Terminology — GSD-2 vs GSD-1 Sub-tabs
- GSD-2 projects get an entirely different set of sub-tabs — the GSD-1 sub-tabs (Plans, Context, Verification, UAT, Validation, Debug) are hidden entirely
- GSD-2 sub-tab set (in order): Health, Milestones, Slices, Tasks
- GSD-1 sub-tab set: unchanged — Plans, Context, Todos, Validation, UAT, Verification, Milestones, Debug
- `gsd_version` field added to `ProjectWithStats` TypeScript interface and exposed from Rust `get_project` / `get_projects_with_stats` commands — the project page reads `project.gsd_version` to decide which tab set to render

### Version Badges on Project Cards
- Badge goes in the tech stack row alongside framework/language badges (existing Row 4 in project-card.tsx)
- GSD-2 projects show a "GSD-2" badge; GSD-1 projects show a "GSD-1" badge
- Non-GSD projects (`gsd_version === 'none'` or null) show NO badge — clean omission
- Same badge treatment on the dashboard project cards

### Claude's Discretion
- Exact badge color/variant for GSD-1 vs GSD-2 (suggest distinct colors: GSD-2 gets a standout color like subtle-cyan, GSD-1 gets a neutral muted variant)
- Health widget layout details (grid vs stack, exact spacing)
- Env error/warning count display format within the health widget
- ETA display format (relative time vs absolute)
- Active milestone/slice/task display (just IDs or include titles)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Frontend — Project Page and Cards
- `src/pages/project.tsx` — GSD tab structure, TabGroup usage, `hasPlanning` guard pattern, `useGsdFileWatcher` integration
- `src/components/projects/project-card.tsx` — Tech stack row (Row 4) where version badge goes; existing Badge usage
- `src/components/dashboard/project-card.tsx` — Dashboard card for badge placement
- `src/components/project/index.ts` — Existing GSD tab component exports

### Existing Frontend — Hooks and Queries
- `src/hooks/use-gsd-file-watcher.ts` — File watcher hook to extend for `gsd2:file-changed` events
- `src/lib/queries.ts` — React Query hooks pattern; add `useGsd2Health` hook here
- `src/lib/query-keys.ts` — Query key factory; add `gsd2.health(projectId)` key
- `src/lib/tauri.ts` — `ProjectWithStats` interface (add `gsd_version` field); add `gsd2GetHealth` invoke wrapper

### Existing Frontend — UI Primitives
- `src/components/ui/badge.tsx` — Badge component and available variants
- `src/components/ui/progress.tsx` — Progress bar component for budget display
- `src/components/project/git-status-widget.tsx` — Reference for widget card layout style

### Rust Backend
- `src-tauri/src/commands/gsd2.rs` — Phase 1 module; add `gsd2_get_health` command here
- `src-tauri/src/commands/projects.rs` — Where `get_project` and `get_projects_with_stats` live; add `gsd_version` to return types
- `src-tauri/src/db/mod.rs` — `gsd_version` column was added in Phase 1 migration; verify column name

### Requirements
- `.planning/REQUIREMENTS.md` — HLTH-01–04 (health command + widget) and TERM-01–03 (adaptive terminology + badges)

### GSD-2 File Sources for Health Data
- `/Users/jeremymcspadden/github/gsd-2/dist/resources/extensions/gsd/state.ts` — State derivation logic (active milestone/slice/task IDs, blocker field)
- `.gsd/STATE.md` in any GSD-2 project — Frontmatter fields: budget_spent, budget_ceiling, active_milestone, active_slice, active_task, blocker, eta, phase
- `.gsd/metrics.json` in any GSD-2 project — Budget spent/ceiling values

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Badge` component (`src/components/ui/badge.tsx`) — Already used in project-card.tsx for tech stack badges; use same variants
- `Progress` component (`src/components/ui/progress.tsx`) — Use for budget progress bar in health widget
- `formatCost()` in `src/lib/utils.ts` — Already formats dollar amounts; use for budget display
- `formatRelativeTime()` in `src/lib/utils.ts` — Use for ETA display
- `TabGroup` component used in `src/pages/project.tsx` — Pattern for the GSD-2 sub-tab set (same as GSD-1 tab group)
- `use-gsd-file-watcher.ts` — Already listens to `gsd:file-changed`; extend to also handle `gsd2:file-changed` for health refresh
- `git-status-widget.tsx` — Reference layout for a health-style info card with multiple data rows

### Established Patterns
- All Tauri commands: `invoke<T>("command_name", { args })` in `lib/tauri.ts`, then React Query hook in `lib/queries.ts`
- File watcher integration: `useGsdFileWatcher(id, path, condition, callback)` → `queryClient.invalidateQueries()`
- Conditional tab rendering: `hasPlanning &&` guard in project.tsx — use same pattern for `gsd_version === 'gsd2'` guard on Health tab
- Badge in tech stack row: look at Row 4 in project-card.tsx for exact placement insertion point

### Integration Points
- `src/pages/project.tsx` — Two changes: (1) read `project.gsd_version` to swap tab sets, (2) add Health tab component
- `src/components/projects/project-card.tsx` and `src/components/dashboard/project-card.tsx` — Add version badge in tech stack row
- `src/lib/tauri.ts` — Add `gsd_version: string | null` to `ProjectWithStats`, add `gsd2GetHealth` wrapper
- `src-tauri/src/commands/gsd2.rs` — Add `gsd2_get_health` command
- `src-tauri/src/commands/projects.rs` — Expose `gsd_version` in the project query responses

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-health-widget-adaptive-ui-and-reactive-updates*
*Context gathered: 2026-03-20*
