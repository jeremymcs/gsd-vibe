---
estimated_steps: 7
estimated_files: 6
skills_used:
  - frontend-design
  - make-interfaces-feel-better
  - core-web-vitals
---

# T02: Add CSS animations — shimmer, stagger, crossfade, card hover lift

**Slice:** S03 — Micro-interactions & Feedback
**Milestone:** M005

## Description

Add four CSS-only micro-interactions: (1) skeleton shimmer animation replacing the existing pulse, (2) list stagger-in animation on dashboard project items, (3) view crossfade on project page navigation, (4) card hover lift effect. All animations use CSS keyframes and utility classes — no animation library (D019). All must be covered by the existing `@media (prefers-reduced-motion: reduce)` block in globals.css.

## Steps

1. **Add keyframes to `src/styles/globals.css`** — After the existing `@keyframes fade-in` block (around line 157), add:
   - `@keyframes shimmer` — moves a gradient background from -200% to 200% horizontal position
   - `@keyframes stagger-in` — opacity 0 + translateY(8px) → opacity 1 + translateY(0)
   - `.animate-shimmer` class with the shimmer animation (1.5s ease-in-out infinite) and a gradient background using `hsl(var(--muted))` → `hsl(var(--muted-foreground) / 0.1)` → `hsl(var(--muted))`; background-size: 200% 100%
   - `.animate-stagger-in` class with the stagger-in animation (0.4s ease-out both)
   - Add `.animate-shimmer` and `.animate-stagger-in` to the existing `@media (prefers-reduced-motion: reduce)` block alongside `.animate-spin`, `.animate-pulse`, `.animate-fade-in`

2. **Register in `tailwind.config.js`** — In `theme.extend.keyframes`, add `shimmer` and `stagger-in` keyframe definitions. In `theme.extend.animation`, add `shimmer` and `stagger-in` entries. This allows Tailwind's JIT to recognize `animate-shimmer` and `animate-stagger-in` even though we also define them in globals.css.

3. **Update `src/components/ui/skeleton.tsx`** — In the base `Skeleton` component, replace `animate-pulse` with `animate-shimmer`. The shimmer gradient is applied via the `.animate-shimmer` CSS class in globals.css, so also remove the `bg-muted` class from the Skeleton component since the shimmer class provides its own background.

4. **Enhance `src/components/ui/card.tsx`** — In the `interactive` variant of `cardVariants`, add `hover:-translate-y-0.5 hover:shadow-xl` alongside the existing `hover:scale-[1.01] active:scale-[0.99]`. This creates a subtle lift effect with enhanced shadow on hover.

5. **Add view crossfade to `src/pages/project.tsx`** — On the div wrapping `<ViewRenderer>` (around line 191), add `key={activeView}` to force React to remount the div on view change, and add `animate-fade-in` to the className. This creates a fade-in effect when navigating between views. The div currently has classes `h-full overflow-y-auto p-6`.

6. **Add stagger animation to `src/pages/dashboard.tsx`** — Wrap each `<ProjectCard>` in the grid view (line ~219) and each `<ProjectRow>` in the list view (line ~232) with a div that has `className="animate-stagger-in"` and `style={{ animationDelay: \`${index * 50}ms\` }}`. The stagger adds a subtle sequential entrance when the dashboard loads. Pass `index` from the `.map()` callback. Cap delay at 1000ms (first 20 items stagger, rest appear instantly) to avoid excessive total animation time on large lists: `style={{ animationDelay: \`${Math.min(index * 50, 1000)}ms\` }}`.

7. **Verify** — Run `pnpm build` and `pnpm test --run` to confirm no regressions.

## Must-Haves

- [ ] `@keyframes shimmer` exists in globals.css with gradient background animation
- [ ] `@keyframes stagger-in` exists in globals.css with opacity + translateY
- [ ] `.animate-shimmer` and `.animate-stagger-in` classes defined in globals.css
- [ ] Both new animation classes added to `prefers-reduced-motion` block
- [ ] Tailwind config has `shimmer` and `stagger-in` in keyframes and animation
- [ ] Skeleton component uses `animate-shimmer` instead of `animate-pulse`
- [ ] Card interactive variant includes `hover:-translate-y-0.5 hover:shadow-xl`
- [ ] Project view wrapper has `key={activeView}` and `animate-fade-in`
- [ ] Dashboard grid and list items wrapped with stagger animation + per-item delay
- [ ] `pnpm build` exits 0
- [ ] `pnpm test --run` passes 143+ tests

## Verification

- `grep -q '@keyframes shimmer' src/styles/globals.css && echo "PASS"` → PASS
- `grep -q '@keyframes stagger-in' src/styles/globals.css && echo "PASS"` → PASS
- `grep -q 'animate-shimmer' src/components/ui/skeleton.tsx && echo "PASS"` → PASS
- `grep -q 'translate-y' src/components/ui/card.tsx && echo "PASS"` → PASS
- `grep -q 'key={activeView}' src/pages/project.tsx && echo "PASS"` → PASS
- `grep -q 'animate-stagger-in' src/pages/dashboard.tsx && echo "PASS"` → PASS
- `grep 'animate-shimmer\|animate-stagger-in' src/styles/globals.css | grep -q 'reduced-motion' || grep -A10 'prefers-reduced-motion' src/styles/globals.css | grep -q 'animate-shimmer'` → reduced-motion block covers new classes
- `pnpm build` exits 0
- `pnpm test --run` passes all tests

## Inputs

- `src/styles/globals.css` — existing fade-in keyframes at line 157, prefers-reduced-motion block at line 249
- `tailwind.config.js` — existing keyframes/animation section with fade-in/fade-out
- `src/components/ui/skeleton.tsx` — base Skeleton uses `animate-pulse rounded-md bg-muted`
- `src/components/ui/card.tsx` — interactive variant: `cursor-pointer hover:scale-[1.01] active:scale-[0.99]`
- `src/pages/project.tsx` — view wrapper div at line ~191: `<div className="h-full overflow-y-auto p-6">`
- `src/pages/dashboard.tsx` — grid map at line ~219, list map at line ~232

## Expected Output

- `src/styles/globals.css` — new `@keyframes shimmer`, `@keyframes stagger-in`, `.animate-shimmer`, `.animate-stagger-in` classes, updated prefers-reduced-motion block
- `tailwind.config.js` — `shimmer` and `stagger-in` added to keyframes and animation config
- `src/components/ui/skeleton.tsx` — `animate-pulse` replaced with `animate-shimmer`, `bg-muted` removed
- `src/components/ui/card.tsx` — interactive variant enhanced with `hover:-translate-y-0.5 hover:shadow-xl`
- `src/pages/project.tsx` — view wrapper has `key={activeView}` and `animate-fade-in`
- `src/pages/dashboard.tsx` — grid and list items wrapped in stagger animation divs with per-item delay
