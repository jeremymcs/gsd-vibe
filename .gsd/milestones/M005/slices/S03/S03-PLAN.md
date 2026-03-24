# S03: Micro-interactions & Feedback

**Goal:** Every user mutation shows a toast on success/failure, skeleton loading shimmers, cards lift on hover, list items stagger in on mount, and view navigation crossfades — all via CSS only, respecting prefers-reduced-motion.
**Demo:** Trigger any mutation (create project, save settings, delete snippet) and see a contextual success toast. Open the dashboard and watch project cards stagger in. Hover a card and see it lift. Navigate between project views and see a fade-in transition. Loading states show a shimmer gradient instead of a pulse.

## Must-Haves

- All 18 user-facing mutations show contextual `toast.success` messages (not generic "Success")
- `@keyframes shimmer` added to globals.css and applied to the Skeleton component (replaces `animate-pulse`)
- `@keyframes stagger-in` added and applied to dashboard project grid/list items with per-item delay
- View content in project.tsx fades in on view change via `key={activeView}` + `animate-fade-in`
- Card interactive variant enhanced with `hover:-translate-y-0.5` and `hover:shadow-xl`
- All animations disabled when `prefers-reduced-motion: reduce` is active (existing media query covers new animation classes)
- `pnpm build` exits 0
- `pnpm test --run` passes 143+ tests

## Verification

```bash
# Toast coverage: confirm all 18 mutations now have toast.success
rg 'toast\.success' src/lib/queries.ts | wc -l
# Expected: >= 18 (some existing like git ops + new ones)

# Shimmer keyframe exists
grep -q '@keyframes shimmer' src/styles/globals.css && echo "PASS" || echo "FAIL"

# Stagger keyframe exists
grep -q '@keyframes stagger-in' src/styles/globals.css && echo "PASS" || echo "FAIL"

# Skeleton uses shimmer not pulse
grep -q 'animate-shimmer' src/components/ui/skeleton.tsx && echo "PASS" || echo "FAIL"

# Card interactive has translate
grep -q 'translate-y' src/components/ui/card.tsx && echo "PASS" || echo "FAIL"

# View crossfade key applied
grep -q 'key={activeView}' src/pages/project.tsx && echo "PASS" || echo "FAIL"

# Dashboard stagger applied
grep -q 'animate-stagger-in' src/pages/dashboard.tsx && echo "PASS" || echo "FAIL"

# Reduced motion covers new animations
grep -q 'animate-shimmer' src/styles/globals.css && echo "PASS" || echo "FAIL"

# Build passes
pnpm build

# Tests pass
pnpm test --run
```

## Observability / Diagnostics

- Runtime signals: Sonner toasts appear bottom-right on every mutation (success green, error red); shimmer gradient animates on skeleton elements during loading states
- Inspection surfaces: Browser DevTools → Elements → Computed → filter "animation" shows active keyframes; TanStack Query devtools → Mutations panel shows all mutation invocations with success/error status
- Failure visibility: Missing toasts are immediately visible to the user as "silent" mutations; broken animations visible as static elements in DevTools animation inspector
- Redaction constraints: None — toasts display operation names only, no user data

## Tasks

- [x] **T01: Add success toasts to all user-facing mutations** `est:45m`
  - Why: R044 requires every user-triggered mutation to show toast on success — 18 mutations currently lack `toast.success` calls
  - Files: `src/lib/queries.ts`, `src/pages/settings.tsx`
  - Do: Add `toast.success("Contextual message")` to the `onSuccess` callback of 18 mutation hooks. For `useToggleAutoCommand`, use the returned `AutoCommand.enabled` field to show "Auto-command enabled/disabled". For `useUpdateSettings`, add toast in the hook since `settings.tsx` uses `mutateAsync`. Skip silent mutations (toggleFavorite, markNotificationRead, addCommandHistory, toggleScriptFavorite, finalizeProjectCreation, clearAllData, exportData, clearAppLogs).
  - Verify: `rg 'toast\.success' src/lib/queries.ts | wc -l` returns ≥ 28 (10 existing git + 18 new); `pnpm build` exits 0; `pnpm test --run` passes
  - Done when: Every user-facing mutation shows a contextual toast on success

- [x] **T02: Add CSS animations — shimmer, stagger, crossfade, card hover lift** `est:1h`
  - Why: R045 requires skeleton shimmer, list stagger, view crossfade, and card hover lift — all CSS-only
  - Files: `src/styles/globals.css`, `tailwind.config.js`, `src/components/ui/skeleton.tsx`, `src/components/ui/card.tsx`, `src/pages/dashboard.tsx`, `src/pages/project.tsx`
  - Do: (1) Add `@keyframes shimmer` and `@keyframes stagger-in` to globals.css. (2) Register `shimmer` and `stagger-in` in tailwind.config.js keyframes/animation. (3) Replace `animate-pulse` with `animate-shimmer` + gradient background in Skeleton component. (4) Add `animate-stagger-in` to reduced-motion list in globals.css. (5) Add `hover:-translate-y-0.5 hover:shadow-xl` to Card interactive variant. (6) Add `key={activeView}` and `animate-fade-in` to project.tsx view wrapper. (7) Wrap dashboard grid/list items in stagger divs with per-item `animationDelay`.
  - Verify: `grep -q '@keyframes shimmer' src/styles/globals.css`; `grep -q 'animate-stagger-in' src/pages/dashboard.tsx`; `grep -q 'translate-y' src/components/ui/card.tsx`; `grep -q 'key={activeView}' src/pages/project.tsx`; `pnpm build` exits 0; `pnpm test --run` passes
  - Done when: Skeleton shimmers, dashboard items stagger in, cards lift on hover, views fade in on navigation

## Files Likely Touched

- `src/lib/queries.ts`
- `src/pages/settings.tsx`
- `src/styles/globals.css`
- `tailwind.config.js`
- `src/components/ui/skeleton.tsx`
- `src/components/ui/card.tsx`
- `src/pages/dashboard.tsx`
- `src/pages/project.tsx`
