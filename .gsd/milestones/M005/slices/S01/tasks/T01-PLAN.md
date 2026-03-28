---
estimated_steps: 4
estimated_files: 1
skills_used:
  - frontend-design
  - accessibility
---

# T01: Add light theme CSS variables to globals.css

**Slice:** S01 — Light Theme
**Milestone:** M005

## Description

Add a complete `.light {}` CSS variable block to `globals.css` with all design tokens calibrated for white/light backgrounds. This is the foundation — without these variables, selecting "Light" theme produces invisible text because all components reference `hsl(var(--*))` tokens that are undefined outside `.dark {}`. Also fix the missing `--terminal-bg` and `--terminal-fg` variables in the `.dark {}` block (referenced by `card.tsx` `variant="terminal"` but never defined).

## Steps

1. Open `src/styles/globals.css`. Locate the `@layer base` section with the existing `.dark {}` block (starts around line 9). Add a `.light {}` block immediately after the `.dark {}` block's closing brace. Define all core tokens: `--background: 0 0% 100%` (white), `--foreground: 240 10% 3.9%` (near-black), `--card: 0 0% 100%`, `--card-foreground: 240 10% 3.9%`, `--popover: 0 0% 100%`, `--popover-foreground: 240 10% 3.9%`, `--primary: 189 94% 35%` (darker cyan for ~7:1 contrast on white), `--primary-foreground: 0 0% 100%`, `--secondary: 240 4.8% 95.9%`, `--secondary-foreground: 240 5.9% 10%`, `--muted: 240 4.8% 95.9%`, `--muted-foreground: 240 3.8% 46.1%`, `--accent: 240 4.8% 95.9%`, `--accent-foreground: 240 5.9% 10%`, `--destructive: 0 84.2% 60.2%`, `--destructive-foreground: 0 0% 98%`, `--border: 240 5.9% 90%`, `--input: 240 5.9% 90%`, `--ring: 189 94% 35%`, `--radius: 0.5rem`.
2. Add brand and status tokens to the `.light {}` block: `--gsd-cyan: 189 94% 35%` (darker than dark-mode 50% for contrast on white), `--status-success: 142 76% 36%`, `--status-warning: 38 95% 38%`, `--status-error: 0 84% 50%`, `--status-info: 217 91% 50%`, `--status-pending: 220 12% 40%`, `--status-blocked: 30 95% 42%`, `--status-paused: 45 100% 38%`. These are shifted to 36-50% lightness range — darker than dark-mode's 52-68% range.
3. Add `--terminal-bg` and `--terminal-fg` to BOTH blocks. In `.light {}`: `--terminal-bg: 240 5.9% 96%` (light gray), `--terminal-fg: 240 10% 3.9%` (near-black). In `.dark {}` (gap fix — these variables are referenced by card.tsx terminal variant but never defined): `--terminal-bg: 0 0% 4%` (near-black), `--terminal-fg: 0 0% 95%` (near-white). Add the dark values near the end of the existing `.dark {}` block before the closing brace.
4. Verify the `.light {}` block has at least 30 CSS variable definitions by counting `--` lines within the block. Run `pnpm build` to ensure CSS is valid.

## Must-Haves

- [ ] `.light {}` block exists inside `@layer base` with all core tokens (background through ring + radius)
- [ ] `.light {}` block includes `--gsd-cyan` at lower lightness than dark mode (35% vs 50%)
- [ ] `.light {}` block includes all 7 status color tokens with lightness in 36-50% range
- [ ] `.dark {}` block includes `--terminal-bg` and `--terminal-fg` (gap fix)
- [ ] `.light {}` block includes `--terminal-bg` and `--terminal-fg`
- [ ] No duplicate property names within the `.light {}` block

## Verification

- `grep -c "\-\-" src/styles/globals.css` shows increase of 30+ lines (light block tokens)
- `grep "terminal-bg" src/styles/globals.css` returns lines in both `.dark` and `.light` blocks
- `pnpm build` succeeds (CSS is valid, no TypeScript errors)

## Observability Impact

- Signals added/changed: CSS variables become defined under `.light` class on `<html>` — previously undefined, causing `hsl(var(--*))` to resolve to transparent/broken colors in light mode
- How a future agent inspects this: In browser DevTools, select `<html class="light">`, check Computed styles → all `--background`, `--foreground`, `--status-*`, `--gsd-cyan`, `--terminal-bg/fg` variables should show defined HSL values. Alternatively: `getComputedStyle(document.documentElement).getPropertyValue('--background')` should return a non-empty string when `.light` class is active.
- Failure state exposed: If variables are missing or miscalibrated, text becomes invisible (white-on-white) or status colors become indistinguishable — immediately visible via visual inspection in light mode

## Inputs

- `src/styles/globals.css` — existing dark theme CSS variables and structure to mirror
- `.gsd/milestones/M005/slices/S01/S01-RESEARCH.md` — calibrated light theme color values (exact HSL tokens listed in Implementation Landscape → CSS Strategy)

## Expected Output

- `src/styles/globals.css` — modified: `.light {}` block added with 30+ token definitions, `.dark {}` block patched with `--terminal-bg` and `--terminal-fg`
