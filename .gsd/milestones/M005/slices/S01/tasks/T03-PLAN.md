---
estimated_steps: 5
estimated_files: 9
skills_used:
  - accessibility
  - frontend-design
  - make-interfaces-feel-better
---

# T03: Add dark: variants to components with hardcoded palette colors

**Slice:** S01 — Light Theme
**Milestone:** M005

## Description

Approximately 30 instances across 9 component files use raw Tailwind `-400` or `-500` palette colors (e.g., `text-yellow-400`, `text-green-400`) tuned for dark backgrounds. These produce inadequate contrast on white/light backgrounds (yellow-400 is ~1.8:1 on white — far below the 4.5:1 AA minimum). The fix is to apply the established `text-{color}-600 dark:text-{color}-400` pattern already used in `codebase-health-card.tsx`. Yellow/amber need `-700` level because `-600` is only ~2.1:1 on white.

## Steps

1. Fix `src/components/project/knowledge-captures-panel.tsx` — occurrences of `-400` colors. Apply pattern: `text-blue-400` → `text-blue-600 dark:text-blue-400`, `text-purple-400` → `text-purple-600 dark:text-purple-400`, `text-amber-400` → `text-amber-700 dark:text-amber-400`, `text-green-400` → `text-green-600 dark:text-green-400`, `text-red-400` → `text-red-600 dark:text-red-400`, `text-yellow-400` → `text-yellow-700 dark:text-yellow-400`.
2. Fix `src/components/project/gsd-validation-plan-tab.tsx` — color occurrences. Same color→dark: mapping: `text-purple-400` → `text-purple-600 dark:text-purple-400`, `text-blue-400` → `text-blue-600 dark:text-blue-400`, `text-green-400` → `text-green-600 dark:text-green-400`, `text-red-400` → `text-red-600 dark:text-red-400`, `text-yellow-400` → `text-yellow-700 dark:text-yellow-400`.
3. Fix GSD-2 active-status indicators in 4 files: `gsd2-milestones-tab.tsx`, `gsd2-tasks-tab.tsx`, `gsd2-slices-tab.tsx`, `gsd2-visualizer-tab.tsx` — each has `text-yellow-500` on a `▶` indicator → change to `text-yellow-600 dark:text-yellow-500`.
4. Fix `src/pages/todos.tsx` — priority badge map and action icons: `text-red-400` → `text-red-600 dark:text-red-400`, `text-orange-400` → `text-orange-600 dark:text-orange-400`, `text-yellow-400` → `text-yellow-700 dark:text-yellow-400`, `hover:text-green-400` → `hover:text-green-600 dark:hover:text-green-400`. Also fix `src/pages/logs.tsx` — 1 occurrence: `text-green-400` → `text-green-600 dark:text-green-400`.
5. Fix `src/components/command-palette/command-palette.tsx` — icon colors: `text-green-400` → `text-green-600 dark:text-green-400`, `text-blue-400` → `text-blue-600 dark:text-blue-400`, `text-orange-400` → `text-orange-600 dark:text-orange-400`, `text-purple-400` → `text-purple-600 dark:text-purple-400`.

## Must-Haves

- [ ] Zero `text-{color}-400` without `dark:` prefix in non-test `.tsx` files (verified by grep, excluding `codebase-health-card.tsx` which already uses the correct pattern)
- [ ] Yellow/amber colors use `-700` level for light mode (not `-600` which fails contrast at ~2.1:1)
- [ ] GSD-2 active indicators (▶) in all 4 tab files have `dark:` variants
- [ ] Todo priority badges have `dark:` variants
- [ ] Command palette icon colors have `dark:` variants
- [ ] `pnpm build` compiles without TypeScript errors
- [ ] `pnpm test --run` passes 143+ tests (no regressions from class name changes)

## Verification

- `rg 'text-(yellow|amber|green|blue|red|orange|purple)-400' src/ --glob '*.tsx' | grep -v test | grep -v dark: | grep -v codebase-health` returns 0 lines (all -400 colors have dark: prefix now)
- `pnpm build` succeeds
- `pnpm test --run` — 143+ pass

## Observability Impact

- Signals added/changed: No runtime signals — this is a Tailwind class-name change only. The `dark:` prefix causes Tailwind to generate CSS that activates under `.dark` class, while the unprefixed `-600`/`-700` class is active by default (including under `.light`).
- How a future agent inspects this: Run `rg 'text-(yellow|amber|green|blue|red|orange|purple)-400' src/ --glob '*.tsx' | grep -v test | grep -v dark:` — any results indicate a missed occurrence. In browser: toggle to light mode and visually inspect status badges, priority labels, and command palette icons for adequate contrast.
- Failure state exposed: Low-contrast or invisible colored text on light backgrounds — yellow text on white is the most critical since yellow-400 is ~1.8:1 contrast ratio (below AA minimum of 4.5:1).

## Inputs

- `src/components/project/codebase-health-card.tsx` — reference pattern for `dark:` variant usage (read-only, do not modify)
- `src/components/project/knowledge-captures-panel.tsx` — color occurrences to fix
- `src/components/project/gsd-validation-plan-tab.tsx` — color occurrences to fix
- `src/components/project/gsd2-milestones-tab.tsx` — `text-yellow-500` indicator to fix
- `src/components/project/gsd2-tasks-tab.tsx` — `text-yellow-500` indicator to fix
- `src/components/project/gsd2-slices-tab.tsx` — `text-yellow-500` indicator to fix
- `src/components/project/gsd2-visualizer-tab.tsx` — `text-yellow-500` indicator to fix
- `src/pages/todos.tsx` — priority badge and action icon colors to fix
- `src/pages/logs.tsx` — `text-green-400` occurrence to fix
- `src/components/command-palette/command-palette.tsx` — icon colors to fix

## Expected Output

- `src/components/project/knowledge-captures-panel.tsx` — modified: all -400 colors have dark: variants
- `src/components/project/gsd-validation-plan-tab.tsx` — modified: all -400 colors have dark: variants
- `src/components/project/gsd2-milestones-tab.tsx` — modified: yellow-500 has dark: variant
- `src/components/project/gsd2-tasks-tab.tsx` — modified: yellow-500 has dark: variant
- `src/components/project/gsd2-slices-tab.tsx` — modified: yellow-500 has dark: variant
- `src/components/project/gsd2-visualizer-tab.tsx` — modified: yellow-500 has dark: variant
- `src/pages/todos.tsx` — modified: all -400 colors have dark: variants
- `src/pages/logs.tsx` — modified: green-400 has dark: variant
- `src/components/command-palette/command-palette.tsx` — modified: all -400 icon colors have dark: variants
