---
estimated_steps: 5
estimated_files: 12
skills_used:
  - react-best-practices
  - lint
---

# T02: Replace bare loading text with skeletons and add error states across all data-fetching views

**Slice:** S02 — Consistent State Patterns
**Milestone:** M005

## Description

Sweep all data-fetching views that currently show bare "Loading..." text or lack error handling. Replace loading text with `Skeleton` lines that approximate the loaded content shape. Add `isError` destructuring from TanStack Query hooks and render `ViewError` from `src/components/shared/loading-states.tsx` (created in T01) when queries fail. This task covers 12 files across three tiers of priority.

**Critical constraint:** Do NOT touch `knowledge-captures-panel.tsx` (its `KnowLoading`/`KnowEmpty` components have test assertions on exact text — changing them breaks tests). Do NOT touch `env-vars-tab.tsx` or `secrets-manager.tsx` (they use `useState` + `useEffect` for loading, not TanStack Query — adding error states requires try/catch refactoring that's out of scope). Do NOT touch any `gsd2-*` tab (already has proper skeleton/error/empty states).

## Steps

1. **Sweep 7 GSD 1.x tab components** — these all follow the same pattern. For each file:
   - Add `isError` to the query destructure (e.g., `const { data, isLoading, isError } = useGsdMilestones(projectId)`)
   - Replace the `isLoading` return block: remove the bare text div, replace with 3–4 `Skeleton` lines (`h-8 w-full`) inside the same container div
   - Add a new `if (isError)` block after the loading check, rendering `<ViewError message="Failed to load [thing] — check that the project path is accessible." />`
   - Leave existing empty states untouched — they already have icons and contextual messages
   - Import `Skeleton` from `@/components/ui/skeleton` and `ViewError` from `@/components/shared/loading-states`

   Files (in order):
   - `src/components/project/gsd-milestones-tab.tsx` — query: `useGsdMilestones` + `useGsdState`
   - `src/components/project/gsd-plans-tab.tsx` — query: `useGsdPlans` (uses `plansLoading` alias)
   - `src/components/project/gsd-todos-tab.tsx` — query: `useGsdTodos`
   - `src/components/project/gsd-uat-tab.tsx` — query: `useGsdUatResults`
   - `src/components/project/gsd-validation-plan-tab.tsx` — query: `useGsdValidations`
   - `src/components/project/gsd-verification-tab.tsx` — query: `useGsdValidations`
   - `src/components/project/gsd-debug-tab.tsx` — query: `useGsdDebugSessions`

2. **Sweep 2 small panel components** — same pattern as step 1 but smaller scope:
   - `src/components/knowledge/knowledge-bookmarks.tsx` — query: `useKnowledgeBookmarks`. Replace inline `"Loading..."` div with 3 `Skeleton` lines (`h-4 w-full`). Add `isError` handling.
   - `src/components/terminal/auto-commands-panel.tsx` — query: `useAutoCommands`. Replace inline `"Loading..."` with 3 `Skeleton` lines. Add `isError` handling.

3. **Replace loading text in `src/pages/settings.tsx`** — the `isLoading || !formData` guard currently shows bare `"Loading settings..."` text. Replace it with a settings-shaped skeleton: 2–3 `SkeletonCard` components from `@/components/ui/skeleton` stacked vertically (simulating settings form cards). No `isError` needed — the `useSettings` hook is page-level and the form waits for data.

4. **Replace loading text in `src/pages/project.tsx`** — the `projectLoading` guard shows bare `"Loading project..."` text. Replace with a project-page skeleton: a header skeleton (`Skeleton h-8 w-1/3` for project name + `Skeleton h-4 w-1/2` for path) plus 3 `Skeleton h-10 w-full` rows for content. Import `Skeleton` from `@/components/ui/skeleton`.

5. **Replace Loader2 spinner in `src/components/project/roadmap-progress-card.tsx`** — the `isLoading` guard renders a Card with `Loader2` spinner. Replace the spinner content with 3 `Skeleton` lines inside the existing Card structure. Add `isError` from query destructure + `ViewError` with message "Failed to load roadmap data."

After all changes, run verification:
```bash
pnpm test --run    # 143/143 must pass
pnpm build         # exit 0
rg '"Loading (milestones|plans|todos|UAT results|validation plans|verifications|debug sessions|settings|project)\.\.\."' src --glob '*.tsx' | grep -v test | grep -v __tests__
# → exit code 1 (0 lines)
```

## Must-Haves

- [ ] All 7 GSD 1.x tabs have `Skeleton` loading states replacing bare text
- [ ] All 7 GSD 1.x tabs have `isError` handling with `ViewError`
- [ ] `knowledge-bookmarks.tsx` has skeleton loading + error handling
- [ ] `auto-commands-panel.tsx` has skeleton loading + error handling
- [ ] `pages/settings.tsx` has skeleton loading (SkeletonCard or Skeleton lines)
- [ ] `pages/project.tsx` has skeleton loading (header + content shape)
- [ ] `roadmap-progress-card.tsx` has skeleton loading replacing Loader2 spinner + error handling
- [ ] No bare "Loading [thing]..." text remains in production components (test mocks are OK)
- [ ] All 143 existing tests pass
- [ ] `pnpm build` exits 0

## Verification

- `pnpm test --run` → 143/143 pass
- `pnpm build` → exit 0
- `rg '"Loading (milestones|plans|todos|UAT results|validation plans|verifications|debug sessions|settings|project)\.\.\."' src --glob '*.tsx' | grep -v test | grep -v __tests__` → exit code 1 (0 matches)
- For each GSD tab: `grep -q 'isError' src/components/project/gsd-milestones-tab.tsx` (repeat for all 7) → all succeed

## Inputs

- `src/components/shared/loading-states.tsx` — ViewError primitive (created in T01)
- `src/components/ui/skeleton.tsx` — Skeleton, SkeletonCard primitives
- `src/components/project/gsd-milestones-tab.tsx` — Tier 1 target
- `src/components/project/gsd-plans-tab.tsx` — Tier 1 target
- `src/components/project/gsd-todos-tab.tsx` — Tier 1 target
- `src/components/project/gsd-uat-tab.tsx` — Tier 1 target
- `src/components/project/gsd-validation-plan-tab.tsx` — Tier 1 target
- `src/components/project/gsd-verification-tab.tsx` — Tier 1 target
- `src/components/project/gsd-debug-tab.tsx` — Tier 1 target
- `src/components/knowledge/knowledge-bookmarks.tsx` — Tier 1 target
- `src/components/terminal/auto-commands-panel.tsx` — Tier 1 target
- `src/pages/settings.tsx` — Tier 2 target
- `src/pages/project.tsx` — Tier 2 target
- `src/components/project/roadmap-progress-card.tsx` — Tier 2 target

## Expected Output

- `src/components/project/gsd-milestones-tab.tsx` — skeleton loading + isError handling
- `src/components/project/gsd-plans-tab.tsx` — skeleton loading + isError handling
- `src/components/project/gsd-todos-tab.tsx` — skeleton loading + isError handling
- `src/components/project/gsd-uat-tab.tsx` — skeleton loading + isError handling
- `src/components/project/gsd-validation-plan-tab.tsx` — skeleton loading + isError handling
- `src/components/project/gsd-verification-tab.tsx` — skeleton loading + isError handling
- `src/components/project/gsd-debug-tab.tsx` — skeleton loading + isError handling
- `src/components/knowledge/knowledge-bookmarks.tsx` — skeleton loading + isError handling
- `src/components/terminal/auto-commands-panel.tsx` — skeleton loading + isError handling
- `src/pages/settings.tsx` — skeleton loading replacing bare text
- `src/pages/project.tsx` — skeleton loading replacing bare text
- `src/components/project/roadmap-progress-card.tsx` — skeleton loading + isError handling
