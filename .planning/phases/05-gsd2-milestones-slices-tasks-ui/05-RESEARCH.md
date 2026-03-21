// Track Your Shit - Phase 5 Research: GSD-2 Milestones, Slices, and Tasks UI
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

# Phase 5: GSD-2 Milestones, Slices, and Tasks UI - Research

**Researched:** 2026-03-21
**Domain:** React/TypeScript frontend — Tauri IPC wiring, React Query hooks, two-level accordion UI
**Confidence:** HIGH (all findings sourced directly from existing project files)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Milestone expand behavior:** Two-level accordion in Milestones tab — milestone row expands to slices, slice row expands further to tasks. No tab navigation on click. Slice rows show: slice ID, title, task count (e.g. "3/5 tasks"), done/pending badge. Task rows show: task ID, title, status indicator.
- **Pattern:** Same `expandedRows: Set<string>` approach used in Worktrees tab.
- **Slices tab:** Grouped by milestone with collapsible milestone-section headers. Each slice row expands inline to show tasks (same accordion pattern).
- **Tasks tab — data strategy:** Walk all milestones → fetch each slice via `gsd2_get_slice` to build a complete task list. Show active + pending tasks only (filter out done). Group tasks by slice name.
- **Tasks tab — status indicators:** Active task: `▶` icon with pulsing amber + "Active" badge. Pending task: `○` icon (gray) + "Pending" badge. Consistent with Phase 4 Visualizer.
- **Empty states:** Simple text message, no skeleton, tabs remain visible.
  - Milestones: "No milestones yet — run a GSD-2 session to get started"
  - Slices: "No slices yet — run a GSD-2 session to get started"
  - Tasks: "No active or pending tasks — all done, or no GSD-2 session has run yet"
- **Loading states:** Skeleton rows matching the list structure.
- **Tab differentiation:** Milestones = interactive navigation hub (drill-down). Visualizer = read-only progress overview. Not redundant.

### Claude's Discretion

- Exact Tailwind classes for accordion open/close animation
- Whether slice tasks are loaded eagerly (on milestone expand) or lazily (on slice expand)
- Exact skeleton row count and shape
- Error state copy and styling

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PARS-01 | `gsd2_list_milestones` lists milestone directories from `.gsd/milestones/` | Rust command verified at lines 900–909 of gsd2.rs; TypeScript wrapper needed in tauri.ts |
| PARS-02 | `gsd2_get_milestone` reads ROADMAP.md and returns slices with ID, title, done status, dependencies | Rust command verified at lines 912–962; TypeScript wrapper + `Gsd2Milestone` type needed |
| PARS-03 | `gsd2_get_slice` reads PLAN.md and returns tasks with ID, title, done status, estimate | Rust command verified at lines 965–1039; TypeScript wrapper + `Gsd2Slice`/`Gsd2Task` types needed |
| PARS-04 | `gsd2_derive_state` returns active milestone/slice/task IDs and M/S/T progress | Rust command verified at lines 1042–1050; TypeScript wrapper + `Gsd2State` type needed |
| PARS-05 | `gsd2_get_roadmap_progress` returns milestone/slice/task completion counts | Rust command verified at lines 1053–1061; TypeScript wrapper + `Gsd2RoadmapProgress` type needed |
</phase_requirements>

---

## Summary

Phase 5 is a pure frontend wiring phase. All five Rust commands (PARS-01 through PARS-05) are implemented and verified in `src-tauri/src/commands/gsd2.rs`. This phase connects them to the UI by: (1) adding TypeScript invoke wrappers and interface types to `src/lib/tauri.ts`, (2) adding React Query hooks to `src/lib/queries.ts` and query key entries to `src/lib/query-keys.ts`, and (3) implementing three React components (`Gsd2MilestonesTab`, `Gsd2SlicesTab`, `Gsd2TasksTab`) that replace the "coming soon" placeholder divs in `src/pages/project.tsx`.

All patterns, components, and conventions are already established in the project. There are no new libraries, no new shadcn components to install, and no Rust changes required. The primary research value is in precisely documenting the Rust struct shapes (to produce correct TypeScript interfaces), the existing accordion pattern from `gsd2-worktrees-tab.tsx`, and the UI design contract from `05-UI-SPEC.md`.

The Tasks tab has a notable data-loading concern: it must walk all milestones, then lazily fetch each slice's tasks. The `gsd2_get_slice` command requires both `milestone_id` and `slice_id`. This means the Tasks tab builds its task list through a series of per-slice queries (one `useGsd2Slice` per slice across all milestones), which requires careful React Query configuration to avoid N+1 performance issues. The recommended approach — aligning with Claude's discretion — is lazy loading: only fetch a slice's tasks when that slice row is expanded, matching the UI-SPEC decision on the Milestones tab.

**Primary recommendation:** Follow the exact patterns from `gsd2-worktrees-tab.tsx` (accordion), `gsd2-health-tab.tsx` (empty/error/loading states), and `gsd2-visualizer-tab.tsx` (status icons). Implement in three waves: (Wave 1) tauri.ts types + wrappers + query infrastructure, (Wave 2) Milestones tab component, (Wave 3) Slices and Tasks tab components.

---

## Standard Stack

### Core (all already in project — no new installs needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 18 + TypeScript | already installed | Component implementation | Project baseline |
| @tauri-apps/api | already installed | `invoke<T>()` IPC to Rust | Project baseline |
| @tanstack/react-query | already installed | Data fetching, caching, stale management | Established project pattern for all GSD-2 data |
| Tailwind CSS | already installed | Styling | Project baseline |
| shadcn/ui (manual) | already installed | Card, Badge, Skeleton, ScrollArea, Button | All components present in `src/components/ui/` |
| Lucide React | already installed | ChevronRight, Flag, CheckCircle2 icons | Project baseline |

**Installation:** Nothing to install. All dependencies are present.

---

## Architecture Patterns

### Recommended Project Structure for New Files

```
src/
├── lib/
│   ├── tauri.ts              # ADD: 5 invoke wrappers + 4 TypeScript interfaces
│   ├── queries.ts            # ADD: 4 React Query hooks (useGsd2Milestones, useGsd2Milestone, useGsd2Slice, useGsd2DerivedState)
│   └── query-keys.ts        # ADD: 4 query key entries
└── components/
    └── project/
        ├── gsd2-milestones-tab.tsx   # NEW
        ├── gsd2-slices-tab.tsx       # NEW
        ├── gsd2-tasks-tab.tsx        # NEW
        └── index.ts                  # ADD: 3 new exports
```

### Pattern 1: Tauri Invoke Wrapper (established pattern)

**What:** Typed `invoke<T>()` wrappers at the bottom of `tauri.ts`, grouped under the `// GSD-2` section (currently at line 1276).

**When to use:** For every new Rust command exposed to the frontend.

```typescript
// Source: src/lib/tauri.ts lines 1276-1362 (existing GSD-2 section)

// TypeScript interfaces (map Rust structs 1:1)
export interface Gsd2MilestoneListItem {
  id: string;
  title: string;
  dir_name: string;
  done: boolean;
  slices: Gsd2SliceSummary[];   // from gsd2_list_milestones (slices array present but tasks=[])
  dependencies: string[];
}

export interface Gsd2SliceSummary {
  id: string;
  title: string;
  done: boolean;
  risk: string | null;
  dependencies: string[];
  tasks: Gsd2TaskItem[];        // empty from list_milestones; populated by get_slice
}

export interface Gsd2TaskItem {
  id: string;
  title: string;
  done: boolean;
  estimate: string | null;
  files: string[];
  verify: string | null;
}

export interface Gsd2DerivedState {
  active_milestone_id: string | null;
  active_slice_id: string | null;
  active_task_id: string | null;
  phase: string | null;
  milestones_done: number;
  milestones_total: number;
  slices_done: number;
  slices_total: number;
  tasks_done: number;
  tasks_total: number;
}

export interface Gsd2RoadmapProgressData {
  milestones_done: number;
  milestones_total: number;
  slices_done: number;
  slices_total: number;
  tasks_done: number;
  tasks_total: number;
}

// Invoke wrappers
export const gsd2ListMilestones = (projectId: string) =>
  invoke<Gsd2MilestoneListItem[]>('gsd2_list_milestones', { projectId });

export const gsd2GetMilestone = (projectId: string, milestoneId: string) =>
  invoke<Gsd2MilestoneListItem>('gsd2_get_milestone', { projectId, milestoneId });

export const gsd2GetSlice = (projectId: string, milestoneId: string, sliceId: string) =>
  invoke<Gsd2SliceSummary>('gsd2_get_slice', { projectId, milestoneId, sliceId });

export const gsd2DeriveState = (projectId: string) =>
  invoke<Gsd2DerivedState>('gsd2_derive_state', { projectId });

export const gsd2GetRoadmapProgress = (projectId: string) =>
  invoke<Gsd2RoadmapProgressData>('gsd2_get_roadmap_progress', { projectId });
```

**Critical note on `gsd2_get_slice` signature:** The Rust command requires THREE parameters: `project_id`, `milestone_id`, and `slice_id`. This differs from most other GSD-2 commands that only take `project_id`. The React Query hook must accept both IDs.

### Pattern 2: Query Key Factory Entries (established pattern)

**What:** Append to the `// GSD-2` section at the bottom of `query-keys.ts` (currently ends at line 108).

```typescript
// Source: src/lib/query-keys.ts lines 102-108 (existing GSD-2 block)

// ADD these 4 entries:
gsd2Milestones: (projectId: string) => ['gsd2', 'milestones', projectId] as const,
gsd2Milestone: (projectId: string, milestoneId: string) => ['gsd2', 'milestone', projectId, milestoneId] as const,
gsd2Slice: (projectId: string, milestoneId: string, sliceId: string) => ['gsd2', 'slice', projectId, milestoneId, sliceId] as const,
gsd2DerivedState: (projectId: string) => ['gsd2', 'derived-state', projectId] as const,
```

**Note:** `gsd2_get_roadmap_progress` is not needed as a standalone hook — the Tasks tab derives its data from slice queries, and the Milestones/Slices tabs compute progress from `gsd2_list_milestones` return data. `gsd2DeriveState` covers the active-unit context needed for Tasks tab ordering. Add `gsd2RoadmapProgress` only if a component needs it independently.

### Pattern 3: React Query Hook (established pattern)

**What:** `useQuery` hooks in `queries.ts`, following the exact shape of existing GSD-2 hooks.

```typescript
// Source: src/lib/queries.ts lines 1134-1226 (existing GSD-2 hooks)

// Milestones list — stable data, poll every 30s
export const useGsd2Milestones = (projectId: string) =>
  useQuery({
    queryKey: queryKeys.gsd2Milestones(projectId),
    queryFn: () => api.gsd2ListMilestones(projectId),
    enabled: !!projectId,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

// Single milestone detail — loaded on accordion expand
export const useGsd2Milestone = (projectId: string, milestoneId: string, enabled: boolean) =>
  useQuery({
    queryKey: queryKeys.gsd2Milestone(projectId, milestoneId),
    queryFn: () => api.gsd2GetMilestone(projectId, milestoneId),
    enabled: !!projectId && !!milestoneId && enabled,
    staleTime: 15_000,
  });

// Single slice detail — loaded lazy on slice row expand
export const useGsd2Slice = (projectId: string, milestoneId: string, sliceId: string, enabled: boolean) =>
  useQuery({
    queryKey: queryKeys.gsd2Slice(projectId, milestoneId, sliceId),
    queryFn: () => api.gsd2GetSlice(projectId, milestoneId, sliceId),
    enabled: !!projectId && !!milestoneId && !!sliceId && enabled,
    staleTime: 15_000,
  });

// Derived state — for Tasks tab active/pending context
export const useGsd2DerivedState = (projectId: string) =>
  useQuery({
    queryKey: queryKeys.gsd2DerivedState(projectId),
    queryFn: () => api.gsd2DeriveState(projectId),
    enabled: !!projectId,
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
```

### Pattern 4: Two-Level Accordion (from gsd2-worktrees-tab.tsx)

**What:** Two independent `Set<string>` states — one for expanded milestones, one for expanded slices.

**When to use:** Milestones tab (milestone → slice → task drill-down), Slices tab (milestone section → slice row → task list).

```typescript
// Source: src/components/project/gsd2-worktrees-tab.tsx lines 129-142

const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set());
const [expandedSlices, setExpandedSlices] = useState<Set<string>>(new Set());

const toggleMilestone = (id: string) => {
  setExpandedMilestones((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
};

const toggleSlice = (id: string) => {
  setExpandedSlices((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
};
```

The ChevronRight rotate pattern from Worktrees:
```typescript
// Source: src/components/project/gsd2-worktrees-tab.tsx lines 227-232
<ChevronRight
  className="h-4 w-4 transition-transform duration-200"
  style={{
    transform: expandedRows.has(wt.name) ? 'rotate(90deg)' : 'rotate(0deg)',
  }}
/>
```

### Pattern 5: Status Icon (from gsd2-visualizer-tab.tsx)

**What:** Inline `StatusIcon` component using text characters with Tailwind color classes.

```typescript
// Source: src/components/project/gsd2-visualizer-tab.tsx lines 17-25
function StatusIcon({ status }: { status: string }) {
  if (status === 'done') {
    return <span className="text-status-success">✔</span>;
  }
  if (status === 'active') {
    return <span className="text-yellow-500 animate-pulse">▶</span>;
  }
  return <span className="text-muted-foreground">○</span>;
}
```

This exact component can be copy-inlined or imported into each new tab component. The UI-SPEC mandates reuse of this exact icon pattern.

### Pattern 6: Status Badge Variants

Per the UI-SPEC:

| Status | Badge classes |
|--------|---------------|
| done | `bg-status-success/10 text-status-success border-status-success/30` |
| active | `bg-status-warning/10 text-status-warning border-status-warning/30` |
| pending | `bg-status-pending/10 text-status-pending border-status-pending/30` |

Use the `Badge` component with `variant="outline"` and override with `className` prop (consistent with existing badge usage in Worktrees tab).

### Pattern 7: Empty / Error / Loading States (from gsd2-health-tab.tsx)

**Loading:** `Skeleton` rows inside a `Card`. The UI-SPEC specifies exact shapes per tab:
- Milestones: 3 rows `h-10 w-full mb-2`
- Slices: 2 headers `h-8 w-1/3` + 2 rows each `h-8 w-full mb-1`
- Tasks: 1 divider `h-4 w-1/4 mb-2` + 3 rows `h-8 w-full mb-1`

**Error:** Card with `text-status-error` text. Copy per UI-SPEC copywriting contract.

**Empty:** Card with `text-muted-foreground` plain text, `py-8 text-center` — same as Health tab empty state.

### Pattern 8: Tab Registration in project.tsx

Three placeholder divs at lines 277, 283, 289 are replaced:

```typescript
// Source: src/pages/project.tsx lines 273-290
{
  id: "gsd2-milestones",
  label: "Milestones",
  icon: Flag,
  content: <Gsd2MilestonesTab projectId={project.id} projectPath={project.path} />,
},
{
  id: "gsd2-slices",
  label: "Slices",
  icon: Layers,   // or appropriate icon — see Anti-Patterns below
  content: <Gsd2SlicesTab projectId={project.id} projectPath={project.path} />,
},
{
  id: "gsd2-tasks",
  label: "Tasks",
  icon: CheckSquare,
  content: <Gsd2TasksTab projectId={project.id} projectPath={project.path} />,
},
```

All three currently use `Flag` icon — the planner should pick semantically appropriate icons for Slices and Tasks. Flag is fine to keep if icons are not a priority.

### Anti-Patterns to Avoid

- **Calling `gsd2_get_slice` eagerly on all milestones:** The Tasks tab must walk all milestones → slices but should NOT fire all slice fetches at once on tab mount. React Query's `enabled` flag gates the fetch until needed. Ignore `gsd2_get_roadmap_progress` for the Tasks tab — build the task list from slice queries.
- **Using a single `expandedRows` Set for both levels:** Two separate Sets are required (milestone level and slice level) to support multiple rows open at both levels simultaneously.
- **Modifying `gsd-milestones-tab.tsx`:** The GSD-1 milestones tab must not be modified. All new files are prefixed `gsd2-`.
- **Incorrect invoke argument naming:** `gsd2_get_slice` takes `{ projectId, milestoneId, sliceId }` — three arguments. Missing `milestoneId` will cause a Rust error.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Data fetching + caching | Custom fetch logic | TanStack Query `useQuery` with `enabled` flag | Handles stale-while-revalidate, deduplication, background refresh |
| Accordion animation | Custom CSS transition | `transition-transform duration-200` on ChevronRight + conditional render of expanded content | Established project pattern, no new dependency |
| Status icons | Custom SVG icons | Text characters `▶` `○` `✔` with Tailwind color classes | Exact match to Phase 4 Visualizer, zero dependency |
| Done/pending/active badges | Custom badge component | shadcn `Badge` with `className` override | Already installed, established pattern |
| Loading skeletons | Custom shimmer | shadcn `Skeleton` component | Already installed, established pattern |

---

## Common Pitfalls

### Pitfall 1: `gsd2_get_slice` Requires `milestone_id`

**What goes wrong:** Calling `gsd2_get_slice(projectId, sliceId)` with only two arguments returns a Rust error ("Milestone not found") because the command needs three: `project_id`, `milestone_id`, `slice_id`.

**Why it happens:** Unlike most GSD-2 commands, slice resolution requires traversing `.gsd/milestones/{milestone_dir}/{slice_dir}/S01-PLAN.md` — the milestone directory path is needed to locate the slice.

**How to avoid:** The `useGsd2Slice` hook signature must be `(projectId, milestoneId, sliceId, enabled)`. When building the Tasks tab task list, maintain a lookup of `sliceId → milestoneId` from the `gsd2_list_milestones` response.

**Warning signs:** TypeScript won't catch this if the wrapper is written with two arguments — test against a real project with `.gsd/milestones/`.

### Pitfall 2: `gsd2_list_milestones` Returns Slices with Empty Tasks

**What goes wrong:** `gsd2_list_milestones` returns `Gsd2Milestone[]` where each milestone has `slices: Gsd2Slice[]` but each slice's `tasks: []` is always empty. Tasks are only populated by `gsd2_get_slice`.

**Why it happens:** The Rust command only parses `ROADMAP.md` for the slice list — it does not walk into each slice's `PLAN.md`.

**How to avoid:** The Milestones tab can show slice rows (from list_milestones data) without tasks. Task rows inside a slice expansion must be loaded lazily via `useGsd2Slice`. The Tasks tab must call `gsd2_get_slice` for each slice. Never derive task counts from `gsd2_list_milestones` slices.tasks.length.

### Pitfall 3: Tasks Tab Requires Active Milestone → Slice → Task Walk

**What goes wrong:** Trying to get all tasks in a single Tauri call. There is no "list all tasks" command.

**Why it happens:** GSD-2's data model is hierarchical: tasks live inside slices, which live inside milestones.

**How to avoid:** The Tasks tab uses `useGsd2Milestones` to get the milestone list, then derives a slice list from the milestone data (ROADMAP.md slices). For each slice, it calls `useGsd2Slice(projectId, milestoneId, sliceId, enabled)`. Filter the combined task list to `done === false` only.

**Performance note:** With 5 milestones × 5 slices = 25 potential slice queries. React Query deduplicates these if the same slice is queried from multiple components. Lazy loading (only enable slice query when slice row is expanded) is the recommended strategy per UI-SPEC.

### Pitfall 4: `expandedRows` Key Collisions Between Milestones and Slices

**What goes wrong:** Using a single `expandedRows` Set and storing both milestone IDs and slice IDs in it. Milestone "M001" and a hypothetical slice "M001" would collide.

**Why it happens:** GSD-2 uses short IDs like "M001" and "S01" — not globally unique across types.

**How to avoid:** Use two separate state variables: `expandedMilestones: Set<string>` and `expandedSlices: Set<string>`. This matches the two-level accordion design. See Worktrees tab for single-level precedent — extend it to two levels.

### Pitfall 5: File Header Convention

**What goes wrong:** Missing the project file header causes lint or convention failure.

**How to avoid:** All new files must begin with:
```
// Track Your Shit - [File Purpose]
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
```

---

## Code Examples

### Deriving Task Status from `Gsd2Task` Fields

The Rust `Gsd2Task` struct has `done: bool` but no explicit `active` field. Determining "active" requires cross-referencing with `gsd2_derive_state`:

```typescript
// Derive status for a task, given the active task ID from gsd2_derive_state
function getTaskStatus(
  task: Gsd2TaskItem,
  activeTaskId: string | null
): 'done' | 'active' | 'pending' {
  if (task.done) return 'done';
  if (activeTaskId && task.id === activeTaskId) return 'active';
  return 'pending';
}
```

The Tasks tab should call `useGsd2DerivedState(projectId)` to get `active_task_id` and use it to mark the single active task row.

### Task Count Display (from CONTEXT.md spec)

Slice rows show task count as "X/Y tasks":
```typescript
// tasks comes from the slices array on the milestone (done count must be derived)
const doneCount = slice.tasks.filter(t => t.done).length;
const totalCount = slice.tasks.length;
const taskCountLabel = `${doneCount}/${totalCount} tasks`;
```

Note: `slice.tasks` from `gsd2_list_milestones` is always `[]`. Only call `useGsd2Milestone` (which fetches the full milestone detail including all slice task lists) OR `useGsd2Slice` to get tasks. The task count in the Milestones tab slice row requires fetching milestone detail, not just the list.

**Simplified approach:** Use `useGsd2Milestones` for the list (which gives slices without tasks), then show task count only after the slice row is expanded and `useGsd2Slice` has loaded. Before expansion, omit the task count or show a loading indicator.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Placeholder divs for milestones/slices/tasks | Real data components | Phase 5 (this phase) | PARS-01..05 backend verified in Phase 1; frontend wiring deferred until now |
| N/A | Lazy slice loading (enabled flag) | Phase 5 decision (UI-SPEC) | Prevents N+1 query storm on tab mount |

---

## Open Questions

1. **Task count in Milestones tab slice rows without a separate fetch**
   - What we know: `gsd2_list_milestones` returns slices with `tasks: []`. Showing "3/5 tasks" in a slice row requires knowing the task count.
   - What's unclear: Should task count be shown only after expansion (lazy), or should it be shown on collapsed rows (requiring milestone detail fetch or a separate count)?
   - Recommendation: Show task count only after the slice row is expanded (lazy). Before expansion, show just slice title + done/pending badge. This avoids loading all milestone details upfront. The CONTEXT.md spec says task count shows in expanded slice rows, not collapsed ones.

2. **Icon choice for Slices and Tasks tabs**
   - What we know: Both currently use `Flag` icon in `project.tsx`. The UI-SPEC does not specify replacements.
   - What's unclear: Whether the planner should change these icons.
   - Recommendation: Leave `Flag` for all three as-is. Icon choice is cosmetic and can be refined post-phase. The planner may choose `Layers` for Slices and `CheckSquare` for Tasks if desired, both are already imported in `project.tsx`.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest + React Testing Library (configured in `vite.config.ts`) |
| Config file | `vite.config.ts` (under `test` key) |
| Quick run command | `pnpm test --run` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PARS-01 | `gsd2ListMilestones` invoke wrapper + `useGsd2Milestones` hook returns data | unit | `pnpm test --run src/lib/tauri.test.ts` | ❌ Wave 0 |
| PARS-02 | `gsd2GetMilestone` invoke wrapper + `useGsd2Milestone` hook | unit | `pnpm test --run src/lib/tauri.test.ts` | ❌ Wave 0 |
| PARS-03 | `gsd2GetSlice` invoke wrapper (3 args: projectId, milestoneId, sliceId) | unit | `pnpm test --run src/lib/tauri.test.ts` | ❌ Wave 0 |
| PARS-04 | `gsd2DeriveState` invoke wrapper + `useGsd2DerivedState` hook | unit | `pnpm test --run src/lib/tauri.test.ts` | ❌ Wave 0 |
| PARS-05 | `gsd2GetRoadmapProgress` invoke wrapper | unit | `pnpm test --run src/lib/tauri.test.ts` | ❌ Wave 0 |
| UI | Milestones tab renders skeleton, empty state, error state | unit | `pnpm test --run src/components/project/gsd2-milestones-tab.test.tsx` | ❌ Wave 0 |
| UI | Tasks tab filters out done tasks, shows active/pending only | unit | `pnpm test --run src/components/project/gsd2-tasks-tab.test.tsx` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm test --run`
- **Per wave merge:** `pnpm test --run`
- **Phase gate:** Full `pnpm test` green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/lib/tauri.test.ts` — may already exist; add GSD-2 invoke wrapper tests for 5 new functions
- [ ] `src/components/project/gsd2-milestones-tab.test.tsx` — covers PARS-01/02 + accordion render
- [ ] `src/components/project/gsd2-tasks-tab.test.tsx` — covers PARS-03 + active/pending filter

Note: The existing test infrastructure (Vitest + setup.ts + test-utils.tsx) covers all needs. No new framework install required. Tauri `invoke` will need to be mocked via `vi.mock('@tauri-apps/api/core')` — the pattern is likely already present in other test files.

---

## Sources

### Primary (HIGH confidence)

- Direct file reads: `src-tauri/src/commands/gsd2.rs` lines 160–216, 900–1061 — Rust struct definitions and command signatures
- Direct file reads: `src/lib/tauri.ts` lines 1276–1362 — existing GSD-2 invoke wrapper pattern
- Direct file reads: `src/lib/queries.ts` lines 1134–1227 — existing GSD-2 React Query hook pattern
- Direct file reads: `src/lib/query-keys.ts` lines 102–108 — existing GSD-2 key factory entries
- Direct file reads: `src/components/project/gsd2-worktrees-tab.tsx` — two-level accordion pattern
- Direct file reads: `src/components/project/gsd2-health-tab.tsx` — empty/error/loading state pattern
- Direct file reads: `src/components/project/gsd2-visualizer-tab.tsx` lines 17–25 — StatusIcon pattern
- Direct file reads: `src/pages/project.tsx` lines 273–292 — placeholder divs to replace
- Direct file reads: `.planning/phases/05-gsd2-milestones-slices-tasks-ui/05-UI-SPEC.md` — visual/interaction contract
- Direct file reads: `.planning/phases/05-gsd2-milestones-slices-tasks-ui/05-CONTEXT.md` — locked decisions

### Secondary (MEDIUM confidence)

None needed — all findings are sourced directly from project files.

### Tertiary (LOW confidence)

None.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are already in project; verified by file reads
- Architecture patterns: HIGH — all patterns sourced from existing, working project files
- Rust struct shapes / TypeScript interface mapping: HIGH — read directly from gsd2.rs struct definitions
- Pitfalls: HIGH — derived from direct analysis of command signatures and existing patterns

**Research date:** 2026-03-21
**Valid until:** 2026-04-20 (stable domain — no external dependencies)
