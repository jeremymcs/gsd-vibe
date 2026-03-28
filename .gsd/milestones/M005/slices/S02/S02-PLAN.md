# S02: Consistent State Patterns

**Goal:** Every data-fetching view in the app has a skeleton loading state, a styled error card, and a contextual empty state message — no bare "Loading..." text, no blank panels on failure.
**Demo:** Navigate to any GSD tab, page, or panel while data is loading → see skeleton shapes instead of text. Force a query failure → see a styled error card with an icon and contextual message. View with no data → see an icon, a specific message, and a hint about what to do.

## Must-Haves

- Shared primitives `ViewSkeleton`, `ViewError`, `ViewEmpty` exist in `src/components/shared/loading-states.tsx`
- All 9 Tier 1 GSD/knowledge/terminal components replace bare "Loading..." text with `Skeleton` lines
- All 9 Tier 1 components add `isError` handling with a styled error card
- `pages/settings.tsx`, `pages/project.tsx`, and `roadmap-progress-card.tsx` replace bare loading text/spinners with skeleton shapes
- Existing empty states remain intact — no regressions
- All 143 existing tests continue to pass
- `pnpm build` exits 0

## Verification

```bash
# 1. Shared primitives exist with correct exports
grep -q 'export function ViewSkeleton' src/components/shared/loading-states.tsx
grep -q 'export function ViewError' src/components/shared/loading-states.tsx
grep -q 'export function ViewEmpty' src/components/shared/loading-states.tsx

# 2. No bare "Loading..." text in Tier 1 components (allow test mocks and breadcrumbs)
rg '"Loading (milestones|plans|todos|UAT results|validation plans|verifications|debug sessions|settings|project)\.\.\."' src --glob '*.tsx' | grep -v test | grep -v __tests__
# → must return 0 lines (exit code 1)

# 3. isError handling present in all swept components
for f in gsd-milestones-tab gsd-plans-tab gsd-todos-tab gsd-uat-tab gsd-validation-plan-tab gsd-verification-tab gsd-debug-tab; do
  grep -q 'isError' "src/components/project/${f}.tsx" || echo "MISSING isError: ${f}"
done
# → no output (all have isError)

# 4. Tests pass
pnpm test --run  # 143/143

# 5. Build succeeds
pnpm build  # exit 0

# 6. Failure-path observability: ViewError renders text-status-error message
grep -q 'text-status-error' src/components/shared/loading-states.tsx
# → exit 0 (error card uses CSS variable color, not hardcoded palette)
```

## Tasks

- [x] **T01: Create shared loading-state primitives** `est:20m`
  - Why: S02 needs reusable `ViewSkeleton`, `ViewError`, `ViewEmpty` components that establish the visual pattern for all loading/error/empty states. Creating these first gives T02 ready-made imports.
  - Files: `src/components/shared/loading-states.tsx`
  - Do: Create the file with three exported components following the design in S02-RESEARCH. `ViewSkeleton` renders configurable Skeleton lines. `ViewError` renders a Card with AlertCircle icon + error message. `ViewEmpty` renders a Card with configurable icon + message + optional description. All use CSS variable colors (`bg-card`, `text-muted-foreground`, `text-status-error`) for light/dark theme compatibility. Import `Skeleton` from `@/components/ui/skeleton`, `Card`/`CardContent` from `@/components/ui/card`, `AlertCircle` from `lucide-react`.
  - Verify: `pnpm build` exits 0; `grep 'export function View' src/components/shared/loading-states.tsx` returns 3 lines
  - Done when: Three primitives exported, build passes, no TypeScript errors

- [x] **T02: Replace bare loading text with skeletons and add error states across all data-fetching views** `est:1h`
  - Why: This is the core deliverable of S02 — sweeping all components that show bare "Loading..." text or lack error handling, replacing them with skeleton shapes and styled error cards.
  - Files: `src/components/project/gsd-milestones-tab.tsx`, `src/components/project/gsd-plans-tab.tsx`, `src/components/project/gsd-todos-tab.tsx`, `src/components/project/gsd-uat-tab.tsx`, `src/components/project/gsd-validation-plan-tab.tsx`, `src/components/project/gsd-verification-tab.tsx`, `src/components/project/gsd-debug-tab.tsx`, `src/components/knowledge/knowledge-bookmarks.tsx`, `src/components/terminal/auto-commands-panel.tsx`, `src/pages/settings.tsx`, `src/pages/project.tsx`, `src/components/project/roadmap-progress-card.tsx`
  - Do: For each Tier 1 component (7 GSD tabs + bookmarks + auto-commands): (1) add `isError` to query destructure, (2) replace bare loading div with 3–4 `Skeleton` lines matching the content shape, (3) add `if (isError)` block rendering `ViewError` with a contextual message. For Tier 2 components (settings, project, roadmap): replace loading text/spinner with Skeleton shapes matching the page layout. Do NOT touch `knowledge-captures-panel.tsx` (test breakage risk), `env-vars-tab.tsx`/`secrets-manager.tsx` (useState, not TanStack Query), or any `gsd2-*` tab (already done).
  - Verify: `pnpm test --run` passes 143/143; `pnpm build` exits 0; `rg '"Loading (milestones|plans|todos|UAT results|validation plans|verifications|debug sessions|settings|project)\.\.\."' src --glob '*.tsx' | grep -v test` returns 0 lines
  - Done when: All 12 files updated, no bare loading text in production components, all tests pass, build succeeds

## Observability / Diagnostics

**Runtime signals:**
- `ViewError` renders an `AlertCircle` icon + `text-status-error` message on every `isError: true` TanStack Query result. This is the primary visible signal that a backend fetch failed.
- `ViewSkeleton` renders animated pulse lines while `isLoading: true`. If skeleton shapes persist indefinitely, open the TanStack Query devtools → select the stale query → inspect the "Error" or "Data" panel.
- `ViewEmpty` renders when a query succeeds but returns an empty array. If empty state appears unexpectedly, verify the query returned `[]` rather than `undefined` (which would bypass the empty branch).

**Inspection surfaces:**
- TanStack Query devtools (browser DevTools panel) — inspect query state, data, and errors per query key.
- React DevTools — inspect component tree to confirm which primitive is rendered (ViewSkeleton vs ViewError vs ViewEmpty vs data).
- `pnpm build` — TypeScript type-checks all imports; a type error in any consumer of these primitives will fail the build.

**Failure visibility:**
- Failed queries that previously silently rendered nothing or showed bare text will now show a styled `ViewError` card with a contextual message. This makes data-fetch failures user-visible by default.
- Empty-data states that previously rendered nothing now show a `ViewEmpty` card with a description, reducing confusion when a project has no milestones/plans/etc.

**Redaction:**
- Error messages passed to `ViewError` must not include raw stack traces or sensitive path data. Pass user-facing strings only (e.g. "Failed to load milestones — check the project path").

## Files Likely Touched

- `src/components/shared/loading-states.tsx` (new)
- `src/components/project/gsd-milestones-tab.tsx`
- `src/components/project/gsd-plans-tab.tsx`
- `src/components/project/gsd-todos-tab.tsx`
- `src/components/project/gsd-uat-tab.tsx`
- `src/components/project/gsd-validation-plan-tab.tsx`
- `src/components/project/gsd-verification-tab.tsx`
- `src/components/project/gsd-debug-tab.tsx`
- `src/components/knowledge/knowledge-bookmarks.tsx`
- `src/components/terminal/auto-commands-panel.tsx`
- `src/pages/settings.tsx`
- `src/pages/project.tsx`
- `src/components/project/roadmap-progress-card.tsx`
