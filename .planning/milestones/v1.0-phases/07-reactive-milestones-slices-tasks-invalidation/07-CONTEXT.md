# Phase 7: Reactive Milestones/Slices/Tasks Invalidation - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Add missing `gsd2:file-changed` event invalidations for Milestones, Slices, and Tasks query keys in `use-gsd-file-watcher.ts`, so those tabs refresh within 2 seconds of a `.gsd/` file change (currently wait up to 30s poll). Also fix the `[ ]` → `[x]` checkbox for `06-01-PLAN.md` in ROADMAP.md.

This is pure gap closure — no new features, no new commands, no new UI. One file edited (plus ROADMAP.md doc fix).

</domain>

<decisions>
## Implementation Decisions

### Query invalidation approach
- Add 4 invalidations to the existing `gsd2:file-changed` listener block in `use-gsd-file-watcher.ts` (lines 104–111), following the identical pattern of the 3 already there
- No debounce — existing decision from Phase 6: `gsd2:file-changed` fires immediately (dedicated key, not batched with gsd1 events)
- Use full prefix keys for milestone/slice detail queries so all open accordions refresh, not just the list:
  - `queryKeys.gsd2Milestones(projectId)` — list of milestones
  - `queryKeys.gsd2DerivedState(projectId)` — derived state consumed by Milestones tab
  - `['gsd2', 'milestone', projectId]` — prefix invalidation covers any `gsd2Milestone(projectId, milestoneId)` in cache
  - `['gsd2', 'slice', projectId]` — prefix invalidation covers any `gsd2Slice(projectId, milestoneId, sliceId)` in cache

### ROADMAP.md doc fix
- Change `- [ ] 07-01-PLAN.md` under Phase 6 plans section to `- [x] 06-01-PLAN.md` (the checkbox was incorrectly left unchecked after Phase 6 completion)

### Claude's Discretion
- Comment wording/formatting in the invalidation block
- Exact placement of the new lines within the `gsd2:file-changed` handler

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### File watcher (the only file being modified)
- `src/hooks/use-gsd-file-watcher.ts` — The hook to edit; the `gsd2:file-changed` listener is at lines 104–111

### Query keys (reference only — no changes needed)
- `src/lib/query-keys.ts` — Defines all query key factories; `gsd2Milestones`, `gsd2DerivedState`, `gsd2Milestone`, `gsd2Slice` already exist at lines 108–111

### Doc to fix
- `.planning/ROADMAP.md` — Phase 6 plan checkbox needs `[ ]` → `[x]` correction for `06-01-PLAN.md`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useGsdFileWatcher` hook already has the `unlisten2` / `gsd2:file-changed` listener pattern in place (lines 104–111) — new invalidations are appended inline, no structural change needed

### Established Patterns
- `void queryClient.invalidateQueries({ queryKey: queryKeys.gsd2X(projectId) })` — exact form used for all 3 existing gsd2 invalidations; same form for new ones
- Prefix invalidation: pass partial array `['gsd2', 'milestone', projectId]` instead of full key to hit all milestone detail queries regardless of `milestoneId` argument

### Integration Points
- `use-gsd-file-watcher.ts` is used in `ProjectPage` — no changes needed to callers
- Milestones/Slices/Tasks tabs (Phase 5 work) use `useGsd2Milestones`, `useGsd2Milestone`, `useGsd2Slice`, `useGsd2DerivedState` hooks — those hooks' `staleTime` determines how fast they refetch after invalidation; no changes needed there

</code_context>

<specifics>
## Specific Ideas

No specific requirements — the ROADMAP.md plan description already specifies the exact 4 query keys and the doc fix. Implementation is mechanical.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 07-reactive-milestones-slices-tasks-invalidation*
*Context gathered: 2026-03-21*
