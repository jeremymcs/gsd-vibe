# S01: Light Theme

**Goal:** Add a complete light theme CSS variable set and fix all TypeScript/component barriers so the existing theme toggle works correctly — every view renders with proper contrast in both dark and light mode.
**Demo:** Open Settings → change theme to "Light" → navigate through dashboard, projects, GSD-2 views, todos, notifications, logs, command palette — all text is readable, status colors are visible, brand cyan is distinct, no invisible elements.

## Must-Haves

- `.light {}` CSS variable block in `globals.css` defines all tokens: background, foreground, card, muted, border, input, ring, primary, secondary, destructive, accent, popover, status colors, gsd-cyan, terminal-bg/fg
- `Theme` type in `use-theme.ts` includes `"light"` as a valid value
- `getInitialTheme()` in `theme-provider.tsx` recognizes `"light"` from localStorage
- Backend settings sync in `theme-provider.tsx` recognizes `"light"` from saved settings
- All components using raw Tailwind `-400` palette colors have `dark:` variants (light-mode color at `-600`/`-700` level for adequate contrast)
- Yellow `-500` indicators in GSD-2 tabs have `dark:` variants for contrast safety
- `pnpm build` compiles without TypeScript errors
- `pnpm test --run` passes 143+ tests (no regressions)

## Proof Level

- This slice proves: integration
- Real runtime required: yes (visual inspection in Tauri app or `pnpm dev` browser)
- Human/UAT required: yes (confirm no invisible text or broken colors in light mode across all views)

## Verification

- `pnpm build` — 0 TypeScript errors
- `pnpm test --run` — 143+ tests pass
- `grep -c '\-\-' src/styles/globals.css` shows increase of 30+ lines vs current state
- `grep 'terminal-bg' src/styles/globals.css` returns lines in both `.dark` and `.light` blocks
- `grep '"light"' src/hooks/use-theme.ts` shows `"light"` in the type union
- `rg 'text-(yellow|amber|green|blue|red|orange|purple)-400' src/ --glob '*.tsx' | grep -v test | grep -v dark: | grep -v codebase-health` returns 0 lines
- Visual inspection: toggle to Light in Settings → navigate all view categories (dashboard, project list, project detail with GSD-2 tabs, todos, logs, notifications, settings, command palette) — no invisible text, no broken contrast, status colors distinguishable

## Observability / Diagnostics

- Runtime signals: none (CSS-only changes + type fix; no new runtime logic or state transitions)
- Inspection surfaces: browser DevTools → Computed styles → CSS variable values under `.light` class; `document.documentElement.classList` shows `light` when theme is active
- Failure visibility: visually broken contrast or invisible text in light mode; theme-provider console logs on theme change show resolved theme value
- Redaction constraints: none

## Integration Closure

- Upstream surfaces consumed: none (S01 is the first slice, no dependencies)
- New wiring introduced in this slice: `.light {}` CSS variable block consumed by all existing `hsl(var(--*))` references; `Theme` type union extended to `"light" | "dark" | "system"`
- What remains before the milestone is truly usable end-to-end: S02 (state patterns must look correct in light mode), S03 (animations/toasts), S04 (focus rings in light mode), S05/S06 (build cleanup)

## Tasks

- [x] **T01: Add light theme CSS variables to globals.css** `est:30m`
  - Why: The app has no light-mode CSS variables — selecting "Light" or having system preference set to light produces invisible text on white backgrounds because all tokens are undefined outside `.dark {}`
  - Files: `src/styles/globals.css`
  - Do: Add a `.light {}` block inside `@layer base` with all tokens calibrated for white backgrounds — backgrounds white/near-white, foregrounds near-black, status colors shifted to 36-50% lightness range (darker than dark-mode 52-68%), gsd-cyan at 35% lightness for ~7:1 contrast, terminal-bg/fg fallback values. Also add missing `--terminal-bg` and `--terminal-fg` to the `.dark {}` block since they're referenced but undefined.
  - Verify: `grep -c "\.light" src/styles/globals.css` returns >= 1; `grep "terminal-bg" src/styles/globals.css` returns lines in both `.dark` and `.light` blocks; `pnpm build` succeeds
  - Done when: `.light {}` block has all 30+ CSS variable tokens defined and `.dark {}` block has terminal-bg/fg gap filled

- [x] **T02: Fix Theme type and provider guard conditions** `est:20m`
  - Why: The `Theme` type is `"dark" | "system"` — selecting "light" in settings silently falls back to dark because `getInitialTheme()` and the backend sync guard both reject the value
  - Files: `src/hooks/use-theme.ts`, `src/components/theme/theme-provider.tsx`
  - Do: Extend `Theme` type to `"dark" | "system" | "light"`. Fix `getInitialTheme()` to accept `"light"` from localStorage. Fix backend settings sync to accept `"light"` from saved settings. Do NOT touch the DOM manipulation code (classList.remove/add) — it already works correctly for all three values.
  - Verify: `pnpm build` succeeds; `grep '"light"' src/hooks/use-theme.ts` shows it in the type union; `grep -c '"light"' src/components/theme/theme-provider.tsx` returns at least 2 (both guard conditions)
  - Done when: TypeScript compiles clean with `"light"` as a valid Theme value, and both guard conditions accept it

- [x] **T03: Add dark: variants to components with hardcoded palette colors** `est:45m`
  - Why: ~30 instances across 9 component files use raw Tailwind `-400` or `-500` colors tuned for dark backgrounds — these produce inadequate contrast (< 3:1) on white backgrounds in light mode
  - Files: `src/components/project/knowledge-captures-panel.tsx`, `src/components/project/gsd-validation-plan-tab.tsx`, `src/components/project/gsd2-milestones-tab.tsx`, `src/components/project/gsd2-tasks-tab.tsx`, `src/components/project/gsd2-slices-tab.tsx`, `src/components/project/gsd2-visualizer-tab.tsx`, `src/pages/todos.tsx`, `src/pages/logs.tsx`, `src/components/command-palette/command-palette.tsx`
  - Do: Apply the established `text-{color}-600 dark:text-{color}-400` pattern (reference: `codebase-health-card.tsx`). For yellow/amber use `-700 dark:-400` since yellow-600 is only ~2.1:1 on white. For `-500` colors on small indicators (▶ in GSD-2 tabs and visualizer), use `text-yellow-600 dark:text-yellow-500`. For hover states, use `hover:text-{color}-600 dark:hover:text-{color}-400`.
  - Verify: `pnpm build` succeeds; `rg 'text-(yellow|amber|green|blue|red|orange|purple)-400' src/ --glob '*.tsx' | grep -v test | grep -v dark: | grep -v codebase-health` returns 0 results; `pnpm test --run` passes 143+ tests
  - Done when: Zero raw `-400` palette colors without `dark:` variants in non-test `.tsx` files

## Files Likely Touched

- `src/styles/globals.css`
- `src/hooks/use-theme.ts`
- `src/components/theme/theme-provider.tsx`
- `src/components/project/knowledge-captures-panel.tsx`
- `src/components/project/gsd-validation-plan-tab.tsx`
- `src/components/project/gsd2-milestones-tab.tsx`
- `src/components/project/gsd2-tasks-tab.tsx`
- `src/components/project/gsd2-slices-tab.tsx`
- `src/components/project/gsd2-visualizer-tab.tsx`
- `src/pages/todos.tsx`
- `src/pages/logs.tsx`
- `src/components/command-palette/command-palette.tsx`
