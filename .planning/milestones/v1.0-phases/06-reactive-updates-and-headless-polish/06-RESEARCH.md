# Phase 6: Reactive Updates and Headless Session Polish - Research

**Researched:** 2026-03-21
**Domain:** TanStack Query reactive invalidation, React state persistence across tab navigation, documentation gap closure
**Confidence:** HIGH

## Summary

Phase 6 is a gap-closure phase with three distinct problems to solve. None require new Rust commands or new React Query query keys — all the infrastructure exists. The gaps are: (1) `use-gsd-file-watcher.ts` only invalidates `gsd2Health` on `gsd2:file-changed` events; Worktrees and Visualizer queries are not included; (2) `useHeadlessSession` is a custom hook that holds log state in local `useState`, so when `Gsd2HeadlessTab` unmounts (tab navigation away), the accumulated `logs[]` array is destroyed; (3) documentation frontmatter fields are missing in two SUMMARY files and the ROADMAP progress table is stale.

The reactive invalidation fix is a surgical 3-line addition to the existing `gsd2:file-changed` listener in `use-gsd-file-watcher.ts`. The headless log-persistence fix requires lifting `useHeadlessSession` state from the tab component up to the page level (or a React context), so the hook lives above the tab and survives tab navigation. The documentation fixes are pure text edits.

**Primary recommendation:** Lift `useHeadlessSession` into `ProjectPage` alongside the existing file watcher, add Worktrees and Visualizer invalidation to the `gsd2:file-changed` handler, then patch the two SUMMARY frontmatter fields and the ROADMAP table.

## Standard Stack

### Core (all already in project — no new installations)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-query | 5.x | Query invalidation via `queryClient.invalidateQueries` | Already used throughout project |
| @tauri-apps/api/event | 2.x | `listen()` for `gsd2:file-changed` events | Already used in `use-gsd-file-watcher.ts` |
| React | 18.x | `useState`, `useCallback`, `useRef`, `useContext` | Already used throughout |

No new packages required for this phase.

## Architecture Patterns

### Recommended Project Structure (unchanged)

```
src/
├── hooks/
│   └── use-gsd-file-watcher.ts   # Add Worktrees + Visualizer invalidation here
│   └── use-headless-session.ts   # No changes; hook stays as-is
├── pages/
│   └── project.tsx               # Lift useHeadlessSession call to page level
├── components/project/
│   └── gsd2-headless-tab.tsx     # Accept headless session state via props
├── lib/
│   └── query-keys.ts             # Already has gsd2Worktrees + gsd2VisualizerData
```

### Pattern 1: Reactive Invalidation via `gsd2:file-changed`

**What:** Extend the existing `gsd2:file-changed` listener in `use-gsd-file-watcher.ts` to also invalidate `gsd2Worktrees` and `gsd2VisualizerData` query keys.

**Current state:** The listener only calls `queryClient.invalidateQueries({ queryKey: queryKeys.gsd2Health(projectId) })`. Both Worktrees and Visualizer are missing.

**Fix:** Add two invalidation calls immediately after the existing health invalidation — no debounce needed since these are the same dedicated GSD-2 listener (not the batching GSD-1 listener):

```typescript
// Source: src/hooks/use-gsd-file-watcher.ts — existing gsd2:file-changed listener
listen<GsdFileChangedPayload>('gsd2:file-changed', (event) => {
  if (event.payload.project_path !== projectPath) return;
  void queryClient.invalidateQueries({ queryKey: queryKeys.gsd2Health(projectId) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.gsd2Worktrees(projectId) });         // ADD
  void queryClient.invalidateQueries({ queryKey: queryKeys.gsd2VisualizerData(projectId) });    // ADD
}).then((fn) => {
  unlisten2 = fn;
});
```

**When to use:** Any GSD-2 file change should prompt a fresh worktree list and fresh visualizer data, matching the existing health behavior.

### Pattern 2: Lifting Session State to Survive Tab Navigation

**What:** Move the `useHeadlessSession()` call from inside `Gsd2HeadlessTab` up to `ProjectPage`. Pass the returned values down as props. The hook then lives at page scope, not tab scope — its state survives when the GSD-2 TabGroup switches away from the "Headless" tab.

**Why the current implementation loses logs:** `Gsd2HeadlessTab` calls `useHeadlessSession()` internally. Tabs in `TabGroup` are controlled by TanStack/shadcn `Tabs` — when the user navigates away, `TabsContent` for the headless tab is no longer rendered (it does not use `forceMount`). React destroys the component, unmounting `Gsd2HeadlessTab` and tearing down the local state from `useHeadlessSession`. The `bufferRef`, `logs[]`, `lastSnapshot`, and `status` are all lost.

**Note on current unmount behavior:** The Phase 4 decision records: "useHeadlessSession cleans up event listeners on unmount without closing PTY session — session survives tab navigation." This is correct — the PTY session itself continues in Rust. The gap is that the JavaScript-side log buffer (accumulated `logs[]` state) is lost on unmount even though the PTY session is alive.

**Recovery mechanism (already exists):** On remount, the tab calls `gsd2HeadlessGetSession(projectId)` and if a session exists, calls `setSessionId(sid)` which re-attaches the PTY event listener. New lines arriving after remount are captured. But lines that arrived between unmount and remount are lost, and the historical `logs[]` prior to unmount are also gone.

**Fix approach — lift to page, pass via props:**

In `ProjectPage`:
```typescript
// In project.tsx — move useHeadlessSession here
const headlessSession = useHeadlessSession();
```

`Gsd2HeadlessTab` props change to accept the full headless session return value:
```typescript
interface Gsd2HeadlessTabProps {
  projectId: string;
  projectPath: string;
  session: UseHeadlessSessionReturn;  // lifted from page
}

export function Gsd2HeadlessTab({ projectId, session }: Gsd2HeadlessTabProps) {
  const { status, sessionId, logs, lastSnapshot, completedAt, setSessionId, setStatus, clearLogs } = session;
  // ... rest unchanged
}
```

The `useEffect` for session recovery on mount is already in `Gsd2HeadlessTab` and can stay there — it only runs when the component mounts (tab becomes active for the first time), which is correct.

**Alternative considered:** React Context. A `HeadlessSessionContext` wrapping the GSD-2 tab set would also work. Props are simpler — no new context file, no provider insertion, and only one consumer exists. Prefer props.

**Alternative considered:** `forceMount` on the TabsContent. This keeps the component alive. However, `forceMount` on all tabs creates hidden DOM and may affect performance for the full GSD-2 tab set. The Shell tab already uses `forceMount` specifically for terminal persistence. Extending this to all GSD-2 tabs is heavier than lifting a single hook. Prefer lift over forceMount.

### Pattern 3: Documentation Gap Closure

**What:** Two SUMMARY files are missing `requirements-completed` frontmatter fields. The ROADMAP progress table shows Phase 1 as "In Progress (2/3)" (stale).

**Files to update:**

1. `.planning/phases/02-health-widget-adaptive-ui-and-reactive-updates/02-01-SUMMARY.md` — add `requirements-completed: [HLTH-01, HLTH-02]` to YAML frontmatter

2. `.planning/phases/03-worktrees-panel/03-01-SUMMARY.md` — add `requirements-completed: [WORK-01, WORK-02, WORK-03, WORK-04]` to YAML frontmatter

3. `.planning/ROADMAP.md` Phase 1 progress table entry — update "In Progress (2/3)" to "Complete" and add completed date (from the phase 1 verification: completed 2026-03-20)

**Confirmed from audit:** These are documentation gaps only — the underlying implementations are verified complete. The SUMMARY frontmatter format convention is established: `requirements-completed: [REQ-ID, REQ-ID]`. Existing examples: `02-02-SUMMARY.md` and `03-02-SUMMARY.md` both have this field.

### Anti-Patterns to Avoid

- **Do not add `forceMount` to all GSD-2 tabs** to fix headless log persistence — only the Shell tab needs this treatment. Using `forceMount` broadly defeats lazy rendering.
- **Do not debounce the `gsd2:file-changed` Worktrees/Visualizer invalidation** — the existing health invalidation fires immediately without debounce by design. Worktrees and Visualizer should match that behavior.
- **Do not create a new Tauri event or Rust command** for the reactive update fix — the `gsd2:file-changed` event already covers all `.gsd/` file changes. The gap is purely frontend.
- **Do not add a 2-second polling interval** to Worktrees or Visualizer queries as a shortcut — the requirement is reactive invalidation via file-change events, not faster polling.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Reactive cache invalidation | Custom event emitter or MutationObserver | `queryClient.invalidateQueries()` | TanStack Query's invalidation is designed for this exact pattern; already in use for health |
| Tab-resilient state | Global store (Zustand/Redux) | Lift state to `ProjectPage` | One consumer, no cross-component sharing; a full store is overkill |
| Log persistence across mounts | Local storage / sessionStorage | Lifted React state | Logs are ephemeral per session, not persisted across app restart; React state at page scope is correct |

**Key insight:** All infrastructure already exists — the work is wiring existing pieces correctly, not building new systems.

## Common Pitfalls

### Pitfall 1: Duplicate `useHeadlessSession` Instances
**What goes wrong:** If `useHeadlessSession` is instantiated both in `ProjectPage` and inside `Gsd2HeadlessTab` (accidentally left in), two independent state machines run. PTY output listeners will be registered twice for the same session ID.
**Why it happens:** Easy to forget to remove the internal call when adding the prop-passing pattern.
**How to avoid:** When adding `session` prop to `Gsd2HeadlessTab`, immediately remove the `const { ... } = useHeadlessSession()` line inside the component.
**Warning signs:** Log rows appearing doubled; TypeScript not catching it because both have the same return shape.

### Pitfall 2: Session Recovery Effect Runs on Every Mount
**What goes wrong:** The `useEffect` that calls `gsd2HeadlessGetSession(projectId)` on mount is fine when the hook is inside the tab — it only fires when the tab is first shown. If lifted to `ProjectPage`, the project page mounts once — the effect needs to stay in `Gsd2HeadlessTab` (which still mounts/unmounts), not move to `ProjectPage`.
**Why it happens:** Over-lifting — moving effects that should remain at the tab level up to the page level.
**How to avoid:** Only lift the `useHeadlessSession()` call (and its returned state) to `ProjectPage`. Keep the mount-time recovery `useEffect` inside `Gsd2HeadlessTab` — it relies on `setSessionId` and `sessionId` from the lifted session object, both accessible via props.

### Pitfall 3: `queryKeys.gsd2VisualizerData` Key Shape Mismatch
**What goes wrong:** Passing wrong arguments to `queryClient.invalidateQueries` — e.g., using `['gsd2', 'visualizer']` instead of the factory.
**Why it happens:** Copying the health invalidation without checking the key factory shape for Visualizer.
**How to avoid:** Always use the `queryKeys.*` factory functions. From `query-keys.ts`: `gsd2VisualizerData: (projectId: string) => ['gsd2', 'visualizer', projectId]`.

### Pitfall 4: ROADMAP.md Has Two Phase 1 Status Entries
**What goes wrong:** The ROADMAP.md progress table has a row for Phase 1 that says "In Progress (2/3)" — updating only the table without checking whether the Phase Details section also has stale content.
**Why it happens:** The progress table and the Phase Details narrative may drift independently.
**How to avoid:** Read both the `## Progress` table and the `### Phase 1` details block in ROADMAP.md before editing. The Phase Details section already shows plans as `[x]` complete — only the progress table row needs updating.

### Pitfall 5: Missing `UseHeadlessSessionReturn` Export
**What goes wrong:** Adding `session: UseHeadlessSessionReturn` to `Gsd2HeadlessTabProps` fails to compile if the type is not exported from `use-headless-session.ts`.
**Why it happens:** The type was defined for internal use only.
**How to avoid:** Confirm `UseHeadlessSessionReturn` is exported from `use-headless-session.ts`. It is: line 18 shows `export interface UseHeadlessSessionReturn`.

## Code Examples

### Reactive Invalidation Addition (complete change)

```typescript
// Source: src/hooks/use-gsd-file-watcher.ts
// In the useEffect, replace the gsd2:file-changed listener:

listen<GsdFileChangedPayload>('gsd2:file-changed', (event) => {
  if (event.payload.project_path !== projectPath) return;
  // Immediately invalidate GSD-2 reactive queries (no debounce — dedicated key)
  void queryClient.invalidateQueries({ queryKey: queryKeys.gsd2Health(projectId) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.gsd2Worktrees(projectId) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.gsd2VisualizerData(projectId) });
}).then((fn) => {
  unlisten2 = fn;
});
```

### Lifting useHeadlessSession to ProjectPage

```typescript
// Source: src/pages/project.tsx
import { useHeadlessSession } from '@/hooks/use-headless-session';
import type { UseHeadlessSessionReturn } from '@/hooks/use-headless-session';

// Inside ProjectPage():
const headlessSession = useHeadlessSession();

// In the Gsd2HeadlessTab usage:
{
  id: "gsd2-headless",
  label: "Headless",
  icon: Play,
  content: <Gsd2HeadlessTab projectId={project.id} projectPath={project.path} session={headlessSession} />,
},
```

```typescript
// Source: src/components/project/gsd2-headless-tab.tsx
interface Gsd2HeadlessTabProps {
  projectId: string;
  projectPath: string;
  session: UseHeadlessSessionReturn;
}

export function Gsd2HeadlessTab({ projectId, session }: Gsd2HeadlessTabProps) {
  const { status, sessionId, logs, lastSnapshot, completedAt, setSessionId, setStatus, clearLogs } = session;
  // Remainder of component unchanged — remove the internal useHeadlessSession() call
}
```

### SUMMARY Frontmatter Additions

```yaml
# 02-01-SUMMARY.md — add to existing frontmatter block:
requirements-completed: [HLTH-01, HLTH-02]

# 03-01-SUMMARY.md — add to existing frontmatter block:
requirements-completed: [WORK-01, WORK-02, WORK-03, WORK-04]
```

### ROADMAP.md Progress Table Fix

```markdown
# Current (stale):
| 1. GSD-2 Backend Foundation | 3/3 | In Progress (2/3) | |

# Fixed:
| 1. GSD-2 Backend Foundation | 3/3 | Complete | 2026-03-20 |
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Polling only (30s) for Worktrees/Visualizer | Reactive + polling via file-change events | Phase 6 | Sub-2-second refresh instead of up to 30s wait |
| Log state in tab component (lost on nav) | Log state lifted to page component | Phase 6 | Logs survive tab navigation during active session |

## Open Questions

1. **Should `useHeadlessSession` also be initialized lazily (only when isGsd2)?**
   - What we know: `useHeadlessSession` only sets up PTY listeners when `sessionId` is non-null. When idle, it holds minimal state.
   - What's unclear: Whether the hook being instantiated for all GSD-2 projects (even idle ones) causes any issue.
   - Recommendation: Always instantiate when `isGsd2 === true`. The hook is lightweight when idle.

2. **Should the `gsd2:file-changed` event also invalidate Milestones/Slices/Tasks queries added in Phase 5?**
   - What we know: `gsd2Milestones`, `gsd2DerivedState` query keys exist; these display data from `.gsd/milestones/` files.
   - What's unclear: The Phase 6 success criteria only mentions Worktrees and Visualizer. Milestones/Slices/Tasks invalidation is not listed.
   - Recommendation: Add Milestones and DerivedState invalidation in the same change as a low-cost improvement. But do not block Phase 6 completion on this — treat as bonus if time allows.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest + React Testing Library |
| Config file | `vite.config.ts` (test section at line 68) |
| Quick run command | `pnpm test --run` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

Phase 6 has no new v1 requirements (it closes integration gaps). Test coverage maps to success criteria:

| Success Criterion | Behavior | Test Type | Automated Command | File Exists? |
|-------------------|----------|-----------|-------------------|-------------|
| SC-1: Worktrees reactive refresh | `gsd2:file-changed` triggers `gsd2Worktrees` invalidation | unit | `pnpm test --run src/lib/__tests__/queries-gsd2.test.ts` | ✅ (extend) |
| SC-2: Visualizer reactive refresh | `gsd2:file-changed` triggers `gsd2VisualizerData` invalidation | unit | `pnpm test --run src/lib/__tests__/queries-gsd2.test.ts` | ✅ (extend) |
| SC-3: Headless log persistence | `useHeadlessSession` logs survive component remount when held at page level | unit | `pnpm test --run src/lib/__tests__/queries-gsd2.test.ts` | ❌ Wave 0 |
| SC-4: Documentation accuracy | ROADMAP table + SUMMARY frontmatter correct | manual | manual review | n/a |

### Sampling Rate
- **Per task commit:** `pnpm test --run`
- **Per wave merge:** `pnpm test --run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/hooks/__tests__/use-headless-session.test.ts` — unit test that instantiates `useHeadlessSession`, populates `logs[]`, simulates unmount, and verifies logs survive when state is held at caller scope

*(Existing `src/lib/__tests__/queries-gsd2.test.ts` can be extended — no new file needed for reactive invalidation tests)*

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `src/hooks/use-gsd-file-watcher.ts` — current gsd2:file-changed handler (lines 104-110)
- Direct code inspection: `src/hooks/use-headless-session.ts` — full hook implementation, confirms `logs` is `useState`
- Direct code inspection: `src/components/project/gsd2-headless-tab.tsx` — confirms hook called internally at line 31
- Direct code inspection: `src/lib/query-keys.ts` — confirms `gsd2Worktrees` and `gsd2VisualizerData` key shapes
- Direct code inspection: `src/pages/project.tsx` — confirms tab structure, `forceMount` used only on Shell tab
- Direct code inspection: `.planning/v1.0-MILESTONE-AUDIT.md` — authoritative gap descriptions
- Direct code inspection: `.planning/phases/02-*/02-01-SUMMARY.md` — confirms missing `requirements-completed` field
- Direct code inspection: `.planning/phases/03-*/03-01-SUMMARY.md` — confirms missing `requirements-completed` field
- Direct code inspection: `.planning/ROADMAP.md` — confirms stale Phase 1 row in progress table

### Secondary (MEDIUM confidence)
- TanStack Query v5 invalidation pattern: `queryClient.invalidateQueries()` with exact key — consistent with all existing usage in `queries.ts`

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; all existing
- Architecture: HIGH — direct code inspection of all affected files
- Pitfalls: HIGH — derived from actual code paths and Phase 4 decision log

**Research date:** 2026-03-21
**Valid until:** 2026-04-21 (stable — no fast-moving dependencies)
