# Phase 6: Reactive Updates and Headless Session Polish - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Three focused gap-closure fixes:
1. `use-gsd-file-watcher.ts` — add Worktrees and Visualizer query invalidation to the `gsd2:file-changed` handler (currently only invalidates `gsd2Health`)
2. `useHeadlessSession` — lift from tab level to `project.tsx` so log rows survive tab navigation
3. Documentation — update ROADMAP.md Phase 1 progress table and add `requirements-completed` frontmatter to two SUMMARY files (02-01 and 03-01)

No new Rust commands, no new query keys, no new React Query hooks required.

</domain>

<decisions>
## Implementation Decisions

### Reactive invalidation behavior
- When `gsd2:file-changed` fires, invalidate **all three** GSD-2 reactive queries immediately (no debounce): `gsd2Health`, `gsd2Worktrees`, `gsd2VisualizerData`
- Invalidation is immediate — same timing as the existing Health invalidation, not batched with the 500ms debounce used for GSD-1 events
- All `.gsd/` file changes trigger both Worktrees and Visualizer invalidation regardless of which specific file changed — simple rule, false positives are harmless refetches

### Log persistence strategy
- `useHeadlessSession` hook is **lifted to `project.tsx`** (page level), alongside `useGsdFileWatcher`
- `Gsd2HeadlessTab` receives the session object as props (consistent with how the file watcher is already passed down)
- No new React Context provider — props drilling is sufficient and matches existing page-level state patterns
- Log buffer is **bounded at 500 rows** — oldest rows drop off when the cap is exceeded, preventing memory growth in long sessions
- When returning to the Headless tab after navigating away: show **all buffered rows** and auto-scroll to the bottom — same experience as if the user never left

### Claude's Discretion
- Exact props interface for `Gsd2HeadlessTab` (which fields of the session object to thread through)
- Exact SUMMARY frontmatter field name (`requirements-completed: true` vs `requirements_completed: true`) — match existing frontmatter conventions in those files
- Exact ROADMAP.md Phase 1 table content — derive from actual Phase 1 completion data

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### File Watcher (reactive invalidation fix)
- `src/hooks/use-gsd-file-watcher.ts` — Current implementation; `gsd2:file-changed` listener at line ~104 only invalidates `gsd2Health`; add `gsd2Worktrees` and `gsd2VisualizerData` here
- `src/lib/query-keys.ts` lines 103–107 — `gsd2Health`, `gsd2Worktrees`, `gsd2VisualizerData` query key factory entries

### Headless log persistence fix
- `src/hooks/use-headless-session.ts` — Hook to be lifted; currently owns `logs[]` state in local useState; no changes to hook internals
- `src/pages/project.tsx` — Page where hook must be lifted to; already owns `useGsdFileWatcher`; add `useHeadlessSession` call here
- `src/components/project/gsd2-headless-tab.tsx` — Tab that currently calls `useHeadlessSession` internally; refactor to accept session via props

### Documentation fixes
- `.planning/ROADMAP.md` — Phase 1 progress table needs to be updated to reflect actual completion
- `.planning/phases/02-health-widget-adaptive-ui-and-reactive-updates/02-01-SUMMARY.md` — Needs `requirements-completed` frontmatter field
- `.planning/phases/03-worktrees-panel/03-01-SUMMARY.md` — Needs `requirements-completed` frontmatter field

### Research
- `.planning/phases/06-reactive-updates-and-headless-polish/06-RESEARCH.md` — Full architecture analysis; section "Primary recommendation" and "Headless Log Persistence" subsections are most relevant for implementation

### UI Design Contract
- `.planning/phases/06-reactive-updates-and-headless-polish/06-UI-SPEC.md` — Approved design contract; spacing, typography, color, and component specs for any UI changes in this phase

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `use-gsd-file-watcher.ts` — `gsd2:file-changed` listener already set up at ~line 104; add two `invalidateQueries` calls alongside the existing Health invalidation
- `queryKeys.gsd2Worktrees(projectId)` and `queryKeys.gsd2VisualizerData(projectId)` — already defined in `query-keys.ts`, ready to use
- `useHeadlessSession` return type `UseHeadlessSessionReturn` — already exported; use as prop type for `Gsd2HeadlessTab`

### Established Patterns
- Page-level hook ownership: `project.tsx` already owns `useGsdFileWatcher` and passes `enabled` + callbacks down — same pattern for `useHeadlessSession`
- 500-row circular buffer: implement with `setLogs(prev => [...prev.slice(-499), newRow])` in the hook's log accumulator
- Props-first tab components: all other GSD-2 tab components (`Gsd2HealthTab`, `Gsd2WorktreesTab`) receive `projectId` as prop; `Gsd2HeadlessTab` will additionally receive `session: UseHeadlessSessionReturn`

### Integration Points
- `src/pages/project.tsx` — Add `useHeadlessSession()` call; pass result as `session={headlessSession}` prop to `<Gsd2HeadlessTab>`
- `src/hooks/use-gsd-file-watcher.ts` line ~107 — Add two lines after the existing `gsd2Health` invalidation
- `src/components/project/gsd2-headless-tab.tsx` — Remove internal `useHeadlessSession()` call; accept `session` prop instead

</code_context>

<specifics>
## Specific Ideas

- 500-row buffer cap: `setLogs(prev => [...prev.slice(-499), newRow])` is the idiomatic React pattern
- Immediate invalidation for gsd2 file changes: add both invalidations inside the existing `listen<GsdFileChangedPayload>('gsd2:file-changed', ...)` callback, right after the Health line

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 06-reactive-updates-and-headless-polish*
*Context gathered: 2026-03-21*
